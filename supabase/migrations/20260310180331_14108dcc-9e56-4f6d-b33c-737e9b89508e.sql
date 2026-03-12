
-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- user_profile table
CREATE TABLE public.user_profile (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  name TEXT,
  "current_role" TEXT,
  target_role TEXT,
  long_term_ambition TEXT,
  daily_time_commitment INTEGER DEFAULT 20,
  learning_cadence TEXT DEFAULT 'daily',
  cycle_length INTEGER DEFAULT 5,
  learning_style TEXT,
  unique_differentiator TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.user_profile ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON public.user_profile FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.user_profile FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.user_profile FOR UPDATE USING (auth.uid() = user_id);
CREATE TRIGGER update_user_profile_updated_at BEFORE UPDATE ON public.user_profile FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- pillars table
CREATE TABLE public.pillars (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  why_it_matters TEXT,
  starting_level INTEGER NOT NULL DEFAULT 1 CHECK (starting_level BETWEEN 1 AND 5),
  current_level INTEGER NOT NULL DEFAULT 1 CHECK (current_level BETWEEN 1 AND 5),
  trend TEXT DEFAULT 'stable' CHECK (trend IN ('up', 'stable', 'down')),
  last_difficulty_signal TEXT CHECK (last_difficulty_signal IN ('too_easy', 'about_right', 'too_hard')),
  phase_weight INTEGER DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.pillars ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own pillars" ON public.pillars FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own pillars" ON public.pillars FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own pillars" ON public.pillars FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own pillars" ON public.pillars FOR DELETE USING (auth.uid() = user_id);

-- phases table
CREATE TABLE public.phases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  timeline_start DATE,
  timeline_end DATE,
  goal TEXT,
  is_active BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0
);
ALTER TABLE public.phases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own phases" ON public.phases FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own phases" ON public.phases FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own phases" ON public.phases FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own phases" ON public.phases FOR DELETE USING (auth.uid() = user_id);

-- phase_weights table
CREATE TABLE public.phase_weights (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  phase_id UUID NOT NULL REFERENCES public.phases(id) ON DELETE CASCADE,
  pillar_id UUID NOT NULL REFERENCES public.pillars(id) ON DELETE CASCADE,
  weight INTEGER NOT NULL DEFAULT 0
);
ALTER TABLE public.phase_weights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view phase weights via phases" ON public.phase_weights FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.phases WHERE phases.id = phase_weights.phase_id AND phases.user_id = auth.uid())
);
CREATE POLICY "Users can insert phase weights via phases" ON public.phase_weights FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.phases WHERE phases.id = phase_weights.phase_id AND phases.user_id = auth.uid())
);
CREATE POLICY "Users can update phase weights via phases" ON public.phase_weights FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.phases WHERE phases.id = phase_weights.phase_id AND phases.user_id = auth.uid())
);
CREATE POLICY "Users can delete phase weights via phases" ON public.phase_weights FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.phases WHERE phases.id = phase_weights.phase_id AND phases.user_id = auth.uid())
);

-- topic_map table
CREATE TABLE public.topic_map (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pillar_id UUID NOT NULL REFERENCES public.pillars(id) ON DELETE CASCADE,
  cluster_name TEXT NOT NULL,
  subtopics TEXT[] DEFAULT '{}',
  difficulty_level INTEGER DEFAULT 1 CHECK (difficulty_level BETWEEN 1 AND 5),
  status TEXT DEFAULT 'queued' CHECK (status IN ('covered', 'queued', 'in_progress')),
  priority_order INTEGER DEFAULT 0,
  cross_pillar_connections TEXT
);
ALTER TABLE public.topic_map ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view topic map via pillars" ON public.topic_map FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.pillars WHERE pillars.id = topic_map.pillar_id AND pillars.user_id = auth.uid())
);
CREATE POLICY "Users can insert topic map via pillars" ON public.topic_map FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.pillars WHERE pillars.id = topic_map.pillar_id AND pillars.user_id = auth.uid())
);
CREATE POLICY "Users can update topic map via pillars" ON public.topic_map FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.pillars WHERE pillars.id = topic_map.pillar_id AND pillars.user_id = auth.uid())
);
CREATE POLICY "Users can delete topic map via pillars" ON public.topic_map FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.pillars WHERE pillars.id = topic_map.pillar_id AND pillars.user_id = auth.uid())
);

