import { requireWorkshop } from '@/lib/auth'
import { LiveRefresh } from '@/components/admin/live-refresh'
import { JobCard, type QueueJob } from './job-card'

export const dynamic = 'force-dynamic'

// All three queries run on the user's own JWT: RLS returns this workshop's
// jobs and nothing else — no workshop_id filter appears in application code.
const JOB_SELECT = `
  id, sequence, qty, status, due_date, completed_at,
  product:products ( name_en, name_ar, category, species )
`

export default async function WorkshopQueue() {
  const { supabase } = await requireWorkshop()

  const monthStart = new Date()
  monthStart.setUTCDate(1)
  monthStart.setUTCHours(0, 0, 0, 0)

  const [incomingRes, workingRes, doneRes] = await Promise.all([
    supabase
      .from('jobs')
      .select(JOB_SELECT)
      .eq('status', 'pending')
      .order('due_date', { ascending: true, nullsFirst: false }),
    supabase
      .from('jobs')
      .select(JOB_SELECT)
      .in('status', ['accepted', 'in_progress'])
      .order('due_date', { ascending: true, nullsFirst: false }),
    supabase
      .from('jobs')
      .select(JOB_SELECT)
      .eq('status', 'completed')
      .gte('completed_at', monthStart.toISOString())
      .order('completed_at', { ascending: false }),
  ])

  const incoming = (incomingRes.data ?? []) as unknown as QueueJob[]
  const working = (workingRes.data ?? []) as unknown as QueueJob[]
  const done = (doneRes.data ?? []) as unknown as QueueJob[]

  return (
    <div className="space-y-8">
      <LiveRefresh tables="jobs" />

      <section>
        <h1 className="mb-3 font-display text-3xl">
          Incoming
          {incoming.length > 0 ? (
            <span className="ms-3 text-walnut">{incoming.length}</span>
          ) : null}
        </h1>
        {incoming.length === 0 ? (
          <p className="text-lg text-ink/70">No jobs waiting for acceptance.</p>
        ) : (
          <div className="space-y-3">
            {incoming.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 font-display text-3xl">In production</h2>
        {working.length === 0 ? (
          <p className="text-lg text-ink/70">Nothing on the bench.</p>
        ) : (
          <div className="space-y-3">
            {working.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 font-display text-3xl">
          Completed this month
          <span className="ms-3 text-walnut">{done.length}</span>
        </h2>
        {done.length === 0 ? (
          <p className="text-lg text-ink/70">None yet this month.</p>
        ) : (
          <ul className="space-y-2">
            {done.map((job) => (
              <li
                key={job.id}
                className="flex flex-wrap items-baseline justify-between gap-2 border-b border-stone/40 pb-2"
              >
                <span className="text-xl">
                  {job.product?.name_en}
                  <span className="ms-2 text-ink/60">qty {job.qty}</span>
                </span>
                <span className="text-xl" dir="rtl" lang="ar">
                  {job.product?.name_ar}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
