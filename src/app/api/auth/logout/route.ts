import { NextResponse } from "next/server";
import { sessionCookieName } from "@/lib/auth";
export async function POST() { const r=NextResponse.json({ok:true}); r.cookies.set(sessionCookieName,"",{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"strict",path:"/",maxAge:0}); return r; }
