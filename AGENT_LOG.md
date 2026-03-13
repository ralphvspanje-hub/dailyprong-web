# Agent Log — DailyProng Web

This file tracks confusions, mistakes, and improvements made by agents working on this codebase.
When you encounter something wrong or unclear in any CLAUDE.md or in the code itself, add an entry here.
If you resolved it, also update the relevant CLAUDE.md immediately and mark this entry as Fixed.

## 2026-03-13 — RAL-69: Remove VITE_OWNER_EMAIL from client bundle — No issues found

## Log Format

```markdown
## YYYY-MM-DD — [short title]
**What was confusing / wrong:** ...
**File/folder affected:** ...
**What I did:** ...
**Suggested fix:** ...
**Status:** Fixed | Needs human review
```

---

<!-- Entries go below this line, newest first -->

## 2026-03-13 — RAL-71 — No issues found

## 2026-03-13 — RAL-70 — No issues found

## 2026-03-13 — RAL-65a — No issues found

## 2026-03-13 — RAL-65 — No issues found

## 2026-03-13 — RAL-67 — No issues found

## 2026-03-13 — RAL-64 — No issues found

## 2026-03-13 — RAL-66 — Plan used invalid `--project-ref` flag for `supabase db push`
**What was confusing / wrong:** The plan specified `supabase db push --project-ref hpubamqxoeckzrbvgsof`, but `db push` doesn't accept `--project-ref`. It pushes to the linked project by default (`--linked`). Also, prior migrations weren't in the remote history table, requiring `supabase migration repair --status applied <version> --linked` for each one before the new migration could be pushed.
**File/folder affected:** `.claude/plans/RAL-66.md`
**What I did:** Ran `supabase migration repair` for 5 prior migrations, then `supabase db push` (no `--project-ref`). Migration applied successfully.
**Suggested fix:** Future plans should use `supabase db push` (no `--project-ref`) and note that migration history may need repairing if local migration files were added without being pushed.
**Status:** Fixed

## 2026-03-13 — RAL-63 — No issues found

## 2026-03-13 — RAL-61 — Fixed duplicate guard silently blocking all pre-gen calls
**What was confusing / wrong:** The pre-gen `useEffect` in Dashboard.tsx was calling `generate-unit → next_section` correctly, but the edge function's duplicate guard (`is_pending_feedback = true AND is_bonus = false`) was finding the currently-displayed unit and returning early — no unit N+1 was ever created. Additionally, after feedback, `setUiState(null)` caused the dashboard query to drive state directly to `"pending_feedback"` (showing the pre-gen unit immediately), bypassing the "up_to_date" menu the user needs to see.
**File/folder affected:** `supabase/functions/generate-unit/index.ts`, `src/pages/Dashboard.tsx`
**What I did:** (1) Pass `current_section_number` in the pre-gen call body; guard now filters `section_number > current_section_number` when present. (2) Changed `setUiState(null)` → `setUiState("up_to_date")` in `handleFeedback` so the menu always shows after feedback. (3) Added `activeCycle: { id: unit.cycle_id }` to the pending-unit query branch so the active-cycle menu variant renders correctly. Updated `supabase/functions/CLAUDE.md` duplicate guard docs.
**Status:** Fixed

## 2026-03-13 — RAL-61 — Updated duplicate guard docs in CLAUDE.md
**What was confusing / wrong:** `supabase/functions/CLAUDE.md` described the duplicate guard as matching "any non-bonus `is_pending_feedback` unit" without mentioning the new `current_section_number` filter. After adding the section-number-aware guard, the docs needed updating.
**File/folder affected:** `supabase/functions/CLAUDE.md`
**What I did:** Updated duplicate guard bullet to document both paths (with and without `current_section_number`). Updated pre-gen bullet to note that `current_section_number` is now passed.
**Status:** Fixed

