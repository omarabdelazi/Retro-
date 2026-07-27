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

// The workshop counterpart. Unlike the admin gate, everything after this
// stays on the user's own Supabase client, so every query and mutation runs
// under RLS with their JWT — the workshop dashboard never touches the
// service connection.
export async function requireWorkshop() {
  const supabase = await createClient()

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error || !user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, workshop_id')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'workshop' || !profile.workshop_id) {
    redirect('/login?error=denied')
  }

  return { user, workshopId: profile.workshop_id as string, supabase }
}
