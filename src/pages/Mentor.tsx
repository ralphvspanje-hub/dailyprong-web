import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useDemo, DEMO_MENTOR_MESSAGES } from "@/hooks/useDemo";
import { useMentorName } from "@/hooks/useMentorName";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Loader2, Plus, ArrowLeftRight, Pencil, BarChart3, Trash2, RefreshCw, Check, X } from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
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

const TEXTAREA_BASE =
  "w-full resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none [&::-webkit-scrollbar]:w-2.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-track]:mt-5 [&::-webkit-scrollbar-track]:pb-2 [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:border-[3px] [&::-webkit-scrollbar-thumb]:border-transparent [&::-webkit-scrollbar-thumb]:bg-clip-content [&::-webkit-scrollbar-thumb:hover]:bg-muted-foreground";

const Mentor = () => {
  const { user } = useAuth();
  const { isDemo } = useDemo();
  const { mentorName } = useMentorName();
  const isMobile = useIsMobile();
  const [messages, setMessages] = useState<MentorMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(false);
  const [applyingChanges, setApplyingChanges] = useState<string | null>(null);
  const [dismissedChanges, setDismissedChanges] = useState<Set<number>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const didShowEmpty = useRef(false);

  useEffect(() => {
    if (isDemo) {
      setMessages(DEMO_MENTOR_MESSAGES as MentorMessage[]);
    }
  }, [isDemo]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleTextareaInput = (e: React.FormEvent<HTMLTextAreaElement>) => {
    const el = e.currentTarget;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 200) + "px";
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const sendMessage = async (text?: string) => {
    const messageText = text || input.trim();
    if (!messageText || loading) return;
    if (messageText.length > MAX_MENTOR_MSG_LENGTH) {
      toast.error(`Message too long. Max ${MAX_MENTOR_MSG_LENGTH} characters.`);
      return;
    }

    if (!text) {
      setInput("");
      if (inputRef.current) inputRef.current.style.height = "auto";
    }

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
      await supabase.from("mentor_conversations").insert({
        user_id: user!.id,
        role: "user",
        content: messageText,
      });

      const { data, error } = await supabase.functions.invoke("mentor-chat", {
        body: { message: messageText },
      });
      if (error) {
        let msg = error.message;
        try {
          const body = await (error as any).context?.json();
          if (body?.error) msg = body.error;
        } catch {}
        throw new Error(msg);
      }

      const assistantMsg: MentorMessage = { role: "assistant", content: data.message };
      setMessages([...newMessages, assistantMsg]);

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
      if (error) {
        let msg = error.message;
        try {
          const body = await (error as any).context?.json();
          if (body?.error) msg = body.error;
        } catch {}
        throw new Error(msg);
      }

      toast.success("Changes applied!");
      window.location.reload();
    } catch (err: any) {
      toast.error("Failed to apply changes: " + err.message);
    }
    setApplyingChanges(null);
  };

  const hasConversation = messages.length > 0;
  const showEmptyState = !isMobile && !hasConversation;

  if (showEmptyState) didShowEmpty.current = true;

  const openingMessage = `Hey! I'm ${mentorName} — your learning strategist. I know your Prongs, your pillars, and where you're headed. Think of me as a thinking partner who asks before they act. What's on your mind?`;

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
        ) : (
          <AnimatePresence mode="wait">
            {showEmptyState ? (
              /* ── Desktop Empty State ── */
              <motion.div
                key="empty"
                className="flex flex-col items-center justify-center min-h-[calc(100dvh-10rem)]"
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.25 }}
              >
                <div className="mb-8 max-w-lg w-full">
                  <div className="bg-card text-card-foreground border border-border rounded-lg px-4 py-3 text-sm leading-relaxed">
                    <ReactMarkdown>{openingMessage}</ReactMarkdown>
                  </div>
                </div>

                <div className="w-full max-w-[680px] space-y-3">
                  <div className="flex flex-col border border-border bg-background rounded-2xl focus-within:ring-2 focus-within:ring-accent/50 focus-within:border-accent transition-shadow pr-2">
                    <div className="relative overflow-hidden rounded-t-2xl">
                      <textarea
                        ref={inputRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value.slice(0, MAX_MENTOR_MSG_LENGTH))}
                        onInput={handleTextareaInput}
                        onKeyDown={handleKeyDown}
                        placeholder={`Ask ${mentorName} anything...`}
                        disabled={loading}
                        rows={1}
                        className={`${TEXTAREA_BASE} min-h-[80px] max-h-[200px] px-4 pt-5 pb-3`}
                        autoFocus
                      />
                      <div className="pointer-events-none absolute inset-x-0 top-0 h-5 bg-background rounded-t-2xl" />
                    </div>
                    <div className="flex items-center justify-between px-4 pb-2">
                      <span className="text-[10px] text-muted-foreground">
                        {input.length}/{MAX_MENTOR_MSG_LENGTH}
                      </span>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() => sendMessage()}
                            disabled={loading || !input.trim()}
                            className={`h-8 w-8 rounded-full flex items-center justify-center transition-colors ${
                              input.trim()
                                ? "text-foreground hover:bg-muted"
                                : "text-muted-foreground"
                            }`}
                          >
                            <Send className="h-4 w-4" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>Send</TooltipContent>
                      </Tooltip>
                    </div>
                  </div>

                  <div className="flex flex-wrap justify-center gap-2">
                    {QUICK_ACTIONS.map((action) => (
                      <button
                        key={action.label}
                        onClick={() => sendMessage(action.message)}
                        disabled={loading}
                        className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:border-foreground/20 transition-colors disabled:opacity-50"
                      >
                        <action.icon className="h-3 w-3" />
                        {action.label}
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            ) : (
              /* ── Active Conversation ── */
              <motion.div
                key="active"
                initial={!isMobile && didShowEmpty.current ? { opacity: 0, y: 20 } : false}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                onAnimationComplete={() => inputRef.current?.focus()}
                className="flex flex-col h-[calc(100dvh-10rem)] md:h-[calc(100dvh-7rem)]"
              >
                <ScrollArea className="flex-1">
                  <div className="space-y-4 pt-4 pb-4 pr-2">
                    <AnimatePresence>
                      {messages.map((msg, i) => {
                        const { cleanContent, changes } =
                          msg.role === "assistant"
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
                              <div
                                className={`rounded-lg px-4 py-3 text-sm leading-relaxed ${
                                  msg.role === "user"
                                    ? "bg-accent text-accent-foreground"
                                    : "bg-card text-card-foreground border border-border"
                                }`}
                              >
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

                {/* Pinned input bar */}
                <div className="pt-3 space-y-2 backdrop-blur-sm bg-background/80">
                  <div className="flex flex-wrap gap-1.5">
                    {QUICK_ACTIONS.map((action) => (
                      <button
                        key={action.label}
                        onClick={() => sendMessage(action.message)}
                        disabled={loading}
                        className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-[11px] text-muted-foreground hover:text-foreground hover:border-foreground/20 transition-colors disabled:opacity-50"
                      >
                        <action.icon className="h-3 w-3" />
                        {action.label}
                      </button>
                    ))}
                  </div>

                  <div className="flex flex-col border border-border bg-background rounded-xl focus-within:ring-2 focus-within:ring-accent/50 focus-within:border-accent transition-shadow pr-2">
                    <div className="relative overflow-hidden rounded-t-xl">
                      <textarea
                        ref={inputRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value.slice(0, MAX_MENTOR_MSG_LENGTH))}
                        onInput={handleTextareaInput}
                        onKeyDown={handleKeyDown}
                        placeholder={`Ask ${mentorName} anything...`}
                        disabled={loading}
                        rows={1}
                        className={`${TEXTAREA_BASE} min-h-[56px] max-h-[200px] px-4 pt-5 pb-3`}
                      />
                      <div className="pointer-events-none absolute inset-x-0 top-0 h-5 bg-background rounded-t-xl" />
                    </div>
                    <div className="flex items-center justify-between px-4 pb-2">
                      <span className="text-[10px] text-muted-foreground">
                        {input.length}/{MAX_MENTOR_MSG_LENGTH}
                      </span>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() => sendMessage()}
                            disabled={loading || !input.trim()}
                            className={`h-8 w-8 rounded-full flex items-center justify-center transition-colors ${
                              loading || !input.trim()
                                ? "text-muted-foreground"
                                : "text-foreground hover:bg-muted"
                            }`}
                          >
                            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>Send</TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>
    </Layout>
  );
};

export default Mentor;
