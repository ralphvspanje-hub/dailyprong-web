import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Check } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

const MAX_FEEDBACK_NOTE_LENGTH = 500;

interface UnitData {
  id: string;
  section_number: number;
  section_type: string;
  topic: string;
  difficulty_level: number;
  content: string;
  is_bridge: boolean;
  bridge_prerequisite_for?: string;
  is_pending_feedback: boolean;
  cycle_theme?: string;
  pillar_name?: string;
  total_sections?: number;
  phase_name?: string;
}

interface UnitDisplayProps {
  unit: UnitData;
  onFeedback: (feedback: {
    difficulty: "too_easy" | "about_right" | "too_hard";
    value: "high" | "medium" | "low";
    note?: string;
  }) => void;
  feedbackLoading?: boolean;
}

export const UnitDisplay = ({ unit, onFeedback, feedbackLoading }: UnitDisplayProps) => {
  const [completed, setCompleted] = useState(false);
  const [difficulty, setDifficulty] = useState<"too_easy" | "about_right" | "too_hard" | null>(null);
  const [value, setValue] = useState<"high" | "medium" | "low" | null>(null);
  const [note, setNote] = useState("");

  const handleSubmit = () => {
    if (!difficulty || !value) {
      toast.error("Please select both difficulty and value ratings.");
      return;
    }
    onFeedback({ difficulty, value, note: note.trim() || undefined });
  };

  const sectionTypes: Record<string, string> = {
    concept: "Concept", deep_dive: "Deep Dive", case_study: "Case Study",
    hands_on: "Hands-On", synthesis: "Synthesis",
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="space-y-6">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span>Section {unit.section_number}{unit.total_sections ? ` of ${unit.total_sections}` : ""}</span>
          <span>·</span><span>{unit.cycle_theme}</span><span>·</span><span>{unit.pillar_name}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{sectionTypes[unit.section_type] || unit.section_type}</Badge>
          <div className="flex gap-0.5">
            {[1, 2, 3, 4, 5].map((l) => (
              <div key={l} className={`h-1.5 w-3 rounded-full ${l <= unit.difficulty_level ? "bg-accent" : "bg-muted"}`} />
            ))}
          </div>
          {unit.phase_name && <span className="text-xs text-muted-foreground">{unit.phase_name}</span>}
          {unit.is_bridge && (
            <Badge variant="outline" className="text-warning border-warning">Bridge: prerequisite for {unit.bridge_prerequisite_for}</Badge>
          )}
        </div>
        <h1 className="font-serif text-2xl md:text-3xl font-bold">{unit.topic}</h1>
      </div>

      <Separator />

      <div className="prose-powerhouse max-w-none">
        <ReactMarkdown>{unit.content}</ReactMarkdown>
      </div>

      <Separator />

      {unit.is_pending_feedback && (
        <div className="space-y-4">
          {!completed ? (
            <Button onClick={() => setCompleted(true)} variant="outline" className="w-full gap-2">
              <Check className="h-4 w-4" />
              I've completed this unit
            </Button>
          ) : (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="space-y-4">
              <Card className="border-border">
                <CardContent className="pt-4 space-y-4">
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Difficulty</p>
                    <div className="flex gap-2">
                      {(["too_easy", "about_right", "too_hard"] as const).map((d) => (
                        <Button key={d} variant={difficulty === d ? "default" : "outline"} size="sm" onClick={() => setDifficulty(d)} className="flex-1 capitalize">
                          {d.replace("_", " ")}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Value</p>
                    <div className="flex gap-2">
                      {(["high", "medium", "low"] as const).map((v) => (
                        <Button key={v} variant={value === v ? "default" : "outline"} size="sm" onClick={() => setValue(v)} className="flex-1 capitalize">{v}</Button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">Notes (optional)</p>
                      <span className="text-[10px] text-muted-foreground">{note.length}/{MAX_FEEDBACK_NOTE_LENGTH}</span>
                    </div>
                    <Input
                      value={note}
                      onChange={(e) => setNote(e.target.value.slice(0, MAX_FEEDBACK_NOTE_LENGTH))}
                      placeholder="Any thoughts on this unit..."
                    />
                  </div>
                  <Button onClick={handleSubmit} disabled={!difficulty || !value || feedbackLoading} className="w-full">
                    {feedbackLoading ? "Submitting..." : "Submit Feedback"}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </div>
      )}
    </motion.div>
  );
};