import { requireAdmin } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { signOut } from '../login/actions'
import { AdminNav } from './nav'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await requireAdmin()

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-52 shrink-0 flex-col justify-between border-e border-stone/50 py-5">
        <div>
          <div className="px-3 pb-5">
            <span className="font-display text-2xl">Retro</span>
            <span className="ms-2 text-sm text-stone">admin</span>
          </div>
          <AdminNav />
        </div>
        <div className="space-y-2 px-3">
          <p className="truncate text-sm text-stone" title={user.email ?? ''}>
            {user.email}
          </p>
          <form action={signOut}>
            <Button variant="outline" size="xs" type="submit">
              Sign out
            </Button>
          </form>
        </div>
      </aside>
      <main className="min-w-0 flex-1 px-6 py-5">{children}</main>
    </div>
  )
}
