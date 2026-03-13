import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { checkRateLimit } from "../_shared/rateLimit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ONBOARDING_SYSTEM_PROMPT = `You are the DailyProng onboarding guide — warm, sharp, and genuinely curious. Your job is to discover who this learner is and build their personalized career learning architecture.

DISCOVERY DIMENSIONS (explore all 5):
1. **Career Identity**: Current role, target role, long-term ambition, industry
2. **Skill Landscape**: Existing strengths, known gaps, adjacent skills of interest
3. **Learning Style**: How they learn best (reading, doing, cases, discussion), time they can commit daily
4. **Growth Priorities**: What matters most right now (promotion, pivot, mastery, breadth)
5. **Unique Context**: What makes their situation unique (niche domain, career change, returning from break, etc.)

CONVERSATION RULES:
- Ask 1–2 focused questions at a time, not a wall of questions
- Listen actively — reference what they told you earlier
- Be conversational, not clinical. You're a thinking partner, not a form
- Guide them but let them surprise you. Don't assume their goals
- After exploring all dimensions, summarize what you've learned and propose their architecture
- A good onboarding typically takes 6–10 exchanges. Don't rush to conclusions.

FORMATTING RULES (every conversational reply must follow this):
- Start with a short acknowledgment/reflection paragraph that references what the user just shared. Use **bold** freely to highlight key things they mentioned.
- Then add a horizontal rule: ---
- Then a header: **Questions for you:**
- Then numbered questions, one per line (1. 2. etc.)
- Keep it to 1–3 questions per turn.
- Never dump a wall of unformatted text. Always use this structure.

OUTPUT FORMAT:
When you have enough information to build the architecture, wrap your final structured output in:

[ONBOARDING_COMPLETE]
{
  "pillars": [
    {
      "name": "Pillar Name",
      "description": "What this pillar covers",
      "why_it_matters": "Why it matters for their goals",
      "starting_level": 1,
      "key_topics": ["topic1", "topic2"]
    }
  ],
  "phases": [
    {
      "name": "Phase Name",
      "timeline_start": "YYYY-MM-DD",
      "timeline_end": "YYYY-MM-DD",
      "goal": "What this phase achieves",
      "weights": {"Pillar Name": 40, "Other Pillar": 30}
    }
  ],
  "topicMap": [
    {
      "pillar": "Pillar Name",
      "cluster_name": "Cluster Name",
      "subtopics": ["sub1", "sub2", "sub3"],
      "difficulty_level": 1
    }
  ]
}
[/ONBOARDING_COMPLETE]

ARCHITECTURE RULES:
- Create 3–5 pillars based on their goals (not more)
- Starting levels should reflect their honest self-assessment (1–5)
- Topic clusters should be specific and actionable, not generic
- Each pillar should have 3–6 topic clusters ordered by priority
- Phases should span 2–4 months each, with realistic goals
- Phase weights should sum to ~100% and reflect priorities
- Difficulty levels on clusters should match the pillar's starting level ± 1

Include your conversational message BEFORE the [ONBOARDING_COMPLETE] block. The message should summarize what you've learned and present the architecture with enthusiasm.`;

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
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY")!;

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

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const ip = req.headers.get("x-forwarded-for") || "unknown";
    const rateCheck = await checkRateLimit(supabaseAdmin, userId, ip, "onboarding-chat");
    if (!rateCheck.allowed) {
      return jsonRes({ error: rateCheck.message }, 429);
    }

    const { action, messages } = await req.json();

    if (!["start", "continue"].includes(action)) {
      return jsonRes({ error: "Invalid action. Must be: start, continue" }, 400);
    }

    if (action === "continue" && (!messages || messages.length === 0)) {
      return jsonRes({ error: "messages array cannot be empty" }, 400);
    }

    for (const msg of messages || []) {
      const len = typeof msg.content === "string" ? msg.content.length : 0;
      if (msg.role === "user" && len > 2000) {
        return jsonRes({ error: "Message too long" }, 400);
      }
      if (msg.role === "assistant" && len > 16000) {
        return jsonRes({ error: "Message too long" }, 400);
      }
    }

    const turnCount = (messages || []).filter((m: any) => m.role === "user").length;
    let systemPrompt = ONBOARDING_SYSTEM_PROMPT;
    if (turnCount >= 10) {
      systemPrompt += "\n\nIMPORTANT: The conversation has gone on for a while. If you have enough information, wrap up and produce the [ONBOARDING_COMPLETE] output now. If you still need critical information, ask one final focused question.";
    }

    const contents: { role: string; parts: { text: string }[] }[] = [];

    if (action === "start") {
      contents.push({
        role: "user",
        parts: [{ text: "I just started the onboarding. Please introduce yourself and begin." }],
      });
    } else {
      for (const msg of messages || []) {
        contents.push({
          role: msg.role === "assistant" ? "model" : "user",
          parts: [{ text: msg.content }],
        });
      }
    }

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
          contents,
          generationConfig: { maxOutputTokens: 4096, temperature: 0.7 },
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
    const fullContent: string = aiData.candidates?.[0]?.content?.parts?.[0]?.text || "";

    const completeMatch = fullContent.match(
      /\[ONBOARDING_COMPLETE\]\s*([\s\S]*?)\s*\[\/ONBOARDING_COMPLETE\]/
    );

    if (completeMatch) {
      const messageBeforeBlock = fullContent
        .replace(/\[ONBOARDING_COMPLETE\][\s\S]*?\[\/ONBOARDING_COMPLETE\]/, "")
        .trim();

      try {
        const outputs = JSON.parse(completeMatch[1]);
        return jsonRes({
          message: messageBeforeBlock || "Here's your personalized learning architecture!",
          outputs,
        });
      } catch {
        return jsonRes({ message: fullContent });
      }
    }

    return jsonRes({ message: fullContent });
  } catch (err: any) {
    console.error(err); // full error + stack visible in Supabase function logs
    return jsonRes({ error: "Internal server error" }, 500);
  }
});