-- cycles table
CREATE TABLE public.cycles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  cycle_number INTEGER NOT NULL DEFAULT 1,
  pillar_id UUID REFERENCES public.pillars(id) ON DELETE SET NULL,
  theme TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'skipped')),
  bridge_count INTEGER DEFAULT 0,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);
ALTER TABLE public.cycles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own cycles" ON public.cycles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own cycles" ON public.cycles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own cycles" ON public.cycles FOR UPDATE USING (auth.uid() = user_id);

-- units table
CREATE TABLE public.units (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cycle_id UUID NOT NULL REFERENCES public.cycles(id) ON DELETE CASCADE,
  pillar_id UUID REFERENCES public.pillars(id) ON DELETE SET NULL,
  section_number INTEGER NOT NULL DEFAULT 1,
  section_type TEXT DEFAULT 'concept' CHECK (section_type IN ('concept', 'deep_dive', 'case_study', 'hands_on', 'synthesis')),
  topic TEXT,
  difficulty_level INTEGER DEFAULT 1 CHECK (difficulty_level BETWEEN 1 AND 5),
  content TEXT,
  is_bridge BOOLEAN DEFAULT false,
  is_bonus BOOLEAN DEFAULT false,
  bridge_prerequisite_for TEXT,
  feedback_difficulty TEXT CHECK (feedback_difficulty IN ('too_easy', 'about_right', 'too_hard')),
  feedback_value TEXT CHECK (feedback_value IN ('high', 'medium', 'low')),
  feedback_note TEXT,
  is_pending_feedback BOOLEAN DEFAULT true,
  file_path_equivalent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  feedback_given_at TIMESTAMP WITH TIME ZONE
);
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view units via cycles" ON public.units FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.cycles WHERE cycles.id = units.cycle_id AND cycles.user_id = auth.uid())
);
CREATE POLICY "Users can insert units via cycles" ON public.units FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.cycles WHERE cycles.id = units.cycle_id AND cycles.user_id = auth.uid())
);
CREATE POLICY "Users can update units via cycles" ON public.units FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.cycles WHERE cycles.id = units.cycle_id AND cycles.user_id = auth.uid())
);

-- progress_archive table
CREATE TABLE public.progress_archive (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cycle_id UUID REFERENCES public.cycles(id) ON DELETE SET NULL,
  summary TEXT,
  avg_difficulty NUMERIC,
  avg_value NUMERIC,
  level_change TEXT
);
ALTER TABLE public.progress_archive ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view progress via cycles" ON public.progress_archive FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.cycles WHERE cycles.id = progress_archive.cycle_id AND cycles.user_id = auth.uid())
);
CREATE POLICY "Users can insert progress via cycles" ON public.progress_archive FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.cycles WHERE cycles.id = progress_archive.cycle_id AND cycles.user_id = auth.uid())
);

-- personal_notes table
CREATE TABLE public.personal_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  note TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.personal_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own notes" ON public.personal_notes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own notes" ON public.personal_notes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own notes" ON public.personal_notes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own notes" ON public.personal_notes FOR DELETE USING (auth.uid() = user_id);

-- onboarding_conversations table
CREATE TABLE public.onboarding_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  messages JSONB DEFAULT '[]'::jsonb,
  status TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.onboarding_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own conversations" ON public.onboarding_conversations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own conversations" ON public.onboarding_conversations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own conversations" ON public.onboarding_conversations FOR UPDATE USING (auth.uid() = user_id);
