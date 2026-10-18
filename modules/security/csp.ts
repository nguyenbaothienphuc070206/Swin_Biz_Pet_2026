export function buildContentSecurityPolicy(nonce: string, supabaseUrl?: string, development = false) {
  let supabaseOrigin = "";
  try { if (supabaseUrl) supabaseOrigin = new URL(supabaseUrl).origin; } catch { /* invalid public config adds no CSP source */ }
  const supabaseWs = supabaseOrigin.startsWith("https://") ? `wss://${supabaseOrigin.slice("https://".length)}` : "";
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${development ? " 'unsafe-eval'" : ""}`,
    `style-src 'self' 'nonce-${nonce}' 'unsafe-inline'`,
    `img-src 'self' data: blob: ${supabaseOrigin} https://*.googleapis.com https://*.gstatic.com https://*.maptiler.com https://demotiles.maplibre.org`,
    `connect-src 'self' ${supabaseOrigin} ${supabaseWs} https://maps.googleapis.com https://*.googleapis.com https://*.maptiler.com https://demotiles.maplibre.org`,
    "font-src 'self' data:",
    "media-src 'self' blob:",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(development ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");
}
