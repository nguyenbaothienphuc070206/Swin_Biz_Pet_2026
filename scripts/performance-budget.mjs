import {spawn} from "node:child_process";
import {fileURLToPath} from "node:url";
import {chromium} from "@playwright/test";

const baseURL=process.env.PERF_BASE_URL??"http://127.0.0.1:4178";
const routes=[{path:"/vi",jsBudgetKb:240,interaction:"details summary"},{path:"/en",jsBudgetKb:240,interaction:"details summary"},{path:"/vi/clinics",jsBudgetKb:280},{path:"/en/clinics",jsBudgetKb:280},{path:"/vi/demo",jsBudgetKb:380,interaction:"button"}];
const server=spawn(process.execPath,[fileURLToPath(new URL("../node_modules/next/dist/bin/next",import.meta.url)),"start","-p","4178"],{stdio:"ignore",env:process.env});
let browser;
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function waitReady(){for(let i=0;i<60;i++){if(server.exitCode!==null)throw new Error(`Production server exited with ${server.exitCode}`);try{const response=await fetch(baseURL);if(response.ok)return;}catch{}await sleep(1000);}throw new Error("Production server did not become ready");}
try{
  await waitReady();
  browser=await chromium.launch({headless:true});
  const results=[];
  for(const route of routes){
    const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,hasTouch:true,isMobile:true});
    const page=await context.newPage();
    const cdp=await context.newCDPSession(page);
    await cdp.send("Network.enable");
    await cdp.send("Network.emulateNetworkConditions",{offline:false,latency:150,downloadThroughput:1600*1024/8,uploadThroughput:750*1024/8,connectionType:"cellular4g"});
    await cdp.send("Emulation.setCPUThrottlingRate",{rate:4});
    await page.addInitScript(()=>{window.__pawcarePerf={lcp:0,cls:0,events:[]};try{new PerformanceObserver(list=>{for(const entry of list.getEntries())window.__pawcarePerf.lcp=entry.startTime;}).observe({type:"largest-contentful-paint",buffered:true});new PerformanceObserver(list=>{for(const entry of list.getEntries())if(!entry.hadRecentInput)window.__pawcarePerf.cls+=entry.value;}).observe({type:"layout-shift",buffered:true});new PerformanceObserver(list=>{for(const entry of list.getEntries())if(entry.interactionId)window.__pawcarePerf.events.push(entry.duration);}).observe({type:"event",buffered:true,durationThreshold:16});}catch{}});
    const response=await page.goto(new URL(route.path,baseURL).toString(),{waitUntil:"networkidle",timeout:90000});
    if(!response?.ok())throw new Error(`${route.path} returned ${response?.status()}`);
    await page.waitForTimeout(300);
    const initial=await page.evaluate(()=>({lcp:window.__pawcarePerf.lcp,cls:window.__pawcarePerf.cls,jsBytes:performance.getEntriesByType("resource").filter(entry=>entry.name.includes("/_next/")&&entry.name.endsWith(".js")).reduce((sum,entry)=>sum+(entry.transferSize||entry.encodedBodySize||0),0)}));
    if(route.interaction){const target=page.locator(route.interaction).first();if(await target.count())await target.click({timeout:10000}).catch(()=>{});await page.waitForTimeout(100);let hasInteraction=await page.evaluate(()=>window.__pawcarePerf.events.length>0);if(!hasInteraction){await page.mouse.click(10,10);await page.waitForTimeout(100);}}
    const interaction=await page.evaluate(()=>({cls:window.__pawcarePerf.cls,inpEventsOver16ms:window.__pawcarePerf.events.length,inpMs:window.__pawcarePerf.events.length?Math.max(...window.__pawcarePerf.events):0}));
    const result={route:route.path,lcpMs:Math.round(initial.lcp),inpMs:Math.round(interaction.inpMs),inpEventsOver16ms:interaction.inpEventsOver16ms,cls:Number(interaction.cls.toFixed(3)),jsKb:Math.ceil(initial.jsBytes/1024),jsBudgetKb:route.jsBudgetKb};
    results.push(result);console.log(JSON.stringify(result));await context.close();
  }
  const offlineContext=await browser.newContext({viewport:{width:390,height:844}});
  const offlinePage=await offlineContext.newPage();
  offlinePage.on("console",message=>{if(message.type()==="error")console.error("pwa-console:",message.text());});
  offlinePage.on("response",response=>{if(response.status()>=400)console.error("pwa-http:",response.status(),response.url());});
  await offlinePage.goto(new URL("/vi",baseURL).toString(),{waitUntil:"networkidle"});
  await offlinePage.waitForTimeout(1000);
  const registrations=await offlinePage.evaluate(async()=>{const items=await navigator.serviceWorker.getRegistrations();if(items.length)return {count:items.length};const response=await fetch("/sw.js");return {count:0,swStatus:response.status,swType:response.headers.get("content-type"),swBody:(await response.text()).slice(0,160),secureContext:isSecureContext};});
  if(!registrations.count)throw new Error(`Service worker did not register: ${JSON.stringify(registrations)}`);
  await offlinePage.reload({waitUntil:"networkidle"});
  await offlinePage.waitForFunction(()=>Boolean(navigator.serviceWorker.controller),{timeout:10000});
  const manifest=await offlinePage.evaluate(async()=>{const response=await fetch("/manifest.webmanifest");const body=await response.json();return response.ok&&body.display==="standalone"&&body.icons.some(icon=>icon.sizes==="192x192")&&body.icons.some(icon=>icon.sizes==="512x512");});
  if(!manifest)throw new Error("PWA manifest is not installable");
  const offlineCdp=await offlineContext.newCDPSession(offlinePage);await offlineCdp.send("Network.enable");await offlineCdp.send("Network.emulateNetworkConditions",{offline:true,latency:0,downloadThroughput:0,uploadThroughput:0});
  const cachedShell=await offlinePage.evaluate(async()=>{const response=await caches.match("/offline.html");return response?await response.text():null;}); if(!cachedShell?.includes("PawCare offline"))throw new Error("Offline shell was not precached");
  console.log(JSON.stringify({pwaManifest:"pass",offlineShellCache:"pass"}));await offlineContext.close();
  const violations=results.flatMap(result=>[...(result.lcpMs>2500?[`${result.route}: LCP ${result.lcpMs}ms > 2500ms`]:[]),...(result.inpMs>200?[`${result.route}: INP proxy ${result.inpMs}ms > 200ms`]:[]),...(result.cls>0.1?[`${result.route}: CLS ${result.cls} > 0.1`]:[]),...(result.jsKb>result.jsBudgetKb?[`${result.route}: JavaScript ${result.jsKb}KB > ${result.jsBudgetKb}KB`]:[])]);
  console.log(JSON.stringify({summary:"PawCare mobile/slow-4G performance budget",routes:results,violations}));
  if(violations.length)process.exitCode=1;
}catch(error){console.error(error);process.exitCode=1;}finally{await browser?.close();server.kill("SIGTERM");}