## 2026-03-13 — RAL-60 — Removed dual pre-gen race condition, updated docs
**What was confusing / wrong:** After adding the client-side display trigger (Step 2), the server-side cascade in `generate-unit` was still active, creating a race where both mechanisms fired before either unit existed in the DB — producing duplicate units that broke the cascade for subsequent sections. Also, `supabase/functions/CLAUDE.md` still described the server-side cascade as active.
**File/folder affected:** `supabase/functions/generate-unit/index.ts`, `supabase/functions/CLAUDE.md`, `supabase/CLAUDE.md`
**What I did:** Removed the server-side cascade block from `generate-unit`. Updated `generate-unit` docs: replaced "Server-side pre-gen" bullet with "Pre-gen triggered by client", updated rate limit bullet to note background token is legacy. Updated `INTERNAL_BACKGROUND_SECRET` env var description in `supabase/CLAUDE.md`.
**Status:** Fixed

## 2026-03-13 — RAL-52 — No issues found

## 2026-03-13 — RAL-48 — Updated CLAUDE.md for unit_role column and section numbering
**What was confusing / wrong:** `supabase/functions/CLAUDE.md` did not document the section numbering logic for supplemental vs main units, nor the new `unit_role` column.
**File/folder affected:** `supabase/functions/CLAUDE.md`
**What I did:** Added two bullet points documenting section numbering rules and the `unit_role` column mapping.
**Status:** Fixed

## 2026-03-13 — RAL-44 — Updated CLAUDE.md docs for OWNER_EMAIL env var
**What was confusing / wrong:** `supabase/CLAUDE.md` and `supabase/functions/CLAUDE.md` did not document the `OWNER_EMAIL` env var or the owner rate limit override. Also, `_shared` folder was missing from the structure diagram in `supabase/CLAUDE.md`.
**File/folder affected:** `supabase/CLAUDE.md`, `supabase/functions/CLAUDE.md`, `dailyprong-web/CLAUDE.md`
**What I did:** Added `OWNER_EMAIL` to all three env var docs and updated the rate limit description in `functions/CLAUDE.md`.
**Status:** Fixed

## 2026-03-13 — RAL-49 — No issues found

## 2026-03-13 — RAL-47 — No issues found

## 2026-03-13 — RAL-43b — No issues found

## 2026-03-13 — RAL-43 — No issues found

## 2026-03-13 — RAL-45 code review cleanup
**What was confusing / wrong:** `src/hooks/CLAUDE.md` listed `generationError` in the `useUnitGeneration` exports, which was removed as dead state in this cleanup.
**File/folder affected:** `src/hooks/CLAUDE.md`
**What I did:** Removed `generationError` from the hook table row to match the updated interface.
**Status:** Fixed

## 2026-03-13 — RAL-41 — Updated CLAUDE.md docs for server-side pre-gen
**What was confusing / wrong:** `supabase/functions/CLAUDE.md` did not document `INTERNAL_BACKGROUND_SECRET` env var, the duplicate guard, server-side pre-gen triggers, or `process-feedback`'s new pre-gen + stale deletion behavior. `src/hooks/CLAUDE.md` still listed `isPreGenerating` and `startBackgroundGeneration` exports.
**File/folder affected:** `supabase/CLAUDE.md`, `supabase/functions/CLAUDE.md`, `src/hooks/CLAUDE.md`
**What I did:** Updated all three docs to reflect the new server-side pre-gen architecture.
**Status:** Fixed

## 2026-03-13 — RAL-42c — No issues found

## 2026-03-13 — RAL-42b — No issues found

## 2026-03-13 — RAL-42 — No issues found

## 2026-03-13 — RAL-40 Add motivational copy — No issues found

## 2026-03-13 — RAL-37 — Updated process-feedback CLAUDE.md for level_changed return field
**What was confusing / wrong:** `supabase/functions/CLAUDE.md` did not document the return value of `process-feedback`. After adding the `level_changed` field to the response, the docs needed a `Returns` line.
**File/folder affected:** `supabase/functions/CLAUDE.md`
**What I did:** Added `Returns` line documenting `{ success: true, level_changed: boolean }`.
**Status:** Fixed

## 2026-03-13 — RAL-36 — No issues found

## 2026-03-13 — RAL-35 — No issues found

