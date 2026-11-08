export type Channel = "sms" | "telegram";
export interface ConsentRecord { channel: Channel; granted: boolean; purpose: string; capturedAt: string; source: string; revokedAt?: string | null; }
/** Only a current, explicit consent record authorizes a campaign send. */
export function canSendMarketing(records: ConsentRecord[], channel: Channel, now = new Date()): boolean {
  return records.some((record) => {
    if (record.channel !== channel || !record.granted || record.revokedAt) return false;
    if (!record.purpose.trim() || !record.source.trim()) return false;
    const captured = new Date(record.capturedAt);
    return !Number.isNaN(captured.getTime()) && captured <= now;
  });
}
