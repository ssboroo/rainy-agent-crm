import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { ensureSchema, pool } from "@/lib/server-db";
import { parseRemaxAgentCards, parseRemaxSitemap, parseSitemapLocations, parseRemaxPublicPhone } from "@/lib/remax-import";

export const runtime = "nodejs";
export const maxDuration = 300;

const DIRECTORIES = [
  "https://www.remax.mn/ProfileSearch?countryId=119&country=Mongolia&searchType=agent",
  "https://www.remax.mn/en/agents/mongolia",
  "https://www.remax.mn/mn-mn/агентууд/монгол",
  "https://www.remax.mn/ProfileSearch?countryId=119&searchType=agent"
];
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchPublicAgentPhone(profileUrl: string): Promise<string | null> {
  try {
    const url = new URL(profileUrl);
    if (!["www.remax.mn", "remax.mn"].includes(url.hostname)) return null;
    const response = await fetch(url, {
      headers: { ...headers, Accept: "text/html,application/xhtml+xml" },
      signal: AbortSignal.timeout(12000), cache: "no-store", redirect: "follow"
    });
    if (!response.ok) return null;
    const html = await response.text();
    if (html.length > 3_000_000 || /cf-chl-|challenge-platform|just a moment\.\.\./i.test(html)) return null;
    return parseRemaxPublicPhone(html);
  } catch {
    return null;
  }
}
const headers = {
  "User-Agent": "Mozilla/5.0 (compatible; RAINY-Agent-CRM/1.0; +https://rainy.studio)",
  "Accept": "text/html,application/xhtml+xml"
};

