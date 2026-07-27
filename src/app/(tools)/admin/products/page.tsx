import Link from 'next/link'
import { asc, eq, sql } from 'drizzle-orm'
import { getDb } from '@/db'
import { products } from '@/db/schema'
import { requireAdmin } from '@/lib/auth'
import { money } from '@/lib/format'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export const dynamic = 'force-dynamic'

export default async function ProductsPage() {
  await requireAdmin()
  const db = getDb()

  const rows = await db
    .select({
      id: products.id,
      slug: products.slug,
      nameEn: products.nameEn,
      nameAr: products.nameAr,
      room: products.room,
      category: products.category,
      species: products.species,
      price: products.price,
      currency: products.currency,
      active: products.active,
      chain: sql<string | null>`(
        select string_agg(w.name_en, ' → ' order by pw.sequence)
        from public.product_workshops pw
        join public.workshops w on w.id = pw.workshop_id
        where pw.product_id = ${products.id}
      )`,
    })
    .from(products)
    .orderBy(asc(products.room), asc(products.nameEn))

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl">Products</h1>
        <Button asChild>
          <Link href="/admin/products/new">New product</Link>
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Room</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Species</TableHead>
            <TableHead>Price</TableHead>
            <TableHead>Production chain</TableHead>
            <TableHead>State</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((product) => (
            <TableRow key={product.id}>
              <TableCell>
                <Link
                  href={`/admin/products/${product.id}`}
                  className="font-medium text-walnut hover:text-ochre"
                >
                  {product.nameEn}
                </Link>
                <span className="ms-2 text-sm text-stone" dir="rtl" lang="ar">
                  {product.nameAr}
                </span>
              </TableCell>
              <TableCell>{product.room}</TableCell>
              <TableCell>{product.category}</TableCell>
              <TableCell>{product.species}</TableCell>
              <TableCell>{money(product.price, product.currency)}</TableCell>
              <TableCell className="text-sm text-stone">
                {product.chain ?? 'no steps'}
              </TableCell>
              <TableCell>
                <Badge variant={product.active ? 'walnut' : 'muted'}>
                  {product.active ? 'active' : 'inactive'}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
