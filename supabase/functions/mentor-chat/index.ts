import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function checkRateLimit(
  supabaseAdmin: any,
  userId: string,
  ipAddress: string,
  endpoint: string
): Promise<{ allowed: boolean; message?: string }> {
  const windowStart = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  // Check user limit (50/day)
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
  if (userTotal >= 50) {
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(
      authHeader.replace("Bearer ", "")
    );
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub as string;

    // Rate limiting
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const ip = req.headers.get("x-forwarded-for") || "unknown";
    const rateCheck = await checkRateLimit(supabaseAdmin, userId, ip, "mentor-chat");
    if (!rateCheck.allowed) {
      return new Response(
        JSON.stringify({ error: rateCheck.message }),
        {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { message } = await req.json();
    if (!message || typeof message !== "string" || message.length > 2000) {
      return new Response(
        JSON.stringify({ error: "Invalid message" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Load user context
    const [profileRes, pillarsRes, phasesRes, cyclesRes] = await Promise.all([
      supabase.from("user_profile").select("*").eq("user_id", userId).maybeSingle(),
      supabase.from("pillars").select("*").eq("user_id", userId).eq("is_active", true).order("sort_order"),
      supabase.from("phases").select("*").eq("user_id", userId).eq("is_active", true).limit(1),
      supabase.from("cycles").select("*").eq("user_id", userId).order("cycle_number", { ascending: false }).limit(3),
    ]);

    const profile = profileRes.data;
    const pillars = pillarsRes.data || [];
    const phase = phasesRes.data?.[0];
    const recentCycles = cyclesRes.data || [];

    // Load conversation history (last 30 messages)
    const { data: history } = await supabase
      .from("mentor_conversations")
      .select("role, content")
      .eq("user_id", userId)
      .order("created_at", { ascending: true })
      .limit(30);

    const mentorDisplayName = profile?.mentor_name || "Mentor";

    // Build system prompt
    const systemPrompt = `You are ${mentorDisplayName}, the DailyProng career mentor — a sharp, thoughtful thinking partner focused on the user's long-term career growth. You ask before you act. Never change pillars or settings without explicit user confirmation.

USER PROFILE:
- Name: ${profile?.name || "Unknown"}
- Current Role: ${profile?.current_role || "Not set"}
- Target Role: ${profile?.target_role || "Not set"}
- Long-term Ambition: ${profile?.long_term_ambition || "Not set"}

ACTIVE PILLARS:
${pillars.map((p: any) => `- ${p.name} (Level ${p.current_level}/5, Weight: ${p.phase_weight || 0}%, Trend: ${p.trend || "stable"})`).join("\n") || "None"}

CURRENT PHASE:
${phase ? `${phase.name} (${phase.timeline_start} to ${phase.timeline_end}) — Goal: ${phase.goal}` : "No active phase"}

RECENT CYCLES:
${recentCycles.map((c: any) => `- Cycle ${c.cycle_number}: ${c.theme || "No theme"} (${c.status})`).join("\n") || "None"}

BEHAVIOR RULES:
- When the user wants to add, swap, edit, or delete pillars: ask clarifying questions first (2–4 turns), then summarize proposed changes clearly, then wait for confirmation.
- When the user wants to change a pillar level: ask 3–5 diagnostic questions about their experience with the topic to assess their actual level, then recommend a specific level with reasoning.
- When discussing career direction: be honest, curious, and specific. Reference their actual goals and pillars.
- Keep responses focused and actionable. No filler.
- You are not a general chatbot — stay within career growth, learning strategy, and the user's DailyProng setup.
- When you propose pillar changes, always end your confirmation message with a PROPOSED_CHANGES block so the app can parse and apply it.

PROPOSED_CHANGES FORMAT:
When proposing changes, end your message with:
PROPOSED_CHANGES
{"action": "<action>", "changes": {<changes>}}

Actions: add_pillar, delete_pillar, edit_pillar, swap_pillar, change_level, full_recalibration

For add_pillar changes: {"name": "", "description": "", "why_it_matters": "", "starting_level": 1, "phase_weight": 0, "topic_clusters": [{"cluster_name": "", "subtopics": []}]}
For delete_pillar changes: {"pillar_id": ""}
For edit_pillar changes: {"pillar_id": "", "fields_to_update": {}}
For swap_pillar changes: {"remove_pillar_id": "", "add": {same as add_pillar}}
For change_level changes: {"pillar_id": "", "new_level": 1}
For full_recalibration changes: {"redirect": true}

AVAILABLE PILLAR IDS:
${pillars.map((p: any) => `- ${p.name}: ${p.id}`).join("\n") || "None"}`;

    // Build messages for AI
    const aiMessages = [
      { role: "system", content: systemPrompt },
      ...(history || []).map((m: any) => ({
        role: m.role,
        content:
          m.role === "user"
            ? `[USER MESSAGE]: ${m.content} [/USER MESSAGE]`
            : m.content,
      })),
      {
        role: "user",
        content: `[USER MESSAGE]: ${message} [/USER MESSAGE]`,
      },
    ];

    // Call Lovable AI Gateway
    const aiResponse = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${lovableApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: aiMessages,
          max_tokens: 2048,
          temperature: 0.7,
        }),
      }
    );

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      throw new Error(`AI API error: ${aiResponse.status} ${errText}`);
    }

    const aiData = await aiResponse.json();
    const assistantMessage =
      aiData.choices?.[0]?.message?.content || "I'm sorry, I couldn't generate a response.";

    return new Response(
      JSON.stringify({ message: assistantMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});