# src/pages/ — Agent Context

## All Routes

| File | Route | Guard | Purpose |
|------|-------|-------|---------|
| Auth.tsx | `/auth` | AuthRoute | Login/signup form + "Explore Demo" button |
| Dashboard.tsx | `/dashboard` | ProtectedRoute | Today's unit, pillar selection, feedback, next section, bonus unit |
| Onboarding.tsx | `/onboarding` | ProtectedRoute | AI onboarding chat → blueprint review → confirm |
| Progress.tsx | `/progress` | ProtectedRoute | Pillar levels, difficulty trajectories, recent cycles |
| History.tsx | `/history` | ProtectedRoute | Past units with search + pillar/type filters |
| SettingsPage.tsx | `/settings` | ProtectedRoute | Mentor name, learning prefs, pillar management, danger zone |
| Mentor.tsx | `/mentor` | ProtectedRoute | AI mentor chat with quick actions |
| About.tsx | `/about` | None | Static "What is a Prong?" content page |
| NotFound.tsx | `*` | None | 404 page |
| **Index.tsx** | — | — | **Unused orphan.** `/` redirects to `/dashboard` in App.tsx. This file is not referenced anywhere. |

## Route Guards (defined in App.tsx)

- **`ProtectedRoute`** — If `isDemo` → render children. If loading → spinner. If no session → redirect to `/auth`.
- **`AuthRoute`** — If `isDemo` → redirect to `/dashboard`. If loading → spinner. If session → redirect to `/dashboard`. Otherwise render Auth page.
