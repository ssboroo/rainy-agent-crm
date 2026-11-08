import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { ensureSchema,pool } from "@/lib/server-db";
export const runtime="nodejs";
export async function GET() { if(!await isAuthenticated()) return NextResponse.json({error:"Нэвтэрнэ үү."},{status:401}); try { await ensureSchema(); const r=await pool.query("select c.*, (select count(*)::int from message_logs m where m.campaign_id=c.id) recipient_count from campaigns c order by created_at desc limit 100"); return NextResponse.json({campaigns:r.rows}); } catch(e) { return NextResponse.json({error:e instanceof Error?e.message:"DB алдаа"},{status:500}); } }
export async function POST(request:Request) {
 if(!await isAuthenticated()) return NextResponse.json({error:"Нэвтэрнэ үү."},{status:401});
 const b=await request.json().catch(()=>({}));
 if(typeof b.name!=="string"||!b.name.trim()||typeof b.message!=="string"||!b.message.trim()||!["sms","telegram"].includes(b.channel)) return NextResponse.json({error:"Кампанит ажлын нэр, суваг, текст шаардлагатай."},{status:400});
 try { await ensureSchema(); const r=await pool.query("insert into campaigns(name,channel,message) values($1,$2,$3) returning *",[b.name.trim(),b.channel,b.message.trim()]); return NextResponse.json({campaign:r.rows[0]},{status:201}); } catch(e) { return NextResponse.json({error:e instanceof Error?e.message:"DB алдаа"},{status:500}); }
}
