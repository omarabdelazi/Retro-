import Link from 'next/link'
import { asc, sql } from 'drizzle-orm'
import { getDb } from '@/db'
import { collections } from '@/db/schema'
import { requireAdmin } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { createCollection } from './actions'

export const dynamic = 'force-dynamic'

export default async function CollectionsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  await requireAdmin()
  const { error } = await searchParams
  const db = getDb()

  const rows = await db
    .select({
      id: collections.id,
      slug: collections.slug,
      nameEn: collections.nameEn,
      nameAr: collections.nameAr,
      productCount: sql<number>`(
        select count(*)::int from public.collection_products cp
        where cp.collection_id = ${collections.id}
      )`,
    })
    .from(collections)
    .orderBy(asc(collections.nameEn))

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl">Collections</h1>
        <Dialog>
          <DialogTrigger asChild>
            <Button>New collection</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogTitle>New collection</DialogTitle>
            <form action={createCollection} className="mt-4 space-y-3">
              <div className="space-y-1">
                <Label htmlFor="c-slug">Slug</Label>
                <Input id="c-slug" name="slug" required />
              </div>
              <div className="space-y-1">
                <Label htmlFor="c-name-en">Name (English)</Label>
                <Input id="c-name-en" name="nameEn" required />
              </div>
              <div className="space-y-1">
                <Label htmlFor="c-name-ar">Name (Arabic)</Label>
                <Input id="c-name-ar" name="nameAr" dir="rtl" lang="ar" required />
              </div>
              <Button type="submit">Create</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {error ? (
        <p className="border border-walnut/50 bg-walnut/10 px-3 py-2 text-sm text-walnut">
          {error === 'slug' ? 'That slug is already taken.' : 'Fill in every field.'}
        </p>
      ) : null}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Slug</TableHead>
            <TableHead>Products</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((collection) => (
            <TableRow key={collection.id}>
              <TableCell>
                <Link
                  href={`/admin/collections/${collection.id}`}
                  className="font-medium text-walnut hover:text-ochre"
                >
                  {collection.nameEn}
                </Link>
                <span className="ms-2 text-sm text-stone" dir="rtl" lang="ar">
                  {collection.nameAr}
                </span>
              </TableCell>
              <TableCell className="text-stone">{collection.slug}</TableCell>
              <TableCell>{collection.productCount}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
