# src/hooks/ — Agent Context

## All Hooks

| File | Hook | Exports | Purpose |
|------|------|---------|---------|
| useAuth.tsx | useAuth | `AuthProvider`, `useAuth` → `{ session, user, loading, signOut }` | Supabase auth state management. Wraps the app as a provider. |
| useDemo.tsx | useDemo | `DemoProvider`, `useDemo` → `{ isDemo, enableDemo, disableDemo }` + `DEMO_*` fixtures | Demo mode. Gates entire app into read-only state with hardcoded sample data. No auth required. |
| useTheme.tsx | useTheme | `ThemeProvider`, `useTheme` → `{ theme, toggleTheme }` | Dark/light theme. Stored in `localStorage` under `dailyprong-theme`. Default: `dark`. Toggles `dark` class on `<html>`. |
| useMentorName.tsx | useMentorName | `{ mentorName, setMentorName, loading }` | Fetches mentor name from `user_profile.mentor_name`. Demo fallback: `"Sage"`. |
| use-mobile.tsx | useIsMobile | `useIsMobile` → `boolean` | Returns `true` when viewport width < 768px. |
| use-toast.ts | useToast | `useToast`, `toast`, toast reducer | Toast notification state management (used by the Radix toast component). |
| useUnitGeneration.tsx | useUnitGeneration | `UnitGenerationProvider`, `useUnitGeneration` → `{ isGenerating, pendingUnit, startGeneration, clearPendingUnit }` | Lifts unit generation out of Dashboard so in-flight requests survive navigation. Handles 6 actions (`new_cycle`, `next_section`, `bonus`, `repeat_section`, `extra_resources`, `cycle_recap`). Also passes optional `last_section_topic` to the edge function for section-aware bonus/extra_resources generation. Background pre-generation is handled server-side by `generate-unit` and `process-feedback` edge functions. Provider lives inside `BrowserRouter` but outside `Routes`. |
