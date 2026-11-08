export type RemaxAgentCard = { fullName: string; profileUrl: string };

function decodeHtml(value: string): string {
  return value
    .replace(/&amp;/gi, "&")
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/&nbsp;/gi, " ")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Extract only public agent display names and canonical profile URLs. No phone/email scraping. */
export function parseRemaxAgentCards(html: string): RemaxAgentCard[] {
  const found = new Map<string, RemaxAgentCard>();
  const anchor = /<a\b([^>]*?)href\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))([^>]*)>([\s\S]*?)<\/a>/gi;
  for (const match of html.matchAll(anchor)) {
    const href = (match[2] || match[3] || match[4] || "").replace(/&amp;/gi, "&").trim();
    if (!/^https?:\/\/(?:www\.)?remax\.mn\//i.test(href) && !/^\/(?:agent\/|[a-z]{2}\/agents\/)/i.test(href)) continue;
    const absolute = new URL(href, "https://www.remax.mn").toString();
    const path = new URL(absolute).pathname;
    if (!/^\/agent\/\d{6,}\/?$/i.test(path) && !/^\/[a-z]{2}\/agents\/.+\/\d{6,}\/?$/i.test(path)) continue;
    const fullName = decodeHtml(match[6] || "");
    if (!fullName || fullName.length > 120 || /^(agent|агент|profile)$/i.test(fullName)) continue;
    found.set(absolute, { fullName, profileUrl: absolute });
  }
  return [...found.values()];
}
