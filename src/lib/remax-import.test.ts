import { describe, expect, it } from "vitest";
import { parseRemaxAgentCards, parseRemaxSitemap } from "./remax-import";

describe("parseRemaxAgentCards", () => {
  it("extracts legacy and localized profile anchors", () => {
    const html = '<a href="/agent/119030065">Tumenjargal Gantulga</a><a href="/office/119000001">REMAX Green</a><a href="https://www.remax.mn/agent/119078060">Telmen Delgerbayar</a><a href="/en/agents/mongolia/bayanzurkh/gantulga-damdin/119039007">Gantulga Damdin</a>';
    expect(parseRemaxAgentCards(html)).toEqual([
      { fullName: "Tumenjargal Gantulga", profileUrl: "https://www.remax.mn/agent/119030065" },
      { fullName: "Telmen Delgerbayar", profileUrl: "https://www.remax.mn/agent/119078060" },
      { fullName: "Gantulga Damdin", profileUrl: "https://www.remax.mn/en/agents/mongolia/bayanzurkh/gantulga-damdin/119039007" }
    ]);
  });
  it("recognizes Mongolian slugs, numeric profiles and legacy AgentProfile.aspx links", () => {
    const html = '<a href="/mn-mn/агентууд/монгол/хан-уул/gereltsetseg-bold/119082050">Gereltsetseg Bold</a><a href="/119002099-106">Agent Name</a><a href="/AgentProfile.aspx?AgentID=119004033&amp;lang=MNM">Realtor Batzaya</a>';
    expect(parseRemaxAgentCards(html)).toEqual([
      { fullName: "Gereltsetseg Bold", profileUrl: "https://www.remax.mn/mn-mn/агентууд/монгол/хан-уул/gereltsetseg-bold/119082050" },
      { fullName: "Agent Name", profileUrl: "https://www.remax.mn/119002099-106" },
      { fullName: "Realtor Batzaya", profileUrl: "https://www.remax.mn/agent/119004033" }
    ]);
  });
  it("extracts public agent profile URLs from sitemap entries with slug/id paths", () => {
    const xml = `<?xml version="1.0"?><urlset><url><loc>https://www.remax.mn/munkhtuul-amgalanbaatar/119091021</loc></url><url><loc>https://www.remax.mn/agent/119091038</loc></url><url><loc>https://www.remax.mn/office/119000001</loc></url></urlset>`;
    expect(parseRemaxSitemap(xml)).toEqual([
      { fullName: "Munkhtuul Amgalanbaatar", profileUrl: "https://www.remax.mn/munkhtuul-amgalanbaatar/119091021" },
      { fullName: "119091038", profileUrl: "https://www.remax.mn/agent/119091038" }
    ]);
  });
  it("uses accessible labels and slug fallback when anchor text is missing", () => {
    const html = '<a aria-label="Munkhgerel Khurelchuluun" href="/mn-mn/агентууд/монгол/хан-уул/munkhgerel-khurelchuluun/119012085"><img src="/agent.jpg"></a>';
    expect(parseRemaxAgentCards(html)[0]?.fullName).toBe("Munkhgerel Khurelchuluun");
  });
  it("ignores external, non-agent, malformed and short-id links", () => {
    expect(parseRemaxAgentCards('<a href="https://evil.example/agent/119123456">Agent</a><a href="/office/119123456">Office</a><a href="/agent/123"> </a><a href="javascript:alert(1)">Agent</a>')).toEqual([]);
  });
});
