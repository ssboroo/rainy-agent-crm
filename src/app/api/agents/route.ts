import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { isAuthenticated } from "@/lib/auth";
import { ensureSchema,pool } from "@/lib/server-db";
export const runtime="nodejs";
export async function GET(request:Request){
 if(!await isAuthenticated())return NextResponse.json({error:"Нэвтэрнэ үү."},{status:401});
 try{await ensureSchema();const q=new URL(request.url).searchParams.get("q")||"";const r=await pool.query("select a.id,a.full_name,a.office_name,a.phone_e164,a.email,a.profile_url,a.source_url,a.telegram_chat_id,a.created_at,exists(select 1 from consents c where c.agent_id=a.id and c.channel='sms' and c.revoked_at is null) sms_consent,exists(select 1 from consents c where c.agent_id=a.id and c.channel='telegram' and c.revoked_at is null) telegram_consent from agents a where ($1='' or a.full_name ilike $2 or coalesce(a.office_name,'') ilike $2 or coalesce(a.phone_e164,'') ilike $2) order by a.created_at desc limit 500",[q,"%"+q+"%"]);return NextResponse.json({agents:r.rows});}catch(e){return NextResponse.json({error:e instanceof Error?e.message:"DB алдаа"},{status:500});}
}
export async function POST(req:Request){
 if(!await isAuthenticated())return NextResponse.json({error:"Нэвтэрнэ үү."},{status:401});
 const b=await req.json().catch(()=>({}));
 if(typeof b.fullName!=="string"||!b.fullName.trim()||typeof b.sourceUrl!=="string"||!/^https:\/\//i.test(b.sourceUrl))return NextResponse.json({error:"Нэр болон эх сурвалжийн https холбоос шаардлагатай."},{status:400});
 if(b.consents?.telegram===true)return NextResponse.json({error:"Telegram зөвшөөрлийг хэрэглэгч ботод өөрөө баталгаажуулах ёстой. Урилгын холбоос үүсгэнэ."},{status:400});
 if(b.consents?.sms===true&&(!b.evidence||typeof b.evidence!=="string"||!b.evidence.trim()))return NextResponse.json({error:"SMS зөвшөөрлийн нотолгоо шаардлагатай."},{status:400});
 const digits=typeof b.phone==="string"?b.phone.replace(/\D/g,""):"";const phone=digits?(digits.startsWith("976")?"+":" +976").replace(" ","")+(digits.startsWith("976")?digits.slice(3):digits):null;
 if(phone&&!/^\+976\d{8}$/.test(phone))return NextResponse.json({error:"Монгол утасны дугаар 8 оронтой байх ёстой."},{status:400});
 try{await ensureSchema();const linkToken=randomUUID(),optOutToken=randomUUID();const r=await pool.query("insert into agents(full_name,office_name,phone_e164,email,profile_url,source_url,telegram_link_token,opt_out_token) values($1,$2,$3,$4,$5,$6,$7,$8) returning id",[b.fullName.trim(),b.office||null,phone,b.email||null,b.profileUrl||null,b.sourceUrl,linkToken,optOutToken]);const id=r.rows[0].id;
 if(b.consents?.sms===true)await pool.query("insert into consents(agent_id,channel,purpose,source,evidence_ref) values($1,'sms','RAINY FB Pro мэдээлэл хүргэх зөвшөөрөл','Админ бүртгэл',$2)",[id,b.evidence.trim()]);
 const username=process.env.TELEGRAM_BOT_USERNAME?.replace(/^@/,"");const telegramStartUrl=username?"https://t.me/"+username+"?start="+linkToken:null;
 return NextResponse.json({id,telegramStartUrl,telegramLinkToken:linkToken},{status:201});
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Хадгалах үед алдаа гарлаа."},{status:500});}
}
