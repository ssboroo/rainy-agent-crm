import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { isAuthenticated } from "@/lib/auth";
import { ensureSchema,pool } from "@/lib/server-db";
export const runtime="nodejs";
export async function POST(_req:Request,{params}:{params:Promise<{id:string}>}){
 if(!await isAuthenticated())return NextResponse.json({error:"Нэвтэрнэ үү."},{status:401});
 const {id}=await params;const token=process.env.TELEGRAM_BOT_TOKEN;
 if(!token)return NextResponse.json({error:"TELEGRAM_BOT_TOKEN тохируулаагүй."},{status:503});
 try{await ensureSchema();const agent=await pool.query("select id from agents where id=$1",[id]);if(!agent.rowCount)return NextResponse.json({error:"Агент олдсонгүй."},{status:404});
 const me=await fetch("https://api.telegram.org/bot"+token+"/getMe",{cache:"no-store"}).then(r=>r.json());if(!me.ok||!me.result?.username)return NextResponse.json({error:me.description||"Bot username авахад алдаа гарлаа."},{status:502});
 const linkToken=randomUUID();await pool.query("update agents set telegram_link_token=$1 where id=$2",[linkToken,id]);
 return NextResponse.json({url:"https://t.me/"+me.result.username+"?start="+linkToken,bot:me.result.username});
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Урилга үүсгэхэд алдаа гарлаа."},{status:500});}
}
