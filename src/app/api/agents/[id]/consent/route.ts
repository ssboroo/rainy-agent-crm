import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { ensureSchema,pool } from "@/lib/server-db";
export const runtime="nodejs";
export async function POST(req:Request,{params}:{params:Promise<{id:string}>}){
 if(!await isAuthenticated())return NextResponse.json({error:"Нэвтэрнэ үү."},{status:401});
 const {id}=await params;const b=await req.json().catch(()=>({}));
 if(!["sms","telegram"].includes(b.channel)||typeof b.reason!=="string"||!b.reason.trim())return NextResponse.json({error:"Суваг болон цуцлах шалтгаан шаардлагатай."},{status:400});
 try{await ensureSchema();const r=await pool.query("update consents set revoked_at=now() where agent_id=$1 and channel=$2 and revoked_at is null returning id",[id,b.channel]);await pool.query("insert into opt_outs(agent_id,channel,reason) values($1,$2,$3) on conflict(agent_id,channel) do update set reason=excluded.reason,created_at=now()",[id,b.channel,b.reason.trim()]);return NextResponse.json({revoked:r.rowCount||0});}catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Зөвшөөрөл цуцлахад алдаа гарлаа."},{status:500});}
}
