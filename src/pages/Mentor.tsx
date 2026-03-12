import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useDemo, DEMO_MENTOR_MESSAGES, DEMO_PROFILE, DEMO_PILLARS } from "@/hooks/useDemo";
import { useMentorName } from "@/hooks/useMentorName";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Loader2, Plus, ArrowLeftRight, Pencil, BarChart3, Trash2, RefreshCw, Check, X } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";

interface MentorMessage {
  id?: string;
  role: "user" | "assistant";
  content: string;
  created_at?: string;
}

interface ProposedChanges {
  action: string;
  changes: any;
}

const MAX_MENTOR_MSG_LENGTH = 2000;

const QUICK_ACTIONS = [
  { label: "Add a Pillar", icon: Plus, message: "I want to add a new pillar to my learning plan." },
  { label: "Swap a Pillar", icon: ArrowLeftRight, message: "I want to swap out one of my existing pillars for a new one." },
  { label: "Edit a Pillar", icon: Pencil, message: "I want to edit one of my existing pillars." },
  { label: "Change Level", icon: BarChart3, message: "I want to reassess the difficulty level for one of my pillars. Can you ask me some questions to figure out the right level?" },
  { label: "Delete a Pillar", icon: Trash2, message: "I want to delete one of my pillars." },
  { label: "Full Recalibration", icon: RefreshCw, message: "I want to do a full recalibration of my entire learning plan and career goals." },
];

const parseProposedChanges = (content: string): { cleanContent: string; changes: ProposedChanges | null } => {
  const marker = "PROPOSED_CHANGES";
  const idx = content.indexOf(marker);
  if (idx === -1) return { cleanContent: content, changes: null };

  const cleanContent = content.substring(0, idx).trim();
  const jsonStr = content.substring(idx + marker.length).trim();
  try {
    const changes = JSON.parse(jsonStr);
    return { cleanContent, changes };
  } catch {
    return { cleanContent: content, changes: null };
  }
};

