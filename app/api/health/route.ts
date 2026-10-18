export const dynamic="force-dynamic";
export async function GET(){
  return Response.json({status:"ok",service:"pawcare-web",timestamp:new Date().toISOString()},{headers:{"cache-control":"no-store","x-content-type-options":"nosniff"}});
}
