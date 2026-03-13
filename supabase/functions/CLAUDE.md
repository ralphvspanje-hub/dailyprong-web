# supabase/functions/ — Agent Context

## _shared/

Shared Deno modules imported by multiple edge functions.

| Module | Export | Used by |
|--------|--------|---------|
| `rateLimit.ts` | `checkRateLimit` | mentor-chat, generate-unit, onboarding-chat |
| `cors.ts` | `getCorsHeaders` | all 6 functions |

Rate limits: 50 calls/user/day (500 for owner via `OWNER_EMAIL` env var), 100 calls/IP/day per endpoint. Auto-cleans rows older than 48h from `api_rate_limits`.

## mentor-chat

AI mentor conversation endpoint.

- **Auth**: Bearer JWT → `supabase.auth.getUser()` for user ID
- **Rate limits**: 50 calls/user/day, 100 calls/IP/day via `api_rate_limits` table. Old rows (>48h) auto-cleaned.
- **Context loaded**: user_profile, active pillars, active phase, last 3 cycles, last 30 conversation messages
- **AI model**: `gemini-3.1-flash-lite` via Google Generative AI REST API
- **Env vars**: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`
- **Settings**: max_tokens 2048, temperature 0.7
- **Message limit**: Max 2000 chars per user message
- **PROPOSED_CHANGES format**: When the mentor proposes pillar changes, it appends a structured block at the end of its message:

```
PROPOSED_CHANGES
{"action": "<action>", "changes": {<changes>}}
```

Actions: `add_pillar`, `delete_pillar`, `edit_pillar`, `swap_pillar`, `change_level`, `full_recalibration`

## apply-mentor-changes

Applies pillar mutations proposed by the mentor.

- **Auth**: Bearer JWT → `supabase.auth.getUser()` for user ID
- **Env vars**: `SUPABASE_URL`, `SUPABASE_ANON_KEY` only (no admin client needed)
- **Actions**:

| Action | What it does |
|--------|-------------|
| `add_pillar` | Insert pillar + topic clusters, auto-increment sort_order |
| `delete_pillar` | Delete pillar + its topic_map + phase_weights |
| `edit_pillar` | Update pillar fields. **Whitelist**: `name`, `description`, `why_it_matters`, `phase_weight` only |
| `swap_pillar` | Delete one pillar, add another (combines delete + add logic) |
| `change_level` | Set `current_level` on a pillar (clamped 1–5) |
| `full_recalibration` | Returns `{ redirect: "/onboarding" }` — no DB changes, client handles redirect |

## generate-unit

Generates AI learning units for a cycle. Supports 5 actions.

- **Auth**: Bearer JWT → `supabase.auth.getUser()` for user ID
- **Rate limits**: 50 calls/user/day, 100 calls/IP/day via `api_rate_limits` table. Skipped for calls carrying `X-Background-Token` matching `INTERNAL_BACKGROUND_SECRET` (legacy; no server-side cascade currently fires these).
- **Duplicate guard**: For `next_section`, checks for a non-bonus `is_pending_feedback` unit in the cycle. When `current_section_number` is provided (pre-gen path), only matches units with `section_number > current_section_number` — this prevents the currently-displayed unit from short-circuiting the pre-gen. When absent (manual "Next Section" path), matches any pending non-bonus unit.
- **Pre-gen triggered by client**: Dashboard.tsx fires a silent `next_section` call with `current_section_number` when a unit is displayed. The duplicate guard prevents wasted AI calls if the next unit already exists. No server-side cascade.
- **Env vars**: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`, `INTERNAL_BACKGROUND_SECRET`
- **AI model**: `gemini-3.1-flash-lite` via Google Generative AI REST API
- **Token budget**: Scales with `daily_time_commitment` from user_profile: 5min→800, 10min→1200, 15min→1800, 30min→3000, 45min→4000, 60min→5000. For 45–60 min, a "Go Deeper" resource section is appended.
- **Section sequence**: `concept → deep_dive → case_study → hands_on → synthesis`. For cycle_length ≠ 5, the middle types repeat/truncate while concept stays first and synthesis stays last.
- **Section numbering**: Supplemental units (`bonus`, `repeat_section`, `extra_resources`, `cycle_recap`) use `current_section_number` from the client (falls back to `mainUnitsCount` if absent). Main units (`new_cycle`, `next_section`) get `mainUnitsCount + 1`.
- **`unit_role` column**: Persisted alongside `is_bonus`. Maps from action: `new_cycle`/`next_section` → `"normal"`, `bonus` → `"bonus"`, `repeat_section` → `"repeat"`, `extra_resources` → `"extra_resources"`, `cycle_recap` → `"cycle_recap"`. Used by the UI for badge labels.
- **`last_section_topic`**: Optional string from client. When provided for `bonus`, focuses the bonus unit on that topic. When provided for `extra_resources`, narrows the resource suggestions to that specific topic instead of the whole cycle. Sent by the Dashboard when `activeCycle` is present.

