# DailyProng Web — Agent Context

## What this app is

DailyProng Web is an AI-powered career learning platform. Users complete a structured AI onboarding that maps their goals and skills into strategic pillars, then receive daily calibrated learning units organized in themed cycles. An AI mentor provides ongoing career guidance and can modify the learning architecture. Dark/light theme, demo mode for exploring without signup.

## Tech Stack

- **Framework**: React 18.3 + Vite 5
- **Language**: TypeScript 5.8
- **UI**: shadcn/ui + Tailwind CSS 3.4 + Radix UI
- **Routing**: React Router v6
- **Animations**: Framer Motion
- **Data fetching**: TanStack Query v5
- **Forms**: React Hook Form + Zod
- **Markdown**: react-markdown
- **Charts**: Recharts
- **Backend**: Supabase (PostgreSQL + Auth + Edge Functions)
- **AI**: Gemini 3.1 Flash Lite via Google Generative AI REST API (key never in client)
- **Deployment**: Vercel

## Project Structure

```
dailyprong-web/
├── src/
│   ├── main.tsx              # Entry point → App.tsx
│   ├── App.tsx               # Providers, routes, guards
│   ├── pages/                # Route-level components
│   ├── components/           # Layout, NavLink, UnitDisplay
│   │   └── ui/               # shadcn/ui primitives — do not edit
│   ├── hooks/                # Auth, demo, theme, mentor name, mobile, toast, unit generation
│   ├── integrations/supabase/# Auto-generated client + types — do not edit
│   ├── lib/                  # utils.ts (cn() helper only)
│   └── test/                 # Vitest setup + Playwright config
├── supabase/
│   ├── config.toml           # Project config, function settings
│   ├── migrations/           # Postgres schema SQL
│   └── functions/            # Edge functions (Deno)
│       ├── mentor-chat/      # AI mentor conversation
│       ├── apply-mentor-changes/ # Apply pillar mutations
│       ├── generate-unit/    # AI learning unit generation
│       ├── onboarding-chat/  # AI onboarding conversation
│       └── process-feedback/ # Unit feedback + cycle completion
└── package.json
```

Each subfolder has its own `CLAUDE.md`. Read it when working in that folder.

## Core Data Model (12 tables)

All tables use RLS with user-scoped policies.

| Table | Purpose | Key Relationships |
|-------|---------|-------------------|
| **user_profile** | User info, career goals, mentor name, learning prefs | — |
| **phases** | Named time-bounded learning phases with goals | — |
| **pillars** | Strategic skill pillars (name, level 1–5, trend, weight) | — |
| **phase_weights** | Many-to-many link: phase ↔ pillar with weight | → phases, → pillars |
| **topic_map** | Clusters of subtopics per pillar, priority-ordered | → pillars |
| **cycles** | Themed multi-section learning cycles per pillar | → pillars |
| **units** | Individual learning units with content + feedback | → cycles, → pillars |
| **progress_archive** | Completed cycle summaries | → cycles |
| **mentor_conversations** | Mentor chat history (role + content) | — |
| **onboarding_conversations** | Onboarding chat state (messages jsonb) | — |
| **personal_notes** | Free-form user notes | — |
| **api_rate_limits** | Rate limit tracking per user/IP/endpoint | — |

## Key Architectural Rules

### Cloud-first (not optional)
Unlike AnFact, Supabase is **required**. All user data lives in Postgres. No local-first fallback.

### Demo mode
`useDemo()` gates the app into a read-only state with hardcoded fixtures. No auth required. `ProtectedRoute` checks `isDemo` first — if true, always renders children.

### Auth guards
- **`ProtectedRoute`** — demo → render; loading → spinner; no session → redirect `/auth`
- **`AuthRoute`** — demo → redirect `/dashboard`; loading → spinner; session → redirect `/dashboard`; else render Auth

### AI calls stay server-side
All LLM calls route through Supabase Edge Functions. The client never touches an API key. Current model: `gemini-3.1-flash-lite` via Google Generative AI REST API.

### Mentor name
Stored in `user_profile.mentor_name`. Demo uses `"Sage"`. Loaded via `useMentorName()` hook.

### Theme
`dailyprong-theme` key in localStorage. `dark` class on `<html>`. Default: `dark`. Toggle via `useTheme()`.

### Auto-generated files — do not edit
- `src/integrations/supabase/client.ts`
- `src/integrations/supabase/types.ts`

### shadcn/ui primitives — do not edit
Everything in `src/components/ui/` is a shadcn/ui primitive. Add new ones via the shadcn CLI, never edit existing ones manually.

## Routes

| Path | Component | Guard | Purpose |
|------|-----------|-------|---------|
| `/auth` | Auth | AuthRoute | Login/signup + demo entry |
| `/` | — | — | Redirects to `/dashboard` |
| `/dashboard` | Dashboard | Protected | Today's unit, pillar choice, feedback |
| `/onboarding` | Onboarding | Protected | AI onboarding chat |
| `/progress` | Progress | Protected | Pillar levels + cycle history |
| `/history` | History | Protected | Past units with search/filters |
| `/settings` | SettingsPage | Protected | Profile, mentor name, pillars, danger zone |
| `/mentor` | Mentor | Protected | AI mentor chat |
| `/about` | About | None | Static "What is a Prong?" page |
| `*` | NotFound | None | 404 |

## Running the App

```bash
cd dailyprong-web
npm install
npm run dev        # Vite dev server
npm run build      # Production build
npm run test       # Vitest
npm run test:watch # Vitest watch mode
npm run lint       # ESLint
npm run preview    # Preview production build
```

Env vars in `.env.local`:
- `VITE_SUPABASE_URL` — Supabase project URL
- `VITE_SUPABASE_PUBLISHABLE_KEY` — Supabase anon/publishable key

Edge function env vars (set in Supabase dashboard):
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `GEMINI_API_KEY` — Google Generative AI API key (used by mentor-chat, generate-unit, onboarding-chat)
- `OWNER_EMAIL` — Owner account email; gets 500/day rate limit instead of 50

## Common Gotchas

- `Index.tsx` in `src/pages/` is **unused** — `/` redirects to `/dashboard`, the file is orphaned
- `NavLink.tsx` in `src/components/` is **unused** — `Layout.tsx` uses plain `Link` from react-router
- README says the env var is `VITE_SUPABASE_ANON_KEY` but `client.ts` actually reads `VITE_SUPABASE_PUBLISHABLE_KEY` — use the latter
- `supabase/config.toml` has `verify_jwt = false` for both edge functions — JWT validation is done manually in the function code
- Path alias: `@/` maps to `src/`

---

## Self-Improving Loop — READ THIS

This context system is designed to get better over time. **You are expected to maintain it.**

**After every task, before marking work done:**
1. Did anything behave unexpectedly or differ from what a CLAUDE.md described? → Fix the CLAUDE.md immediately and log it in `AGENT_LOG.md`.
2. Nothing to log? → Still write a one-liner in `AGENT_LOG.md`: `## YYYY-MM-DD — [task] — No issues found`.

This step is **not optional**. An empty `AGENT_LOG.md` means the loop is broken.

See root `CLAUDE.md` for the full log format.
