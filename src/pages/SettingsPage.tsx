import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useDemo, DEMO_PROFILE, DEMO_PILLARS } from "@/hooks/useDemo";
import { useMentorName } from "@/hooks/useMentorName";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Loader2, Save, AlertTriangle, Trash2, Minus, Plus, RotateCcw, Rewind, UserX } from "lucide-react";
import { toast } from "sonner";

const SettingsPage = () => {
  const { user } = useAuth();
  const { isDemo } = useDemo();
  const queryClient = useQueryClient();
  const { mentorName, setMentorName: setGlobalMentorName } = useMentorName();
  const [profile, setProfile] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [savingMentor, setSavingMentor] = useState(false);
  const [localMentorName, setLocalMentorName] = useState("");
  const [resetting, setResetting] = useState(false);

  const { data: fetchedProfile, isLoading: profileLoading } = useQuery({
    queryKey: ["user_profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("user_profile").select("*").eq("user_id", user!.id).maybeSingle();
      return data;
    },
    enabled: !isDemo && !!user,
    placeholderData: isDemo ? DEMO_PROFILE : undefined,
  });

  const { data: pillars = [], isLoading: pillarsLoading } = useQuery({
    queryKey: ["pillars", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("pillars").select("*").eq("user_id", user!.id).order("sort_order");
      return data || [];
    },
    enabled: !isDemo && !!user,
    placeholderData: isDemo ? DEMO_PILLARS : undefined,
  });

  const loading = profileLoading || pillarsLoading;

  useEffect(() => {
    if (fetchedProfile) {
      setProfile(fetchedProfile);
      setLocalMentorName((fetchedProfile as any)?.mentor_name || "");
    }
  }, [fetchedProfile]);

  useEffect(() => {
    if (isDemo) {
      setProfile(DEMO_PROFILE);
      setLocalMentorName(DEMO_PROFILE.mentor_name || "");
    }
  }, [isDemo]);

  const saveProfile = async () => {
    if (isDemo) { toast.success("Settings saved! (Demo mode)"); return; }
    if (!profile) return;
    setSaving(true);
    const { error } = await supabase
      .from("user_profile")
      .update({
        daily_time_commitment: profile.daily_time_commitment,
        learning_cadence: profile.learning_cadence,
        cycle_length: profile.cycle_length,
      })
      .eq("user_id", user!.id);
    if (error) toast.error(error.message);
    else {
      queryClient.invalidateQueries({ queryKey: ["user_profile", user?.id] });
      toast.success("Settings saved.");
    }
    setSaving(false);
  };

  const saveMentorName = async () => {
    if (isDemo) { toast.success("Mentor name saved! (Demo mode)"); return; }
    setSavingMentor(true);
    const nameToSave = localMentorName.trim() || null;
    const { error } = await supabase
      .from("user_profile")
      .update({ mentor_name: nameToSave } as any)
      .eq("user_id", user!.id);
    if (error) toast.error(error.message);
    else {
      setGlobalMentorName(nameToSave || "Mentor");
      queryClient.invalidateQueries({ queryKey: ["user_profile", user?.id] });
      toast.success("Mentor name updated.");
    }
    setSavingMentor(false);
  };

  const updatePillarLevel = async (pillarId: string, newLevel: number) => {
    if (isDemo) { toast.success("Level updated! (Demo mode)"); return; }
    const clamped = Math.max(1, Math.min(5, newLevel));
    const { error } = await supabase.from("pillars").update({ current_level: clamped }).eq("id", pillarId);
    if (error) toast.error(error.message);
    else {
      queryClient.invalidateQueries({ queryKey: ["pillars", user?.id] });
      toast.success("Level updated.");
    }
  };

  const deletePillar = async (pillarId: string, pillarName: string) => {
    if (isDemo) { toast.success("Pillar deleted! (Demo mode)"); return; }
    try {
      await supabase.from("topic_map").delete().eq("pillar_id", pillarId);
      await supabase.from("phase_weights").delete().eq("pillar_id", pillarId);
      await supabase.from("pillars").delete().eq("id", pillarId);
      queryClient.invalidateQueries({ queryKey: ["pillars", user?.id] });
      toast.success(`${pillarName} deleted.`);
    } catch (err: any) {
      toast.error("Failed to delete pillar: " + err.message);
    }
  };

  const resetAllData = async () => {
    if (isDemo) { toast.success("Data reset! (Demo mode)"); return; }
    setResetting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { error } = await supabase.functions.invoke("reset-user-data", {
        body: { mode: "full" },
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (error) throw error;
      queryClient.clear();
      window.location.href = "/onboarding";
    } catch (err: any) {
      toast.error("Failed to reset data: " + (err.message || "Unknown error"));
      setResetting(false);
    }
  };

  const rewindData = async () => {
    if (isDemo) { toast.success("Data rewound! (Demo mode)"); return; }
    setResetting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { error } = await supabase.functions.invoke("reset-user-data", {
        body: { mode: "rewind" },
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (error) throw error;
      queryClient.clear();
      window.location.href = "/dashboard";
    } catch (err: any) {
      toast.error("Failed to rewind data: " + (err.message || "Unknown error"));
      setResetting(false);
    }
  };

  const deleteAccount = async () => {
    if (isDemo) { toast.success("Account deleted! (Demo mode)"); return; }
    setResetting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { error } = await supabase.functions.invoke("reset-user-data", {
        body: { mode: "delete_account" },
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (error) throw error;
      queryClient.clear();
      await supabase.auth.signOut();
      window.location.href = "/auth";
    } catch (err: any) {
      toast.error("Failed to delete account: " + (err.message || "Unknown error"));
      setResetting(false);
    }
  };

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
      <div className="max-w-2xl mx-auto space-y-8">
        <h1 className="font-serif text-2xl font-bold">Settings</h1>

        {/* Mentor Name */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="font-serif text-lg">Your Mentor</CardTitle>
            <CardDescription>This is what your AI mentor will be called throughout the app. Leave blank to use the default.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label>Mentor name</Label>
              <Input
                value={localMentorName}
                onChange={(e) => setLocalMentorName(e.target.value)}
                placeholder="Mentor"
              />
            </div>
            <Button onClick={saveMentorName} disabled={savingMentor} size="sm" className="gap-2">
              {savingMentor ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save
            </Button>
          </CardContent>
        </Card>

        {/* Learning Preferences */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="font-serif text-lg">Learning Preferences</CardTitle>
            <CardDescription>Adjust your daily time commitment and learning pace.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Daily Time (minutes)</Label>
              <Select value={String(profile?.daily_time_commitment || 15)} onValueChange={(v) => setProfile({ ...profile, daily_time_commitment: parseInt(v) })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 minutes</SelectItem>
                  <SelectItem value="10">10 minutes</SelectItem>
                  <SelectItem value="15">15 minutes</SelectItem>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="45">45 minutes</SelectItem>
                  <SelectItem value="60">60 minutes</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Learning Cadence</Label>
              <Select value={profile?.learning_cadence || "daily"} onValueChange={(v) => setProfile({ ...profile, learning_cadence: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekdays">Weekdays Only</SelectItem>
                  <SelectItem value="every_other_day">Every Other Day</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Cycle Length (sections)</Label>
              <Select value={String(profile?.cycle_length || 5)} onValueChange={(v) => setProfile({ ...profile, cycle_length: parseInt(v) })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">3 sections</SelectItem>
                  <SelectItem value="5">5 sections</SelectItem>
                  <SelectItem value="7">7 sections</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={saveProfile} disabled={saving} className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save
            </Button>
          </CardContent>
        </Card>

        {/* Pillars */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="font-serif text-lg">Pillars</CardTitle>
            <CardDescription>Your strategic knowledge domains. To add, swap, or edit pillars, talk to your {mentorName}.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {pillars.map((p) => (
              <div key={p.id} className="flex items-center justify-between py-2 border-b border-border last:border-0 gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{p.name}</p>
                  <p className="text-xs text-muted-foreground">{p.is_active ? "Active" : "Inactive"}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => updatePillarLevel(p.id, p.current_level - 1)}
                      disabled={p.current_level <= 1}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="text-sm font-mono w-8 text-center">{p.current_level}/5</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => updatePillarLevel(p.id, p.current_level + 1)}
                      disabled={p.current_level >= 5}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete {p.name}?</AlertDialogTitle>
                        <AlertDialogDescription>This cannot be undone. All topic map entries and phase weights for this pillar will also be removed.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deletePillar(p.id, p.name)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle className="font-serif text-lg flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              Danger Zone
            </CardTitle>
            <CardDescription>Want to tweak your pillars or goals? Talk to your {mentorName} instead.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" disabled={resetting} className="w-full text-destructive hover:text-destructive gap-2">
                    {resetting ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                    Reset All Data
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Reset all data?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete all your data and return you to onboarding. This cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={resetAllData} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      Reset Everything
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <p className="text-xs text-muted-foreground mt-2">
                Wipe everything — profile, pillars, history, conversations — and start fresh from onboarding.
              </p>
            </div>

            <div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" disabled={resetting} className="w-full text-destructive hover:text-destructive gap-2">
                      {resetting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rewind className="h-4 w-4" />}
                      Rewind
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Rewind learning history?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will wipe your learning history but keep your profile and pillars. Topic clusters will be reset to queued.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={rewindData} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                        Rewind
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                <p className="text-xs text-muted-foreground mt-2">
                  Keep your profile and pillars, but wipe cycles, units, mentor conversations, and notes. Topic clusters reset to queued.
                </p>
              </div>

            <div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" disabled={resetting} className="w-full text-destructive hover:text-destructive gap-2">
                    {resetting ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserX className="h-4 w-4" />}
                    Delete Account
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete your account?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete your account and all your data. You will be signed out. This cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={deleteAccount} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      Delete Account
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <p className="text-xs text-muted-foreground mt-2">
                Permanently delete your account and all data. You will be signed out.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default SettingsPage;