import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
export const runtime="nodejs";
export async function POST(){
 if(!await isAuthenticated())return NextResponse.json({error:"Нэвтэрнэ үү."},{status:401});
 const token=process.env.TELEGRAM_BOT_TOKEN,secret=process.env.TELEGRAM_WEBHOOK_SECRET,base=(process.env.APP_BASE_URL||"").replace(/\/$/,"");
 if(!token||!secret||!base)return NextResponse.json({error:"TELEGRAM_BOT_TOKEN, TELEGRAM_WEBHOOK_SECRET, APP_BASE_URL тохируулна уу."},{status:503});
 const response=await fetch("https://api.telegram.org/bot"+token+"/setWebhook",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({url:base+"/api/telegram/webhook",secret_token:secret,allowed_updates:["message","callback_query"],drop_pending_updates:false}),cache:"no-store"});
 const data=await response.json();if(!response.ok||!data.ok)return NextResponse.json({error:data.description||"Webhook тохируулахад алдаа гарлаа."},{status:502});
 const me=await fetch("https://api.telegram.org/bot"+token+"/getMe",{cache:"no-store"}).then(r=>r.json());
 return NextResponse.json({ok:true,webhook:base+"/api/telegram/webhook",bot:me.result?.username||null});
}
