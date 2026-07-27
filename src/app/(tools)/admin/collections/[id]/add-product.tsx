'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { addProductToCollection } from '../actions'

export function AddProductSelect({
  collectionId,
  available,
}: {
  collectionId: string
  available: { id: string; nameEn: string }[]
}) {
  const [selected, setSelected] = useState('')
  const [pending, startTransition] = useTransition()

  if (available.length === 0) return null

  return (
    <div className="flex gap-2">
      <div className="w-72">
        <Select value={selected} onValueChange={setSelected}>
          <SelectTrigger>
            <SelectValue placeholder="Add a product" />
          </SelectTrigger>
          <SelectContent>
            {available.map((product) => (
              <SelectItem key={product.id} value={product.id}>
                {product.nameEn}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button
        disabled={!selected || pending}
        onClick={() =>
          startTransition(async () => {
            await addProductToCollection(collectionId, selected)
            setSelected('')
          })
        }
      >
        Add
      </Button>
    </div>
  )
}
