import {PDFDocument,rgb} from "pdf-lib";
import {readFile} from "node:fs/promises";
import {join} from "node:path";
import fontkit from "@pdf-lib/fontkit";
import {z} from "zod";
import {requireRole} from "@/lib/auth/server";
import {createServiceClient} from "@/lib/supabase/service";
import {calculateInvoiceTotal} from "@/modules/billing/invoice";

const Query=z.object({clinic_id:z.string().uuid(),locale:z.enum(["vi","en"]).default("vi")});
export async function GET(request:Request){
  const {supabase,userId}=await requireRole(["clinic_staff","clinic_admin"]);const query=Query.safeParse(Object.fromEntries(new URL(request.url).searchParams));if(!query.success)return Response.json({error:"invalid_request"},{status:400});
  const {data:membership}=await supabase.from("clinic_staff").select("clinic_id").eq("clinic_id",query.data.clinic_id).eq("user_id",userId).maybeSingle();if(!membership)return Response.json({error:"not_found"},{status:404});
  try{
    const db=createServiceClient();const {data:entries,error}=await db.from("commission_ledger").select("source_type,amount_vnd,status").eq("clinic_id",query.data.clinic_id).eq("is_sandbox",true).order("created_at",{ascending:true}).limit(100);
    if(error)throw error;if(!entries?.length)return Response.json({error:"no_statement_data"},{status:404});
    const messages=(await import(`@/messages/${query.data.locale}.json`)).default.billing as Record<string,string>;const pdf=await PDFDocument.create();pdf.registerFontkit(fontkit);const fontBytes=await readFile(join(process.cwd(),"public","fonts","be-vietnam-pro-vietnamese-400.woff"));const font=await pdf.embedFont(fontBytes,{subset:true});const page=pdf.addPage([595,842]);const dark=rgb(.12,.31,.28);
    const sourceLabel=(source:string)=>source==="booking"?messages.bookingCommission:source==="sos"?messages.sosCommission:messages.otherCommission;
    const lines=entries.map(row=>({description:`${sourceLabel(row.source_type)} · ${row.status==="sandbox"?messages.sandboxOnly:(messages[row.status]??row.status)}`,quantity:1,unitAmountMinor:Number(row.amount_vnd)}));const total=calculateInvoiceTotal(lines);const currency=new Intl.NumberFormat(query.data.locale=== "vi"?"vi-VN":"en-US",{style:"currency",currency:"VND",maximumFractionDigits:0});
    page.drawText(messages.clinicStatementTitle,{x:48,y:780,size:17,font,color:dark});page.drawText(messages.clinicStatementDisclaimer,{x:48,y:750,size:12,font,color:rgb(.7,.18,.12)});page.drawText(`${messages.clinicReference}: ${query.data.clinic_id}`,{x:48,y:720,size:10,font});
    let y=675;for(const [index,line] of lines.entries()){if(y<80){const next=pdf.addPage([595,842]);y=780;next.drawText("PawCare commission statement (continued)",{x:48,y,size:13,font,color:dark});}
      const target=pdf.getPages()[pdf.getPageCount()-1];target.drawText(`${line.description} x ${line.quantity}`,{x:48,y,size:10,font,maxWidth:320});target.drawText(currency.format(line.unitAmountMinor),{x:400,y,size:10,font});y-=24;if(index===lines.length-1)target.drawText(`${messages.totalLabel}: ${currency.format(total.totalMinor)}`,{x:380,y:y-16,size:13,font});
    }
    const bytes=await pdf.save();return new Response(Buffer.from(bytes),{headers:{"content-type":"application/pdf","content-disposition":'attachment; filename="pawcare-sandbox-commission-statement.pdf"',"cache-control":"no-store"}});
  }catch{return Response.json({error:"statement_unavailable"},{status:503});}
}
