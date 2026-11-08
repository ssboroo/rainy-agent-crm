export function smsCanIncludeUnsubscribe(phone:string):boolean{
 const n=phone.replace(/^\+976/,"").replace(/\D/g,"");
 if(!/^\d{8}$/.test(n))return false;
 const p2=n.slice(0,2),p3=n.slice(0,3),p4=Number(n.slice(0,4));
 if(["85","94","95","99"].includes(p2)||p3==="505"||p4>=5050&&p4<=5099||p4>=5550&&p4<=5599)return true;
 if(["80","86","88","89"].includes(p2)||p4>=5000&&p4<=5049||p4>=5500&&p4<=5549)return true;
 if(["69","90","91","92","96","78","83","87","93","97","98"].includes(p2))return true;
 return false;
}
export function smsWithinProviderLimit(text:string):boolean{
 const unicode=/[\u0080-\uFFFF]/.test(text)||/[\[\\\]^{}|~`]/.test(text);
 const max=unicode?260:620;
 return Array.from(text).length<=max;
}
