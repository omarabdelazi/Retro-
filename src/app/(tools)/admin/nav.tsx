'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const items = [
  { href: '/admin', label: 'Overview' },
  { href: '/admin/orders', label: 'Orders' },
  { href: '/admin/products', label: 'Products' },
  { href: '/admin/collections', label: 'Collections' },
  { href: '/admin/payouts', label: 'Payouts' },
  { href: '/admin/workshops', label: 'Workshops' },
]

export function AdminNav() {
  const pathname = usePathname()

  return (
    <nav className="space-y-0.5">
      {items.map((item) => {
        const active =
          item.href === '/admin'
            ? pathname === '/admin'
            : pathname.startsWith(item.href)
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'block border-s-2 px-3 py-1.5 text-base outline-none focus-visible:outline-2 focus-visible:outline-ochre',
              active
                ? 'border-walnut font-medium text-walnut'
                : 'border-transparent text-ink hover:border-stone hover:text-walnut',
            )}
          >
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
