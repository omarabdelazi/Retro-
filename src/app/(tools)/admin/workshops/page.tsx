import { asc, eq, sql } from 'drizzle-orm'
import { getDb } from '@/db'
import { profiles, workshops } from '@/db/schema'
import { requireAdmin } from '@/lib/auth'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  assignUserToWorkshop,
  deleteWorkshop,
  removeUserFromWorkshop,
} from './actions'
import { WorkshopDialog } from './workshop-dialog'

export const dynamic = 'force-dynamic'

const errorMessages: Record<string, string> = {
  fields: 'Fill in every required field.',
  slug: 'That slug is already taken.',
  'in-use':
    'This workshop has jobs, payouts, production steps, or members and cannot be deleted.',
  'no-user': 'No account exists with that email.',
  'is-admin': 'That account is an admin; remove admin first.',
}

export default async function WorkshopsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  await requireAdmin()
  const { error } = await searchParams
  const db = getDb()

  const [rows, members] = await Promise.all([
    db
      .select({
        id: workshops.id,
        slug: workshops.slug,
        nameEn: workshops.nameEn,
        nameAr: workshops.nameAr,
        active: workshops.active,
        openJobs: sql<number>`(
          select count(*)::int from public.jobs j
          where j.workshop_id = ${workshops.id}
            and j.status not in ('completed', 'rejected')
        )`,
      })
      .from(workshops)
      .orderBy(asc(workshops.nameEn)),
    db
      .select({
        id: profiles.id,
        fullName: profiles.fullName,
        workshopId: profiles.workshopId,
        email: sql<string | null>`(
          select u.email from auth.users u where u.id = "profiles"."id"
        )`,
      })
      .from(profiles)
      .where(eq(profiles.role, 'workshop'))
      .orderBy(asc(profiles.fullName)),
  ])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl">Workshops</h1>
        <WorkshopDialog />
      </div>

      {error ? (
        <p className="border border-walnut/50 bg-walnut/10 px-3 py-2 text-sm text-walnut">
          {errorMessages[error] ?? 'Something went wrong.'}
        </p>
      ) : null}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Workshop</TableHead>
            <TableHead>Slug</TableHead>
            <TableHead>Open jobs</TableHead>
            <TableHead>Users</TableHead>
            <TableHead>State</TableHead>
            <TableHead className="w-36" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((workshop) => {
            const workshopMembers = members.filter((m) => m.workshopId === workshop.id)
            return (
              <TableRow key={workshop.id}>
                <TableCell>
                  <span className="font-medium">{workshop.nameEn}</span>
                  <span className="ms-2 text-sm text-stone" dir="rtl" lang="ar">
                    {workshop.nameAr}
                  </span>
                </TableCell>
                <TableCell className="text-stone">{workshop.slug}</TableCell>
                <TableCell>{workshop.openJobs}</TableCell>
                <TableCell>
                  {workshopMembers.length === 0 ? (
                    <span className="text-sm text-stone">none</span>
                  ) : (
                    <ul className="space-y-0.5">
                      {workshopMembers.map((member) => (
                        <li key={member.id} className="flex items-center gap-2 text-sm">
                          <span>{member.fullName ?? member.email ?? member.id}</span>
                          <span className="text-stone">{member.email}</span>
                          <form action={removeUserFromWorkshop.bind(null, member.id)}>
                            <Button variant="quiet" size="xs" type="submit">
                              Remove
                            </Button>
                          </form>
                        </li>
                      ))}
                    </ul>
                  )}
                  <form
                    action={assignUserToWorkshop.bind(null, workshop.id)}
                    className="mt-1.5 flex items-center gap-1.5"
                  >
                    <Input
                      name="email"
                      type="email"
                      placeholder="email to assign"
                      className="h-7 w-52 text-sm"
                    />
                    <Button variant="outline" size="xs" type="submit">
                      Assign
                    </Button>
                  </form>
                </TableCell>
                <TableCell>
                  <Badge variant={workshop.active ? 'walnut' : 'muted'}>
                    {workshop.active ? 'active' : 'inactive'}
                  </Badge>
                </TableCell>
                <TableCell className="text-end">
                  <div className="flex justify-end gap-1">
                    <WorkshopDialog workshop={workshop} />
                    <form action={deleteWorkshop.bind(null, workshop.id)}>
                      <Button variant="quiet" size="xs" type="submit">
                        Delete
                      </Button>
                    </form>
                  </div>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