## 2026-03-12 — RAL-34 — No issues found

## 2026-03-12 — RAL-27 — Updated hooks CLAUDE.md for background pre-generation
**What was confusing / wrong:** `src/hooks/CLAUDE.md` listed `useUnitGeneration` with only 5 exports and "4 actions". After adding `isPreGenerating`, `startBackgroundGeneration`, and noting `extra_resources` as a 5th action, the docs needed updating.
**File/folder affected:** `src/hooks/CLAUDE.md`
**What I did:** Updated the hook table row to include new exports and corrected the action count to 5.
**Status:** Fixed

## 2026-03-12 — RAL-32 — Updated CLAUDE.md for new extra_resources action
**What was confusing / wrong:** `supabase/functions/CLAUDE.md` said generate-unit "Supports 4 actions" and the action table only listed 4. After adding `extra_resources` as a 5th action, the docs needed updating.
**File/folder affected:** `supabase/functions/CLAUDE.md`
**What I did:** Updated action count to 5 and added `extra_resources` row to the action table.
**Status:** Fixed

## 2026-03-12 — RAL-33 — Plan claimed Tooltip imports not needed
**What was confusing / wrong:** The plan stated "No new imports needed — Tooltip/TooltipTrigger/TooltipContent are already available via the global provider." This conflates `TooltipProvider` (which wraps the app in App.tsx) with the actual `Tooltip`, `TooltipTrigger`, and `TooltipContent` components, which must be imported to use in JSX.
**File/folder affected:** `.claude/plans/RAL-33.md`, `src/pages/Onboarding.tsx`
**What I did:** Added the necessary Tooltip component imports to Onboarding.tsx.
**Suggested fix:** Plans should note that `TooltipProvider` being global does NOT eliminate the need to import Tooltip sub-components.
**Status:** Fixed

## 2026-03-12 — RAL-31 — Scrollbar track offset finally fixed with margin-top
**What was confusing / wrong:** The textarea scrollbar track in Mentor.tsx was bleeding under the `h-5` overlay div. Multiple prior attempts used `padding-top` on `::-webkit-scrollbar-track`, which has no effect in WebKit. Took several iterations to discover that `margin-top` is the correct property for offsetting scrollbar tracks in WebKit.
**File/folder affected:** `src/pages/Mentor.tsx`
**What I did:** Changed `[&::-webkit-scrollbar-track]:pt-5` → `[&::-webkit-scrollbar-track]:mt-5` in the `TEXTAREA_BASE` constant.
**Suggested fix:** Remember: WebKit scrollbar pseudo-elements ignore `padding` — use `margin` to offset track/thumb positioning.
**Status:** Fixed

## 2026-03-12 — RAL-30 — Model swap gemini-2.0-flash → gemini-2.5-flash-lite
**What was confusing / wrong:** CLAUDE.md files all still referenced `gemini-2.0-flash` — correctly matched the code at the time. Updated all docs to match the new `gemini-2.5-flash-lite` model.
**File/folder affected:** `dailyprong-web/CLAUDE.md`, `supabase/functions/CLAUDE.md`, all 3 edge functions
**What I did:** Replaced model string in generate-unit, mentor-chat, onboarding-chat edge functions + updated both CLAUDE.md files. Deployed all 3 functions.
**Status:** Fixed

## 2026-03-12 — RAL-29 — scroll-area.tsx edit sanctioned by plan
**What was confusing / wrong:** CLAUDE.md says "do not edit" shadcn/ui files in `src/components/ui/`, but RAL-29 explicitly required editing `scroll-area.tsx` to add `mt-1` to the scrollbar track. Same pattern as RAL-21 (textarea.tsx). No CLAUDE.md change needed — the rule is correct in general.
**File/folder affected:** `src/components/ui/scroll-area.tsx`
**What I did:** Applied the `mt-1` fix as specified. Also added `pt-4` to Mentor.tsx message content div.
**Status:** Fixed

## 2026-03-12 — RAL-28 — No issues found

