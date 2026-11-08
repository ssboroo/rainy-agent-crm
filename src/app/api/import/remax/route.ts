import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { ensureSchema, pool } from "@/lib/server-db";
import { parseRemaxAgentCards } from "@/lib/remax-import";

export const runtime = "nodejs";
export const maxDuration = 300;

const DIRECTORIES = [
  "https://www.remax.mn/ProfileSearch?countryId=119&country=Mongolia&searchType=agent",
  "https://www.remax.mn/en/agents/mongolia",
  "https://www.remax.mn/mn-mn/агентууд/монгол",
  "https://www.remax.mn/ProfileSearch?countryId=119&searchType=agent"
];
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const headers = {
  "User-Agent": "Mozilla/5.0 (compatible; RAINY-Agent-CRM/1.0; +https://rainy.studio)",
  "Accept": "text/html,application/xhtml+xml"
};

export async function POST() {
  if (!await isAuthenticated()) return NextResponse.json({ error: "Нэвтэрнэ үү." }, { status: 401 });
  try {
    await ensureSchema();
    let imported = 0;
    let updated = 0;
    let pagesScanned = 0;
    let selectedDirectory = "";
    const seenOnRun = new Set<string>();
    const diagnostics: string[] = [];

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
          const result = await pool.query(
            `insert into agents(full_name, profile_url, source_url, source_checked_at)
             values($1,$2,$2,now())
             on conflict(profile_url) do update set
               full_name=excluded.full_name, source_url=excluded.source_url, source_checked_at=now()
             returning (xmax = 0) as inserted`,
            [agent.fullName, agent.profileUrl]
          );
          if (result.rows[0]?.inserted) imported++; else updated++;
          pageFound++;
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
      pagesScanned,
      directory: selectedDirectory,
      note: "Зөвхөн нийтэд нээлттэй агентын нэр, профайлын холбоос импортолсон. Утас, имэйл болон маркетингийн зөвшөөрөл цуглуулаагүй."
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "RE/MAX импорт амжилтгүй.";
    return NextResponse.json({ success: false, error: message }, { status: 502 });
  }
}
