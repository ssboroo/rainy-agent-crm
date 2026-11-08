import { NextResponse } from "next/server";
import { makeSession, sessionCookieName, verifyPassword } from "@/lib/auth";
export const runtime = "nodejs";
export async function POST(request: Request) {
  const body = await request.json().catch(()=>({}));
  if (typeof body.password !== "string" || !verifyPassword(body.password)) return NextResponse.json({error:"Нууц үг буруу байна."},{status:401});
  const response = NextResponse.json({ok:true});
  response.cookies.set(sessionCookieName,makeSession(),{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"strict",path:"/",maxAge:60*60*24*7});
  return response;
}
