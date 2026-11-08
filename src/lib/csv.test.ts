import { describe,it,expect } from "vitest";
import { parseAgentCsv, stringifyCsv } from "./csv";
describe("agent CSV",()=>{
 it("parses quoted commas and escaped quotes",()=>expect(parseAgentCsv('full_name,phone\n"Doe, Jane",99112233\n"Bold ""Boro""",88112233')).toEqual([{full_name:"Doe, Jane",phone:"99112233"},{full_name:'Bold "Boro"',phone:"88112233"}]));
 it("rejects CSV without a header",()=>expect(()=>parseAgentCsv("")).toThrow());
 it("round trips commas and newlines",()=>expect(parseAgentCsv(stringifyCsv([{name:"A, B",note:"line 1\nline 2"}]))).toEqual([{name:"A, B",note:"line 1\nline 2"}]));
});