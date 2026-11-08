import { describe, expect, it } from "vitest";
import { parseRemaxAgentCards } from "./remax-import";

describe("parseRemaxAgentCards", () => {
  it("extracts public agent profile links and names only", () => {
    const html = '<div><a href="/agent/119030065">Tumenjargal Gantulga</a><a href="/office/119000001">REMAX Green</a><a href="https://www.remax.mn/agent/119078060">Telmen Delgerbayar</a></div>';
    expect(parseRemaxAgentCards(html)).toEqual([
      { fullName: "Tumenjargal Gantulga", profileUrl: "https://www.remax.mn/agent/119030065" },
      { fullName: "Telmen Delgerbayar", profileUrl: "https://www.remax.mn/agent/119078060" }
    ]);
  });
  it("ignores empty, non-agent and malformed anchors", () => {
    expect(parseRemaxAgentCards('<a href="/agent/123"> </a><a href="/office/123">Office</a><a href="javascript:alert(1)">Agent</a>')).toEqual([]);
  });
});
