import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function jsonRes(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonRes({ error: "Unauthorized" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (userError || !userData?.user) {
      return jsonRes({ error: "Unauthorized" }, 401);
    }

    const userId = userData.user.id;
    const userEmail = userData.user.email;

    const { mode } = await req.json();
    if (!["full", "rewind", "delete_account"].includes(mode)) {
      return jsonRes({ error: "Invalid mode. Expected 'full', 'rewind', or 'delete_account'." }, 400);
    }

    if (mode === "rewind") {
      const ownerEmail = Deno.env.get("OWNER_EMAIL");
      if (!ownerEmail || userEmail?.toLowerCase() !== ownerEmail.toLowerCase()) {
        return jsonRes({ error: "Forbidden" }, 403);
      }
    }

    const admin = createClient(supabaseUrl, supabaseServiceKey);

    const { data: cycleIds } = await admin
      .from("cycles")
      .select("id")
      .eq("user_id", userId);
    const ids = (cycleIds || []).map((c: { id: string }) => c.id);

    if (ids.length > 0) {
      await admin.from("progress_archive").delete().in("cycle_id", ids);
    }
    await admin.from("cycles").delete().eq("user_id", userId);
    await admin.from("mentor_conversations").delete().eq("user_id", userId);
    await admin.from("personal_notes").delete().eq("user_id", userId);
    await admin.from("api_rate_limits").delete().eq("user_id", userId);

    if (mode === "full" || mode === "delete_account") {
      await admin.from("phases").delete().eq("user_id", userId);
      await admin.from("pillars").delete().eq("user_id", userId);
      await admin.from("onboarding_conversations").delete().eq("user_id", userId);
      await admin.from("user_profile").delete().eq("user_id", userId);

      if (mode === "delete_account") {
        const { error: deleteAuthError } = await admin.auth.admin.deleteUser(userId);
        if (deleteAuthError) throw deleteAuthError;
      }
    } else {
      const { data: pillarIds } = await admin
        .from("pillars")
        .select("id")
        .eq("user_id", userId);
      const pIds = (pillarIds || []).map((p: { id: string }) => p.id);
      if (pIds.length > 0) {
        await admin
          .from("topic_map")
          .update({ status: "queued" })
          .in("pillar_id", pIds);
      }
    }

    return jsonRes({ success: true });
  } catch (err: any) {
    console.error(err); // full error + stack visible in Supabase function logs
    return jsonRes({ error: "Internal server error" }, 500);
  }
});
