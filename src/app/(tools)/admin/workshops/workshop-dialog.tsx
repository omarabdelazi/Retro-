'use client'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { saveWorkshop } from './actions'

type WorkshopValues = {
  id: string
  slug: string
  nameEn: string
  nameAr: string
  active: boolean
}

export function WorkshopDialog({ workshop }: { workshop?: WorkshopValues }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        {workshop ? (
          <Button variant="quiet" size="xs">
            Edit
          </Button>
        ) : (
          <Button>New workshop</Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogTitle>{workshop ? 'Edit workshop' : 'New workshop'}</DialogTitle>
        <form
          action={saveWorkshop.bind(null, workshop?.id ?? null)}
          className="mt-4 space-y-3"
        >
          <div className="space-y-1">
            <Label htmlFor="w-slug">Slug</Label>
            <Input id="w-slug" name="slug" defaultValue={workshop?.slug} required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="w-name-en">Name (English)</Label>
            <Input id="w-name-en" name="nameEn" defaultValue={workshop?.nameEn} required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="w-name-ar">Name (Arabic)</Label>
            <Input
              id="w-name-ar"
              name="nameAr"
              defaultValue={workshop?.nameAr}
              dir="rtl"
              lang="ar"
              required
            />
          </div>
          <label className="flex items-center gap-2 text-base">
            <input
              type="checkbox"
              name="active"
              defaultChecked={workshop?.active ?? true}
              className="size-4 accent-walnut"
            />
            Active
          </label>
          <Button type="submit">{workshop ? 'Save' : 'Create'}</Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
