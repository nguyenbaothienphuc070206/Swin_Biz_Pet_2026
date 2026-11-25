"use client";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { useLocale } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui";
import { CommunityMap } from "./community-map";
import { compressPetImage } from "@/modules/passport/image";
import { BackButton } from "@/components/ui/back-button";
import { ImageLightbox } from "@/components/ui/image-lightbox";
import {
  Radio,
  MapPin,
  HeartHandshake,
  Compass,
  Users,
  CheckCircle2,
  ShieldAlert,
  Sparkles,
  Navigation,
  Plus,
  Clock,
} from "lucide-react";

type PublicData = { lostFound: Array<{id:string;kind:string;species:string;color_tags:string[];latitude:number;longitude:number}>; strays:Array<{id:string;species:string;color_tags:string[];latitude:number;longitude:number}>; neighborhoods:Array<{species:string;report_count:number;latitude:number;longitude:number}>; rescues:Array<{id:string;title:string;summary:string;species:string;recipient_name:string;estimated_vnd:number|null;verified_total_vnd:number;is_demo:boolean}>;imageUrls?:Record<string,string> };
type Post = { id:string;title:string;body:string;imageUrl?:string|null;created_at:string;community_comments?:Array<{id:string;body:string;created_at:string}> };
type OwnReport={id:string;kind:string;species:string;color_tags:string[];description:string|null;status:string;created_at:string};
type OwnRescue={id:string;title:string;status:string;verification_status:string;canVerify:boolean};
const empty: PublicData = { lostFound:[],strays:[],neighborhoods:[],rescues:[] };
const field = "w-full rounded-xl border border-border bg-background px-4 py-3 text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function CommunityDashboard() {
  const t = useTranslations("community");
  const locale=useLocale();
  const isEn = locale === "en";
  const [radiusFilter, setRadiusFilter] = useState<number | "all">(5);
  const [communityRescueNotice, setCommunityRescueNotice] = useState<string | null>(null);
  const [communityCases, setCommunityCases] = useState([
    {
      id: "case-geo-01",
      title: isEn
        ? "Puppy trapped in drainage canal (Severe Hypothermia)"
        : "Chó con bị kẹt cống thoát nước ngập mưa (Hạ thân nhiệt)",
      species: "dog",
      lat: 10.7758,
      lng: 106.6987,
      address: isEn ? "Alley 150 Nguyen Thi Minh Khai, D1" : "Hẻm 150 Nguyễn Thị Minh Khai, P. Bến Thành, Q.1",
      distanceKm: 0.4,
      urgency: "critical",
      responders: 2,
      status: "responding",
      hasJoined: false,
      reporter: "Minh Anh (Good Samaritan)",
      timeAgo: isEn ? "12 mins ago" : "12 phút trước",
    },
    {
      id: "case-geo-02",
      title: isEn
        ? "Mother cat with injured leg after motorbike incident"
        : "Mèo mẹ gãy chân sau va chạm giao thông",
      species: "cat",
      lat: 10.7621,
      lng: 106.6834,
      address: isEn ? "An Duong Vuong junction, D5" : "Ngã tư An Dương Vương - Trần Phú, Quận 5",
      distanceKm: 2.1,
      urgency: "urgent",
      responders: 1,
      status: "open",
      hasJoined: false,
      reporter: isEn ? "Saigon Animal Rescue Group" : "Hội Cứu Trợ Thú Cưng Sài Gòn",
      timeAgo: isEn ? "25 mins ago" : "25 phút trước",
    },
    {
      id: "case-geo-03",
      title: isEn
        ? "Stray malnourished dog seeking shelter"
        : "Chó hoang kiệt sức cần thức ăn & cưu mang",
      species: "dog",
      lat: 10.7924,
      lng: 106.7082,
      address: isEn ? "Thi Nghe canal footbridge, Binh Thanh" : "Chân cầu Thị Nghè, Quận Bình Thạnh",
      distanceKm: 3.5,
      urgency: "moderate",
      responders: 0,
      status: "open",
      hasJoined: false,
      reporter: isEn ? "Local neighborhood resident" : "Người dân địa phương",
      timeAgo: isEn ? "1 hour ago" : "1 giờ trước",
    },
  ]);

  const handleJoinRescue = (caseId: string) => {
    setCommunityCases((prev) =>
      prev.map((c) => {
        if (c.id === caseId) {
          return {
            ...c,
            hasJoined: true,
            responders: c.responders + 1,
            status: "responding",
          };
        }
        return c;
      })
    );
    setCommunityRescueNotice(
      isEn
        ? "You have joined this rescue mission! Other volunteers and nearest partner clinics are notified."
        : "Bạn đã tham gia ứng cứu ca này! Các tình nguyện viên và phòng khám gần nhất đã được thông báo."
    );
    setTimeout(() => setCommunityRescueNotice(null), 5000);
  };

  const handleReportGpsRescue = () => {
    const newCase = {
      id: `case-geo-${Date.now().toString().slice(-4)}`,
      title: isEn
        ? "Emergency stray rescue reported at live GPS"
        : "Báo cáo ca cứu trợ khẩn cấp tại tọa độ GPS hiện tại",
      species: "dog",
      lat: 10.7769,
      lng: 106.7009,
      address: isEn ? "Current GPS (Ben Thanh Ward, D1)" : "Vị trí GPS hiện tại (P. Bến Thành, Q.1)",
      distanceKm: 0.1,
      urgency: "urgent",
      responders: 1,
      status: "open",
      hasJoined: true,
      reporter: isEn ? "You (Good Samaritan)" : "Bạn (Người cứu hộ)",
      timeAgo: isEn ? "Just now" : "Vừa xong",
    };
    setCommunityCases((prev) => [newCase, ...prev]);
    setCommunityRescueNotice(
      isEn
        ? "Rescue pin broadcast live to all nearby rescuers within 5 km!"
        : "Đã ghim ca cứu trợ lên bản đồ và phát thông báo tới các tình nguyện viên trong 5 km!"
    );
    setTimeout(() => setCommunityRescueNotice(null), 5000);
  };

  const [data,setData] = useState<PublicData>(empty); const [posts,setPosts] = useState<Post[]>([]); const [reports,setReports]=useState<OwnReport[]>([]); const [ownRescues,setOwnRescues]=useState<OwnRescue[]>([]); const [matches,setMatches]=useState<Array<{id:string;kind:string;species:string;color_tags:string[];latitude:number;longitude:number}>>([]); const [selectedReport,setSelectedReport]=useState(""); const [error,setError]=useState(""); const [notice,setNotice]=useState("");
  const [location,setLocation]=useState<{latitude:number;longitude:number}|null>(null); const [photo,setPhoto]=useState<File|null>(null); const [busy,setBusy]=useState(false);
  const [previewImage, setPreviewImage]=useState<{src:string;title:string}|null>(null);
  const load=useCallback(async()=>{setError("");try{const [a,b,c,d]=await Promise.all([fetch("/api/community/public",{cache:"no-store"}),fetch("/api/community/posts",{cache:"no-store"}),fetch("/api/community/lost-found",{cache:"no-store"}),fetch("/api/community/rescue/own",{cache:"no-store"})]);if(!a.ok||!b.ok||!c.ok||!d.ok)throw Error("fetch");const pub=await a.json() as PublicData;const feed=await b.json();const mine=await c.json();const rescue=await d.json();setData(pub);setPosts(feed.posts??[]);setReports(mine.reports??[]);setOwnRescues(rescue.cases??[])}catch{setError(t("error"))}},[t]);
  useEffect(()=>{void load()},[load]);
  async function uploadPhoto(){if(!photo)return null;const client=createClient();const {data:{user}}=await client.auth.getUser();if(!user)throw Error("auth");const ext=photo.type==="image/png"?"png":photo.type==="image/webp"?"webp":"jpg";const path=`${user.id}/${crypto.randomUUID()}.jpg`;const compressed=await compressPetImage(photo,1200,0.78);const {error}=await client.storage.from("community-private").upload(path,compressed,{contentType:"image/jpeg",upsert:false});if(error)throw error;return path}
  async function uploadFile(file:File,bucket:string){const client=createClient();const {data:{user}}=await client.auth.getUser();if(!user)throw Error("auth");const ext=file.type==="application/pdf"?"pdf":file.type==="image/png"?"png":file.type==="image/webp"?"webp":"jpg";const path=`${user.id}/${crypto.randomUUID()}.${ext}`;const {error}=await client.storage.from(bucket).upload(path,file,{contentType:file.type,upsert:false});if(error)throw error;const hash=await crypto.subtle.digest("SHA-256",await file.arrayBuffer());return {path,sha256:Array.from(new Uint8Array(hash),b=>b.toString(16).padStart(2,"0")).join("")}}
  async function submitPartner(event:FormEvent<HTMLFormElement>){event.preventDefault();const form=event.currentTarget;const values=new FormData(form);setBusy(true);try{const file=values.get("documents");let documentsPath:string|null=null;if(file instanceof File&&file.size>0)documentsPath=(await uploadFile(file,"rescue-private")).path;const response=await fetch("/api/community/rescue/partners",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({organizationName:String(values.get("organizationName")),documentsPath})});if(!response.ok)throw Error();form.reset();setNotice(t("saved"))}catch{setError(t("uploadError"))}finally{setBusy(false)}}
  async function verifyOwnRescue(caseId:string){setBusy(true);try{const response=await fetch(`/api/community/rescue/${caseId}/verify`,{method:"POST"});if(!response.ok)throw Error();setNotice(t("caseVerified"));await load()}catch{setError(t("verifyError"))}finally{setBusy(false)}}
  async function submitReceipt(event:FormEvent<HTMLFormElement>,caseId:string){event.preventDefault();const form=event.currentTarget;const values=new FormData(form);const file=values.get("receipt");if(!(file instanceof File)||file.size===0||values.get("direct")!=="on"){setError(t("confirmDirect"));return}setBusy(true);try{const {path,sha256}=await uploadFile(file,"community-private");const response=await fetch(`/api/community/rescue/${caseId}/receipts`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({amountVnd:Number(values.get("amount")),donorAlias:String(values.get("alias")||"")||null,receiptPath:path,receiptSha256:sha256})});if(!response.ok)throw Error();form.reset();setNotice(t("saved"));await load()}catch{setError(t("uploadError"))}finally{setBusy(false)}}
  async function submit(event:FormEvent<HTMLFormElement>,url:string,adapt:(form:FormData,imagePath:string|null)=>Record<string,unknown>){event.preventDefault();const formElement=event.currentTarget;setBusy(true);setNotice("");try{const form=new FormData(formElement);const path=await uploadPhoto();const response=await fetch(url,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(adapt(form,path))});if(!response.ok)throw Error(await response.text());const result=await response.json();if(url.endsWith("/lost-found")&&result.reportId){setSelectedReport(result.reportId);const matchResponse=await fetch(`/api/community/lost-found/${result.reportId}/matches`);const matchData=await matchResponse.json();setMatches(matchData.matches??[])}setNotice(t("saved"));formElement.reset();setPhoto(null);await load()}catch{setError(t(photo?"uploadError":"error"))}finally{setBusy(false)}}
  const pins=[...data.lostFound.map(x=>({id:x.id,latitude:x.latitude,longitude:x.longitude,label:`${x.kind} · ${x.species}`})),...data.strays.map(x=>({id:x.id,latitude:x.latitude,longitude:x.longitude,label:`${x.species} · stray`}))];
  const locate=()=>navigator.geolocation?.getCurrentPosition(pos=>setLocation({latitude:pos.coords.latitude,longitude:pos.coords.longitude}),()=>setError(t("noLocation")),{enableHighAccuracy:false,timeout:8000});
  const coordinate=(form:FormData,name:string)=>{const value=String(form.get(name)??"").trim();return value?Number(value):Number.NaN};
  const currency=new Intl.NumberFormat(locale==="vi"?"vi-VN":"en-US",{style:"currency",currency:"VND",maximumFractionDigits:0});
  const uploadField=<label className="grid gap-2 text-sm font-medium">{t("photo")}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>setPhoto(e.target.files?.[0]??null)} className={field}/></label>;
  return <div className="mx-auto grid max-w-6xl gap-6">
    <div><BackButton fallbackHref={`/${locale}/owner`} label={locale === "en" ? "Back to Main" : "Quay về Trang chính"} variant="pill" /></div>
    <header><p className="text-sm font-semibold uppercase tracking-wider text-primary">PawCare</p><h1 className="mt-2 font-display text-3xl font-bold md:text-4xl">{t("title")}</h1><p className="mt-3 max-w-3xl text-muted-foreground">{t("intro")}</p><p className="mt-3 rounded-xl bg-secondary p-3 text-sm">{t("locationNote")}</p></header>
    {error&&<p role="alert" className="rounded-xl border border-destructive/40 bg-destructive/10 p-3">{error}<button onClick={()=>void load()} className="ml-3 underline">{t("retry")}</button></p>}{notice&&<p role="status" className="rounded-xl bg-secondary p-3">{notice}</p>}
    <CommunityMap pins={pins}/>

    {/* Open Community Rescue Access: Free real-time geolocation access for animal rescuers and Good Samaritans */}
    <div className="rounded-3xl border-2 border-emerald-500/40 bg-gradient-to-br from-emerald-500/10 via-card to-primary/5 p-6 md:p-8 space-y-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-black text-emerald-800 dark:text-emerald-300 border border-emerald-500/30">
              <Radio className="size-3.5 animate-pulse text-emerald-600" />
              {isEn ? "OPEN RESCUE ACCESS" : "MẠNG LƯỚI CỨU HỘ MỞ"}
            </span>
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-bold text-primary">
              {isEn ? "Free Real-Time Geolocation" : "Miễn phí định vị thời gian thực"}
            </span>
            <span className="rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-400">
              {isEn ? "Good Samaritans & Rescuers" : "Dành cho Người cứu hộ & Tình nguyện viên"}
            </span>
          </div>

          <h2 className="font-display text-xl sm:text-2xl font-bold text-foreground">
            {isEn
              ? "Open Community Rescue Access (Live Geolocation)"
              : "Bản Đồ Điều Phối Cứu Hộ Cộng Đồng (Tọa Độ Thời Gian Thực)"}
          </h2>
          <p className="text-xs text-muted-foreground sm:text-sm max-w-2xl">
            {isEn
              ? "Free real-time geolocation access connecting local animal rescuers and Good Samaritans to drive organic community advocacy."
              : "Quyền truy cập định vị thời gian thực miễn phí kết nối người cứu hộ động vật và cộng đồng yêu thú cưng để thúc đẩy hỗ trợ cơ sở."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleReportGpsRescue}
            className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 text-xs font-bold transition shadow-sm cursor-pointer"
          >
            <Plus className="size-4" />
            <span>{isEn ? "Report Case at Live GPS" : "Báo ca cứu trợ bằng GPS"}</span>
          </button>
        </div>
      </div>

      {communityRescueNotice && (
        <div className="flex items-center justify-between rounded-2xl border border-emerald-500/50 bg-emerald-500/20 p-4 text-xs font-semibold text-emerald-950 dark:text-emerald-300 animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-4.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{communityRescueNotice}</span>
          </div>
          <button onClick={() => setCommunityRescueNotice(null)} className="p-1 hover:opacity-75">✕</button>
        </div>
      )}

      {/* Radius Filters */}
      <div className="flex items-center justify-between gap-3 text-xs flex-wrap">
        <div className="flex items-center gap-2">
          <span className="font-bold text-muted-foreground">{isEn ? "Rescue Radius:" : "Bán kính quét:"}</span>
          {[
            { label: isEn ? "Within 2 km" : "Trong 2 km", val: 2 },
            { label: isEn ? "Within 5 km (Standard)" : "Trong 5 km (Tiêu chuẩn)", val: 5 },
            { label: isEn ? "All City" : "Toàn thành phố", val: "all" },
          ].map((btn) => (
            <button
              key={btn.label}
              type="button"
              onClick={() => setRadiusFilter(btn.val as any)}
              className={`rounded-xl px-3 py-1.5 font-bold transition cursor-pointer border ${
                radiusFilter === btn.val
                  ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                  : "bg-secondary text-secondary-foreground border-border hover:bg-muted"
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 text-muted-foreground">
          <span className="size-2 rounded-full bg-emerald-500 animate-ping" />
          <span>{isEn ? "3 Active Geolocation Pings" : "3 điểm tọa độ đang phát tín hiệu"}</span>
        </div>
      </div>

      {/* Live Rescue Incident Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {communityCases
          .filter((c) => radiusFilter === "all" || c.distanceKm <= radiusFilter)
          .map((item) => (
            <div
              key={item.id}
              className={`flex flex-col justify-between rounded-2xl border p-4.5 space-y-3 bg-card transition hover:shadow-md ${
                item.urgency === "critical"
                  ? "border-rose-500/40 hover:border-rose-500"
                  : "border-border hover:border-primary/40"
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${
                      item.urgency === "critical"
                        ? "bg-rose-500/20 text-rose-700 dark:text-rose-300"
                        : "bg-amber-500/20 text-amber-700 dark:text-amber-300"
                    }`}
                  >
                    {item.urgency === "critical"
                      ? (isEn ? "Critical Alert" : "Khẩn cấp")
                      : (isEn ? "Urgent Case" : "Cần hỗ trợ")}
                  </span>

                  <span className="text-[11px] font-bold text-muted-foreground flex items-center gap-1">
                    <Clock className="size-3" />
                    <span>{item.timeAgo}</span>
                  </span>
                </div>

                <h3 className="font-display text-sm font-bold text-foreground line-clamp-2">
                  {item.title}
                </h3>

                <div className="space-y-1 text-xs text-muted-foreground">
                  <div className="flex items-start gap-1.5">
                    <MapPin className="size-3.5 text-primary shrink-0 mt-0.5" />
                    <span className="line-clamp-1">{item.address}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] pt-1">
                    <span className="font-mono text-primary font-semibold">
                      GPS: {item.lat.toFixed(4)}, {item.lng.toFixed(4)}
                    </span>
                    <span className="font-bold text-foreground">
                      {item.distanceKm} km {isEn ? "away" : "cách đây"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="border-t border-border/80 pt-3 flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <Users className="size-3.5 text-emerald-600" />
                    <span>
                      <strong>{item.responders}</strong> {isEn ? "Responders En Route" : "người đang đến"}
                    </span>
                  </span>
                  <span className="text-[11px] text-muted-foreground truncate max-w-[110px]">
                    {item.reporter}
                  </span>
                </div>

                {item.hasJoined ? (
                  <div className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 py-2 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                    <CheckCircle2 className="size-4" />
                    <span>{isEn ? "You are Responding" : "Bạn đang đến hỗ trợ"}</span>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleJoinRescue(item.id)}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground py-2 text-xs font-bold transition shadow-xs cursor-pointer active:scale-95"
                  >
                    <HeartHandshake className="size-3.5" />
                    <span>{isEn ? "I'm Nearby & Responding" : "Tôi ở gần & Đang đến hỗ trợ"}</span>
                  </button>
                )}
              </div>
            </div>
          ))}
      </div>
    </div>
    <section aria-label={t("lost")} className="grid gap-3 md:grid-cols-2">{data.lostFound.map(item=><article key={item.id} className="rounded-xl border border-border p-4"><p className="font-semibold">{item.kind==="lost"?t("lostType"):t("foundType")} · {item.species} · {item.color_tags.join(", ")}</p>{data.imageUrls?.[`lost_found:${item.id}`]&&<img loading="lazy" decoding="async" src={data.imageUrls[`lost_found:${item.id}`]} alt={item.species} className="mt-3 max-h-56 rounded-lg object-cover"/>}</article>)}</section>
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="p-5"><h2 className="text-xl font-bold">{t("lost")}</h2><p className="my-2 text-sm text-muted-foreground">{t("pending")}</p>
        <form className="mt-4 grid gap-3" onSubmit={e=>submit(e,"/api/community/lost-found",(f,imagePath)=>({kind:String(f.get("kind")),species:String(f.get("species")),breed:String(f.get("breed")??""),colors:String(f.get("colors")).split(",").map(s=>s.trim()).filter(Boolean),description:String(f.get("description")),latitude:location?.latitude??coordinate(f,"latitude"),longitude:location?.longitude??coordinate(f,"longitude"),petId:String(f.get("petId")||"")||null,imagePath}))}>
          <label className="grid gap-2 text-sm">{t("lostType")}<select name="kind" className={field}><option value="lost">{t("lostType")}</option><option value="found">{t("foundType")}</option></select></label>
          <label className="grid gap-2 text-sm">{t("species")}<select name="species" className={field}><option value="dog">{t("dog")}</option><option value="cat">{t("cat")}</option><option value="other">{t("other")}</option></select></label>
          <input name="breed" maxLength={100} placeholder={t("breed")} className={field}/><input name="colors" required placeholder={t("colors")} className={field}/><input name="petId" placeholder={t("petId")} className={field}/><textarea name="description" required maxLength={2000} placeholder={t("description")} className={field}/>
          <button type="button" onClick={locate} className="min-h-11 rounded-xl border border-border px-4 text-left">{location?`${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`:t("useLocation")}</button><div className="grid grid-cols-2 gap-2"><input name="latitude" type="number" step="any" placeholder={t("latitude")} className={field}/><input name="longitude" type="number" step="any" placeholder={t("longitude")} className={field}/></div>{uploadField}
          <button disabled={busy} className="min-h-12 rounded-xl bg-primary px-5 font-semibold text-primary-foreground disabled:opacity-50">{busy?t("submit"):t("submit")}</button>
        </form>
        <h3 className="mt-6 font-semibold">{t("match")}</h3><label className="mt-2 grid gap-2 text-sm">{t("lost")}<select value={selectedReport} onChange={async e=>{setSelectedReport(e.target.value);if(e.target.value){const r=await fetch(`/api/community/lost-found/${e.target.value}/matches`);const v=await r.json();setMatches(v.matches??[])}else setMatches([])}} className={field}><option value="">—</option>{reports.filter(r=>r.status==="open"||r.status==="matched").map(r=><option key={r.id} value={r.id}>{r.kind} · {r.species} · {r.status}</option>)}</select></label><ul className="mt-2 grid gap-2">{matches.map(m=><li data-testid={`community-match-${m.id}`} key={m.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-secondary p-3"><span>{m.kind} · {m.species} · {m.color_tags.join(", ")}</span><button aria-label={t("resolveMatch")} className="min-h-10 rounded-lg border px-3" onClick={async()=>{const r=await fetch(`/api/community/lost-found/${selectedReport}/resolve`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({matchedReportId:m.id})});if(r.ok){setNotice(t("resolved"));await load()}}}>{t("resolveMatch")}</button></li>)}</ul>
      </Card>
      <Card className="p-5"><h2 className="text-xl font-bold">{t("stray")}</h2><p className="my-2 text-sm text-muted-foreground">{t("pending")}</p>
        <form className="grid gap-3" onSubmit={e=>submit(e,"/api/community/strays",(f,imagePath)=>({species:String(f.get("species")),colors:String(f.get("colors")).split(",").map(s=>s.trim()).filter(Boolean),description:String(f.get("description"))||null,latitude:location?.latitude??coordinate(f,"latitude"),longitude:location?.longitude??coordinate(f,"longitude"),imagePath}))}>
          <label className="grid gap-2 text-sm">{t("species")}<select name="species" className={field}><option value="dog">{t("dog")}</option><option value="cat">{t("cat")}</option><option value="other">{t("other")}</option></select></label><input name="colors" placeholder={t("colors")} className={field}/><textarea name="description" maxLength={2000} placeholder={t("description")} className={field}/><button type="button" onClick={locate} className="min-h-11 rounded-xl border border-border px-4 text-left">{location?`${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`:t("useLocation")}</button><div className="grid grid-cols-2 gap-2"><input name="latitude" type="number" step="any" placeholder={t("latitude")} className={field}/><input name="longitude" type="number" step="any" placeholder={t("longitude")} className={field}/></div>{uploadField}<button disabled={busy} className="min-h-12 rounded-xl bg-primary px-5 font-semibold text-primary-foreground">{t("submit")}</button>
        </form><h3 className="mt-6 font-semibold">{t("neighborhoods")}</h3><ul className="mt-2 grid gap-2">{data.neighborhoods.map((n,i)=><li key={`${n.species}-${i}`} className="rounded-lg bg-secondary p-3">{n.species}: {n.report_count}</li>)}</ul><div className="mt-4 grid gap-3">{data.strays.map(s=><article key={s.id} className="rounded-xl border p-3"><p>{s.species} · {s.color_tags.join(", ")}</p>{data.imageUrls?.[`stray:${s.id}`]&&<img loading="lazy" decoding="async" src={data.imageUrls[`stray:${s.id}`]} alt={t("strayLabel")} className="mt-2 max-h-52 rounded-lg object-cover"/>}</article>)}</div>
      </Card>
    </div>
    <Card className="p-5"><h2 className="text-xl font-bold">{t("posts")}</h2><form className="my-4 grid gap-3" onSubmit={e=>submit(e,"/api/community/posts",(f,imagePath)=>({title:String(f.get("title")),body:String(f.get("body")),imagePath}))}><input name="title" required maxLength={160} placeholder={t("postTitle")} className={field}/><textarea name="body" required maxLength={4000} placeholder={t("postBody")} className={field}/>{uploadField}<button disabled={busy} className="min-h-12 rounded-xl bg-primary px-5 font-semibold text-primary-foreground">{t("createPost")}</button></form>
      <div className="grid gap-4">{posts.length?posts.map(p=><article key={p.id} className="rounded-xl border border-border p-4"><h3 className="font-semibold">{p.title}</h3>{p.imageUrl&&<img loading="lazy" decoding="async" src={p.imageUrl} alt={p.title} className="mt-3 max-h-80 w-full rounded-xl object-cover"/>}<p className="mt-2 whitespace-pre-wrap">{p.body}</p><p className="mt-3 text-sm text-muted-foreground">{t("comments")}: {p.community_comments?.length??0}</p><div className="mt-2 grid gap-1">{p.community_comments?.map(c=><p key={c.id} className="rounded-lg bg-secondary p-2 text-sm">{c.body}</p>)}</div><form className="mt-3 flex gap-2" onSubmit={async e=>{e.preventDefault();const form=e.currentTarget;const f=new FormData(form);try{const r=await fetch(`/api/community/posts/${p.id}/comments`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({body:f.get("body")})});if(!r.ok)throw Error();form.reset();setNotice(t("saved"))}catch{setError(t("error"))}}}><input name="body" required maxLength={3000} placeholder={t("comment")} className={field}/><button className="min-h-11 rounded-xl border px-4">{t("send")}</button></form></article>):<p className="text-muted-foreground">{t("noPosts")}</p>}</div>
    </Card>
    <section><h2 className="mb-3 text-2xl font-bold">{t("rescue")}</h2><p className="mb-4 rounded-xl bg-secondary p-3 text-sm">{t("directOnly")} {t("contactPartner")}</p><Card className="mb-4 p-5"><h3 className="text-lg font-semibold">{t("partnerApply")}</h3><form className="mt-3 grid gap-3" onSubmit={submitPartner}><input name="organizationName" required minLength={2} maxLength={160} placeholder={t("organizationName")} className={field}/><input name="documents" type="file" required accept="application/pdf,image/jpeg,image/png,image/webp" className={field}/><button className="min-h-11 rounded-xl border px-4">{t("applyPartner")}</button></form></Card><Card className="mb-4 p-5"><h3 className="text-lg font-semibold">{t("rescueCreate")}</h3><form className="mt-3 grid gap-3 md:grid-cols-2" onSubmit={e=>submit(e,"/api/community/rescue",f=>({title:String(f.get("title")),summary:String(f.get("summary")),species:String(f.get("species")),clinicId:String(f.get("clinicId")||"")||null,rescuePartnerId:String(f.get("partnerId")||"")||null}))}><input name="title" required minLength={5} maxLength={160} placeholder={t("caseTitle")} className={field}/><select name="species" className={field}><option value="dog">{t("dog")}</option><option value="cat">{t("cat")}</option><option value="other">{t("other")}</option></select><textarea name="summary" required minLength={20} maxLength={4000} placeholder={t("caseSummary")} className={`${field} md:col-span-2`}/><input name="clinicId" placeholder={t("clinicId")} className={field}/><input name="partnerId" placeholder={t("partnerId")} className={field}/><button className="min-h-12 rounded-xl bg-primary px-5 font-semibold text-primary-foreground md:col-span-2">{t("proposeCase")}</button></form></Card><div className="grid gap-4 md:grid-cols-2">{data.rescues.length?data.rescues.map(c=><Card key={c.id} className="p-5"><h3 className="font-bold">{c.title}</h3>{data.imageUrls?.[`rescue_case:${c.id}`]&&<img loading="lazy" decoding="async" src={data.imageUrls[`rescue_case:${c.id}`]} alt={c.title} className="mt-3 max-h-60 rounded-xl object-cover"/>}<p className="mt-2">{c.summary}</p><p className="mt-3 text-sm">{t("recipient")}: {c.recipient_name}</p><p className="text-sm">{t("estimate")}: {currency.format(Number(c.estimated_vnd??0))} ₫</p><p className="text-sm">{t("donated")}: {currency.format(Number(c.verified_total_vnd??0))} ₫</p><p className="mt-2 text-xs text-muted-foreground">{t("verifiedLedger")}</p><form className="mt-4 grid gap-2" onSubmit={e=>submitReceipt(e,c.id)}><input name="amount" type="number" min={1} max={10000000000} required placeholder={t("donorAmount")} className={field}/><input name="alias" maxLength={80} placeholder={t("donorAlias")} className={field}/><input name="receipt" type="file" required accept="image/jpeg,image/png,image/webp" className={field}/><label className="flex items-start gap-2 text-sm"><input name="direct" type="checkbox" required className="mt-1 size-4"/>{t("confirmDirect")}</label><button disabled={busy} className="min-h-11 rounded-xl border px-4">{t("submitReceipt")}</button></form>{c.is_demo&&<span className="mt-3 inline-flex rounded-full bg-warning/20 px-3 py-1 text-xs font-semibold">DEMO · FICTIONAL</span>}</Card>):<p className="text-muted-foreground">{t("noCases")}</p>}</div></section>
    {ownRescues.length>0&&<section className="grid gap-3"><h2 className="text-xl font-bold">{t("myRescueCases")}</h2>{ownRescues.map(item=><article key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-4"><div><h3 className="font-semibold">{item.title}</h3><p className="text-sm text-muted-foreground">{item.status} · {item.verification_status}</p></div>{item.canVerify&&item.verification_status==="pending"&&<button disabled={busy} onClick={()=>void verifyOwnRescue(item.id)} className="min-h-11 rounded-xl border px-4">{t("verifyRescueCase")}</button>}</article>)}</section>}
    <ImageLightbox isOpen={Boolean(previewImage)} onClose={()=>setPreviewImage(null)} src={previewImage?.src} title={previewImage?.title} locale={locale}/>
  </div>;
}
