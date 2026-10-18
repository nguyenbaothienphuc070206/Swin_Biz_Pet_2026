import type {Instrumentation} from "next";

export async function register(){
  if(process.env.NEXT_RUNTIME==="nodejs"){
    const {validateRuntimeEnv}=await import("./lib/env");
    validateRuntimeEnv();
    const {writeLog}=await import("./modules/observability/logger");
    writeLog("info","runtime.started",{runtime:"nodejs"});
  }
}

export const onRequestError:Instrumentation.onRequestError=async(error,request,context)=>{
  if(process.env.NEXT_RUNTIME!=="nodejs")return;
  const {writeLog}=await import("./modules/observability/logger");
  const rawId=request.headers["x-request-id"];
  const requestId=Array.isArray(rawId)?rawId[0]:rawId;
  writeLog("error","request.unhandled",{
    request_id:requestId&&/^[0-9a-f-]{36}$/i.test(requestId)?requestId:null,
    route:context.routePath,method:request.method,route_type:context.routeType,
    error_type:error instanceof Error?error.name:"unknown",
  });
};
