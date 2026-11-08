import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { ensureSchema, pool } from "@/lib/server-db";
import { parseRemaxAgentCards } from "@/lib/remax-import";

export const runtime = "nodejs";
export const maxDuration = 300;

const DIRECTORY = "https://www.remax.mn/ProfileSearch?countryId=119&searchType=agent";
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function POST() {
  if (!await isAuthenticated()) return NextResponse.json({ error: "Нэвтэрнэ үү." }, { status: 401 });
  try {
    await ensureSchema();
    let imported = 0;
    let updated = 0;
    let pagesScanned = 0;
    let emptyPages = 0;
    const seenOnRun = new Set<string>();
    const errors: string[] = [];

    // Small, sequential batches avoid hammering the public directory. Re-run safely to continue refreshing.
    for (let page = 1; page <= 40; page++) {
      const url = new URL(DIRECTORY);
      if (page > 1) url.searchParams.set("page", String(page));
      const response = await fetch(url, {
        headers: { "User-Agent": "RAINY-Agent-CRM/1.0 (public profile directory sync; contact: support@rainy.studio)", "Accept": "text/html" },
        signal: AbortSignal.timeout(15000),
        cache: "no-store"
      });
      if (!response.ok) throw new Error(`RE/MAX directory HTTP ${response.status}`);
      const html = await response.text();
      if (html.length > 8_000_000) throw new Error("RE/MAX хуудасны хэмжээ хэтэрсэн тул зогсоолоо.");
      const cards = parseRemaxAgentCards(html);
      pagesScanned++;
      let pageNew = 0;
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
        pageNew++;
      }
      if (pageNew === 0) emptyPages++; else emptyPages = 0;
      // The directory may render all matches in one page. Stop on repeated/empty pages.
      if (emptyPages >= 2 || (page > 1 && cards.length === 0)) break;
      await sleep(750);
    }
    if (pagesScanned === 0 || seenOnRun.size === 0) {
      return NextResponse.json({
        error: "RE/MAX жагсаалтын HTML-ээс агентын профайл илэрсэнгүй. Сайт бүтэц эсвэл хамгаалалтаа өөрчилсөн байж болзошгүй.",
        pagesScanned
      }, { status: 502 });
    }
    return NextResponse.json({
      success: true,
      imported,
      updated,
      totalFound: seenOnRun.size,
      pagesScanned,
      note: "Зөвхөн нийтэд нээлттэй агентын нэр, профайлын холбоос импортолсон. Утас, имэйл болон маркетингийн зөвшөөрөл цуглуулаагүй."
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "RE/MAX импорт амжилтгүй.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
