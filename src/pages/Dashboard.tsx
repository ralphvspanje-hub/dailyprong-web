import { useState, useMemo, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useDemo, DEMO_PENDING_UNIT, DEMO_PILLARS, DEMO_CYCLES } from "@/hooks/useDemo";
import { useMentorName } from "@/hooks/useMentorName";
import { useUnitGeneration } from "@/hooks/useUnitGeneration";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/Layout";
import { UnitDisplay } from "@/components/UnitDisplay";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Loader2, Zap, ArrowRight, Plus, MessageSquare, RotateCcw, BookOpen } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

type DashboardState = "loading" | "needs_onboarding" | "pending_feedback" | "pillar_selection" | "generating" | "up_to_date";

const SECTION_DISPLAY_NAMES: Record<string, string> = {
  concept: "Concept", deep_dive: "Deep Dive", case_study: "Case Study",
  hands_on: "Hands-On", synthesis: "Synthesis",
};

const MIDDLE_TYPES_SEQ = ["deep_dive", "case_study", "hands_on"] as const;

function buildSectionSeq(cycleLength: number): string[] {
  if (cycleLength <= 1) return ["concept"];
  if (cycleLength === 2) return ["concept", "synthesis"];
  const seq: string[] = ["concept"];
  const middleCount = cycleLength - 2;
  for (let i = 0; i < middleCount; i++) {
    seq.push(MIDDLE_TYPES_SEQ[i % MIDDLE_TYPES_SEQ.length]);
  }
  seq.push("synthesis");
  return seq;
}

interface PillarOption {
  id: string;
  name: string;
  current_level: number;
  description: string;
  cycles_since_last: number | null;
  recommended: boolean;
}

interface DashboardData {
  pendingUnit: any | null;
  activeCycle: any | null;
  completedCycle: any | null;
  lastSectionType: string | null;
  lastSectionTopic: string | null;
  nextSectionTopic: string | null;
  nextSectionType: string | null;
  nextSectionIndex: number | null;
  cycleLength: number;
  derivedState: DashboardState;
}

const DEMO_DASHBOARD_DATA: DashboardData = {
  pendingUnit: DEMO_PENDING_UNIT,
  activeCycle: DEMO_CYCLES.find(c => c.status === "active") || null,
  completedCycle: DEMO_CYCLES.find(c => c.status === "completed") || null,
  lastSectionType: null,
  lastSectionTopic: null,
  nextSectionTopic: null,
  nextSectionType: null,
  nextSectionIndex: null,
  cycleLength: 5,
  derivedState: "pending_feedback",
};

