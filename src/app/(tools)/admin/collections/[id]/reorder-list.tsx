'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { removeProductFromCollection, reorderCollection } from '../actions'

type Row = { productId: string; nameEn: string; nameAr: string; room: string }

// Native HTML5 drag and drop — no library, no animation. Order saves on drop.
export function ReorderList({
  collectionId,
  initial,
}: {
  collectionId: string
  initial: Row[]
}) {
  const [rows, setRows] = useState(initial)
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [overIndex, setOverIndex] = useState<number | null>(null)
  const [pending, startTransition] = useTransition()

  function handleDrop() {
    if (dragIndex === null || overIndex === null || dragIndex === overIndex) {
      setDragIndex(null)
      setOverIndex(null)
      return
    }
    const next = [...rows]
    const [moved] = next.splice(dragIndex, 1)
    next.splice(overIndex, 0, moved!)
    setRows(next)
    setDragIndex(null)
    setOverIndex(null)
    startTransition(() =>
      reorderCollection(
        collectionId,
        next.map((r) => r.productId),
      ),
    )
  }

  if (rows.length === 0) {
    return <p className="text-sm text-stone">No products in this collection yet.</p>
  }

  return (
    <ol className={cn('space-y-1', pending && 'opacity-60')}>
      {rows.map((row, index) => (
        <li
          key={row.productId}
          draggable
          onDragStart={() => setDragIndex(index)}
          onDragOver={(e) => {
            e.preventDefault()
            setOverIndex(index)
          }}
          onDrop={handleDrop}
          onDragEnd={() => {
            setDragIndex(null)
            setOverIndex(null)
          }}
          className={cn(
            'flex cursor-grab items-center gap-3 rounded-xs border border-stone/50 bg-bone px-3 py-2',
            overIndex === index && dragIndex !== null && 'border-ochre',
            dragIndex === index && 'opacity-50',
          )}
        >
          <span className="w-5 text-sm text-stone">{index + 1}</span>
          <span className="font-medium">{row.nameEn}</span>
          <span className="text-sm text-stone" dir="rtl" lang="ar">
            {row.nameAr}
          </span>
          <span className="ms-auto text-sm text-stone">{row.room}</span>
          <Button
            type="button"
            variant="ghost"
            size="xs"
            onClick={() =>
              startTransition(async () => {
                await removeProductFromCollection(collectionId, row.productId)
                setRows((prev) => prev.filter((r) => r.productId !== row.productId))
              })
            }
          >
            Remove
          </Button>
        </li>
      ))}
    </ol>
  )
}
