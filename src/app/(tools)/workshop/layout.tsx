import type { Metadata } from 'next'
import Link from 'next/link'
import { requireWorkshop } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { signOut } from '../login/actions'

export const metadata: Metadata = {
  title: 'Retro — Workshop',
}

// Floor chrome: one dashboard, scoped by the signed-in user's workshop_id.
// Everything inside renders at arm's-length sizes with plain ink on bone.
export default async function WorkshopLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { workshopId, supabase } = await requireWorkshop()

  const { data: workshop } = await supabase
    .from('workshops')
    .select('name_en, name_ar')
    .eq('id', workshopId)
    .single()

  return (
    <div className="mx-auto flex min-h-screen max-w-4xl flex-col px-4 pb-10 text-lg">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-ink/20 py-4">
        <div>
          <p className="font-display text-2xl leading-tight">
            {workshop?.name_en ?? 'Workshop'}
          </p>
          <p className="text-lg text-walnut" dir="rtl" lang="ar">
            {workshop?.name_ar}
          </p>
        </div>
        <nav className="flex items-center gap-2">
          <Link
            href="/workshop"
            className="rounded-xs border-2 border-ink/30 px-5 py-2.5 text-lg font-medium text-ink hover:border-ochre focus-visible:outline-2 focus-visible:outline-ochre"
          >
            Queue
          </Link>
          <Link
            href="/workshop/history"
            className="rounded-xs border-2 border-ink/30 px-5 py-2.5 text-lg font-medium text-ink hover:border-ochre focus-visible:outline-2 focus-visible:outline-ochre"
          >
            History
          </Link>
          <form action={signOut}>
            <Button variant="ghost" className="h-12 px-4 text-lg" type="submit">
              Sign out
            </Button>
          </form>
        </nav>
      </header>
      <main className="flex-1 pt-5">{children}</main>
    </div>
  )
}
