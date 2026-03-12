import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useDemo } from "@/hooks/useDemo";
import { supabase } from "@/integrations/supabase/client";

export const useMentorName = () => {
  const { user } = useAuth();
  const { isDemo } = useDemo();
  const [mentorName, setMentorName] = useState("Mentor");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isDemo) {
      setMentorName("Sage");
      setLoading(false);
      return;
    }
    if (!user) {
      setLoading(false);
      return;
    }

    const load = async () => {
      const { data } = await supabase
        .from("user_profile")
        .select("mentor_name")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data?.mentor_name) {
        setMentorName(data.mentor_name);
      }
      setLoading(false);
    };
    load();
  }, [user, isDemo]);

  return { mentorName, setMentorName, loading };
};