'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireWorkshop } from '@/lib/auth'

// Every mutation goes through the user's own Supabase client, so RLS row
// policies, column grants, and the transition trigger are the enforcement.
// The .eq('status') guards only make stale-screen taps fail politely.

function done(jobId: string, failed: boolean): never {
  revalidatePath('/workshop')
  revalidatePath(`/workshop/jobs/${jobId}`)
  revalidatePath('/workshop/history')
  redirect(`/workshop/jobs/${jobId}${failed ? '?error=blocked' : ''}`)
}

export async function acceptJob(jobId: string) {
  const { supabase } = await requireWorkshop()
  const { data, error } = await supabase
    .from('jobs')
    .update({ status: 'accepted', accepted_at: new Date().toISOString() })
    .eq('id', jobId)
    .eq('status', 'pending')
    .select('id')
  done(jobId, Boolean(error) || !data?.length)
}

export async function startJob(jobId: string) {
  const { supabase } = await requireWorkshop()
  const { data, error } = await supabase
    .from('jobs')
    .update({ status: 'in_progress', started_at: new Date().toISOString() })
    .eq('id', jobId)
    .eq('status', 'accepted')
    .select('id')
  done(jobId, Boolean(error) || !data?.length)
}

export async function completeJob(jobId: string) {
  const { supabase } = await requireWorkshop()
  const { data, error } = await supabase
    .from('jobs')
    .update({ status: 'completed', completed_at: new Date().toISOString() })
    .eq('id', jobId)
    .eq('status', 'in_progress')
    .select('id')
  done(jobId, Boolean(error) || !data?.length)
}

export async function rejectJob(jobId: string, formData: FormData) {
  const { supabase } = await requireWorkshop()
  const reason = String(formData.get('reason') ?? '').trim()
  if (!reason) redirect(`/workshop/jobs/${jobId}?error=reason`)

  const { data, error } = await supabase
    .from('jobs')
    .update({ status: 'rejected', rejection_reason: reason })
    .eq('id', jobId)
    .in('status', ['pending', 'accepted'])
    .select('id')
  done(jobId, Boolean(error) || !data?.length)
}
