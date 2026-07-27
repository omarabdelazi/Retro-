'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { ORDER_STATUSES, statusLabel } from '@/lib/format'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const ALL = 'all'

export function OrderFilters({
  workshops,
}: {
  workshops: { id: string; nameEn: string }[]
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  function setParam(key: 'status' | 'workshop', value: string) {
    const params = new URLSearchParams(searchParams)
    if (value === ALL) params.delete(key)
    else params.set(key, value)
    router.replace(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="flex gap-2">
      <Select
        value={searchParams.get('status') ?? ALL}
        onValueChange={(v) => setParam('status', v)}
      >
        <SelectTrigger className="w-44">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All statuses</SelectItem>
          {ORDER_STATUSES.map((status) => (
            <SelectItem key={status} value={status}>
              {statusLabel(status)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={searchParams.get('workshop') ?? ALL}
        onValueChange={(v) => setParam('workshop', v)}
      >
        <SelectTrigger className="w-52">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All workshops</SelectItem>
          {workshops.map((w) => (
            <SelectItem key={w.id} value={w.id}>
              {w.nameEn}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
