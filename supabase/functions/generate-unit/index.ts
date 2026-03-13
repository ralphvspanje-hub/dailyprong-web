import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { checkRateLimit } from "../_shared/rateLimit.ts";
import { getCorsHeaders } from "../_shared/cors.ts";

let corsHeaders: Record<string, string> = {};

const SECTION_SEQUENCE = ["concept", "deep_dive", "case_study", "hands_on", "synthesis"] as const;
type SectionType = typeof SECTION_SEQUENCE[number];

const MIDDLE_TYPES: SectionType[] = ["deep_dive", "case_study", "hands_on"];

const TOKEN_BUDGET: Record<number, number> = {
  5: 800, 10: 1200, 15: 1800, 30: 3000, 45: 4000, 60: 5000,
};

const DIFFICULTY_GUIDANCE: Record<number, string> = {
  1: "Beginner-friendly. Define all terms. Use simple analogies and step-by-step explanations.",
  2: "Basics assumed. Some jargon is OK. Provide more depth than pure intro material.",
  3: "Intermediate. Expects foundational knowledge. Moderate complexity, real examples.",
  4: "Advanced. Assumes strong foundation. Complex scenarios, nuanced trade-offs.",
  5: "Expert-level. Cutting-edge topics, research-informed, industry-leading practices.",
};

const SECTION_INSTRUCTIONS: Record<string, string> = {
  concept: "Core Concepts — Explain the key ideas clearly with concrete examples. Build mental models the learner can rely on.",
  deep_dive: "Deep Dive — Go deeper into the mechanics, technical details, or research behind the topic. Reference real frameworks or methodologies.",
  case_study: "Case Study — Present a real-world scenario or example. Walk through the decisions made and analyze outcomes. Make it feel like a story.",
  hands_on: "Hands-On Practice — Give the learner a practical exercise or actionable task they can do today. Include clear steps and expected results.",
  synthesis: "Synthesis — Connect everything from this cycle together. Help the learner integrate these ideas with their broader skills and career goals. End with reflection questions.",
  extra_resources: `Extra Resources — Generate a concise summary of what was covered in this cycle, then provide:
1. A short (2–3 sentence) cycle summary highlighting the key themes and takeaways
2. 5–7 YouTube search query suggestions the learner can paste into YouTube to find great videos on the topics covered (be specific and practical, not generic)
3. 3–5 recommended practice sites, tools, or resources where the learner can apply what they learned (include URLs where possible)

Format each section with clear markdown headings. Keep it actionable and directly tied to the pillar and topic cluster.`,
  cycle_recap: `Cycle Recap — This is a structured summary of the entire completed cycle. Using the list of existing units as your source, produce:
1. A section-by-section recap: for each unit in the cycle, write a concise 2–3 sentence summary of what was covered and the key insight
2. Key Takeaways: 3–5 bullet points capturing the most important lessons across the whole cycle
3. Synthesis Connections: How do the different sections connect to each other? What patterns or themes emerged? How does this cycle's learning fit into the learner's broader career goals?

Format with clear markdown headings. Be specific — reference actual topics and insights from the units, not generic statements.`,
};

function buildSectionSequence(cycleLength: number): string[] {
  if (cycleLength <= 1) return ["concept"];
  if (cycleLength === 2) return ["concept", "synthesis"];
  const sequence: string[] = ["concept"];
  const middleCount = cycleLength - 2;
  for (let i = 0; i < middleCount; i++) {
    sequence.push(MIDDLE_TYPES[i % MIDDLE_TYPES.length]);
  }
  sequence.push("synthesis");
  return sequence;
}

function getMaxTokens(dailyTime: number): number {
  const keys = Object.keys(TOKEN_BUDGET).map(Number).sort((a, b) => a - b);
  for (const k of keys) {
    if (dailyTime <= k) return TOKEN_BUDGET[k];
  }
  return 5000;
}

