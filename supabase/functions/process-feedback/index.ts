import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { unit_id, pillar_id, difficulty, value } = await req.json();

    // --- Get the pillar ---
    const { data: pillar, error: pillarError } = await supabase
      .from("pillars")
      .select("*")
      .eq("id", pillar_id)
      .single();

    if (pillarError || !pillar) {
      console.error(pillarError); // full Postgres error visible in Supabase function logs
      throw new Error("Pillar not found");
    }

    // --- Two-consecutive-signals rule ---
    // "about_right" → reset streak
    // "too_hard" + value "low" → immediate level decrease (no waiting for two signals)
    // Same signal twice in a row → change level
    // First signal → store it, wait for second
    let newLevel = pillar.current_level;
    let newLastSignal: string | null = pillar.last_difficulty_signal;
    let newTrend = pillar.trend || "stable";

    if (difficulty === "about_right") {
      newLastSignal = null;
    } else if (difficulty === "too_hard" && value === "low") {
      // Immediate action: lower level without waiting for second signal
      if (pillar.current_level > 1) {
        newLevel = pillar.current_level - 1;
        newTrend = "down";
      }
      newLastSignal = null;
    } else if (pillar.last_difficulty_signal === difficulty) {
      // Two consecutive same-direction signals → change level
      if (difficulty === "too_easy" && pillar.current_level < 5) {
        newLevel = pillar.current_level + 1;
        newTrend = "up";
      } else if (difficulty === "too_hard" && pillar.current_level > 1) {
        newLevel = pillar.current_level - 1;
        newTrend = "down";
      }
      newLastSignal = null; // reset streak after change
    } else {
      newLastSignal = difficulty; // store first signal, wait for second
    }

    await supabase.from("pillars").update({
      current_level: newLevel,
      last_difficulty_signal: newLastSignal,
      trend: newTrend,
    }).eq("id", pillar_id);

    // --- Check if this is the last section of a cycle (synthesis type, not a bonus) ---
    const { data: unit } = await supabase
      .from("units")
      .select("*")
      .eq("id", unit_id)
      .single();

    if (unit && unit.section_type === "synthesis" && !unit.is_bonus) {
      const cycleId = unit.cycle_id;

      // Get all non-bonus units in this cycle for the archive summary
      const { data: cycleUnits } = await supabase
        .from("units")
        .select("*")
        .eq("cycle_id", cycleId)
        .eq("is_bonus", false);

      const { data: cycle } = await supabase
        .from("cycles")
        .select("*")
        .eq("id", cycleId)
        .single();

      if (cycle && cycleUnits) {
        const diffMap: Record<string, number> = { too_easy: 1, about_right: 2, too_hard: 3 };
        const valueMap: Record<string, number> = { low: 1, medium: 2, high: 3 };

        const feedbackUnits = cycleUnits.filter((u: any) => u.feedback_difficulty);
        const avgDiff = feedbackUnits.length
          ? feedbackUnits.reduce((s: number, u: any) => s + (diffMap[u.feedback_difficulty] ?? 2), 0) / feedbackUnits.length
          : 2;
        const avgVal = feedbackUnits.length
          ? feedbackUnits.reduce((s: number, u: any) => s + (valueMap[u.feedback_value] ?? 2), 0) / feedbackUnits.length
          : 2;

        const levelChange = newLevel - (pillar.starting_level ?? newLevel);

        // Archive the completed cycle
        await supabase.from("progress_archive").insert({
          cycle_id: cycleId,
          summary: `Cycle ${cycle.cycle_number}: ${cycle.theme || "Unknown theme"} — ${cycleUnits.length} sections`,
          avg_difficulty: avgDiff,
          avg_value: avgVal,
          level_change: levelChange,
        });

        // Mark cycle as completed
        await supabase.from("cycles").update({
          status: "completed",
          completed_at: new Date().toISOString(),
        }).eq("id", cycleId);

        // Mark the topic cluster as covered in topic_map
        if (cycle.theme) {
          await supabase.from("topic_map")
            .update({ status: "covered" })
            .eq("pillar_id", pillar_id)
            .eq("cluster_name", cycle.theme);
        }
      }
    }

    const levelChanged = newLevel !== pillar.current_level;

    if (unit && !unit.is_bonus && unit.section_type !== "synthesis" && levelChanged) {
      const { data: staleUnits } = await supabase
        .from("units")
        .select("id")
        .eq("cycle_id", unit.cycle_id)
        .eq("is_pending_feedback", true)
        .eq("is_bonus", false);
      for (const s of staleUnits || []) {
        await supabase.from("units").delete().eq("id", s.id);
      }
    }

    return new Response(
      JSON.stringify({ success: true, level_changed: levelChanged }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error(err); // full error + stack visible in Supabase function logs
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
