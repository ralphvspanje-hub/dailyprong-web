import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { useDemo } from "@/hooks/useDemo";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface GenerationParams {
  action: "new_cycle" | "next_section" | "bonus" | "repeat_section" | "extra_resources" | "cycle_recap";
  pillar_id?: string;
  cycle_id?: string;
  section_type?: string;
  current_section_number?: number;
  last_section_topic?: string;
}

interface UnitGenerationContextType {
  isGenerating: boolean;
  pendingUnit: any | null;
  startGeneration: (params: GenerationParams) => void;
  clearPendingUnit: () => void;
}

const UnitGenerationContext = createContext<UnitGenerationContextType>({
  isGenerating: false,
  pendingUnit: null,
  startGeneration: () => {},
  clearPendingUnit: () => {},
});

export const UnitGenerationProvider = ({ children }: { children: ReactNode }) => {
  const { isDemo } = useDemo();
  const [isGenerating, setIsGenerating] = useState(false);
  const [pendingUnit, setPendingUnit] = useState<any | null>(null);

  const startGeneration = useCallback(
    (params: GenerationParams) => {
      if (isDemo) {
        toast.info("Unit generation requires an account. Sign up to get started!");
        return;
      }

      setIsGenerating(true);

      const body: Record<string, string | number> = { action: params.action };
      if (params.pillar_id) body.pillar_id = params.pillar_id;
      if (params.cycle_id) body.cycle_id = params.cycle_id;
      if (params.section_type) body.section_type = params.section_type;
      if (typeof params.current_section_number === "number") body.current_section_number = params.current_section_number;
      if (params.last_section_topic) body.last_section_topic = params.last_section_topic;

      const actionLabels: Record<string, string> = {
        new_cycle: "Unit",
        next_section: "Next section",
        bonus: "Bonus unit",
        repeat_section: "Repeat section",
        extra_resources: "Extra resources",
        cycle_recap: "Cycle recap",
      };
      const label = actionLabels[params.action] || "Unit";

      (async () => {
        try {
          const { data, error } = await supabase.functions.invoke("generate-unit", { body });
          if (error) {
            let msg = error.message;
            try {
              const errBody = await (error as any).context?.json();
              if (errBody?.error) msg = errBody.error;
            } catch {}
            throw new Error(msg);
          }

          if (["new_cycle", "bonus", "repeat_section", "extra_resources", "cycle_recap"].includes(params.action)) {
            const { unit_id } = data;
            const { data: unitRow, error: unitError } = await supabase
              .from("units")
              .select("*, cycles!inner(theme, pillars:pillar_id(name))")
              .eq("id", unit_id)
              .single();
            if (unitError) throw unitError;

            setPendingUnit({
              ...unitRow,
              cycle_theme: (unitRow as any).cycles?.theme,
              pillar_name: (unitRow as any).cycles?.pillars?.name,
            });
          }

          toast.success(`${label} generated!`);
        } catch (err: any) {
          const message = err.message || "Generation failed";
          toast.error(`Failed to generate: ${message}`);
        } finally {
          setIsGenerating(false);
        }
      })();
    },
    [isDemo],
  );

  const clearPendingUnit = useCallback(() => {
    setPendingUnit(null);
  }, []);

  return (
    <UnitGenerationContext.Provider
      value={{ isGenerating, pendingUnit, startGeneration, clearPendingUnit }}
    >
      {children}
    </UnitGenerationContext.Provider>
  );
};

export const useUnitGeneration = () => useContext(UnitGenerationContext);
