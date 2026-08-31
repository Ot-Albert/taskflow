import { createClient } from "@supabase/supabase-js";

// Reads Supabase credentials from Vite env vars. Supabase is required for
// authentication — the local fallback has been removed to enforce consistent
// security (email verification, password reset, and RLS).
//
// To connect Supabase:
//  1. Create a project at https://supabase.com
//  2. Add to .env:
//       VITE_SUPABASE_URL=https://your-project.supabase.co
//       VITE_SUPABASE_ANON_KEY=your-anon-key
//  3. Run the SQL migration in supabase/migration.sql
//  4. Deploy the Edge Functions in supabase/functions/

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
