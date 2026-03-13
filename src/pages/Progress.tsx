import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useDemo, DEMO_PILLARS, DEMO_CYCLES } from "@/hooks/useDemo";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, TrendingUp, TrendingDown, Minus } from "lucide-react";

const Progress = () => {
  const { user } = useAuth();
  const { isDemo } = useDemo();

  const { data: pillars = [], isLoading: pillarsLoading } = useQuery({
    queryKey: ["pillars", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("pillars").select("*").eq("user_id", user!.id).eq("is_active", true).order("sort_order");
      return data || [];
    },
    enabled: !isDemo && !!user,
    placeholderData: isDemo ? DEMO_PILLARS : undefined,
  });

  const { data: cycles = [], isLoading: cyclesLoading } = useQuery({
    queryKey: ["cycles", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("cycles").select("*, pillars:pillar_id(name)").eq("user_id", user!.id).order("cycle_number", { ascending: false }).limit(20);
      return data || [];
    },
    enabled: !isDemo && !!user,
    placeholderData: isDemo ? DEMO_CYCLES : undefined,
  });

  const loading = pillarsLoading || cyclesLoading;

  const trendIcon = (trend: string) => {
    if (trend === "up") return <TrendingUp className="h-4 w-4 text-success" />;
    if (trend === "down") return <TrendingDown className="h-4 w-4 text-destructive" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  const completedCycles = cycles.filter((c) => c.status === "completed").length;

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-accent" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-3xl mx-auto space-y-8">
        <div>
          <h1 className="font-serif text-2xl font-bold">Progress</h1>
          <p className="text-sm text-muted-foreground mt-1">{completedCycles} cycles completed</p>
        </div>

        <section className="space-y-4">
          <h2 className="font-serif text-lg font-semibold">Pillars</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {pillars.map((p) => (
              <Card key={p.id} className="border-border">
                <CardContent className="py-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-serif font-semibold text-sm">{p.name}</span>
                    {trendIcon(p.trend)}
                  </div>
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((l) => (
                      <div key={l} className={`h-2 w-full rounded-full ${l <= p.current_level ? "bg-accent" : "bg-muted"}`} />
                    ))}
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Level {p.current_level}/5</span>
                    <span>Weight: {p.phase_weight}%</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="font-serif text-lg font-semibold">Recent Cycles</h2>
          <div className="space-y-2">
            {cycles.map((c) => (
              <Card key={c.id} className="border-border">
                <CardContent className="flex items-center justify-between py-3">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">Cycle {c.cycle_number}</span>
                      <Badge variant={c.status === "completed" ? "secondary" : "outline"} className="text-[10px]">{c.status}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {(c as any).pillars?.name} · {c.theme || "—"}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
            {cycles.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">No cycles yet. Start learning from the dashboard!</p>
            )}
          </div>
        </section>
      </div>
    </Layout>
  );
};

export default Progress;