const Dashboard = () => {
  const { user } = useAuth();
  const { isDemo } = useDemo();
  const { mentorName } = useMentorName();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const {
    isGenerating: ctxGenerating,
    pendingUnit: ctxPendingUnit,
    clearPendingUnit,
    startGeneration,
  } = useUnitGeneration();

  const [pillarOptions, setPillarOptions] = useState<PillarOption[]>([]);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [uiState, setUiState] = useState<DashboardState | null>(null);
  const [bonusTriggered, setBonusTriggered] = useState(() => localStorage.getItem("dailyprong-bonusTriggered") === "1");
  const [extraResourcesTriggered, setExtraResourcesTriggered] = useState(() => localStorage.getItem("dailyprong-extraTriggered") === "1");
  const [cycleRecapTriggered, setCycleRecapTriggered] = useState(() => localStorage.getItem("dailyprong-cycleRecapTriggered") === "1");
  const [repeatTriggered, setRepeatTriggered] = useState(() => localStorage.getItem("dailyprong-repeatTriggered") === "1");
  const [menuMode, setMenuMode] = useState(() => localStorage.getItem("dailyprong-menuMode") === "1");
  const [lastCompletedTopic, setLastCompletedTopic] = useState<string | null>(() => localStorage.getItem("dailyprong-lastTopic"));
  const [lastCompletedType, setLastCompletedType] = useState<string | null>(() => localStorage.getItem("dailyprong-lastType"));
  const [completedSectionNumber, setCompletedSectionNumber] = useState<number | undefined>(undefined);

  const { data: dashboardData, isLoading: queryLoading } = useQuery<DashboardData>({
    queryKey: ["dashboard", user?.id],
    queryFn: async (): Promise<DashboardData> => {
      const { data: profile } = await supabase
        .from("user_profile").select("*").eq("user_id", user!.id).maybeSingle();
      if (!profile) return { pendingUnit: null, activeCycle: null, completedCycle: null, lastSectionType: null, lastSectionTopic: null, nextSectionTopic: null, nextSectionType: null, nextSectionIndex: null, cycleLength: 5, derivedState: "needs_onboarding" };

      const { data: pendingUnits, error: pendingError } = await supabase
        .from("units")
        .select("*, cycles!inner(theme, pillar_id, status, pillars:pillar_id(name))")
        .eq("is_pending_feedback", true)
        .eq("is_bonus", false)
        .eq("cycles.status", "active")
        .order("section_number", { ascending: true })
        .limit(1);
      if (pendingError) throw pendingError;

      if (pendingUnits && pendingUnits.length > 0) {
        const unit = pendingUnits[0];
        return {
          pendingUnit: {
            ...unit,
            cycle_theme: (unit as any).cycles?.theme,
            pillar_name: (unit as any).cycles?.pillars?.name,
          },
          activeCycle: { id: unit.cycle_id },
          completedCycle: null,
          lastSectionType: null,
          lastSectionTopic: null,
          nextSectionTopic: null,
          nextSectionType: null,
          nextSectionIndex: null,
          cycleLength: profile?.cycle_length || 5,
          derivedState: "pending_feedback",
        };
      }

      const { data: cycles } = await supabase
        .from("cycles").select("*").eq("user_id", user!.id).eq("status", "active").limit(1);

      if (cycles && cycles.length > 0) {
        const cycle = cycles[0];
        const profileCycleLength = profile?.cycle_length || 5;

        const { data: lastUnits } = await supabase
          .from("units").select("section_type, topic")
          .eq("cycle_id", cycle.id)
          .eq("is_bonus", false)
          .order("section_number", { ascending: false })
          .limit(1);

        const { count: nonBonusCount } = await supabase
          .from("units")
          .select("id", { count: "exact", head: true })
          .eq("cycle_id", cycle.id)
          .eq("is_bonus", false);

        const { data: nextPreGen } = await supabase
          .from("units").select("topic, section_type")
          .eq("cycle_id", cycle.id)
          .eq("is_pending_feedback", true)
          .eq("is_bonus", false)
          .order("section_number", { ascending: true })
          .limit(1);

        const computedNextSectionType = buildSectionSeq(profileCycleLength)[nonBonusCount || 0] || null;

        return {
          pendingUnit: null,
          activeCycle: cycle,
          completedCycle: null,
          lastSectionType: lastUnits?.[0]?.section_type || null,
          lastSectionTopic: lastUnits?.[0]?.topic || null,
          nextSectionTopic: nextPreGen?.[0]?.topic || null,
          nextSectionType: nextPreGen?.[0]?.section_type || computedNextSectionType,
          nextSectionIndex: (nonBonusCount || 0) + 1,
          cycleLength: profileCycleLength,
          derivedState: "up_to_date",
        };
      }

      const { data: completedCycles } = await supabase
        .from("cycles").select("*")
        .eq("user_id", user!.id).eq("status", "completed")
        .order("cycle_number", { ascending: false }).limit(1);

      const completedCycle = completedCycles?.[0] || null;
      let completedLastSectionType: string | null = null;
      let completedLastSectionTopic: string | null = null;
      if (completedCycle) {
        const { data: lastUnits } = await supabase
          .from("units").select("section_type, topic")
          .eq("cycle_id", completedCycle.id)
          .eq("is_bonus", false)
          .order("section_number", { ascending: false })
          .limit(1);
        completedLastSectionType = lastUnits?.[0]?.section_type || null;
        completedLastSectionTopic = lastUnits?.[0]?.topic || null;
      }

      return {
        pendingUnit: null, activeCycle: null, completedCycle,
        lastSectionType: completedLastSectionType,
        lastSectionTopic: completedLastSectionTopic,
        nextSectionTopic: null,
        nextSectionType: null,
        nextSectionIndex: null,
        cycleLength: profile?.cycle_length || 5,
        derivedState: "up_to_date",
      };
    },
    enabled: !isDemo && !!user && !ctxGenerating && !ctxPendingUnit,
    placeholderData: isDemo ? DEMO_DASHBOARD_DATA : undefined,
  });

  const state: DashboardState = useMemo(() => {
    if (ctxGenerating) return "generating";
    if (ctxPendingUnit) return "pending_feedback";
    if (uiState) return uiState;
    if (queryLoading) return "loading";
    if (menuMode && dashboardData?.derivedState === "pending_feedback") return "up_to_date";
    return dashboardData?.derivedState ?? "loading";
  }, [ctxGenerating, ctxPendingUnit, uiState, queryLoading, dashboardData, menuMode]);

  const dbPendingUnit = dashboardData?.pendingUnit || null;
  const pendingUnit = ctxPendingUnit || (!menuMode ? dbPendingUnit : null) || null;
  const activeCycle = dashboardData?.activeCycle || null;
  const completedCycle = dashboardData?.completedCycle || null;
  const lastSectionType = dashboardData?.lastSectionType || lastCompletedType;
  const lastSectionTopic = dashboardData?.lastSectionTopic || lastCompletedTopic;
  const nextSectionTopic = (menuMode && dbPendingUnit?.topic) ? dbPendingUnit.topic : (dashboardData?.nextSectionTopic || null);
  const nextSectionType = (menuMode && dbPendingUnit?.section_type) ? dbPendingUnit.section_type : (dashboardData?.nextSectionType || null);
  const nextSectionIndex = (menuMode && dbPendingUnit?.section_number) ? dbPendingUnit.section_number : (dashboardData?.nextSectionIndex || null);
  const cycleLength = dashboardData?.cycleLength || 5;

  const loadPillarOptions = async () => {
    if (isDemo) {
      setPillarOptions(DEMO_PILLARS.map(p => ({
        id: p.id, name: p.name, current_level: p.current_level, description: p.description,
        cycles_since_last: p.id === "p4" ? null : 1,
        recommended: p.id === "p4" || p.phase_weight > 25,
      })));
      return;
    }
    const { data: pillars } = await supabase
      .from("pillars").select("*").eq("user_id", user!.id).eq("is_active", true).order("sort_order");
    if (!pillars) return;

    const { data: allCycles } = await supabase
      .from("cycles").select("pillar_id, cycle_number").eq("user_id", user!.id).order("cycle_number", { ascending: false });
    const maxCycle = allCycles?.[0]?.cycle_number || 0;

    const options: PillarOption[] = pillars.map((p) => {
      const lastCycle = allCycles?.find((c) => c.pillar_id === p.id);
      const cyclesSince = lastCycle ? maxCycle - lastCycle.cycle_number : null;
      return {
        id: p.id, name: p.name, current_level: p.current_level, description: p.description || "",
        cycles_since_last: cyclesSince, recommended: (cyclesSince !== null && cyclesSince >= 3) || (p.phase_weight ?? 0) > 25,
      };
    });
    options.sort((a, b) => (b.recommended ? 1 : 0) - (a.recommended ? 1 : 0));
    setPillarOptions(options);
  };

  const handleFeedback = async (feedback: {
    difficulty: "too_easy" | "about_right" | "too_hard";
    value: "high" | "medium" | "low";
    note?: string;
  }) => {
    if (isDemo) {
      toast.success("Feedback submitted! (Demo mode)");
      await loadPillarOptions();
      setUiState("up_to_date");
      return;
    }
    if (!pendingUnit) return;
    setFeedbackLoading(true);
    try {
      await supabase.from("units").update({
        feedback_difficulty: feedback.difficulty, feedback_value: feedback.value,
        feedback_note: feedback.note, is_pending_feedback: false,
        feedback_given_at: new Date().toISOString(),
      }).eq("id", pendingUnit.id);

      await supabase.functions.invoke("process-feedback", {
        body: { unit_id: pendingUnit.id, pillar_id: pendingUnit.pillar_id, difficulty: feedback.difficulty, value: feedback.value },
      });
      toast.success("Feedback submitted!");

      if (!pendingUnit.is_bonus) {
        const topic = pendingUnit.topic || null;
        const type = pendingUnit.section_type || null;
        setLastCompletedTopic(topic);
        setLastCompletedType(type);
        if (topic) localStorage.setItem("dailyprong-lastTopic", topic);
        else localStorage.removeItem("dailyprong-lastTopic");
        if (type) localStorage.setItem("dailyprong-lastType", type);
        else localStorage.removeItem("dailyprong-lastType");
        setBonusTriggered(false);
        setExtraResourcesTriggered(false);
        setCycleRecapTriggered(false);
        setRepeatTriggered(false);
        localStorage.removeItem("dailyprong-bonusTriggered");
        localStorage.removeItem("dailyprong-extraTriggered");
        localStorage.removeItem("dailyprong-cycleRecapTriggered");
        localStorage.removeItem("dailyprong-repeatTriggered");
      }
      setCompletedSectionNumber(pendingUnit.section_number);
      clearPendingUnit();
      setMenuMode(true);
      localStorage.setItem("dailyprong-menuMode", "1");
      setUiState("up_to_date");
      queryClient.invalidateQueries({ queryKey: ["dashboard", user?.id] });
    } catch (err: any) {
      toast.error("Failed to submit feedback: " + err.message);
    } finally {
      setFeedbackLoading(false);
    }
  };

  const selectPillar = (pillarId: string) => {
    setMenuMode(false);
    localStorage.removeItem("dailyprong-menuMode");
    localStorage.removeItem("dailyprong-lastTopic");
    localStorage.removeItem("dailyprong-lastType");
    setUiState(null);
    setBonusTriggered(false);
    setExtraResourcesTriggered(false);
    setCycleRecapTriggered(false);
    setRepeatTriggered(false);
    localStorage.removeItem("dailyprong-bonusTriggered");
    localStorage.removeItem("dailyprong-extraTriggered");
    localStorage.removeItem("dailyprong-cycleRecapTriggered");
    localStorage.removeItem("dailyprong-repeatTriggered");
    setLastCompletedTopic(null);
    setLastCompletedType(null);
    setCompletedSectionNumber(undefined);
    startGeneration({ action: "new_cycle", pillar_id: pillarId });
  };

  const generateNextSection = useCallback(async () => {
    if (!activeCycle) return;

    setMenuMode(false);
    localStorage.removeItem("dailyprong-menuMode");
    setUiState(null);
    setBonusTriggered(false);
    setExtraResourcesTriggered(false);
    setCycleRecapTriggered(false);
    setRepeatTriggered(false);
    localStorage.removeItem("dailyprong-bonusTriggered");
    localStorage.removeItem("dailyprong-extraTriggered");
    localStorage.removeItem("dailyprong-cycleRecapTriggered");
    localStorage.removeItem("dailyprong-repeatTriggered");
    setCompletedSectionNumber(undefined);

    const { data: preGenUnits } = await supabase
      .from("units")
      .select("id")
      .eq("cycle_id", activeCycle.id)
      .eq("is_pending_feedback", true)
      .eq("is_bonus", false)
      .limit(1);

    if (preGenUnits && preGenUnits.length > 0) {
      queryClient.invalidateQueries({ queryKey: ["dashboard", user?.id] });
    } else {
      startGeneration({ action: "next_section", cycle_id: activeCycle.id });
    }
  }, [activeCycle, queryClient, user?.id, startGeneration]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Enter") return;
      if (state !== "up_to_date") return;

      const tag = (document.activeElement as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || tag === "BUTTON") return;
      if ((document.activeElement as HTMLElement)?.isContentEditable) return;

      e.preventDefault();

      if (activeCycle) {
        generateNextSection();
      } else {
        const confirmed = window.confirm(
          "Start a new cycle? This is your last chance to get a bonus unit or extra resources."
        );
        if (confirmed) {
          loadPillarOptions();
          setUiState("pillar_selection");
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [state, activeCycle, generateNextSection]);

  useEffect(() => {
    if (!pendingUnit || pendingUnit.is_bonus || pendingUnit.section_type === "synthesis" || isDemo) return;
    supabase.functions.invoke("generate-unit", {
      body: { action: "next_section", cycle_id: pendingUnit.cycle_id, current_section_number: pendingUnit.section_number },
    }).catch(() => {});
  }, [pendingUnit?.id]);

  const generateBonus = () => {
    const cycleId = activeCycle?.id || completedCycle?.id;
    if (!cycleId) return;
    setBonusTriggered(true);
    localStorage.setItem("dailyprong-bonusTriggered", "1");
    startGeneration({
      action: "bonus",
      cycle_id: cycleId,
      current_section_number: completedSectionNumber,
      ...(activeCycle && lastSectionTopic ? { last_section_topic: lastSectionTopic } : {}),
    });
  };

  const generateRepeatSection = () => {
    if (!activeCycle || !lastSectionType) return;
    setRepeatTriggered(true);
    localStorage.setItem("dailyprong-repeatTriggered", "1");
    startGeneration({ action: "repeat_section", cycle_id: activeCycle.id, section_type: lastSectionType, current_section_number: completedSectionNumber });
  };

  const generateExtraResources = () => {
    const cycleId = activeCycle?.id || completedCycle?.id;
    if (!cycleId) return;
    setExtraResourcesTriggered(true);
    localStorage.setItem("dailyprong-extraTriggered", "1");
    startGeneration({
      action: "extra_resources",
      cycle_id: cycleId,
      current_section_number: completedSectionNumber,
      ...(activeCycle && lastSectionTopic ? { last_section_topic: lastSectionTopic } : {}),
    });
  };

  const generateCycleRecap = () => {
    if (!completedCycle?.id) return;
    setCycleRecapTriggered(true);
    localStorage.setItem("dailyprong-cycleRecapTriggered", "1");
    startGeneration({ action: "cycle_recap", cycle_id: completedCycle.id });
  };

  const extraResourcesInner = (
    <>
      <BookOpen className={`h-5 w-5 ${extraResourcesTriggered ? "text-muted-foreground" : "text-accent"}`} />
      <div>
        <p className="font-medium text-sm">Extra Resources</p>
        <p className="text-xs text-muted-foreground">{extraResourcesTriggered ? "View in History" : "Videos, practice sites & more"}</p>
      </div>
    </>
  );

  if (state === "needs_onboarding") {
    navigate("/onboarding");
    return null;
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto">
        {isDemo && (
          <div className="mb-4 rounded-lg border border-accent/30 bg-accent/5 px-4 py-2 text-sm text-accent">
            <span>👀 Demo Mode — Explore the app with sample data</span>
          </div>
        )}

        {state === "loading" && (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-accent" />
            <p className="text-sm text-muted-foreground">Loading your learning state...</p>
          </div>
        )}

        {state === "generating" && (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-accent" />
            <p className="text-sm text-muted-foreground">Generating your learning unit...</p>
            <div className="text-foreground text-center max-w-sm mt-4">
              <p className="text-[22px]">Don't reach for your phone.</p>
              <p className="mt-6 text-[16px]">Being bored for a moment is actually good for you.</p>
              <p className="mt-3 text-[16px]">It helps your brain retain what you just learned.</p>
              <p className="mt-3 text-[16px]">Scrolling fills your head with noise, and that noise follows you into the next unit.</p>
              <p className="mt-10 text-[21px]">Become a Prong.</p>
              <img src="/Fork.png" alt="" className="mx-auto mt-5 h-32 opacity-80" />
            </div>
          </div>
        )}

        {state === "pending_feedback" && pendingUnit && (
          <UnitDisplay unit={pendingUnit} onFeedback={handleFeedback} feedbackLoading={feedbackLoading} />
        )}

        {state === "pillar_selection" && (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h1 className="font-serif text-2xl font-bold">Choose Your Focus</h1>
              <p className="text-sm text-muted-foreground">Select a pillar to start a new learning cycle.</p>
            </div>
            <div className="grid gap-3">
              {pillarOptions.map((p) => (
                <motion.div key={p.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                  <Card className="border-border cursor-pointer hover:border-accent/50 transition-colors group" onClick={() => selectPillar(p.id)}>
                    <CardContent className="flex items-center gap-4 py-4">
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-serif font-semibold">{p.name}</span>
                          {p.cycles_since_last === null && (
                            <Badge variant="outline" className="text-[10px]">New</Badge>
                          )}
                          {p.cycles_since_last !== null && p.cycles_since_last >= 3 && (
                            <Badge variant="outline" className="text-[10px] text-warning border-warning">{p.cycles_since_last}+ cycles ago</Badge>
                          )}
                          {p.recommended && (
                            <Badge variant="secondary" className="text-[10px]">Recommended</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-1">{p.description}</p>
                        <div className="flex gap-0.5">
                          {[1, 2, 3, 4, 5].map((l) => (
                            <div key={l} className={`h-1.5 w-3 rounded-full ${l <= p.current_level ? "bg-accent" : "bg-muted"}`} />
                          ))}
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-accent transition-colors" />
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {state === "up_to_date" && (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h1 className="font-serif text-2xl font-bold">
                {activeCycle ? "You're Up To Date" : "Cycle Complete!"}
              </h1>
              <p className="text-sm text-muted-foreground">
                {activeCycle ? "What would you like to do next?" : "Great work. What's next?"}
              </p>
            </div>

            {activeCycle ? (
              <div className="space-y-3">
                <Card className="border-accent/30 cursor-pointer hover:border-accent/60 transition-colors" onClick={generateNextSection}>
                  <CardContent className="flex items-center gap-4 py-5">
                    <ArrowRight className="h-6 w-6 text-accent" />
                    <div className="flex-1">
                      <p className="font-serif font-semibold text-base">Next Section</p>
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm text-muted-foreground truncate">
                          {nextSectionTopic || (nextSectionType ? `${SECTION_DISPLAY_NAMES[nextSectionType] || nextSectionType}: ${activeCycle.theme}` : "Continue current cycle")}
                        </p>
                        {nextSectionIndex != null && (
                          <span className="text-xs text-muted-foreground whitespace-nowrap">{nextSectionIndex}/{cycleLength}</span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {lastSectionTopic && (
                  <div className="flex items-center gap-3 pt-1">
                    <Separator className="flex-1" />
                    <span className="text-xs text-muted-foreground whitespace-nowrap">Want to go deeper on {lastSectionTopic}?</span>
                    <Separator className="flex-1" />
                  </div>
                )}

                <div className="grid gap-3 grid-cols-2">
                  <Card
                    className={`border-border transition-colors ${bonusTriggered ? "opacity-50 pointer-events-none" : "cursor-pointer hover:border-accent/50"}`}
                    onClick={bonusTriggered ? undefined : generateBonus}
                  >
                    <CardContent className="flex items-center gap-3 py-4">
                      <Plus className={`h-5 w-5 ${bonusTriggered ? "text-muted-foreground" : "text-accent"}`} />
                      <div>
                        <p className="font-medium text-sm">Bonus Unit</p>
                        <p className="text-xs text-muted-foreground">{bonusTriggered ? "View in History" : "Different angle"}</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="border-border cursor-pointer hover:border-accent/50 transition-colors" onClick={() => navigate("/mentor")}>
                    <CardContent className="flex items-center gap-3 py-4">
                      <MessageSquare className="h-5 w-5 text-accent" />
                      <div>
                        <p className="font-medium text-sm">Talk to {mentorName}</p>
                        <p className="text-xs text-muted-foreground">Career guidance</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {lastSectionType ? (
                  <div className="grid gap-3 grid-cols-2">
                    <Card
                      className={`border-border transition-colors ${repeatTriggered ? "opacity-50 pointer-events-none" : "cursor-pointer hover:border-accent/50"}`}
                      onClick={repeatTriggered ? undefined : generateRepeatSection}
                    >
                      <CardContent className="flex items-center gap-3 py-4">
                        <RotateCcw className={`h-5 w-5 ${repeatTriggered ? "text-muted-foreground" : "text-accent"}`} />
                        <div>
                          <p className="font-medium text-sm">Another {SECTION_DISPLAY_NAMES[lastSectionType] || lastSectionType}</p>
                          <p className="text-xs text-muted-foreground">{repeatTriggered ? "View in History" : "Same type, fresh content"}</p>
                        </div>
                      </CardContent>
                    </Card>
                    <Card
                      className={`border-border transition-colors ${extraResourcesTriggered ? "opacity-50 pointer-events-none" : "cursor-pointer hover:border-accent/50"}`}
                      onClick={extraResourcesTriggered ? undefined : generateExtraResources}
                    >
                      <CardContent className="flex items-center gap-3 py-4">
                        {extraResourcesInner}
                      </CardContent>
                    </Card>
                  </div>
                ) : (
                  <Card
                    className={`border-border transition-colors ${extraResourcesTriggered ? "opacity-50 pointer-events-none" : "cursor-pointer hover:border-accent/50"}`}
                    onClick={extraResourcesTriggered ? undefined : generateExtraResources}
                  >
                    <CardContent className="flex items-center gap-3 py-4 justify-center">
                      {extraResourcesInner}
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <Card className="border-accent/30 cursor-pointer hover:border-accent/60 transition-colors" onClick={() => { loadPillarOptions(); setUiState("pillar_selection"); }}>
                  <CardContent className="flex items-center gap-4 py-5">
                    <Zap className="h-6 w-6 text-accent" />
                    <div className="flex-1">
                      <p className="font-serif font-semibold text-base">New Cycle</p>
                      <p className="text-sm text-muted-foreground">Pick a pillar and start learning</p>
                    </div>
                  </CardContent>
                </Card>

                {completedCycle?.theme && (
                  <div className="flex items-center gap-3 pt-1">
                    <Separator className="flex-1" />
                    <span className="text-xs text-muted-foreground whitespace-nowrap">Want to explore more of {completedCycle.theme}?</span>
                    <Separator className="flex-1" />
                  </div>
                )}

                <div className="grid gap-3 grid-cols-2">
                  <Card
                    className={`border-border transition-colors ${cycleRecapTriggered ? "opacity-50 pointer-events-none" : "cursor-pointer hover:border-accent/50"}`}
                    onClick={cycleRecapTriggered ? undefined : generateCycleRecap}
                  >
                    <CardContent className="flex items-center gap-3 py-4">
                      <BookOpen className={`h-5 w-5 ${cycleRecapTriggered ? "text-muted-foreground" : "text-accent"}`} />
                      <div>
                        <p className="font-medium text-sm">Cycle Recap</p>
                        <p className="text-xs text-muted-foreground">{cycleRecapTriggered ? "View in History" : "Summarize what you learned"}</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="border-border cursor-pointer hover:border-accent/50 transition-colors" onClick={() => navigate("/mentor")}>
                    <CardContent className="flex items-center gap-3 py-4">
                      <MessageSquare className="h-5 w-5 text-accent" />
                      <div>
                        <p className="font-medium text-sm">Talk to {mentorName}</p>
                        <p className="text-xs text-muted-foreground">Career guidance</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card
                  className={`border-border transition-colors ${extraResourcesTriggered ? "opacity-50 pointer-events-none" : "cursor-pointer hover:border-accent/50"}`}
                  onClick={extraResourcesTriggered ? undefined : generateExtraResources}
                >
                  <CardContent className="flex items-center gap-3 py-4 justify-center">
                    {extraResourcesInner}
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Dashboard;