import createIntlMiddleware from "next-intl/middleware";
import {NextRequest, NextResponse} from "next/server";
import {createServerClient} from "@supabase/ssr";
import {routing} from "./i18n/routing";
import {canAccessRole, homeForRole, parseRole, roleFromClaims, type AppRole} from "./lib/auth/roles";
import {buildContentSecurityPolicy} from "./modules/security/csp";
import {isAllowedMutationOrigin} from "./modules/security/request-policy";

const intl = createIntlMiddleware(routing);
const protectedAreas: Array<{prefix: string; roles: AppRole[]}> = [
  {prefix: "/owner", roles: ["owner"]},
  {prefix: "/clinic", roles: ["clinic_staff", "clinic_admin"]},
  {prefix: "/admin", roles: ["platform_admin"]},
];

export async function proxy(request: NextRequest) {
  const nonce=Buffer.from(crypto.randomUUID()).toString("base64");
  const csp=buildContentSecurityPolicy(nonce,process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NODE_ENV==="development");
  const setSecurityHeaders=(response:NextResponse)=>{
    response.headers.set("Content-Security-Policy",csp);
    response.headers.set("X-Content-Type-Options","nosniff");
    response.headers.set("Referrer-Policy","strict-origin-when-cross-origin");
    response.headers.set("X-Frame-Options","DENY");
    response.headers.set("Permissions-Policy","camera=(self), microphone=(self), geolocation=(self), payment=(), browsing-topics=()");
    if(process.env.NODE_ENV==="production")response.headers.set("Strict-Transport-Security","max-age=63072000; includeSubDomains; preload");
    return response;
  };
  const incomingHeaders=new Headers(request.headers);
  incomingHeaders.set("x-nonce",nonce);
  const requestId=crypto.randomUUID();
  incomingHeaders.set("x-request-id",requestId);
  incomingHeaders.set("Content-Security-Policy",csp);
  if(request.nextUrl.pathname.startsWith("/api/")){
    const allowed=isAllowedMutationOrigin({method:request.method,pathname:request.nextUrl.pathname,origin:request.headers.get("origin"),requestOrigin:request.nextUrl.origin,fetchSite:request.headers.get("sec-fetch-site")});
    if(!allowed)return setSecurityHeaders(NextResponse.json({error:"cross_site_request_rejected"},{status:403}));
    const apiResponse=NextResponse.next({request:{headers:incomingHeaders}});apiResponse.headers.set("x-request-id",requestId);
    return setSecurityHeaders(apiResponse);
  }
  const forwardedRequest=new NextRequest(request,{headers:incomingHeaders});
  const response = NextResponse.next({request:{headers:incomingHeaders}});
  let role: AppRole | null = null;
  let authenticated = false;
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookies) => cookies.forEach(({name, value, options}) => {
          request.cookies.set(name, value);
          response.cookies.set(name, value, options);
        }),
      },
    });
    const {data} = await supabase.auth.getClaims();
    authenticated = Boolean(data?.claims?.sub);
    if (data?.claims?.sub) {
      const {data:profile}=await supabase.from("profiles").select("role").eq("id",String(data.claims.sub)).maybeSingle();
      role = parseRole(profile?.role) ?? roleFromClaims(data.claims);
    }
  }

  const locale = request.nextUrl.pathname.match(/^\/(vi|en)(?:\/|$)/)?.[1] ?? "vi";
  const path = request.nextUrl.pathname.replace(/^\/(vi|en)(?=\/|$)/, "") || "/";
  if (protectedAreas.some(({prefix}) => path === prefix || path.startsWith(`${prefix}/`))) {
    if (!authenticated) {
      const target = new URL(`/${locale}/sign-in`, request.url);
      target.searchParams.set("next", path);
      return setSecurityHeaders(NextResponse.redirect(target));
    }
    const required = protectedAreas.find(({prefix}) => path === prefix || path.startsWith(`${prefix}/`))!;
    if (role && !canAccessRole(role, required.roles)) return setSecurityHeaders(NextResponse.redirect(new URL(`/${locale}${homeForRole(role)}`, request.url)));
    if (!role) return setSecurityHeaders(NextResponse.redirect(new URL(`/${locale}/access-denied`, request.url)));
  }

  if (request.nextUrl.pathname === "/design-system") return setSecurityHeaders(response);

  const localized = intl(forwardedRequest);
  response.cookies.getAll().forEach(({name, value, ...options}) => localized.cookies.set(name, value, options));
  return setSecurityHeaders(localized);
}

export const config = {matcher: ["/", "/api/:path*", "/auth/:path*", "/design-system", "/(vi|en)/:path*"]};