## 2026-03-12 — mentor-textarea-scrollbar-fix — No issues found

## 2026-03-12 — RAL-26 — No issues found

## 2026-03-12 — RAL-24 — No issues found

## 2026-03-12 — RAL-25 — CLAUDE.md said gemini-2.5-flash, updated to gemini-2.0-flash
**What was confusing / wrong:** `CLAUDE.md` (root + `supabase/functions/CLAUDE.md`) referenced `gemini-2.5-flash` as the current model. Switched to `gemini-2.0-flash` for higher free-tier RPD.
**File/folder affected:** `dailyprong-web/CLAUDE.md`, `supabase/functions/CLAUDE.md`
**What I did:** Updated all model references from `gemini-2.5-flash` → `gemini-2.0-flash` in both CLAUDE.md files and all 3 edge functions.
**Status:** Fixed

## 2026-03-12 — RAL-21d — No issues found

## 2026-03-12 — RAL-21c — No issues found

## 2026-03-12 — RAL-21b — No issues found

## 2026-03-12 — RAL-21a — No issues found

## 2026-03-12 — RAL-20 — src/CLAUDE.md provider stack was outdated
**What was confusing / wrong:** `src/CLAUDE.md` listed the provider stack ending at `BrowserRouter → Routes` but didn't mention `UnitGenerationProvider` (newly added). The hooks CLAUDE.md also had no entry for the new hook.
**File/folder affected:** `src/CLAUDE.md`, `src/hooks/CLAUDE.md`, `dailyprong-web/CLAUDE.md`
**What I did:** Added `UnitGenerationProvider` to the provider chain in `src/CLAUDE.md`, added hook table row in `src/hooks/CLAUDE.md`, updated hooks list description in root `CLAUDE.md`.
**Status:** Fixed

## 2026-03-12 — RAL-23 — No issues found

## 2026-03-12 — RAL-22 — No issues found

## 2026-03-12 — RAL-21 — textarea.tsx edit sanctioned by issue
**What was confusing / wrong:** CLAUDE.md says "do not edit" shadcn/ui files in `src/components/ui/`, but the issue explicitly required editing `textarea.tsx` for scrollbar styling. The rule is correct in general but scrollbar customization classes aren't part of the shadcn scaffold — they were added manually before.
**File/folder affected:** `src/components/ui/textarea.tsx`, `src/components/ui/CLAUDE.md`
**What I did:** Applied the scrollbar fix as specified. No CLAUDE.md change needed — the rule is still correct for most cases.
**Status:** Fixed

## 2026-03-12 — RAL-18+RAL-19 — No CLAUDE.md issues found
**Note:** Fixed Dashboard.tsx pending units query (broken `.eq("cycles.user_id", ...)` PostgREST syntax — RLS handles user scoping), selectPillar now shows unit directly, handleFeedback awaits state reload, cycle-end routes to `up_to_date` instead of `pillar_selection`, and added "Cycle Complete!" / "Final section" UI. Also added `setActiveCycle(null)` reset on no-active-cycle path to ensure correct heading.

## 2026-03-12 — RAL-17 — No issues found

## 2026-03-12 — RAL-16 — No issues found

## 2026-03-12 — RAL-15 — No issues found

## 2026-03-13 — RAL-51 — Model swap gemini-2.5-flash-lite → gemini-2.5-flash
**What was confusing / wrong:** CLAUDE.md files (root + supabase/functions/) still referenced `gemini-2.5-flash-lite`. Updated all docs to match the new `gemini-2.5-flash` model.
**File/folder affected:** `CLAUDE.md`, `supabase/functions/CLAUDE.md`
**What I did:** Updated 1 reference in `CLAUDE.md` and 3 references in `supabase/functions/CLAUDE.md`.
**Suggested fix:** N/A — fixed in this commit.
**Status:** Fixed

