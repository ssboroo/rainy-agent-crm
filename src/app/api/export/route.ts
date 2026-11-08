import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { ensureSchema,pool } from "@/lib/server-db";
import { stringifyCsv } from "@/lib/csv";
export const runtime="nodejs";
export async function GET(){
 if(!await isAuthenticated())return NextResponse.json({error:"Нэвтэрнэ үү."},{status:401});
 try{await ensureSchema();const r=await pool.query("select a.full_name,a.office_name,a.phone_e164,a.email,a.profile_url,a.source_url,a.telegram_chat_id,a.created_at,exists(select 1 from consents c where c.agent_id=a.id and c.channel='sms' and c.revoked_at is null) sms_consent,exists(select 1 from consents c where c.agent_id=a.id and c.channel='telegram' and c.revoked_at is null) telegram_consent from agents a order by a.created_at desc");
 const csv=stringifyCsv(r.rows);return new NextResponse(csv,{headers:{"Content-Type":"text/csv; charset=utf-8","Content-Disposition":'attachment; filename="rainy-agents.csv"',"Cache-Control":"no-store"}});
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Экспортын алдаа"},{status:500});}
}
