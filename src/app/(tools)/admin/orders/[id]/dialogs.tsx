'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cancelOrder, reassignJob } from './actions'

type WorkshopOption = { id: string; nameEn: string }

export function ReassignJobDialog({
  orderId,
  jobId,
  currentWorkshopId,
  workshops,
}: {
  orderId: string
  jobId: string
  currentWorkshopId: string
  workshops: WorkshopOption[]
}) {
  const [open, setOpen] = useState(false)
  const [target, setTarget] = useState<string>('')
  const [pending, startTransition] = useTransition()

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="quiet" size="xs">
          Reassign
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogTitle>Reassign job</DialogTitle>
        <DialogDescription>
          The job returns to pending and the new workshop accepts it fresh.
        </DialogDescription>
        <div className="mt-4 space-y-4">
          <Select value={target} onValueChange={setTarget}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a workshop" />
            </SelectTrigger>
            <SelectContent>
              {workshops
                .filter((w) => w.id !== currentWorkshopId)
                .map((w) => (
                  <SelectItem key={w.id} value={w.id}>
                    {w.nameEn}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
          <Button
            disabled={!target || pending}
            onClick={() =>
              startTransition(() => reassignJob(orderId, jobId, target))
            }
          >
            {pending ? 'Reassigning…' : 'Reassign'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function CancelOrderDialog({ orderId }: { orderId: string }) {
  const [pending, startTransition] = useTransition()

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">Cancel order</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogTitle>Cancel this order</DialogTitle>
        <DialogDescription>
          Jobs nobody has started are removed. Started or finished work stays
          on record. This cannot be undone.
        </DialogDescription>
        <div className="mt-4">
          <Button
            disabled={pending}
            onClick={() => startTransition(() => cancelOrder(orderId))}
          >
            {pending ? 'Cancelling…' : 'Cancel the order'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
