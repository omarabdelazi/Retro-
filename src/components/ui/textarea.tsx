import * as React from 'react'
import { cn } from '@/lib/utils'

function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      className={cn(
        'min-h-20 w-full rounded-xs border border-stone bg-bone px-2.5 py-1.5 text-base text-ink placeholder:text-stone outline-none focus-visible:border-ochre focus-visible:outline-1 focus-visible:outline-ochre disabled:opacity-50',
        className,
      )}
      {...props}
    />
  )
}

export { Textarea }