const Mentor = () => {
  const { user } = useAuth();
  const { isDemo } = useDemo();
  const { mentorName } = useMentorName();
  const [messages, setMessages] = useState<MentorMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [applyingChanges, setApplyingChanges] = useState<string | null>(null);
  const [dismissedChanges, setDismissedChanges] = useState<Set<number>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isDemo) {
      setMessages(DEMO_MENTOR_MESSAGES as MentorMessage[]);
      setInitialLoading(false);
    } else if (user) {
      loadMessages();
    }
  }, [user, isDemo]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadMessages = async () => {
    const { data } = await supabase
      .from("mentor_conversations")
      .select("*")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: true })
      .limit(100);
    setMessages((data as MentorMessage[]) || []);
    setInitialLoading(false);
  };

  const sendMessage = async (text?: string) => {
    const messageText = text || input.trim();
    if (!messageText || loading) return;
    if (messageText.length > MAX_MENTOR_MSG_LENGTH) {
      toast.error(`Message too long. Max ${MAX_MENTOR_MSG_LENGTH} characters.`);
      return;
    }

    if (!text) setInput("");

    const userMsg: MentorMessage = { role: "user", content: messageText };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setLoading(true);

    if (isDemo) {
      setTimeout(() => {
        const demoReply: MentorMessage = {
          role: "assistant",
          content: `That's a great direction! In demo mode, I can't make real changes, but in the full app I'd walk you through this step by step. Sign up to get started!`,
        };
        setMessages([...newMessages, demoReply]);
        setLoading(false);
      }, 1000);
      return;
    }

    try {
      // Save user message
      await supabase.from("mentor_conversations").insert({
        user_id: user!.id,
        role: "user",
        content: messageText,
      });

      const { data, error } = await supabase.functions.invoke("mentor-chat", {
        body: { message: messageText },
      });
      if (error) throw error;

      const assistantMsg: MentorMessage = { role: "assistant", content: data.message };
      setMessages([...newMessages, assistantMsg]);

      // Save assistant message
      await supabase.from("mentor_conversations").insert({
        user_id: user!.id,
        role: "assistant",
        content: data.message,
      });
    } catch (err: any) {
      toast.error("Failed to send message: " + err.message);
    }
    setLoading(false);
    inputRef.current?.focus();
  };

  const applyChanges = async (changes: ProposedChanges) => {
    if (isDemo) {
      toast.info("Sign up to apply changes!");
      return;
    }

    setApplyingChanges(changes.action);
    try {
      if (changes.action === "full_recalibration") {
        window.location.href = "/onboarding";
        return;
      }

      const { error } = await supabase.functions.invoke("apply-mentor-changes", {
        body: changes,
      });
      if (error) throw error;

      toast.success("Changes applied!");
      // Reload to reflect changes
      window.location.reload();
    } catch (err: any) {
      toast.error("Failed to apply changes: " + err.message);
    }
    setApplyingChanges(null);
  };

  const hasConversation = messages.length > 0;

  return (
    <Layout>
      <div className="max-w-2xl mx-auto">
        {isDemo && (
          <div className="mb-4 rounded-lg border border-accent/30 bg-accent/5 px-4 py-2 text-sm text-accent flex items-center justify-between">
            <span>👀 Demo Mode — Explore the app with sample data</span>
          </div>
        )}

        {initialLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-accent" />
          </div>
        ) : !hasConversation ? (
          /* Empty State */
          <div className="flex flex-col items-center justify-center py-16 space-y-8">
            <div className="text-center space-y-4 max-w-lg">
              <h1 className="font-serif text-3xl font-bold">Your {mentorName}</h1>
              <p className="text-muted-foreground leading-relaxed">
                Not just a learning engine — a thinking partner. Ask anything about your career direction, goals, or learning path. {mentorName} knows your pillars, your progress, and your trajectory. They ask before they act.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2 max-w-lg">
              {QUICK_ACTIONS.map((action) => (
                <Button
                  key={action.label}
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => sendMessage(action.message)}
                >
                  <action.icon className="h-3.5 w-3.5" />
                  {action.label}
                </Button>
              ))}
            </div>
          </div>
        ) : (
          /* Active Conversation */
          <div className="flex flex-col h-[calc(100vh-14rem)]">
            <ScrollArea className="flex-1 pr-4">
              <div className="space-y-4 pb-4">
                <AnimatePresence>
                  {messages.map((msg, i) => {
                    const { cleanContent, changes } = msg.role === "assistant"
                      ? parseProposedChanges(msg.content)
                      : { cleanContent: msg.content, changes: null };
                    const isDismissed = dismissedChanges.has(i);

                    return (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                        className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                      >
                        <div className="max-w-[85%] space-y-2">
                          <div className={`rounded-lg px-4 py-3 text-sm leading-relaxed ${
                            msg.role === "user"
                              ? "bg-primary text-primary-foreground"
                              : "bg-card text-card-foreground border border-border"
                          }`}>
                            {msg.role === "assistant" ? (
                              <div className="prose-powerhouse text-sm max-w-none">
                                <ReactMarkdown>{cleanContent}</ReactMarkdown>
                              </div>
                            ) : (
                              msg.content
                            )}
                          </div>
                          {changes && !isDismissed && (
                            <Card className="border-accent/30">
                              <CardContent className="py-3 space-y-3">
                                <p className="text-sm font-medium">Apply these changes?</p>
                                <p className="text-xs text-muted-foreground">
                                  Action: <span className="capitalize">{changes.action.replace(/_/g, " ")}</span>
                                </p>
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    className="gap-1"
                                    onClick={() => applyChanges(changes)}
                                    disabled={!!applyingChanges}
                                  >
                                    {applyingChanges === changes.action ? (
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : (
                                      <Check className="h-3 w-3" />
                                    )}
                                    Confirm
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="gap-1"
                                    onClick={() => setDismissedChanges(new Set([...dismissedChanges, i]))}
                                  >
                                    <X className="h-3 w-3" />
                                    Cancel
                                  </Button>
                                </div>
                              </CardContent>
                            </Card>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
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

            <div className="pt-4 border-t border-border space-y-2">
              <div className="flex flex-wrap gap-1.5">
                {QUICK_ACTIONS.map((action) => (
                  <Button
                    key={action.label}
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground"
                    onClick={() => sendMessage(action.message)}
                    disabled={loading}
                  >
                    <action.icon className="h-3 w-3" />
                    {action.label}
                  </Button>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value.slice(0, MAX_MENTOR_MSG_LENGTH))}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
                  placeholder={`Ask ${mentorName} anything...`}
                  disabled={loading}
                  className="flex-1"
                />
                <Button onClick={() => sendMessage()} disabled={loading || !input.trim()} size="icon">
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground text-right">{input.length}/{MAX_MENTOR_MSG_LENGTH}</p>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Mentor;