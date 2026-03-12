import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Send, Loader2, Zap, ChevronDown, Check } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface Pillar {
  name: string;
  description: string;
  why_it_matters: string;
  starting_level: number;
  key_topics: string[];
}

interface Phase {
  name: string;
  timeline_start: string;
  timeline_end: string;
  goal: string;
  weights: Record<string, number>;
}

interface TopicCluster {
  pillar: string;
  cluster_name: string;
  subtopics: string[];
  difficulty_level: number;
}

interface OnboardingOutputs {
  pillars: Pillar[];
  phases: Phase[];
  topicMap: TopicCluster[];
}

const MAX_ONBOARDING_MSG_LENGTH = 3000;

const Onboarding = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState<"chat" | "review">("chat");
  const [outputs, setOutputs] = useState<OnboardingOutputs | null>(null);
  const [saving, setSaving] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (messages.length === 0) {
      startConversation();
    }
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const startConversation = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("onboarding-chat", {
        body: { messages: [], action: "start" },
      });
      if (error) throw error;
      if (data.message) {
        setMessages([{ role: "assistant", content: data.message }]);
      }
      await supabase.from("onboarding_conversations").upsert({
        user_id: user!.id,
        messages: [{ role: "assistant", content: data.message }],
        status: "in_progress",
      });
    } catch (err: any) {
      toast.error("Failed to start conversation: " + err.message);
    }
    setLoading(false);
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMessage = input.trim();
    if (userMessage.length > MAX_ONBOARDING_MSG_LENGTH) {
      toast.error(`Message too long. Max ${MAX_ONBOARDING_MSG_LENGTH} characters.`);
      return;
    }
    setInput("");
    const newMessages = [...messages, { role: "user" as const, content: userMessage }];
    setMessages(newMessages);
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("onboarding-chat", {
        body: { messages: newMessages, action: "continue" },
      });
      if (error) throw error;

      if (data.outputs) {
        setOutputs(data.outputs);
        setPhase("review");
        setMessages([...newMessages, { role: "assistant", content: data.message || "Here's what I've prepared for you:" }]);
      } else if (data.message) {
        setMessages([...newMessages, { role: "assistant", content: data.message }]);
      }

      await supabase.from("onboarding_conversations").update({
        messages: [...newMessages, { role: "assistant", content: data.message }],
        status: data.outputs ? "completed" : "in_progress",
      }).eq("user_id", user!.id);
    } catch (err: any) {
      toast.error("Failed to send message: " + err.message);
    }
    setLoading(false);
    inputRef.current?.focus();
  };

  const handleConfirm = async () => {
    if (!outputs || !user) return;
    setSaving(true);
    try {
      await supabase.from("user_profile").upsert({
        user_id: user.id,
        name: user.email?.split("@")[0] || "Learner",
      });

      for (let i = 0; i < outputs.pillars.length; i++) {
        const p = outputs.pillars[i];
        const { data: pillarData } = await supabase.from("pillars").insert({
          user_id: user.id,
          name: p.name,
          description: p.description,
          why_it_matters: p.why_it_matters,
          starting_level: p.starting_level,
          current_level: p.starting_level,
          sort_order: i,
        }).select().single();

        if (pillarData) {
          const topics = outputs.topicMap.filter((t) => t.pillar === p.name);
          for (let j = 0; j < topics.length; j++) {
            await supabase.from("topic_map").insert({
              pillar_id: pillarData.id,
              cluster_name: topics[j].cluster_name,
              subtopics: topics[j].subtopics,
              difficulty_level: topics[j].difficulty_level,
              priority_order: j,
            });
          }
        }
      }

      for (let i = 0; i < outputs.phases.length; i++) {
        const ph = outputs.phases[i];
        await supabase.from("phases").insert({
          user_id: user.id,
          name: ph.name,
          timeline_start: ph.timeline_start,
          timeline_end: ph.timeline_end,
          goal: ph.goal,
          is_active: i === 0,
          sort_order: i,
        });
      }

      await supabase.from("onboarding_conversations").update({ status: "completed" }).eq("user_id", user.id);
      toast.success("Setup complete! Let's start learning.");
      navigate("/dashboard");
    } catch (err: any) {
      toast.error("Failed to save: " + err.message);
    }
    setSaving(false);
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="container flex h-14 items-center gap-2">
          <Zap className="h-5 w-5 text-accent" />
          <span className="font-serif text-lg font-bold">DailyProng Setup</span>
        </div>
      </header>

      <div className="flex-1 container max-w-2xl py-6">
        {phase === "chat" && (
          <div className="flex flex-col h-[calc(100vh-10rem)]">
            <ScrollArea className="flex-1 pr-4">
              <div className="space-y-4 pb-4">
                <AnimatePresence>
                  {messages.map((msg, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                      className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div className={`max-w-[85%] rounded-lg px-4 py-3 text-sm leading-relaxed ${
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-card text-card-foreground border border-border"
                      }`}>
                        {msg.content}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
                {loading && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                    <div className="bg-card border border-border rounded-lg px-4 py-3">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                  </motion.div>
                )}
                <div ref={scrollRef} />
              </div>
            </ScrollArea>

            <div className="pt-4 border-t border-border space-y-1">
              <div className="flex gap-2">
                <Input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value.slice(0, MAX_ONBOARDING_MSG_LENGTH))}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
                  placeholder="Tell me about your goals..."
                  disabled={loading}
                  className="flex-1"
                />
                <Button onClick={sendMessage} disabled={loading || !input.trim()} size="icon">
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground text-right">{input.length}/{MAX_ONBOARDING_MSG_LENGTH}</p>
            </div>
          </div>
        )}

        {phase === "review" && outputs && (
          <div className="space-y-8">
            <div className="text-center space-y-2">
              <h1 className="font-serif text-3xl font-bold">Your Learning Blueprint</h1>
              <p className="text-muted-foreground">Review and confirm your personalized learning plan.</p>
            </div>

            <section className="space-y-4">
              <h2 className="font-serif text-xl font-semibold">Strategic Pillars</h2>
              <div className="grid gap-4 md:grid-cols-2">
                {outputs.pillars.map((p, i) => (
                  <Card key={i} className="border-border">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base font-serif">{p.name}</CardTitle>
                      <CardDescription className="text-xs">{p.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <p className="text-xs text-muted-foreground">{p.why_it_matters}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Level:</span>
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map((l) => (
                            <div key={l} className={`h-2 w-2 rounded-full ${l <= p.starting_level ? "bg-accent" : "bg-muted"}`} />
                          ))}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {p.key_topics?.map((t, j) => (
                          <Badge key={j} variant="secondary" className="text-[10px]">{t}</Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="font-serif text-xl font-semibold">Career Phases</h2>
              <div className="space-y-3">
                {outputs.phases.map((ph, i) => (
                  <Card key={i} className="border-border">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-serif">{ph.name}</CardTitle>
                        <span className="text-xs text-muted-foreground">{ph.timeline_start} → {ph.timeline_end}</span>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-xs text-muted-foreground mb-2">{ph.goal}</p>
                      {ph.weights && (
                        <div className="flex gap-1 h-3 rounded-full overflow-hidden bg-muted">
                          {Object.entries(ph.weights).map(([name, weight], j) => (
                            <div key={j} className="bg-accent/70 first:rounded-l-full last:rounded-r-full" style={{ width: `${weight}%` }} title={`${name}: ${weight}%`} />
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="font-serif text-xl font-semibold">Topic Map</h2>
              {outputs.pillars.map((p, i) => {
                const topics = outputs.topicMap.filter((t) => t.pillar === p.name);
                return (
                  <Collapsible key={i}>
                    <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-card border border-border rounded-lg hover:bg-secondary transition-colors">
                      <span className="font-serif text-sm font-medium">{p.name}</span>
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-1 space-y-1">
                      {topics.map((t, j) => (
                        <div key={j} className="pl-4 py-2 border-l-2 border-border ml-4">
                          <span className="text-sm font-medium">{t.cluster_name}</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {t.subtopics.map((s, k) => (
                              <Badge key={k} variant="outline" className="text-[10px]">{s}</Badge>
                            ))}
                          </div>
                        </div>
                      ))}
                    </CollapsibleContent>
                  </Collapsible>
                );
              })}
            </section>

            <div className="flex gap-3 justify-center pt-4 pb-8">
              <Button variant="outline" onClick={() => setPhase("chat")}>Adjust Something</Button>
              <Button onClick={handleConfirm} disabled={saving} className="gap-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Confirm & Start Learning
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Onboarding;
