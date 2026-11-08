import { canSendMarketing, type ConsentRecord, type Channel } from "./consent";
export interface CampaignRecipient { id:string; phone?:string|null; telegramChatId?:string|null; consents:ConsentRecord[]; optedOut?:boolean; }
export function eligibleRecipients(recipients:CampaignRecipient[],channel:Channel,now=new Date()):CampaignRecipient[] {
  return recipients.filter((recipient) => {
    if (recipient.optedOut || !canSendMarketing(recipient.consents,channel,now)) return false;
    return channel === "sms" ? Boolean(recipient.phone) : Boolean(recipient.telegramChatId);
  });
}
