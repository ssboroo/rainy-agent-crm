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

function normalizeProfile(href: string): URL | null {
  try {
    const url = new URL(href.replace(/\\//g, "/"), "https://www.remax.mn");
    if (url.hostname !== "www.remax.mn" && url.hostname !== "remax.mn") return null;
    let path = url.pathname;
    try { path = decodeURIComponent(path); } catch { /* retain encoded path */ }
    const queryId = url.searchParams.get("AgentID") || url.searchParams.get("agentId");
    const valid = /^\/agent\/\d{6,}\/?$/i.test(path)
      || /^\/[a-z]{2}(?:-[a-z]{2})?\/(?:agents|агентууд)\/.+\/\d{6,}\/?$/i.test(path)
      || /^\/\d{6,}-\d{1,6}\/?$/.test(path)
      || (/AgentProfile\.aspx$/i.test(path) && /^\d{6,}$/.test(queryId || ""));
    if (!valid) return null;
    if (/AgentProfile\.aspx$/i.test(path) && queryId) {
      url.pathname = "/agent/" + queryId;
      url.search = "";
    } else {
      url.pathname = path;
      url.search = "";
    }
    return url;
  } catch {
    return null;
  }
}

function nameFromProfilePath(path: string): string {
  const parts = path.split("/").filter(Boolean);
  const slug = parts.length >= 2 ? parts[parts.length - 2] : "";
  if (!slug || /^\d+$/.test(slug)) return "";
  return slug.split("-").map(word => word ? word[0].toUpperCase() + word.slice(1) : "").join(" ");
}

/** Extract only public agent display names and canonical profile URLs. No phone/email scraping. */
export function parseRemaxAgentCards(html: string): RemaxAgentCard[] {
  const found = new Map<string, RemaxAgentCard>();
  const anchor = /<a\b([^>]*?)href\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))([^>]*)>([\s\S]*?)<\/a>/gi;
  for (const match of html.matchAll(anchor)) {
    const href = (match[2] || match[3] || match[4] || "").replace(/&amp;/gi, "&").trim();
    const url = normalizeProfile(href);
    if (!url) continue;
    const attrs = match[1] + " " + match[5];
    const title = attrs.match(/(?:aria-label|title|data-name)\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))/i);
    const fullName = decodeHtml(title?.[1] || title?.[2] || title?.[3] || match[6] || "") || nameFromProfilePath(url.pathname);
    if (!fullName || fullName.length > 120 || /^(agent|агент|profile)$/i.test(fullName)) continue;
    found.set(url.toString(), { fullName, profileUrl: url.toString() });
  }
  return [...found.values()];
}
