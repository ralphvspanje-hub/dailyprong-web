# src/components/ — Agent Context

## Shared Components

| Component | Purpose |
|-----------|---------|
| **Layout.tsx** | App shell: sticky header with nav links (Today, Progress, History, Settings, Mentor), theme toggle, sign out button. Mobile: bottom navigation bar. Footer. Wraps all protected pages. |
| **NavLink.tsx** | Wrapper around react-router `NavLink` with `cn()` for active/pending state classes. **Note:** currently unused — `Layout.tsx` uses plain `Link` instead. |
| **UnitDisplay.tsx** | Renders a learning unit: topic heading, section type/difficulty badges, markdown content via `react-markdown`, and feedback form (difficulty + value sliders, personal note). |

## ui/ subfolder

Contains shadcn/ui primitives. See `ui/CLAUDE.md`. Do not edit these manually.
