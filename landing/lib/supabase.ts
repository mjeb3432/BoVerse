// Supabase client. Two flavors: browser (uses anon key, safe to expose) and
// server (uses service role, server-side ONLY — never imported in 'use client').

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export const HAS_SUPABASE_PUBLIC = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);
export const HAS_SUPABASE_SERVICE = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Browser client — anon key. Use from client components or Route Handlers
// where you want RLS to apply.
export function createBrowserSupabase(): SupabaseClient | null {
  if (!HAS_SUPABASE_PUBLIC) return null;
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// Server client — service role key. Bypasses RLS. ONLY import from Route
// Handlers or server actions, never from a 'use client' file.
export function createServerSupabase(): SupabaseClient | null {
  if (!HAS_SUPABASE_SERVICE) return null;
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

export function ensureSupabaseConfigured():
  | { ok: true }
  | { ok: false; reason: string } {
  if (!HAS_SUPABASE_SERVICE) {
    return {
      ok: false,
      reason:
        'Supabase env vars are not set. Create a project at https://supabase.com/dashboard, then add NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY to landing/.env.local.',
    };
  }
  return { ok: true };
}

// Storage bucket name for uploaded source artifacts. Created lazily by the
// 01-ingest route on first use.
export const ARTIFACTS_BUCKET = 'workflow-artifacts';