function jsonRes(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  corsHeaders = getCorsHeaders(req);
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
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY")!;
    const backgroundSecret = Deno.env.get("INTERNAL_BACKGROUND_SECRET");
    const bgToken = req.headers.get("x-background-token");
    const isBackgroundCall = !!(backgroundSecret && bgToken && bgToken === backgroundSecret);

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

    if (!isBackgroundCall) {
      const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
      const ip = req.headers.get("x-forwarded-for") || "unknown";
      const rateCheck = await checkRateLimit(supabaseAdmin, userId, ip, "generate-unit");
      if (!rateCheck.allowed) {
        return jsonRes({ error: rateCheck.message }, 429);
      }
    }

    const body = await req.json();
    const { action, pillar_id, cycle_id, section_type, current_section_number, last_section_topic } = body;

    if (!["new_cycle", "next_section", "bonus", "repeat_section", "extra_resources", "cycle_recap"].includes(action)) {
      return jsonRes({ error: "Invalid action" }, 400);
    }

    const { data: profile } = await supabase
      .from("user_profile").select("*").eq("user_id", userId).maybeSingle();
    const cycleLength = profile?.cycle_length || 5;
    const dailyTime = profile?.daily_time_commitment || 20;
    const maxTokens = getMaxTokens(dailyTime);
    const includeGoDeeper = dailyTime >= 45;

    let targetCycleId = cycle_id;
    let pillar: any = null;
    let cluster: any = null;
    let targetSectionType: string;
    let existingUnits: any[] = [];
    let cycle: any = null;

    if (action === "new_cycle") {
      if (!pillar_id) return jsonRes({ error: "pillar_id required for new_cycle" }, 400);

      const { data: activeCycle } = await supabase
        .from("cycles").select("id").eq("user_id", userId).eq("status", "active").maybeSingle();
      if (activeCycle) {
        await supabase.from("cycles").update({ status: "skipped" }).eq("id", activeCycle.id);
      }

      const { data: pillarData } = await supabase
        .from("pillars").select("*").eq("id", pillar_id).maybeSingle();
      if (!pillarData) return jsonRes({ error: "Pillar not found" }, 404);
      pillar = pillarData;

      const { data: clusters } = await supabase
        .from("topic_map").select("*")
        .eq("pillar_id", pillar_id).eq("status", "queued")
        .order("priority_order").limit(1);
      if (!clusters?.length) {
        return jsonRes({ error: "No queued topic clusters for this pillar" }, 400);
      }
      cluster = clusters[0];

      const { count } = await supabase
        .from("cycles")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId);
      const cycleNumber = (count || 0) + 1;

      const { data: newCycle, error: cycleErr } = await supabase
        .from("cycles")
        .insert({
          user_id: userId, cycle_number: cycleNumber,
          pillar_id, theme: cluster.cluster_name, status: "active",
        })
        .select().single();
      if (cycleErr) throw cycleErr;
      cycle = newCycle;
      targetCycleId = newCycle.id;

      await supabase.from("topic_map").update({ status: "in_progress" }).eq("id", cluster.id);
      targetSectionType = "concept";
    } else {
      if (!cycle_id) return jsonRes({ error: "cycle_id required" }, 400);

      const { data: cycleData } = await supabase
        .from("cycles").select("*").eq("id", cycle_id).maybeSingle();
      if (!cycleData) return jsonRes({ error: "Cycle not found" }, 404);
      cycle = cycleData;

      if (cycle.pillar_id) {
        const { data: p } = await supabase
          .from("pillars").select("*").eq("id", cycle.pillar_id).maybeSingle();
        pillar = p;
      }

      if (pillar && cycle.theme) {
        const { data: c } = await supabase
          .from("topic_map").select("*")
          .eq("pillar_id", pillar.id).eq("cluster_name", cycle.theme)
          .maybeSingle();
        cluster = c;
      }

      const { data: units } = await supabase
        .from("units").select("*").eq("cycle_id", cycle_id).order("section_number");
      existingUnits = units || [];

      if (action === "next_section") {
        const mainUnits = existingUnits.filter((u: any) => !u.is_bonus);
        const sectionSeq = buildSectionSequence(cycleLength);
        const nextIndex = mainUnits.length;
        if (nextIndex >= sectionSeq.length) {
          return jsonRes({ error: "Cycle complete — all sections generated." }, 400);
        }
        targetSectionType = sectionSeq[nextIndex];
      } else if (action === "bonus") {
        targetSectionType = "bonus";
      } else if (action === "extra_resources") {
        targetSectionType = "extra_resources";
      } else if (action === "cycle_recap") {
        targetSectionType = "cycle_recap";
      } else {
        if (!section_type || !SECTION_SEQUENCE.includes(section_type as SectionType)) {
          return jsonRes({ error: "Valid section_type required for repeat_section" }, 400);
        }
        targetSectionType = section_type;
      }
    }

    if (action === "next_section") {
      let guardQuery = supabase
        .from("units")
        .select("id, section_type, topic")
        .eq("cycle_id", cycle_id)
        .eq("is_pending_feedback", true)
        .eq("is_bonus", false);

      if (typeof current_section_number === "number") {
        guardQuery = guardQuery.gt("section_number", current_section_number);
      }

      const { data: pendingNonBonus } = await guardQuery.limit(1);

      if (pendingNonBonus && pendingNonBonus.length > 0) {
        return jsonRes({
          success: true,
          unit_id: pendingNonBonus[0].id,
          section_type: pendingNonBonus[0].section_type,
          topic: pendingNonBonus[0].topic,
        });
      }
    }

    const pillarName = pillar?.name || "General";
    const pillarDesc = pillar?.description || "";
    const pillarLevel = pillar?.current_level || 1;
    const clusterName = cluster?.cluster_name || cycle?.theme || "General Topics";
    const subtopics = cluster?.subtopics?.join(", ") || "";
    const difficultyGuide = DIFFICULTY_GUIDANCE[pillarLevel] || DIFFICULTY_GUIDANCE[1];

    const existingSummary = existingUnits.length > 0
      ? existingUnits.map((u: any) =>
          `- ${u.section_type}: "${u.topic}" (section ${u.section_number}${u.is_bonus ? ", bonus" : ""})`
        ).join("\n")
      : "No previous units in this cycle.";

    let sectionInstruction: string;
    if (action === "cycle_recap") {
      sectionInstruction = SECTION_INSTRUCTIONS["cycle_recap"];
    } else if (action === "extra_resources") {
      let base = SECTION_INSTRUCTIONS["extra_resources"];
      if (last_section_topic) {
        base = base.replace(
          "what was covered in this cycle",
          `the topic "${last_section_topic}"`
        ) + `\n\nFocus the summary, YouTube queries, and practice links specifically on "${last_section_topic}" rather than the whole cycle.`;
      }
      sectionInstruction = base;
    } else if (action === "bonus") {
      let base = `This is a BONUS unit. Pick the most fitting section type from: ${SECTION_SEQUENCE.join(", ")}. Approach the topic from a different angle than existing units. Start your response with [SECTION_TYPE: <chosen_type>] on its own line.`;
      if (last_section_topic) {
        base = `This is a BONUS unit. Focus on: "${last_section_topic}". Pick the most fitting section type from: ${SECTION_SEQUENCE.join(", ")}. Approach it from a different angle than existing units. Start your response with [SECTION_TYPE: <chosen_type>] on its own line.`;
      }
      sectionInstruction = base;
    } else if (action === "repeat_section") {
      sectionInstruction = `This is a REPEAT of the "${targetSectionType}" section type. Generate completely new content — do NOT reuse material from existing units. ${SECTION_INSTRUCTIONS[targetSectionType] || ""}`;
    } else {
      sectionInstruction = SECTION_INSTRUCTIONS[targetSectionType] || "";
    }

    const goDeeper = includeGoDeeper
      ? "\n\nSince this learner has a longer daily commitment, include a 'Go Deeper' section at the end with 2–3 curated resource suggestions (books, articles, courses, tools) relevant to the topic."
      : "";

    const systemPrompt = `You are a world-class learning content generator for DailyProng, an AI career learning platform.

PILLAR: ${pillarName}
${pillarDesc ? `Description: ${pillarDesc}` : ""}
Pillar Level: ${pillarLevel}/5

TOPIC CLUSTER: ${clusterName}
${subtopics ? `Subtopics: ${subtopics}` : ""}

DIFFICULTY CALIBRATION:
${difficultyGuide}

SECTION TYPE: ${targetSectionType === "bonus" ? "(AI chooses)" : targetSectionType === "cycle_recap" ? "Cycle Recap (synthesis)" : targetSectionType}
${sectionInstruction}

EXISTING UNITS IN THIS CYCLE:
${existingSummary}

CONTENT FORMAT:
- Write in markdown
- Start with a clear, engaging title (## heading)
- Include concrete examples, not just theory
- Keep it focused and actionable — no filler
- Match the difficulty level to the pillar level
- Reference the topic cluster's subtopics where relevant
- Do NOT repeat content from existing units${goDeeper}

Respond with ONLY the learning content. No meta-commentary.`;

    const aiResponse = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": geminiApiKey,
        },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: [{
            role: "user",
            parts: [{
              text: `Generate the ${targetSectionType === "bonus" ? "bonus" : targetSectionType} learning unit for "${clusterName}" in the ${pillarName} pillar.`,
            }],
          }],
          generationConfig: { maxOutputTokens: maxTokens, temperature: 0.7 },
        }),
      }
    );

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return jsonRes({ error: "The AI service is temporarily unavailable due to high demand. Please try again in a few minutes." }, 429);
      }
      const errText = await aiResponse.text();
      throw new Error(`AI API error: ${aiResponse.status} ${errText}`);
    }

    const aiData = await aiResponse.json();
    let content: string = aiData.candidates?.[0]?.content?.parts?.[0]?.text || "";

    let finalSectionType = targetSectionType;
    if (action === "cycle_recap") {
      finalSectionType = "synthesis";
    } else if (action === "bonus") {
      const typeMatch = content.match(/\[SECTION_TYPE:\s*(\w+)\]/);
      if (typeMatch && SECTION_SEQUENCE.includes(typeMatch[1] as SectionType)) {
        finalSectionType = typeMatch[1];
        content = content.replace(/\[SECTION_TYPE:\s*\w+\]\n?/, "").trim();
      } else {
        finalSectionType = "deep_dive";
      }
    }

    const topicMatch = content.match(/^##\s+(.+)/m);
    const topic = topicMatch ? topicMatch[1].trim() : clusterName;

    const isSupplemental = ["bonus", "repeat_section", "extra_resources", "cycle_recap"].includes(action);
    const mainUnitsCount = existingUnits.filter((u: any) => !u.is_bonus).length;
    const sectionNumber = isSupplemental
      ? (current_section_number ?? mainUnitsCount)
      : mainUnitsCount + 1;

    const ACTION_TO_ROLE: Record<string, string> = {
      new_cycle: "normal", next_section: "normal",
      bonus: "bonus", repeat_section: "repeat", extra_resources: "extra_resources",
      cycle_recap: "cycle_recap",
    };
    const unitRole = ACTION_TO_ROLE[action] || "normal";

    const { data: savedUnit, error: unitErr } = await supabase
      .from("units")
      .insert({
        cycle_id: targetCycleId,
        pillar_id: pillar?.id || null,
        section_number: sectionNumber,
        section_type: finalSectionType,
        topic,
        difficulty_level: pillarLevel,
        content,
        is_bonus: isSupplemental,
        is_pending_feedback: true,
        unit_role: unitRole,
      })
      .select().single();
    if (unitErr) throw unitErr;

    return jsonRes({
      success: true,
      unit_id: savedUnit.id,
      section_type: finalSectionType,
      topic,
    });
  } catch (err: any) {
    console.error(err); // full error + stack visible in Supabase function logs
    return jsonRes({ error: "Internal server error" }, 500);
  }
});
