import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { ensureSchema,pool } from "@/lib/server-db";
export const runtime="nodejs";
export async function GET(request:Request) {
 if(!await isAuthenticated()) return NextResponse.json({error:"Нэвтэрнэ үү."},{status:401});
 try { await ensureSchema(); const q=new URL(request.url).searchParams.get("q")||""; const result=await pool.query("select a.*, (select count(*)::int from consents c where c.agent_id=a.id and c.revoked_at is null) consent_count, exists(select 1 from consents c where c.agent_id=a.id and c.channel='sms' and c.revoked_at is null) sms_consent, exists(select 1 from consents c where c.agent_id=a.id and c.channel='telegram' and c.revoked_at is null) telegram_consent from agents a where ($1='' or a.full_name ilike $2 or coalesce(a.office_name,'') ilike $2 or coalesce(a.phone_e164,'') ilike $2) order by a.created_at desc limit 200",[q,"%"+q+"%"]); return NextResponse.json({agents:result.rows}); } catch(e) { return NextResponse.json({error:e instanceof Error?e.message:"DB алдаа"},{status:500}); }
}
export async function POST(request:Request) {
 if(!await isAuthenticated()) return NextResponse.json({error:"Нэвтэрнэ үү."},{status:401});
 const b=await request.json().catch(()=>({}));
 if(typeof b.fullName!=="string"||!b.fullName.trim()||typeof b.sourceUrl!=="string"||!/^https:\/\//.test(b.sourceUrl)) return NextResponse.json({error:"Нэр болон эх сурвалжийн https холбоос шаардлагатай."},{status:400});
 const phone=typeof b.phone==="string"?b.phone.replace(/[^0-9]/g,""):"";
 const normalized=phone?(phone.startsWith("976")&&phone.length===11?"+":"+976")+ (phone.startsWith("976")?phone.slice(3):phone):null;
 if(normalized&&!/^\+976\d{8}$/.test(normalized)) return NextResponse.json({error:"Монгол утасны дугаар 8 оронтой байх ёстой."},{status:400});
 try {
  await ensureSchema(); const result=await pool.query("insert into agents(full_name,office_name,phone_e164,email,profile_url,source_url,telegram_chat_id) values($1,$2,$3,$4,$5,$6,$7) returning id",[b.fullName.trim(),b.office||null,normalized,b.email||null,b.profileUrl||null,b.sourceUrl,b.telegramChatId||null]);
  const id=result.rows[0].id;
  for(const channel of ["sms","telegram"] as const) if(b.consents?.[channel]===true && typeof b.evidence==="string" && b.evidence.trim()) await pool.query("insert into consents(agent_id,channel,purpose,source,evidence_ref) values($1,$2,'RAINY FB Pro мэдээлэл хүргэх зөвшөөрөл',$3,$4)",[id,channel,"Админ бүртгэл",b.evidence.trim()]);
  return NextResponse.json({id},{status:201});
 } catch(e) { return NextResponse.json({error:e instanceof Error?e.message:"Хадгалах үед алдаа гарлаа."},{status:500}); }
}
