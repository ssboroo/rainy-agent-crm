import { describe, expect, it } from "vitest";
import { canSendMarketing, type ConsentRecord } from "./consent";
const valid: ConsentRecord = { channel:"sms",granted:true,purpose:"RAINY FB Pro product updates",capturedAt:"2026-01-01T00:00:00.000Z",source:"web opt-in form" };
describe("canSendMarketing", () => {
  it("allows a channel with explicit, current consent", () => { expect(canSendMarketing([valid],"sms",new Date("2026-02-01"))).toBe(true); });
  it("does not treat public contact data as marketing consent", () => { expect(canSendMarketing([],"sms")).toBe(false); });
  it("does not allow consent for a different channel", () => { expect(canSendMarketing([valid],"telegram")).toBe(false); });
  it("blocks revoked consent", () => { expect(canSendMarketing([{...valid,revokedAt:"2026-02-01T00:00:00.000Z"}],"sms")).toBe(false); });
});
