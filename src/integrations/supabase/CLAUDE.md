# src/integrations/supabase/ — Agent Context

## Do Not Edit

Both files in this folder are **auto-generated**. Do not edit them manually.

| File | Purpose |
|------|---------|
| client.ts | Creates the typed Supabase client singleton |
| types.ts | Generated `Database` type with all table/column types |

## Import Pattern

```ts
import { supabase } from "@/integrations/supabase/client";
```

## Env Vars Read by client.ts

| Variable | Purpose |
|----------|---------|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase anon/publishable key |

**Note:** The README mentions `VITE_SUPABASE_ANON_KEY` but the actual code reads `VITE_SUPABASE_PUBLISHABLE_KEY`. Use the latter.
