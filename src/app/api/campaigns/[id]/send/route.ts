import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { isAuthenticated } from "@/lib/auth";
import { ensureSchema,pool } from "@/lib/server-db";
export const runtime="nodejs";
async function sendTelegram(chatId:string,text:string){const token=process.env.TELEGRAM_BOT_TOKEN!;const r=await fetch("https://api.telegram.org/bot"+token+"/sendMessage",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({chat_id:chatId,text,disable_web_page_preview:false}),cache:"no-store"});const d=await r.json();if(!r.ok||!d.ok)throw new Error(d.description||"Telegram send failed");return String(d.result.message_id);}
export async function POST(_req:Request,{params}:{params:Promise<{id:string}>}){
 if(!await isAuthenticated())return NextResponse.json({error:"Нэвтэрнэ үү."},{status:401});
 const {id}=await params;
 try{await ensureSchema();const c=await pool.query("select * from campaigns where id=$1",[id]);if(!c.rowCount)return NextResponse.json({error:"Кампанит ажил олдсонгүй."},{status:404});const campaign=c.rows[0];if(campaign.status!=="draft"&&campaign.status!=="failed")return NextResponse.json({error:"Зөвхөн ноорог эсвэл алдаатай кампанит ажлыг эхлүүлнэ."},{status:409});
 if(campaign.channel==="sms"&&!process.env.WESEND_API_KEY)return NextResponse.json({error:"WESEND_API_KEY тохируулаагүй."},{status:503});
 if(campaign.channel==="telegram"&&!process.env.TELEGRAM_BOT_TOKEN)return NextResponse.json({error:"TELEGRAM_BOT_TOKEN тохируулаагүй."},{status:503});
 const recipients=await pool.query("select a.id,a.phone_e164,a.telegram_chat_id from agents a where exists(select 1 from consents c where c.agent_id=a.id and c.channel=$1 and c.revoked_at is null and c.purpose<>'' and c.evidence_ref<>'') and not exists(select 1 from opt_outs o where o.agent_id=a.id and o.channel=$1) and ($1<>'sms' or a.phone_e164 is not null) and ($1<>'telegram' or a.telegram_chat_id is not null)",[campaign.channel]);
 if(!recipients.rowCount)return NextResponse.json({error:"Илгээх сувгийн нотолгоотой зөвшөөрөлтэй хүлээн авагч олдсонгүй."},{status:409});
 await pool.query("update campaigns set status='sending' where id=$1",[id]);let sent=0,failed=0;
 if(campaign.channel==="sms"){
  const key=process.env.WESEND_API_KEY!;const numbers=[...new Set(recipients.rows.map((r:any)=>String(r.phone_e164).replace(/^\+976/,"")))];
  for(let i=0;i<numbers.length;i+=1000){const batch=numbers.slice(i,i+1000);const response=await fetch("https://api.wesend.mn/v1/sms/bulk",{method:"POST",headers:{Authorization:"Bearer "+key,"Content-Type":"application/json","Idempotency-Key":randomUUID()},body:JSON.stringify({to:batch,text:campaign.message}),cache:"no-store"});const data=await response.json();if(!response.ok)throw new Error(data.message||data.error||"WeSend илгээлтийн алдаа");for(const r of recipients.rows.filter((x:any)=>batch.includes(String(x.phone_e164).replace(/^\+976/,"")))){await pool.query("insert into message_logs(campaign_id,agent_id,channel,status,provider_message_id) values($1,$2,'sms','queued',$3) on conflict do nothing",[id,r.id,data.id]);sent++;}}
 }else{
  for(const r of recipients.rows){try{const providerId=await sendTelegram(r.telegram_chat_id,campaign.message);await pool.query("insert into message_logs(campaign_id,agent_id,channel,status,provider_message_id) values($1,$2,'telegram','sent',$3) on conflict do nothing",[id,r.id,providerId]);sent++;}catch(e){failed++;await pool.query("insert into message_logs(campaign_id,agent_id,channel,status,error_text) values($1,$2,'telegram','failed',$3) on conflict do nothing",[id,r.id,e instanceof Error?e.message:"Telegram алдаа"]);}}
 }
 await pool.query("update campaigns set status=$2 where id=$1",[id,failed?"failed":"completed"]);return NextResponse.json({sent,failed,total:recipients.rowCount,status:failed?"failed":"completed"});
 }catch(e){await pool.query("update campaigns set status='failed' where id=$1",[id]).catch(()=>{});return NextResponse.json({error:e instanceof Error?e.message:"Илгээлтийн алдаа"},{status:502});}
}
