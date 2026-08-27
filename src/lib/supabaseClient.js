import { createClient } from "@supabase/supabase-js";

// Reads Supabase credentials from Vite env vars. If absent, the app falls
// back to a localStorage-based auth + data layer (see localAuth.js / localDb.js)
// so the app is fully functional for demos without a backend.
//
// To connect real Supabase:
//  1. Create a project at https://supabase.com
//  2. Add to .env:
//       VITE_SUPABASE_URL=https://your-project.supabase.co
//       VITE_SUPABASE_ANON_KEY=your-anon-key
//  3. Run the SQL migration in supabase/migration.sql
// The app automatically switches to cloud storage — no code changes needed.

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(url && anonKey);

export const supabase = isSupabaseConfigured
  ? createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null;
