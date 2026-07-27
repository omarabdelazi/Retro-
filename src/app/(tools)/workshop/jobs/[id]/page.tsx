import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireWorkshop } from '@/lib/auth'
import { money } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { LiveRefresh } from '@/components/admin/live-refresh'
import { dueLabel } from '../../job-card'
import { acceptJob, completeJob, startJob } from './actions'
import { RejectDialog } from './reject-dialog'

export const dynamic = 'force-dynamic'

type JobDetail = {
  id: string
  sequence: number
  qty: number
  status: string
  due_date: string | null
  accepted_at: string | null
  started_at: string | null
  completed_at: string | null
  rejection_reason: string | null
  product: {
    name_en: string
    name_ar: string
    category: string
    species: string
    joinery: string
    finish: string
    dimensions_mm: { w: number; d: number; h: number }
    description_en: string | null
    description_ar: string | null
  } | null
  payout: {
    amount: string
    currency: string
    status: string
  } | null
}

const errorMessages: Record<string, string> = {
  blocked: 'That change was not allowed. The job may have moved on — check its state.',
  reason: 'A rejection needs a reason.',
}

function SpecRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-6 border-b border-stone/40 py-3">
      <dt className="text-lg text-ink/60">{label}</dt>
      <dd className="text-end text-lg font-medium">{value}</dd>
    </div>
  )
}

export default async function JobDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ error?: string }>
}) {
  const { supabase } = await requireWorkshop()
  const { id } = await params
  const { error } = await searchParams

  // RLS makes another workshop's job indistinguishable from a missing one
  const { data } = await supabase
    .from('jobs')
    .select(
      `
      id, sequence, qty, status, due_date, accepted_at, started_at,
      completed_at, rejection_reason,
      product:products (
        name_en, name_ar, category, species, joinery, finish,
        dimensions_mm, description_en, description_ar
      ),
      payout:payouts ( amount, currency, status )
    `,
    )
    .eq('id', id)
    .maybeSingle()

  const job = data as unknown as JobDetail | null
  if (!job) notFound()

  const due = dueLabel(job.due_date)
  const dims = job.product?.dimensions_mm

  return (
    <div className="space-y-6">
      <LiveRefresh tables="jobs" />

      <Link href="/workshop" className="inline-block py-2 text-lg text-walnut hover:text-ochre">
        ← Queue
      </Link>

      <div>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h1 className="font-display text-4xl">{job.product?.name_en}</h1>
          <p className="font-display text-3xl" dir="rtl" lang="ar">
            {job.product?.name_ar}
          </p>
        </div>
        <p className="mt-2 text-xl">
          <span className="font-medium capitalize">{job.status.replaceAll('_', ' ')}</span>
          <span className="mx-3 text-stone">·</span>
          <span className={due.overdue && job.status !== 'completed' ? 'font-medium text-walnut' : ''}>
            {due.text}
          </span>
        </p>
      </div>

      {error ? (
        <p className="border-2 border-walnut bg-walnut/10 px-4 py-3 text-lg text-walnut">
          {errorMessages[error] ?? 'Something went wrong.'}
        </p>
      ) : null}

      <dl>
        <SpecRow label="Quantity" value={<span className="text-2xl">{job.qty}</span>} />
        {dims ? (
          <SpecRow
            label="Dimensions"
            value={`${dims.w} × ${dims.d} × ${dims.h} mm`}
          />
        ) : null}
        <SpecRow label="Species" value={job.product?.species} />
        <SpecRow label="Joinery" value={job.product?.joinery} />
        <SpecRow label="Finish" value={job.product?.finish} />
        <SpecRow label="Category" value={job.product?.category} />
        <SpecRow label="Step in chain" value={job.sequence} />
        {job.payout ? (
          <SpecRow
            label="Your payout"
            value={`${money(job.payout.amount, job.payout.currency)} — ${job.payout.status}`}
          />
        ) : null}
      </dl>

      {job.product?.description_en ? (
        <p className="text-lg text-ink/80">{job.product.description_en}</p>
      ) : null}
      {job.product?.description_ar ? (
        <p className="text-lg text-ink/80" dir="rtl" lang="ar">
          {job.product.description_ar}
        </p>
      ) : null}

      {job.status === 'rejected' && job.rejection_reason ? (
        <p className="border-2 border-stone bg-stone/10 px-4 py-3 text-lg">
          Rejected: {job.rejection_reason}
        </p>
      ) : null}

      <div className="flex flex-col gap-3 pt-2 sm:flex-row">
        {job.status === 'pending' ? (
          <>
            <form action={acceptJob.bind(null, job.id)} className="w-full sm:w-auto">
              <Button type="submit" className="h-14 w-full text-xl sm:px-10">
                Accept job
              </Button>
            </form>
            <RejectDialog jobId={job.id} />
          </>
        ) : null}
        {job.status === 'accepted' ? (
          <>
            <form action={startJob.bind(null, job.id)} className="w-full sm:w-auto">
              <Button type="submit" className="h-14 w-full text-xl sm:px-10">
                Start production
              </Button>
            </form>
            <RejectDialog jobId={job.id} />
          </>
        ) : null}
        {job.status === 'in_progress' ? (
          <form action={completeJob.bind(null, job.id)} className="w-full sm:w-auto">
            <Button type="submit" className="h-14 w-full text-xl sm:px-10">
              Mark complete
            </Button>
          </form>
        ) : null}
        {job.status === 'completed' ? (
          <p className="text-xl">
            Done. It will appear in{' '}
            <Link href="/workshop/history" className="text-walnut underline hover:text-ochre">
              history
            </Link>{' '}
            with its payout.
          </p>
        ) : null}
      </div>
    </div>
  )
}
