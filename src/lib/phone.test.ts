import { describe, expect, it } from "vitest";
import { normalizeMongolianPhone } from "./phone";

describe("normalizeMongolianPhone", () => {
  it("normalizes a local eight-digit number", () => { expect(normalizeMongolianPhone("9911 2233")).toBe("+97699112233"); });
  it("normalizes a country-code number", () => { expect(normalizeMongolianPhone("+976-9911-2233")).toBe("+97699112233"); });
  it("rejects incomplete or malformed numbers", () => { expect(normalizeMongolianPhone("991122")).toBeNull(); });
});
