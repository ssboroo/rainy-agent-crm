import { Users, MessageSquare, Send, ShieldCheck, MousePointerClick, Database } from "lucide-react";

const stats = [["Нийт агент", "—", Users], ["Зөвшөөрөлтэй контакт", "—", ShieldCheck], ["SMS илгээлт", "—", MessageSquare], ["Telegram бүртгэл", "—", Send]] as const;
const modules = [["Агентын сан", "Нийтийн эх сурвалжтай агентын профайл, холбоо барих мэдээлэл.", Database], ["Зөвшөөрлийн бүртгэл", "SMS болон Telegram сувгийн зөвшөөрлийг тусад нь хадгална.", ShieldCheck], ["Кампанит ажил", "Зөвшөөрөлтэй хүлээн авагчдад зориулсан хяналттай илгээлт.", Send], ["Үр дүнгийн тайлан", "Илгээлт, хүргэлт, товшилтын үзүүлэлт.", MousePointerClick]] as const;

export default function Home() {
  return <main style={{maxWidth:1180,margin:"0 auto",padding:"42px 24px"}}>
    <header style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:16,marginBottom:36}}>
      <div><div style={{fontSize:13,fontWeight:800,letterSpacing:2,color:"#2563eb"}}>RAINY WORKSPACE</div><h1 style={{fontSize:32,margin:"8px 0"}}>Agent CRM</h1><p style={{color:"#64748b",margin:0}}>RE/MAX агентын мэдээлэл ба зөвшөөрөлд суурилсан харилцаа</p></div>
      <span style={{background:"#e8f1ff",color:"#1d4ed8",padding:"9px 13px",borderRadius:999,fontSize:12,fontWeight:700}}>MVP · SETUP</span>
    </header>
    <section style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(210px,1fr))",gap:16}}>{stats.map(([label,value,Icon])=><article key={label} style={{background:"#fff",border:"1px solid #e5eaf1",borderRadius:18,padding:22}}><Icon size={22} color="#2563eb"/><div style={{fontSize:30,fontWeight:800,marginTop:14}}>{value}</div><div style={{color:"#64748b",fontSize:14,marginTop:4}}>{label}</div></article>)}</section>
    <section style={{marginTop:30,display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(240px,1fr))",gap:16}}>{modules.map(([title,description,Icon])=><article key={title} style={{background:"#fff",border:"1px solid #e5eaf1",borderRadius:18,padding:22}}><Icon size={22} color="#2563eb"/><h2 style={{fontSize:18,margin:"14px 0 8px"}}>{title}</h2><p style={{color:"#64748b",lineHeight:1.6,margin:0,fontSize:14}}>{description}</p></article>)}</section>
    <aside style={{marginTop:28,background:"#fff7e6",border:"1px solid #f4d9a2",padding:20,borderRadius:16,color:"#7c4a03",lineHeight:1.6}}><strong>Илгээлтийн хамгаалалт идэвхтэй.</strong> Нийтийн профайл эсвэл утасны дугаар нь сурталчилгааны зөвшөөрөл биш. SMS илгээхэд тухайн сувгийн ил тод зөвшөөрөл, Telegram-д хэрэглэгч ботод өөрөө эхэлж холбогдсон байх шаардлагатай.</aside>
  </main>;
}
