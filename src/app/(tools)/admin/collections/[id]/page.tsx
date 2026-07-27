import { notFound } from 'next/navigation'
import { asc, eq, notInArray, sql } from 'drizzle-orm'
import { getDb } from '@/db'
import { collectionProducts, collections, products } from '@/db/schema'
import { requireAdmin } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { deleteCollection, updateCollection } from '../actions'
import { AddProductSelect } from './add-product'
import { ReorderList } from './reorder-list'

export const dynamic = 'force-dynamic'

export default async function CollectionDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ error?: string }>
}) {
  await requireAdmin()
  const { id } = await params
  const { error } = await searchParams
  const db = getDb()

  const [collection] = await db.select().from(collections).where(eq(collections.id, id))
  if (!collection) notFound()

  const members = await db
    .select({
      productId: collectionProducts.productId,
      nameEn: products.nameEn,
      nameAr: products.nameAr,
      room: products.room,
    })
    .from(collectionProducts)
    .innerJoin(products, eq(products.id, collectionProducts.productId))
    .where(eq(collectionProducts.collectionId, id))
    .orderBy(asc(collectionProducts.position))

  const memberIds = members.map((m) => m.productId)
  const available = await db
    .select({ id: products.id, nameEn: products.nameEn })
    .from(products)
    .where(memberIds.length ? notInArray(products.id, memberIds) : sql`true`)
    .orderBy(asc(products.nameEn))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl">{collection.nameEn}</h1>
        <form action={deleteCollection.bind(null, id)}>
          <Button variant="outline" size="sm" type="submit">
            Delete collection
          </Button>
        </form>
      </div>

      {error ? (
        <p className="border border-walnut/50 bg-walnut/10 px-3 py-2 text-sm text-walnut">
          Fill in every required field.
        </p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-stone">Products — drag to reorder</h2>
          <ReorderList collectionId={id} initial={members} />
          <AddProductSelect collectionId={id} available={available} />
        </section>

        <section>
          <h2 className="mb-3 text-sm font-medium text-stone">Details</h2>
          <form action={updateCollection.bind(null, id)} className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="slug">Slug</Label>
              <Input id="slug" name="slug" defaultValue={collection.slug} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="nameEn">Name (English)</Label>
                <Input id="nameEn" name="nameEn" defaultValue={collection.nameEn} required />
              </div>
              <div className="space-y-1">
                <Label htmlFor="nameAr">Name (Arabic)</Label>
                <Input
                  id="nameAr"
                  name="nameAr"
                  defaultValue={collection.nameAr}
                  dir="rtl"
                  lang="ar"
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="descriptionEn">Description (English)</Label>
                <Textarea
                  id="descriptionEn"
                  name="descriptionEn"
                  defaultValue={collection.descriptionEn ?? ''}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="descriptionAr">Description (Arabic)</Label>
                <Textarea
                  id="descriptionAr"
                  name="descriptionAr"
                  defaultValue={collection.descriptionAr ?? ''}
                  dir="rtl"
                  lang="ar"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="heroImage">Hero image URL</Label>
              <Input id="heroImage" name="heroImage" defaultValue={collection.heroImage ?? ''} />
            </div>
            <Separator />
            <Button type="submit">Save details</Button>
          </form>
        </section>
      </div>
    </div>
  )
}