## 2026-03-13 — RAL-55 — Fixed inaccurate process-feedback cycle-end doc
**What was confusing / wrong:** `supabase/functions/CLAUDE.md` described process-feedback's cycle-end logic as "checks if all non-bonus units in the cycle have feedback" with a "main units = cycle_length" check. The actual code (line 98) triggers cycle completion specifically when a non-bonus `synthesis`-type unit receives feedback — no count check at all.
**File/folder affected:** `supabase/functions/CLAUDE.md`
**What I did:** Replaced the inaccurate description with the correct trigger: "Triggers cycle completion when a non-bonus `synthesis`-type unit receives feedback."
**Status:** Fixed

## 2026-03-13 — RAL-56 — Updated CLAUDE.md for stale cycle auto-skip
**What was confusing / wrong:** `supabase/functions/CLAUDE.md` described `new_cycle` as failing with an error if an active cycle exists. After replacing the hard error with an auto-skip to `'skipped'` status, the docs needed updating.
**File/folder affected:** `supabase/functions/CLAUDE.md`
**What I did:** Updated the `new_cycle` action table row to document the auto-skip behavior.
**Status:** Fixed

## 2026-03-13 — RAL-54 — No issues found

## 2026-03-13 — RAL-58 — Gemini model swap
**What was confusing / wrong:** CLAUDE.md tech stack line said "Gemini 2.5 Flash Lite" but the actual code used `gemini-2.5-flash` (no "Lite"). The tech stack description was already slightly out of sync with code before this change.
**File/folder affected:** `CLAUDE.md`, `supabase/functions/CLAUDE.md`
**What I did:** Updated all 3 edge functions to `gemini-3.1-flash-lite`, and updated both CLAUDE.md files to match.
**Status:** Fixed

## 2026-03-13 — RAL-46 reset-user-data — No issues found

## 2026-03-13 — RAL-46 addendum: delete_account mode — No issues found

## 2026-03-13 — RAL-62 — Section numbering doc updated
**What was confusing / wrong:** `supabase/functions/CLAUDE.md` said supplemental units "inherit the current main section count" — this was only true before the fix. After RAL-62 they now prefer `current_section_number` from the client, with `mainUnitsCount` as a fallback.
**File/folder affected:** `supabase/functions/CLAUDE.md`
**What I did:** Updated the section numbering bullet to reflect the new behavior.
**Status:** Fixed

## 2026-03-13 — RAL-50 dashboard UX improvements

**What was confusing / wrong:** `useUnitGeneration` `GenerationParams` was strictly typed to only 5 action types and 4 optional fields — it did not support passing arbitrary body fields to the edge function. The plan assumed it might. Also, `supabase/functions/CLAUDE.md` didn't document `last_section_topic` or `cycle_recap`.
**File/folder affected:** `src/hooks/useUnitGeneration.tsx`, `supabase/functions/CLAUDE.md`, `src/hooks/CLAUDE.md`
**What I did:** Extended `GenerationParams` with `cycle_recap` action + `last_section_topic` field. Updated all three CLAUDE.md files to reflect the new 6-action support and `last_section_topic` behavior.
**Status:** Fixed

## 2026-03-13 — RAL-50-fix: transient stale cache + missing sequence computation

**What was confusing / wrong:** Two bugs made the `up_to_date` + activeCycle screen appear unchanged for sections 1–4. (1) `nextSectionType` was only sourced from the pre-gen unit — if no pre-gen existed yet, it was null and the subtitle fell back to the generic "Continue current cycle". (2) `lastSectionTopic`/`lastSectionType` were null during the transient `up_to_date` state after feedback submission — the stale query cache from the `pending_feedback` branch had nulls for those fields, and by the time the refetch returned correct values, the pre-gen unit was ready and the state had already transitioned back to `pending_feedback`.
**File/folder affected:** `src/pages/Dashboard.tsx`
**What I did:** (1) Added `buildSectionSeq` helper mirroring the edge function's section sequence logic; compute `nextSectionType` from `nonBonusCount` as a fallback when no pre-gen unit exists. (2) Added `lastCompletedTopic`/`lastCompletedType` local state — saved from `pendingUnit` in `handleFeedback` before clearing, used as fallbacks in the derivation lines, reset in `selectPillar`.
**Status:** Fixed
