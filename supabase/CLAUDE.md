# supabase/ — Agent Context

## Overview

Supabase backend configuration: edge functions, database migrations, and project config.

## Structure

```
supabase/
├── config.toml       # Project ID + function settings
├── migrations/       # Postgres schema SQL files
└── functions/        # Deno edge functions
    ├── _shared/              # Shared Deno modules (rateLimit.ts, cors.ts)
    ├── mentor-chat/
    ├── apply-mentor-changes/
    ├── generate-unit/
    ├── onboarding-chat/
    ├── process-feedback/
    └── reset-user-data/
```

## config.toml

- Project ID: `hpubamqxoeckzrbvgsof`
- All functions have `verify_jwt = false` — JWT validation is handled manually in function code via `supabase.auth.getUser()`

## Env Vars Used by Edge Functions

| Variable | Used by | Purpose |
|----------|---------|---------|
| `SUPABASE_URL` | All | Supabase project URL |
| `SUPABASE_ANON_KEY` | All | Anon key for user-scoped client |
| `SUPABASE_SERVICE_ROLE_KEY` | mentor-chat, generate-unit, onboarding-chat, reset-user-data | Admin client for rate limit table / data deletion |
| `GEMINI_API_KEY` | mentor-chat, generate-unit, onboarding-chat | Google Generative AI API key |
| `INTERNAL_BACKGROUND_SECRET` | generate-unit | Shared secret used to identify background calls (skips rate limiting). No server-side cascade currently fires these — kept as legacy infrastructure. Set manually in Supabase dashboard → Edge Function secrets. |
| `OWNER_EMAIL` | _shared/rateLimit.ts, reset-user-data | Owner account email — gets 500/day rate limit instead of 50; also gates the "rewind" mode. Set in Supabase dashboard → Edge Function secrets. |

