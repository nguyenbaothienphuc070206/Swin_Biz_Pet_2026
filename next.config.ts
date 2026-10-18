import type {NextConfig} from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");
const nextConfig: NextConfig = {
  images: process.env.NEXT_PUBLIC_SUPABASE_URL ? { remotePatterns: [{ protocol: new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).protocol.replace(":", "") as "https"|"http", hostname: new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname, port: new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).port, pathname: "/storage/v1/object/**" }] } : {},
  async headers(){
    return [{source:"/:path*",headers:[
      {key:"X-Content-Type-Options",value:"nosniff"},
      {key:"Referrer-Policy",value:"strict-origin-when-cross-origin"},
      {key:"X-Frame-Options",value:"DENY"},
      {key:"Permissions-Policy",value:"camera=(self), microphone=(self), geolocation=(self), payment=(), browsing-topics=()"},
      {key:"X-Permitted-Cross-Domain-Policies",value:"none"},
    ]},{source:"/sw.js",headers:[{key:"Content-Type",value:"application/javascript; charset=utf-8"},{key:"Cache-Control",value:"no-cache, no-store, must-revalidate"}]}];
  },
};
export default withNextIntl(nextConfig);
