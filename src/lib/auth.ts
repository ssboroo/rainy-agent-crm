import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const COOKIE = "rainy_agent_session";
function sign(value: string) { return createHmac("sha256", process.env.SESSION_SECRET || "").update(value).digest("hex"); }
export function verifyPassword(candidate: string) {
  const expected = process.env.ADMIN_PASSWORD || "";
  const a = Buffer.from(candidate), b = Buffer.from(expected);
  return Boolean(expected) && a.length === b.length && timingSafeEqual(a,b);
}
export function makeSession() {
  const expiry = String(Date.now() + 1000 * 60 * 60 * 24 * 7);
  return expiry + "." + sign(expiry);
}
export async function isAuthenticated() {
  const token = (await cookies()).get(COOKIE)?.value || "";
  const [expiry, signature] = token.split(".");
  if (!expiry || !signature || Number(expiry) < Date.now()) return false;
  const expected = sign(expiry);
  const a = Buffer.from(signature), b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a,b);
}
export const sessionCookieName = COOKIE;
