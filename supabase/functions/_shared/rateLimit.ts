/**
 * Shared rate limiting for Supabase Edge Functions.
 * Limits: 50 calls/user/day (500 for owner), 100 calls/IP/day per endpoint.
 * Auto-cleans rows older than 48h.
 */
export async function checkRateLimit(
  supabaseAdmin: any,
  userId: string,
  ipAddress: string,
  endpoint: string
): Promise<{ allowed: boolean; message?: string }> {
  const windowStart = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const ownerEmail = Deno.env.get("OWNER_EMAIL");
  let userLimit = 50;
  if (ownerEmail) {
    const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (authUser?.user?.email?.toLowerCase() === ownerEmail.toLowerCase()) {
      userLimit = 500;
    }
  }

  const { data: userCalls } = await supabaseAdmin
    .from("api_rate_limits")
    .select("call_count")
    .eq("user_id", userId)
    .eq("endpoint", endpoint)
    .gte("window_start", windowStart);

  const userTotal = (userCalls || []).reduce(
    (sum: number, r: any) => sum + r.call_count,
    0
  );
  if (userTotal >= userLimit) {
    return { allowed: false, message: "Daily limit reached." };
  }

  // Check IP limit (100/day)
  const { data: ipCalls } = await supabaseAdmin
    .from("api_rate_limits")
    .select("call_count")
    .eq("ip_address", ipAddress)
    .eq("endpoint", endpoint)
    .gte("window_start", windowStart);

  const ipTotal = (ipCalls || []).reduce(
    (sum: number, r: any) => sum + r.call_count,
    0
  );
  if (ipTotal >= 100) {
    return { allowed: false, message: "Too many requests." };
  }

  // Increment
  await supabaseAdmin.from("api_rate_limits").insert({
    user_id: userId,
    ip_address: ipAddress,
    endpoint,
    call_count: 1,
    window_start: new Date().toISOString(),
  });

  // Cleanup old rows (older than 48h)
  const cleanupTime = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
  await supabaseAdmin
    .from("api_rate_limits")
    .delete()
    .lt("window_start", cleanupTime);

  return { allowed: true };
}
