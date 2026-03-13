# DailyProng

**Your career shouldn't run on vibes.**

[![Live Demo](https://img.shields.io/badge/Live_Demo-dailyprong.vercel.app-6366F1?style=flat)](https://dailyprong.vercel.app)
![React](https://img.shields.io/badge/React_18-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript_5.8-3178C6?logo=typescript&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?logo=supabase&logoColor=white)

---

## The Problem

Most people have a vague idea of where they want to go in their career and no real plan to get there. They take a course, forget it, read an article, forget that too. Without structure and repetition, learning doesn't stick — it just makes you feel productive.

## The Solution

DailyProng starts with an AI onboarding that actually asks hard questions: where you are, where you want to go, and what's in the way. From that, it builds skill pillars — the specific areas you need to develop — and organizes your learning into themed cycles with daily units.

Each morning, you pick a pillar and get a focused learning unit. You read it, answer a reflection question, and the app tracks your progress. An AI mentor knows your full plan and can restructure it if your goals change.

One pillar at a time. Every day.

## Key Features

- **AI Onboarding** — A structured conversation that maps your goals and skill gaps into pillars and learning phases. Not a form — an actual dialogue.
- **Daily Learning Units** — Focused content organized into themed cycles, each with multiple section types (concept, application, reflection, hands-on). Generated on demand by Gemini.
- **Cycle System** — Units group into cycles. Finish a cycle and get a summary, a new one starts. You can also grab a bonus unit, extra resources, or talk to your mentor.
- **Extra Resources** — AI-generated YouTube search suggestions and practice recommendations after each cycle, calibrated to your current pillar level.
- **AI Mentor Chat** — Chat with a named mentor who knows your learning architecture. Ask anything, request changes to your plan.
- **Structural Edits** — The mentor can actually modify your pillars and phases, not just give advice.
- **Progress Page** — Pillar levels, cycle history, and completion stats. Recharts for the graphs.
- **History Page** — Every past unit, searchable and filterable.
- **Demo Mode** — Full read-only walkthrough of the app without signing up.
- **Dark/Light Theme** — Defaults dark, toggleable in-app.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 18.3 + Vite 5 |
| Language | TypeScript 5.8 |
| UI | shadcn/ui + Tailwind CSS + Radix UI |
| Routing | React Router v6 |
| Animations | Framer Motion |
| Data Fetching | TanStack Query v5 |
| Forms | React Hook Form + Zod |
| Charts | Recharts |
| Backend | Supabase (PostgreSQL + Auth + Edge Functions) |
| AI | Gemini 3.1 Flash Lite via Google Generative AI REST API |
| Deployment | Vercel |

## Architecture

**Cloud-first.** Unlike an offline-first app, all user data lives in Postgres. The app requires Supabase — there's no local fallback for user data.

**AI stays server-side.** There are five Edge Functions (Deno). The client never holds an API key.

| Edge Function | What it does |
|---------------|-------------|
| `onboarding-chat` | Runs the onboarding dialogue, writes structured profile to DB |
| `generate-unit` | Creates unit content from pillar + topic_map + phase context |
| `process-feedback` | Handles unit feedback, updates pillar progress, manages cycle completion |
| `mentor-chat` | Stateful conversation with the user's full learning context loaded |
| `apply-mentor-changes` | Applies structural mutations the mentor proposes (pillars, phases, weights) |

**12 tables, all RLS-scoped.** The schema tracks the full learning architecture: user profile, phases, pillars, topic maps, cycles, units, progress archives, mentor conversations, onboarding state, personal notes, and rate limits.

```
User
  │
  ▼
┌────────────────┐     ┌───────────────────┐     ┌──────────────┐
│   Client        │────▶│  Supabase Edge Fn  │────▶│ Gemini 3.1   │
│   (React/Vite)  │◀────│  (Deno, key vault) │◀────│ Flash Lite   │
└────────────────┘     └───────────────────┘     └──────────────┘
         │
         ▼
┌────────────────────────────────────────┐
│  Supabase PostgreSQL                   │
│  Pillars, Cycles, Units, Progress,     │
│  Mentor History, Auth, Rate Limits     │
└────────────────────────────────────────┘
         │
         ▼
┌────────────────────────────────────────┐
│  Vercel — dailyprong.vercel.app        │
└────────────────────────────────────────┘
```

## How It Works

**1. Onboard** — Complete the AI onboarding chat. It figures out your role, goals, timeline, and skill gaps, then writes your learning plan: pillars, phases, and weighted topic maps.

**2. Learn** — Pick a pillar on the dashboard each day. The app generates a unit from your current cycle's topic and section type. Read, reflect, submit feedback.

**3. Progress** — Feedback drives pillar level and cycle advancement. Finish a cycle and a new themed one begins automatically.

**4. Adjust** — Talk to your mentor when goals change. They can update your pillars, reweight phases, or restructure the whole plan.

---

## AI-Native Codebase

This project was built with AI as a process, not a shortcut. Features go through a Claude project set up as a virtual CTO before any code is written — it pushes back until the idea holds up. Then: issue in Linear, codebase exploration, implementation plan, execution in Cursor.

The codebase is designed to be navigated by AI agents with zero warm-up time. Every major directory has a `CLAUDE.md` with accurate, current context about what lives there, what the conventions are, and what to avoid.

```
dailyprong-web/
├── CLAUDE.md                    ← start here
├── src/
│   ├── pages/
│   ├── components/
│   ├── hooks/
│   └── integrations/supabase/
└── supabase/
    └── functions/
        ├── onboarding-chat/
        ├── generate-unit/
        ├── mentor-chat/
        ├── apply-mentor-changes/
        └── process-feedback/
```

Agents log any confusion or outdated description to `AGENT_LOG.md` and fix the relevant `CLAUDE.md` immediately. The context system gets more accurate with every session.

---

## Running It

```bash
cd dailyprong-web
npm install
npm run dev
```

Create `.env.local`:

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_PUBLISHABLE_KEY=...
```

Edge function secrets go in the Supabase dashboard: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`.

Push to `main` — Vercel deploys automatically.

---

<p align="center">
  Solo project by <a href="https://www.linkedin.com/in/ralphvanspanje"><strong>Ralph van Spanje</strong></a>
</p>
