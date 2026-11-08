import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { ensureSchema,pool } from "@/lib/server-db";
import { parseAgentCsv } from "@/lib/csv";
export const runtime="nodejs";
export async function POST(req:Request){
 if(!await isAuthenticated())return NextResponse.json({error:"Нэвтэрнэ үү."},{status:401});
 const body=await req.json().catch(()=>({}));if(typeof body.csv!=="string"||body.csv.length>2_000_000)return NextResponse.json({error:"CSV файл 2MB-аас бага текст байх ёстой."},{status:400});
 let rows:Record<string,string>[];try{rows=parseAgentCsv(body.csv);}catch(e){return NextResponse.json({error:e instanceof Error?e.message:"CSV алдаа"},{status:400});}
 const allowed=["full_name","office_name","phone","email","profile_url","source_url"];
 if(rows.length>5000)return NextResponse.json({error:"Нэг удаад 5,000 мөр хүртэл импортолно."},{status:400});
 let imported=0,skipped=0;const errors:string[]=[];
 try{await ensureSchema();for(let i=0;i<rows.length;i++){const r=rows[i];if(!r.full_name||!r.source_url||!/^https:\/\//i.test(r.source_url)){skipped++;if(errors.length<10)errors.push((i+2)+"-р мөр: full_name болон https source_url шаардлагатай.");continue;}
 const digits=(r.phone||"").replace(/\D/g,"");const phone=digits?(digits.startsWith("976")?"+":" +976").replace(" ","")+ (digits.startsWith("976")?digits.slice(3):digits):null;
 if(phone&&!/^\+976\d{8}$/.test(phone)){skipped++;if(errors.length<10)errors.push((i+2)+"-р мөр: утасны дугаар буруу.");continue;}
 try{await pool.query("insert into agents(full_name,office_name,phone_e164,email,profile_url,source_url) values($1,$2,$3,$4,$5,$6) on conflict(profile_url) do update set full_name=excluded.full_name,office_name=excluded.office_name,phone_e164=excluded.phone_e164,email=excluded.email,source_url=excluded.source_url,source_checked_at=now()",[r.full_name,r.office_name||null,phone,r.email||null,r.profile_url||null,r.source_url]);imported++;}catch(e){skipped++;if(errors.length<10)errors.push((i+2)+"-р мөр: "+(e instanceof Error?e.message:"хадгалах алдаа"));}}
 return NextResponse.json({imported,skipped,errors});
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Импортын алдаа"},{status:500});}
}
