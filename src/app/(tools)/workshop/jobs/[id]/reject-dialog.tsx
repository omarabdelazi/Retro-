'use client'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { rejectJob } from './actions'

export function RejectDialog({ jobId }: { jobId: string }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="h-14 w-full border-2 border-ink/40 text-xl sm:w-auto sm:px-8"
        >
          Reject
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogTitle className="text-xl">Reject this job</DialogTitle>
        <DialogDescription className="text-base">
          Say why, so the admin can reroute the work.
        </DialogDescription>
        <form action={rejectJob.bind(null, jobId)} className="mt-4 space-y-4">
          <Textarea
            name="reason"
            required
            placeholder="e.g. oak stock is short this week"
            className="min-h-28 text-lg"
          />
          <Button type="submit" className="h-14 w-full text-xl">
            Reject the job
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
