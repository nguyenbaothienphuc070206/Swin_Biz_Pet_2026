import type {NextConfig} from "next";
import os from "node:os";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

function getLocalIpAddresses(): string[] {
  const ips: string[] = ["localhost", "127.0.0.1"];
  try {
    const nets = os.networkInterfaces();
    for (const name of Object.keys(nets)) {
      for (const net of nets[name] || []) {
        if (net.family === "IPv4" && !net.internal) {
          ips.push(net.address);
        }
      }
    }
  } catch {}
  return Array.from(new Set(ips));
}

const localIps = getLocalIpAddresses();
const serverActionAllowedOrigins = [
  ...localIps.flatMap((ip) => [`${ip}:3000`, `${ip}:3001`, ip]),
  "192.168.*:3000",
  "10.*:3000",
  "172.*:3000",
  "*.local:3000",
];

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  allowedDevOrigins: [
    ...localIps,
    "192.168.*.*",
    "10.*.*.*",
    "172.*.*.*",
    "*.local",
  ],
  experimental: {
    serverActions: {
      allowedOrigins: serverActionAllowedOrigins,
    },
  },
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
