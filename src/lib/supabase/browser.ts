import { createBrowserClient } from '@supabase/ssr'

// For Client Components. Only the public URL and anon key ever reach the
// browser; RLS is what stands between the anon key and the data.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}
