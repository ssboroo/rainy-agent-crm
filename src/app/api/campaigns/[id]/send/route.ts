import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { ensureSchema,pool } from "@/lib/server-db";
import { smsCanIncludeUnsubscribe,smsWithinProviderLimit } from "@/lib/sms";
export const runtime="nodejs";
export async function POST(_req:Request,{params}:{params:Promise<{id:string}>}){
 if(!await isAuthenticated())return NextResponse.json({error:"Нэвтэрнэ үү."},{status:401});const {id}=await params;
 try{
  await ensureSchema();const c=await pool.query("select * from campaigns where id=$1",[id]);if(!c.rowCount)return NextResponse.json({error:"Кампанит ажил олдсонгүй."},{status:404});const campaign=c.rows[0];
  if(campaign.status!=="draft"&&campaign.status!=="failed")return NextResponse.json({error:"Зөвхөн ноорог эсвэл алдаатай кампанит ажлыг эхлүүлнэ."},{status:409});
  if(campaign.channel==="sms"&&!process.env.WESEND_API_KEY)return NextResponse.json({error:"WESEND_API_KEY тохируулаагүй."},{status:503});
  if(campaign.channel==="telegram"&&!process.env.TELEGRAM_BOT_TOKEN)return NextResponse.json({error:"TELEGRAM_BOT_TOKEN тохируулаагүй."},{status:503});
  const recipients=await pool.query("select a.id,a.phone_e164,a.telegram_chat_id,a.opt_out_token from agents a where exists(select 1 from consents c where c.agent_id=a.id and c.channel=$1 and c.revoked_at is null and c.purpose<>'' and c.evidence_ref<>'') and not exists(select 1 from opt_outs o where o.agent_id=a.id and o.channel=$1) and not exists(select 1 from message_logs m where m.campaign_id=$2 and m.agent_id=a.id and m.channel=$1 and m.status in ('sent','queued')) and ($1<>'sms' or a.phone_e164 is not null) and ($1<>'telegram' or a.telegram_chat_id is not null)",[campaign.channel,id]);
  if(!recipients.rowCount)return NextResponse.json({error:"Илгээх сувгийн идэвхтэй зөвшөөрөлтэй шинэ хүлээн авагч олдсонгүй."},{status:409});
  const locked=await pool.query("update campaigns set status='sending' where id=$1 and status in ('draft','failed') returning id",[id]);if(!locked.rowCount)return NextResponse.json({error:"Кампанит ажил аль хэдийн эхэлсэн эсвэл дууссан байна."},{status:409});let sent=0,failed=0,skipped=0;
  for(const r of recipients.rows){if(campaign.channel==="sms"&&!smsCanIncludeUnsubscribe(r.phone_e164)){skipped++;await pool.query("insert into message_logs(campaign_id,agent_id,channel,status,error_text) values($1,$2,'sms','skipped','Carrier does not preserve unsubscribe links')",[id,r.id]);continue;}try{
   let providerId="";
   if(campaign.channel==="sms"){
    const base=process.env.APP_BASE_URL||"https://rainy-agent-crm-production.up.railway.app";
    const text=campaign.message+"\nSMS авахгүй бол: "+base+"/api/optout/"+r.opt_out_token;
    if(!smsWithinProviderLimit(text))throw new Error("SMS 4 хэсгийн WeSend хязгаараас хэтэрсэн.");
    const resp=await fetch("https://api.wesend.mn/v1/sms",{method:"POST",headers:{Authorization:"Bearer "+process.env.WESEND_API_KEY,"Content-Type":"application/json","Idempotency-Key":"rainy-crm-"+id+"-"+r.id},body:JSON.stringify({to:String(r.phone_e164).replace(/^\+976/,""),text}),cache:"no-store"});
    const data=await resp.json();if(!resp.ok)throw new Error(data.message||data.error||"WeSend API алдаа");providerId=String(data.id||"");
   }else{
    const resp=await fetch("https://api.telegram.org/bot"+process.env.TELEGRAM_BOT_TOKEN+"/sendMessage",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({chat_id:r.telegram_chat_id,text:campaign.message,disable_web_page_preview:false}),cache:"no-store"});
    const data=await resp.json();if(!resp.ok||!data.ok)throw new Error(data.description||"Telegram API алдаа");providerId=String(data.result.message_id);
   }
   await pool.query("insert into message_logs(campaign_id,agent_id,channel,status,provider_message_id) values($1,$2,$3,'sent',$4)",[id,r.id,campaign.channel,providerId]);sent++;
  }catch(e){failed++;await pool.query("insert into message_logs(campaign_id,agent_id,channel,status,error_text) values($1,$2,$3,'failed',$4)",[id,r.id,campaign.channel,e instanceof Error?e.message:"Provider алдаа"]);}}
  const status=failed?"failed":"completed";await pool.query("update campaigns set status=$2 where id=$1",[id,status]);return NextResponse.json({sent,failed,skipped,total:recipients.rowCount,status});
 }catch(e){await pool.query("update campaigns set status='failed' where id=$1",[id]).catch(()=>{});return NextResponse.json({error:e instanceof Error?e.message:"Илгээлтийн алдаа"},{status:502});}
}
