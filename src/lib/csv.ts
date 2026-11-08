export function parseAgentCsv(input: string): Record<string,string>[] {
 const text=input.replace(/^\uFEFF/,"");
 const rows:string[][]=[]; let row:string[]=[], field="", quoted=false;
 for(let i=0;i<text.length;i++){const ch=text[i];
  if(quoted){if(ch==='"'&&text[i+1]==='"'){field+='"';i++;}else if(ch==='"')quoted=false;else field+=ch;}
  else if(ch==='"'&&field.length===0)quoted=true;
  else if(ch===","){row.push(field);field="";}
  else if(ch==="\n"||ch==="\r"){if(ch==="\r"&&text[i+1]==="\n")i++;row.push(field);if(row.some(v=>v.trim()))rows.push(row);row=[];field="";}
  else field+=ch;
 }
 if(quoted)throw new Error("CSV-ийн хашилт хаагдаагүй байна.");
 row.push(field);if(row.some(v=>v.trim()))rows.push(row);
 if(!rows.length)throw new Error("CSV хоосон байна.");
 const headers=rows.shift()!.map(h=>h.trim().toLowerCase());
 if(!headers.length||headers.some(h=>!h)||new Set(headers).size!==headers.length)throw new Error("CSV баганын нэр хоосон эсвэл давхардсан байна.");
 return rows.map(cols=>Object.fromEntries(headers.map((h,i)=>[h,(cols[i]??"").trim()])));
}
export function stringifyCsv(rows:Record<string,unknown>[]):string {
 if(!rows.length)return "";
 const headers=Object.keys(rows[0]);
 const cell=(v:unknown)=>{const s=String(v??"");return /[",\r\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s;};
 return [headers.map(cell).join(","),...rows.map(r=>headers.map(h=>cell(r[h])).join(","))].join("\r\n");
}
