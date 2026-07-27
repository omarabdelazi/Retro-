import * as React from 'react'
import { cn } from '@/lib/utils'

function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      className={cn(
        'h-9 w-full rounded-xs border border-stone bg-bone px-2.5 text-base text-ink placeholder:text-stone outline-none focus-visible:border-ochre focus-visible:outline-1 focus-visible:outline-ochre disabled:opacity-50',
        className,
      )}
      {...props}
    />
  )
}

export { Input }
