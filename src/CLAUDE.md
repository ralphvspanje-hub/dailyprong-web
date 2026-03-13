# src/ — Agent Context

## Overview

This is the React application source root. Entry point: `main.tsx` → `App.tsx`.

## Entry Point Flow

1. **`main.tsx`** — Renders `<App />` into `#root`, imports `index.css`
2. **`App.tsx`** — Wraps everything in providers (outer → inner):
   - `QueryClientProvider` (TanStack Query)
   - `ThemeProvider` (dark/light)
   - `AuthProvider` (Supabase session)
   - `DemoProvider` (demo mode)
   - `TooltipProvider`
   - `Toaster` + `Sonner` (toast notifications)
   - `BrowserRouter` → `UnitGenerationProvider` → `Routes`

## Directory Map

| Folder | What it contains |
|--------|-----------------|
| `pages/` | Route-level page components |
| `components/` | Shared components (Layout, NavLink, UnitDisplay) |
| `components/ui/` | shadcn/ui primitives — do not edit manually |
| `hooks/` | Custom React hooks (auth, demo, theme, etc.) |
| `integrations/supabase/` | Auto-generated Supabase client + types — do not edit |
| `lib/` | `utils.ts` only — exports `cn()` for Tailwind class merging |
| `test/` | Vitest setup + placeholder test |

## lib/utils.ts

Single export: `cn(...inputs: ClassValue[])` — merges Tailwind classes using `clsx` + `tailwind-merge`. Nothing else in this folder.

## Styles

- `index.css` — Tailwind directives + CSS custom properties for theme
- `App.css` — minimal app-level styles
