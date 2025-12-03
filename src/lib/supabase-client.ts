import { createBrowserClient } from "@supabase/ssr";

/**
 * Client-side Supabase client (respects RLS)
 * Safe to use in Client Components ("use client")
 * Uses @supabase/ssr for proper cookie handling in Next.js App Router
 */
export function createSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL environment variable");
  }

  if (!anonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable"
    );
  }

  return createBrowserClient(supabaseUrl, anonKey);
}
