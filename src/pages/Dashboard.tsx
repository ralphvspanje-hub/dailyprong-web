import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useDemo, DEMO_PENDING_UNIT, DEMO_PILLARS, DEMO_CYCLES } from "@/hooks/useDemo";
import { useMentorName } from "@/hooks/useMentorName";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/Layout";
import { UnitDisplay } from "@/components/UnitDisplay";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Zap, ArrowRight, Plus, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

type DashboardState = "loading" | "needs_onboarding" | "pending_feedback" | "pillar_selection" | "generating" | "up_to_date";

interface PillarOption {
  id: string;
  name: string;
  current_level: number;
  description: string;
  cycles_since_last: number;
  recommended: boolean;
}

const Dashboard = () => {
  const { user } = useAuth();
  const { isDemo } = useDemo();
  const { mentorName } = useMentorName();
  const navigate = useNavigate();
  const [state, setState] = useState<DashboardState>("loading");
  const [pendingUnit, setPendingUnit] = useState<any>(null);
  const [pillarOptions, setPillarOptions] = useState<PillarOption[]>([]);
  const [activeCycle, setActiveCycle] = useState<any>(null);
  const [feedbackLoading, setFeedbackLoading] = useState(false);

  useEffect(() => {
    if (isDemo) {
      loadDemoState();
    } else if (user) {
      loadDashboardState();
    }
  }, [user, isDemo]);

  const loadDemoState = () => {
    setPendingUnit(DEMO_PENDING_UNIT);
    setActiveCycle(DEMO_CYCLES.find(c => c.status === "active"));
    setState("pending_feedback");
  };

  const loadDashboardState = async () => {
    setState("loading");
    try {
      const { data: profile } = await supabase
        .from("user_profile").select("*").eq("user_id", user!.id).maybeSingle();
      if (!profile) { setState("needs_onboarding"); return; }

      const { data: pendingUnits } = await supabase
        .from("units")
        .select("*, cycles!inner(user_id, theme, pillar_id, pillars:pillar_id(name))")
        .eq("is_pending_feedback", true)
        .eq("cycles.user_id", user!.id)
        .limit(1);

      if (pendingUnits && pendingUnits.length > 0) {
        const unit = pendingUnits[0];
        setPendingUnit({
          ...unit,
          cycle_theme: (unit as any).cycles?.theme,
          pillar_name: (unit as any).cycles?.pillars?.name,
        });
        setState("pending_feedback");
        return;
      }

      const { data: cycles } = await supabase
        .from("cycles").select("*").eq("user_id", user!.id).eq("status", "active").limit(1);

      if (cycles && cycles.length > 0) {
        setActiveCycle(cycles[0]);
        setState("up_to_date");
        return;
      }

      await loadPillarOptions();
      setState("pillar_selection");
    } catch (err: any) {
      toast.error("Failed to load dashboard: " + err.message);
      setState("up_to_date");
    }
  };

  const loadPillarOptions = async () => {
    if (isDemo) {
      setPillarOptions(DEMO_PILLARS.map(p => ({
        id: p.id, name: p.name, current_level: p.current_level, description: p.description,
        cycles_since_last: p.id === "p4" ? 999 : 1,
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
      const cyclesSince = lastCycle ? maxCycle - lastCycle.cycle_number : 999;
      return {
        id: p.id, name: p.name, current_level: p.current_level, description: p.description || "",
        cycles_since_last: cyclesSince, recommended: cyclesSince >= 3 || (p.phase_weight ?? 0) > 25,
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
      setState("up_to_date");
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
      loadDashboardState();
    } catch (err: any) {
      toast.error("Failed to submit feedback: " + err.message);
    }
    setFeedbackLoading(false);
  };

  const selectPillar = async (pillarId: string) => {
    if (isDemo) { toast.info("Unit generation requires an account. Sign up to get started!"); return; }
    setState("generating");
    try {
      const { data, error } = await supabase.functions.invoke("generate-unit", {
        body: { pillar_id: pillarId, action: "new_cycle" },
      });
      if (error) throw error;
      toast.success("Unit generated!");
      loadDashboardState();
    } catch (err: any) {
      toast.error("Failed to generate unit: " + err.message);
      setState("pillar_selection");
    }
  };

  const generateNextSection = async () => {
    if (isDemo) { toast.info("Unit generation requires an account. Sign up to get started!"); return; }
    if (!activeCycle) return;
    setState("generating");
    try {
      const { error } = await supabase.functions.invoke("generate-unit", {
        body: { cycle_id: activeCycle.id, action: "next_section" },
      });
      if (error) throw error;
      toast.success("Next section generated!");
      loadDashboardState();
    } catch (err: any) {
      toast.error("Failed to generate: " + err.message);
      setState("up_to_date");
    }
  };

  const generateBonus = async () => {
    if (isDemo) { toast.info("Unit generation requires an account. Sign up to get started!"); return; }
    if (!activeCycle) return;
    setState("generating");
    try {
      const { error } = await supabase.functions.invoke("generate-unit", {
        body: { cycle_id: activeCycle.id, action: "bonus" },
      });
      if (error) throw error;
      toast.success("Bonus unit generated!");
      loadDashboardState();
    } catch (err: any) {
      toast.error("Failed to generate bonus: " + err.message);
      setState("up_to_date");
    }
  };

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
                          {p.cycles_since_last >= 3 && (
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
              <h1 className="font-serif text-2xl font-bold">You're Up To Date</h1>
              <p className="text-sm text-muted-foreground">What would you like to do next?</p>
            </div>

            <div className="space-y-3">
              {activeCycle && (
                <Card className="border-accent/30 cursor-pointer hover:border-accent/60 transition-colors" onClick={generateNextSection}>
                  <CardContent className="flex items-center gap-4 py-5">
                    <ArrowRight className="h-6 w-6 text-accent" />
                    <div className="flex-1">
                      <p className="font-serif font-semibold text-base">Next Section</p>
                      <p className="text-sm text-muted-foreground">Continue current cycle</p>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="grid gap-3 grid-cols-2">
                {activeCycle && (
                  <Card className="border-border cursor-pointer hover:border-accent/50 transition-colors" onClick={generateBonus}>
                    <CardContent className="flex items-center gap-3 py-4">
                      <Plus className="h-5 w-5 text-accent" />
                      <div>
                        <p className="font-medium text-sm">Bonus Unit</p>
                        <p className="text-xs text-muted-foreground">Different angle</p>
                      </div>
                    </CardContent>
                  </Card>
                )}
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

              {!activeCycle && (
                <Card className="border-border cursor-pointer hover:border-accent/50 transition-colors" onClick={() => { loadPillarOptions(); setState("pillar_selection"); }}>
                  <CardContent className="flex items-center gap-3 py-4">
                    <Zap className="h-5 w-5 text-accent" />
                    <div>
                      <p className="font-medium text-sm">New Cycle</p>
                      <p className="text-xs text-muted-foreground">Pick a pillar and start learning</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Dashboard;