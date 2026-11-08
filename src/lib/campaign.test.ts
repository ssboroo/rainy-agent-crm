import { describe, expect, it } from "vitest";
import { eligibleRecipients, type CampaignRecipient } from "./campaign";
const recipient: CampaignRecipient = { id:"agent-1",phone:"+97699112233",telegramChatId:"123456",consents:[{channel:"sms",granted:true,purpose:"Marketing",capturedAt:"2026-01-01T00:00:00.000Z",source:"opt-in"}] };
describe("eligibleRecipients", () => {
  it("returns only recipients with channel consent and a usable destination", () => { expect(eligibleRecipients([recipient],"sms",new Date("2026-02-01"))).toHaveLength(1); expect(eligibleRecipients([recipient],"telegram",new Date("2026-02-01"))).toHaveLength(0); });
  it("excludes opted-out recipients even when consent exists", () => { expect(eligibleRecipients([{...recipient,optedOut:true}],"sms")).toHaveLength(0); });
});
