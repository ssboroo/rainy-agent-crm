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

function normalizeProfile(href: string): { profileUrl: string; path: string } | null {
  try {
    const url = new URL(href, "https://www.remax.mn");
    if (url.hostname !== "www.remax.mn" && url.hostname !== "remax.mn") return null;
    let path = url.pathname;
    try { path = decodeURIComponent(path); } catch { /* retain encoded path */ }
    const queryId = url.searchParams.get("AgentID") || url.searchParams.get("agentId");
    const legacyAspx = /AgentProfile\.aspx$/i.test(path) && /^\d{6,}$/.test(queryId || "");
    const valid = /^\/agent\/\d{6,}\/?$/i.test(path)
      || /^\/[a-z]{2}(?:-[a-z]{2})?\/(?:agents|агентууд)\/.+\/\d{6,}\/?$/i.test(path)
      || /^\/\d{6,}-\d{1,6}\/?$/.test(path)
      || /^\/(?!agent(?:\/|$)|office(?:\/|$)|team(?:\/|$)|profile(?:\/|$))[a-z0-9][a-z0-9-]{1,}\/\d{6,}\/?$/i.test(path)
      || legacyAspx;
    if (!valid) return null;
    if (legacyAspx) path = "/agent/" + queryId;
    return { profileUrl: url.origin + path, path };
  } catch {
    return null;
  }
}

function nameFromProfilePath(path: string): string {
  const parts = path.split("/").filter(Boolean);
  const slug = parts.length >= 2 ? parts[parts.length - 2] : "";
  if (!slug || /^\d+$/.test(slug) || slug.toLowerCase() === "agent") return "";
  return slug.split("-").map(word => word ? word[0].toUpperCase() + word.slice(1) : "").join(" ");
}

/** Extract a Mongolian contact number only when it is present in rendered, visible profile markup.
 * Script payloads, hidden elements and hidden/reveal metadata are deliberately excluded.
 */
export function parseRemaxPublicPhone(html: string): string | null {
  const visibleMarkup = html
    .replace(/<(script|style|noscript|template)\b[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<([a-z][\w:-]*)\b[^>]*(?:\bhidden\b|aria-hidden\s*=\s*["']true["']|style\s*=\s*["'][^"']*(?:display\s*:\s*none|visibility\s*:\s*hidden)[^"']*["'])[^>]*>[\s\S]*?<\/\1>/gi, " ");
  const visible = visibleMarkup
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&");
  const tel = [...visibleMarkup.matchAll(/<a\b[^>]*href\s*=\s*["']tel:([^"']+)["'][^>]*>/gi)]
    .map(match => match[1]);
  for (const candidate of [...tel, visible]) {
    const matches = candidate.matchAll(/(?:\+?976[\s().-]*)?([6-9](?:[\s().-]*\d){7})(?!\d)/g);
    for (const match of matches) {
      const local = match[1].replace(/\D/g, "");
      if (local.length === 8) return "+976" + local;
    }
  }
  return null;
}

/** Extract public agent display names and canonical profile URLs. */
export function parseRemaxAgentCards(html: string): RemaxAgentCard[] {
  const found = new Map<string, RemaxAgentCard>();
  const anchor = /<a\b([^>]*?)href\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))([^>]*)>([\s\S]*?)<\/a>/gi;
  for (const match of html.matchAll(anchor)) {
    const href = (match[2] || match[3] || match[4] || "").replace(/&amp;/gi, "&").trim();
    const profile = normalizeProfile(href);
    if (!profile) continue;
    const attrs = match[1] + " " + match[5];
    const title = attrs.match(/(?:aria-label|title|data-name)\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))/i);
    const fullName = decodeHtml(title?.[1] || title?.[2] || title?.[3] || match[6] || "") || nameFromProfilePath(profile.path);
    if (!fullName || fullName.length > 120 || /^(agent|агент|profile)$/i.test(fullName)) continue;
    found.set(profile.profileUrl, { fullName, profileUrl: profile.profileUrl });
  }
  return [...found.values()];
}


/** Extract public agent profile links from XML sitemap/urlset documents. */
export function parseRemaxSitemap(xml: string): RemaxAgentCard[] {
  const found = new Map<string, RemaxAgentCard>();
  for (const match of xml.matchAll(/<loc\b[^>]*>([\s\S]*?)<\/loc>/gi)) {
    const href = decodeHtml(match[1]).trim();
    const profile = normalizeProfile(href);
    if (!profile) continue;
    const fullName = nameFromProfilePath(profile.path);
    if (!fullName || fullName.length > 120) continue;
    found.set(profile.profileUrl, { fullName, profileUrl: profile.profileUrl });
  }
  return [...found.values()];
}

/** Read sitemap index locations so the importer can follow nested public sitemaps. */
export function parseSitemapLocations(xml: string): string[] {
  return [...xml.matchAll(/<loc\b[^>]*>([\s\S]*?)<\/loc>/gi)]
    .map(match => decodeHtml(match[1]).trim())
    .filter(value => {
      try {
        const url = new URL(value);
        return url.protocol === "https:" && ["www.remax.mn", "remax.mn"].includes(url.hostname);
      } catch {
        return false;
      }
    });
}


/** Select a bounded, rotating batch so large public directories can sync across requests. */
export function selectRemaxBatch<T>(items: T[], offset: number, batchSize: number): { items: T[]; nextOffset: number; done: boolean } {
  if (items.length === 0) return { items: [], nextOffset: 0, done: true };
  const start = Math.min(Math.max(0, Math.floor(offset)), items.length);
  const size = Math.max(1, Math.floor(batchSize));
  const selected = items.slice(start, start + size);
  const nextOffset = start + selected.length >= items.length ? 0 : start + selected.length;
  return { items: selected, nextOffset, done: nextOffset === 0 };
}
