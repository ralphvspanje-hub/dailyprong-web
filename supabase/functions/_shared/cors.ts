const ALLOWED_ORIGINS = [
  "https://dailyprong-web.vercel.app",
  "http://localhost:5173",
];

const ALLOW_HEADERS =
  "authorization, x-client-info, apikey, content-type, x-background-token, " +
  "x-supabase-client-platform, x-supabase-client-platform-version, " +
  "x-supabase-client-runtime, x-supabase-client-runtime-version";

export function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin") ?? "";
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGINS.includes(origin)
      ? origin
      : ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Headers": ALLOW_HEADERS,
  };
}
