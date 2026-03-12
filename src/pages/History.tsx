import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useDemo, DEMO_UNITS, DEMO_PILLARS } from "@/hooks/useDemo";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Loader2, Search, ChevronDown } from "lucide-react";
import ReactMarkdown from "react-markdown";

const History = () => {
  const { user } = useAuth();
  const { isDemo } = useDemo();
  const [units, setUnits] = useState<any[]>([]);
  const [pillars, setPillars] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [pillarFilter, setPillarFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  useEffect(() => {
    if (isDemo) {
      setUnits(DEMO_UNITS);
      setPillars(DEMO_PILLARS);
      setLoading(false);
    } else if (user) {
      loadHistory();
    }
  }, [user, isDemo]);

  const loadHistory = async () => {
    const [unitsRes, pillarsRes] = await Promise.all([
      supabase
        .from("units")
        .select("*, cycles!inner(user_id, theme, cycle_number, pillar_id, pillars:pillar_id(name))")
        .eq("cycles.user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(100),
      supabase.from("pillars").select("id, name").eq("user_id", user!.id).eq("is_active", true),
    ]);
    setUnits(unitsRes.data || []);
    setPillars(pillarsRes.data || []);
    setLoading(false);
  };

  const filtered = units.filter((u) => {
    if (search && !u.topic?.toLowerCase().includes(search.toLowerCase()) && !u.content?.toLowerCase().includes(search.toLowerCase())) return false;
    if (pillarFilter !== "all" && u.pillar_id !== pillarFilter) return false;
    if (typeFilter !== "all" && u.section_type !== typeFilter) return false;
    return true;
  });

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
      <div className="max-w-3xl mx-auto space-y-6">
        <h1 className="font-serif text-2xl font-bold">History</h1>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search topics..." className="pl-9" />
          </div>
          <Select value={pillarFilter} onValueChange={setPillarFilter}>
            <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Pillar" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Pillars</SelectItem>
              {pillars.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="concept">Concept</SelectItem>
              <SelectItem value="deep_dive">Deep Dive</SelectItem>
              <SelectItem value="case_study">Case Study</SelectItem>
              <SelectItem value="hands_on">Hands-On</SelectItem>
              <SelectItem value="synthesis">Synthesis</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          {filtered.map((u) => (
            <Collapsible key={u.id}>
              <CollapsibleTrigger className="w-full">
                <Card className="border-border hover:border-accent/30 transition-colors">
                  <CardContent className="flex items-center justify-between py-3">
                    <div className="text-left space-y-0.5 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium">{u.topic}</span>
                        <Badge variant="secondary" className="text-[10px] capitalize">{u.section_type?.replace("_", " ")}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {(u as any).cycles?.pillars?.name} · Cycle {(u as any).cycles?.cycle_number}
                        {u.feedback_difficulty && ` · ${u.feedback_difficulty.replace("_", " ")}`}
                      </p>
                    </div>
                    <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0 ml-2" />
                  </CardContent>
                </Card>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <Card className="border-border border-t-0 rounded-t-none">
                  <CardContent className="py-4">
                    <div className="prose-powerhouse text-sm max-w-none">
                      <ReactMarkdown>{u.content || "No content available."}</ReactMarkdown>
                    </div>
                    {(u.feedback_difficulty || u.feedback_value) && (
                      <div className="flex gap-2 mt-4 pt-3 border-t border-border">
                        {u.feedback_difficulty && <Badge variant="outline" className="text-[10px] capitalize">{u.feedback_difficulty.replace("_", " ")}</Badge>}
                        {u.feedback_value && <Badge variant="outline" className="text-[10px] capitalize">{u.feedback_value} value</Badge>}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </CollapsibleContent>
            </Collapsible>
          ))}
          {filtered.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              {units.length === 0 ? "No units yet. Start learning from the dashboard!" : "No matches found."}
            </p>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default History;