| Action | Input | DB Operations |
|--------|-------|---------------|
| `new_cycle` | `{ pillar_id, action }` | Auto-skip any stale active cycle → pick next queued cluster → create cycle row → mark cluster `in_progress` → generate concept unit → save |
| `next_section` | `{ cycle_id, action }` | Read existing units → determine next section type in sequence → generate → save |
| `bonus` | `{ cycle_id, action }` | AI picks section type → generate different-angle content → save with `is_bonus: true` |
| `repeat_section` | `{ cycle_id, action, section_type }` | Generate same section type with new content → save with `is_bonus: true` |
| `extra_resources` | `{ cycle_id, action }` | Generate cycle summary + YouTube search suggestions + practice resource recommendations → save with `is_bonus: true` |
| `cycle_recap` | `{ cycle_id, action }` | Generate structured section-by-section recap of completed cycle using all existing units as context → save with `section_type: "synthesis"`, `unit_role: "cycle_recap"`, `is_bonus: true` |

- **Cycle number**: Count all user's cycles + 1
- **Returns**: `{ success, unit_id, section_type, topic }`

## onboarding-chat

AI-guided onboarding conversation that discovers the user's career context and builds their learning architecture.

- **Auth**: Bearer JWT → `supabase.auth.getUser()` for user ID
- **Rate limits**: 50 calls/user/day, 100 calls/IP/day via `api_rate_limits` table
- **Env vars**: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`
- **AI model**: `gemini-3.1-flash-lite` via Google Generative AI REST API
- **Settings**: max_tokens 4096, temperature 0.7
- **Message limits**: Max 2000 chars per user message, max 16000 chars per assistant message
- **No DB writes** — client handles all saves to user_profile, pillars, topic_map, phases, onboarding_conversations

| Action | Input | Returns |
|--------|-------|---------|
| `start` | `{ action: "start", messages: [] }` | `{ message }` — opening greeting |
| `continue` | `{ action: "continue", messages: [...] }` | `{ message }` or `{ message, outputs }` when complete |

- **Completion detection**: AI wraps final output in `[ONBOARDING_COMPLETE]...[/ONBOARDING_COMPLETE]` block containing JSON with `{ pillars, phases, topicMap }`. Function parses it and returns `{ message, outputs }`.
- **Soft cap**: After 10 user turns, system prompt hints AI to conclude.
- **Output shape**: `outputs.pillars[]` has `name, description, why_it_matters, starting_level, key_topics`. `outputs.phases[]` has `name, timeline_start, timeline_end, goal, weights`. `outputs.topicMap[]` has `pillar, cluster_name, subtopics, difficulty_level`.

## process-feedback

Processes unit feedback to adjust pillar difficulty and detect cycle completion.

- **Input**: `{ unit_id, pillar_id, difficulty, value }`
- **Returns**: `{ success: true, level_changed: boolean }` — `level_changed` is `true` when feedback caused the pillar's `current_level` to change
- **Two-consecutive-signals rule**: Only adjusts pillar level when the last two difficulty signals from the same pillar agree (e.g., two consecutive `too_easy` → level up, two consecutive `too_hard` → level down). Updates `pillars.current_level` (clamped 1–5) and `pillars.trend`.
- **Cycle-end logic**: Triggers cycle completion when a non-bonus `synthesis`-type unit receives feedback. Archives the cycle (computes avg difficulty/value from all non-bonus units), marks the cycle `completed`, marks the associated topic_map cluster as `covered`, and creates a `progress_archive` entry.
- **Level-down stale cleanup**: For non-bonus, non-synthesis units where `level_changed` is true, deletes any stale pending non-bonus units in the cycle (so the next generation uses the updated level).
- **Pre-gen moved to client**: Pre-generation of the next section is triggered from Dashboard.tsx on unit display, not from this function. See Dashboard.tsx `useEffect` keyed on `pendingUnit?.id`.
- **Env vars**: `SUPABASE_URL`, `SUPABASE_ANON_KEY`

## reset-user-data

Destructive data reset endpoint with three modes.

- **Auth**: Bearer JWT → `supabase.auth.getUser()` for user ID
- **Input**: `{ mode: "full" | "rewind" | "delete_account" }`
- **Returns**: `{ success: true }`
- **Service role client**: Used for all deletes (bypasses RLS on tables like `cycles`, `units`, `progress_archive`) and for `admin.auth.admin.deleteUser()`
- **`full` mode**: Deletes everything — progress_archive, cycles (cascades → units), phases (cascades → phase_weights), pillars (cascades → topic_map, phase_weights), mentor_conversations, onboarding_conversations, personal_notes, api_rate_limits, user_profile. Client redirects to `/onboarding`.
- **`rewind` mode**: Owner-only (checked against `OWNER_EMAIL` env var, 403 if not owner). Deletes progress_archive, cycles (cascades → units), mentor_conversations, personal_notes, api_rate_limits. Resets `topic_map.status` to `queued`. Preserves profile, pillars, phases. Client redirects to `/dashboard`.
- **`delete_account` mode**: Same full-data delete as `full`, then calls `admin.auth.admin.deleteUser(userId)` to remove the auth user. Client calls `supabase.auth.signOut()` and redirects to `/auth`.
- **Env vars**: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `OWNER_EMAIL`
