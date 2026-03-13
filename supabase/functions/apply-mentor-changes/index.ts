import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { getCorsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
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
    const userId = userData.user.id;

    const { action, changes } = await req.json();

    if (action === "full_recalibration") {
      return new Response(
        JSON.stringify({ success: true, redirect: "/onboarding" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "add_pillar") {
      const c = changes;
      const { data: existingPillars } = await supabase
        .from("pillars")
        .select("sort_order")
        .eq("user_id", userId)
        .order("sort_order", { ascending: false })
        .limit(1);
      const nextOrder = (existingPillars?.[0]?.sort_order ?? -1) + 1;

      const { data: pillarData, error: pillarError } = await supabase
        .from("pillars")
        .insert({
          user_id: userId,
          name: c.name,
          description: c.description,
          why_it_matters: c.why_it_matters,
          starting_level: c.starting_level || 1,
          current_level: c.starting_level || 1,
          phase_weight: c.phase_weight || 0,
          sort_order: nextOrder,
        })
        .select()
        .single();
      if (pillarError) throw pillarError;

      // Add topic clusters
      if (c.topic_clusters && pillarData) {
        for (let i = 0; i < c.topic_clusters.length; i++) {
          const tc = c.topic_clusters[i];
          await supabase.from("topic_map").insert({
            pillar_id: pillarData.id,
            cluster_name: tc.cluster_name,
            subtopics: tc.subtopics || [],
            priority_order: i,
          });
        }
      }
    } else if (action === "delete_pillar") {
      const pillarId = changes.pillar_id;
      await supabase.from("topic_map").delete().eq("pillar_id", pillarId);
      await supabase.from("phase_weights").delete().eq("pillar_id", pillarId);
      await supabase.from("pillars").delete().eq("id", pillarId);
    } else if (action === "edit_pillar") {
      const { pillar_id, fields_to_update } = changes;
      const allowedFields = ["name", "description", "why_it_matters", "phase_weight"];
      const updateObj: Record<string, any> = {};
      for (const [key, val] of Object.entries(fields_to_update)) {
        if (allowedFields.includes(key)) {
          updateObj[key] = val;
        }
      }
      if (Object.keys(updateObj).length > 0) {
        await supabase.from("pillars").update(updateObj).eq("id", pillar_id);
      }
    } else if (action === "swap_pillar") {
      // Delete old pillar
      const removeId = changes.remove_pillar_id;
      await supabase.from("topic_map").delete().eq("pillar_id", removeId);
      await supabase.from("phase_weights").delete().eq("pillar_id", removeId);
      await supabase.from("pillars").delete().eq("id", removeId);

      // Add new pillar
      const c = changes.add;
      const { data: existingPillars } = await supabase
        .from("pillars")
        .select("sort_order")
        .eq("user_id", userId)
        .order("sort_order", { ascending: false })
        .limit(1);
      const nextOrder = (existingPillars?.[0]?.sort_order ?? -1) + 1;

      const { data: pillarData } = await supabase
        .from("pillars")
        .insert({
          user_id: userId,
          name: c.name,
          description: c.description,
          why_it_matters: c.why_it_matters,
          starting_level: c.starting_level || 1,
          current_level: c.starting_level || 1,
          phase_weight: c.phase_weight || 0,
          sort_order: nextOrder,
        })
        .select()
        .single();

      if (c.topic_clusters && pillarData) {
        for (let i = 0; i < c.topic_clusters.length; i++) {
          const tc = c.topic_clusters[i];
          await supabase.from("topic_map").insert({
            pillar_id: pillarData.id,
            cluster_name: tc.cluster_name,
            subtopics: tc.subtopics || [],
            priority_order: i,
          });
        }
      }
    } else if (action === "change_level") {
      const { pillar_id, new_level } = changes;
      const clamped = Math.max(1, Math.min(5, new_level));
      await supabase.from("pillars").update({ current_level: clamped }).eq("id", pillar_id);
    } else {
      return new Response(
        JSON.stringify({ error: "Unknown action: " + action }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
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