async function runRemaxImport() {
  try {
    await ensureSchema();
    let imported = 0;
    let updated = 0;
    let pagesScanned = 0;
    let phoneNumbersFound = 0;
    let selectedDirectory = "";
    const seenOnRun = new Set<string>();
    const diagnostics: string[] = [];

    // Prefer the site's public XML sitemap: profile URLs may not be present in
    // the server-rendered directory HTML when the listing is hydrated by JS.
    const sitemapQueue: string[] = [
      "https://www.remax.mn/sitemap.xml",
      "https://www.remax.mn/sitemap_index.xml",
      "https://www.remax.mn/sitemap-index.xml"
    ];
    try {
      const robots = await fetch("https://www.remax.mn/robots.txt", {
        headers, signal: AbortSignal.timeout(12000), cache: "no-store", redirect: "follow"
      });
      if (robots.ok) {
        const robotsText = await robots.text();
        for (const line of robotsText.match(/^\s*sitemap:\s*(https?:\/\/\S+)/gim) || []) {
          const value = line.replace(/^\s*sitemap:\s*/i, "").trim();
          if (value.startsWith("https://www.remax.mn/") || value.startsWith("https://remax.mn/")) {
            sitemapQueue.unshift(value);
          }
        }
      }
    } catch {
      diagnostics.push("robots.txt: unavailable; trying standard sitemap paths");
    }

    const visitedSitemaps = new Set<string>();
    const sitemapCards = new Map<string, { fullName: string; profileUrl: string }>();
    while (sitemapQueue.length && visitedSitemaps.size < 15 && sitemapCards.size < 5000) {
      const sitemapUrl = sitemapQueue.shift()!;
      if (visitedSitemaps.has(sitemapUrl)) continue;
      visitedSitemaps.add(sitemapUrl);
      try {
        const response = await fetch(sitemapUrl, {
          headers: { ...headers, "Accept": "application/xml,text/xml,text/plain,*/*" },
          signal: AbortSignal.timeout(15000),
          cache: "no-store",
          redirect: "follow"
        });
        pagesScanned++;
        if (!response.ok) {
          diagnostics.push(`sitemap ${new URL(sitemapUrl).pathname}: HTTP ${response.status}`);
          continue;
        }
        const xml = await response.text();
        if (xml.length > 8_000_000) {
          diagnostics.push(`sitemap ${new URL(sitemapUrl).pathname}: response too large`);
          continue;
        }
        for (const agent of parseRemaxSitemap(xml)) sitemapCards.set(agent.profileUrl, agent);
        if (sitemapCards.size === 0) {
          for (const location of parseSitemapLocations(xml)) {
            if (/sitemap[^/]*\.xml(?:$|\?)/i.test(location) && !visitedSitemaps.has(location)) {
              sitemapQueue.push(location);
            }
          }
        }
      } catch (error) {
        diagnostics.push(`sitemap ${new URL(sitemapUrl).pathname}: ${error instanceof Error ? error.message : "fetch failed"}`);
      }
      await sleep(250);
    }

    for (const agent of sitemapCards.values()) {
      const phone = await fetchPublicAgentPhone(agent.profileUrl);
      if (phone) phoneNumbersFound++;
      const result = await pool.query(
        `insert into agents(full_name, profile_url, source_url, phone_e164, source_checked_at)
         values($1,$2,$2,$3,now())
         on conflict(profile_url) do update set
           full_name=excluded.full_name, source_url=excluded.source_url,
           phone_e164=coalesce(excluded.phone_e164, agents.phone_e164), source_checked_at=now()
         returning (xmax = 0) as inserted`,
        [agent.fullName, agent.profileUrl, phone]
      );
      if (result.rows[0]?.inserted) imported++; else updated++;
      seenOnRun.add(agent.profileUrl);
      await sleep(250);
    }

    for (const directory of DIRECTORIES) {
      let sourceFound = 0;
      let emptyPages = 0;
      for (let page = 1; page <= 40; page++) {
        const url = new URL(directory);
        if (page > 1) url.searchParams.set("page", String(page));
        const response = await fetch(url, {
          headers,
          signal: AbortSignal.timeout(20000),
          cache: "no-store",
          redirect: "follow"
        });
        pagesScanned++;
        if (!response.ok) {
          diagnostics.push(`${url.pathname}: HTTP ${response.status}`);
          break;
        }
        const html = await response.text();
        if (html.length > 8_000_000) {
          diagnostics.push(`${url.pathname}: response too large`);
          break;
        }
        if (/cf-chl-|challenge-platform|just a moment\.\.\./i.test(html) && html.length < 500_000) {
          diagnostics.push(`${url.pathname}: anti-bot challenge response`);
          break;
        }

        const cards = parseRemaxAgentCards(html);
        let pageFound = 0;
        for (const agent of cards) {
          if (seenOnRun.has(agent.profileUrl)) continue;
          seenOnRun.add(agent.profileUrl);
          const phone = await fetchPublicAgentPhone(agent.profileUrl);
          if (phone) phoneNumbersFound++;
          const result = await pool.query(
            `insert into agents(full_name, profile_url, source_url, phone_e164, source_checked_at)
             values($1,$2,$2,$3,now())
             on conflict(profile_url) do update set
               full_name=excluded.full_name, source_url=excluded.source_url,
               phone_e164=coalesce(excluded.phone_e164, agents.phone_e164), source_checked_at=now()
             returning (xmax = 0) as inserted`,
            [agent.fullName, agent.profileUrl, phone]
          );
          if (result.rows[0]?.inserted) imported++; else updated++;
          pageFound++;
          await sleep(250);
        }
        sourceFound += pageFound;
        if (pageFound === 0) emptyPages++; else emptyPages = 0;
        if (emptyPages >= 2 || (page > 1 && cards.length === 0)) break;
        await sleep(600);
      }
      if (sourceFound > 0) {
        selectedDirectory = directory;
        break;
      }
      diagnostics.push(`${new URL(directory).pathname}: no public agent profile links found`);
    }

    if (seenOnRun.size === 0) {
      return NextResponse.json({
        success: false,
        error: "RE/MAX-ийн шинэ болон хуучин жагсаалтын хаягуудыг шалгасан ч профайлын холбоос олдсонгүй. Энэ нь JavaScript/API-аар ачаалдаг эсвэл сайт талаас автомат хүсэлтийг хязгаарласан байж болно.",
        pagesScanned,
        diagnostics,
        checkedDirectories: DIRECTORIES
      }, { status: 502 });
    }

    return NextResponse.json({
      success: true,
      imported,
      updated,
      totalFound: seenOnRun.size,
      phoneNumbersFound,
      pagesScanned,
      directory: selectedDirectory || "https://www.remax.mn/sitemap.xml (public sitemap discovery)",
      note: "Нэр, профайл болон зөвхөн хуудсанд нийтэд харагдаж буй утасны дугаарыг импортолсон. Нууцлагдсан, товшиж ил гардаг, нэвтрэлт шаардсан дугаар болон маркетингийн зөвшөөрөл цуглуулаагүй."
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "RE/MAX импорт амжилтгүй.";
    return NextResponse.json({ success: false, error: message }, { status: 502 });
  }
}


export async function POST() {
  if (!await isAuthenticated()) {
    return NextResponse.json({ error: "Нэвтэрнэ үү." }, { status: 401 });
  }
  return runRemaxImport();
}

// One-time operational trigger; disable by clearing REMAX_SYNC_TRIGGER_TOKEN.
export async function GET(request: Request) {
  const expected = process.env.REMAX_SYNC_TRIGGER_TOKEN || "";
  const supplied = new URL(request.url).searchParams.get("token") || "";
  if (!expected || supplied.length !== expected.length || supplied !== expected) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return runRemaxImport();
}
