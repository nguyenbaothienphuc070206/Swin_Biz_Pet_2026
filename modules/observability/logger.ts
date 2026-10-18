import {createHash, randomUUID} from "node:crypto";

export type LogLevel="info"|"warn"|"error";
export type LogFields=Record<string,string|number|boolean|null|undefined>;

export function requestIdFrom(request:Request){
  const supplied=request.headers.get("x-request-id");
  return supplied&&/^[0-9a-f-]{36}$/i.test(supplied)?supplied:randomUUID();
}

export function writeLog(level:LogLevel,event:string,fields:LogFields={}){
  const record={timestamp:new Date().toISOString(),level,service:"pawcare-web",event,...fields};
  const line=JSON.stringify(record);
  if(level==="error")console.error(line);else if(level==="warn")console.warn(line);else console.info(line);
}

export function sosTraceId(requestId:string){
  return createHash("sha256").update(`pawcare-sos:${requestId}`).digest("hex").slice(0,24);
}

export function traceSos(request:Request,event:"request.created"|"dispatch.pinged"|"dispatch.accepted"|"dispatch.failed"|"session.started"|"session.failed",fields:LogFields={}){
  const requestId=requestIdFrom(request);
  const level=event.endsWith("failed")?"error":"info";
  writeLog(level,`sos.${event}`,{request_id:requestId,trace_id:fields.trace_id??null,...fields});
  return requestId;
}

export function responseWithRequestId(response:Response,requestId:string,traceId?:string){
  const headers=new Headers(response.headers);headers.set("x-request-id",requestId);if(traceId)headers.set("x-trace-id",traceId);
  return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
}
