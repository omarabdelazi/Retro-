import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

// The gate in front of every admin page and server action. Identity and the
// role check run through the RLS-scoped Supabase client (a user can only
// read their own profile); only after this passes may code touch the
// service-level Drizzle connection.
export async function requireAdmin() {
  const supabase = await createClient()

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error || !user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') redirect('/login?error=denied')

  return user
}
