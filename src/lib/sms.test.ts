import {describe,it,expect} from "vitest";
import {smsCanIncludeUnsubscribe,smsWithinProviderLimit} from "./sms";
describe("WeSend safety checks",()=>{
 it("allows carrier prefixes that preserve links",()=>expect(smsCanIncludeUnsubscribe("+97699112233")).toBe(true));
 it("blocks ONDO, Lime and unknown prefixes because unsubscribe links may be stripped",()=>{expect(smsCanIncludeUnsubscribe("60112233")).toBe(false);expect(smsCanIncludeUnsubscribe("72112233")).toBe(false);expect(smsCanIncludeUnsubscribe("77112233")).toBe(false);});
 it("enforces WeSend multipart cap for Cyrillic",()=>{expect(smsWithinProviderLimit("Сайн байна уу")).toBe(true);expect(smsWithinProviderLimit("а".repeat(261))).toBe(false);});
});