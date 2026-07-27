import Link from 'next/link'
import { cn } from '@/lib/utils'

export type QueueJob = {
  id: string
  sequence: number
  qty: number
  status: string
  due_date: string | null
  product: {
    name_en: string
    name_ar: string
    category: string
    species: string
  } | null
}

export function dueLabel(dueDate: string | null): {
  text: string
  overdue: boolean
} {
  if (!dueDate) return { text: 'no due date', overdue: false }
  const due = new Date(`${dueDate}T00:00:00Z`)
  const today = new Date(new Date().toISOString().slice(0, 10) + 'T00:00:00Z')
  const days = Math.round((due.getTime() - today.getTime()) / 86400000)
  if (days < 0) return { text: `${-days} days overdue`, overdue: true }
  if (days === 0) return { text: 'due today', overdue: true }
  if (days === 1) return { text: 'due tomorrow', overdue: false }
  return { text: `due in ${days} days`, overdue: false }
}

// One job, one card, one thumb-sized target.
export function JobCard({ job }: { job: QueueJob }) {
  const due = dueLabel(job.due_date)

  return (
    <Link
      href={`/workshop/jobs/${job.id}`}
      className={cn(
        'block rounded-xs border-2 bg-bone p-5 hover:border-ochre focus-visible:outline-2 focus-visible:outline-ochre',
        due.overdue && job.status !== 'completed'
          ? 'border-walnut'
          : 'border-ink/25',
      )}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <span className="text-2xl font-medium">{job.product?.name_en}</span>
        <span className="text-2xl" dir="rtl" lang="ar">
          {job.product?.name_ar}
        </span>
      </div>
      <div className="mt-2 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <span className="text-lg">
          qty <span className="font-medium">{job.qty}</span>
          <span className="mx-2 text-stone">·</span>
          {job.product?.species}
          <span className="mx-2 text-stone">·</span>
          step {job.sequence}
        </span>
        <span
          className={cn(
            'text-lg',
            due.overdue && job.status !== 'completed'
              ? 'font-medium text-walnut'
              : 'text-ink/70',
          )}
        >
          {due.text}
        </span>
      </div>
    </Link>
  )
}
