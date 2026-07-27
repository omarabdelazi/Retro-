import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

// No transitions: dashboards are tools, and ochre marks the interaction
// states so hover reads instantly without motion.
const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xs font-medium outline-none focus-visible:outline-2 focus-visible:outline-ochre focus-visible:outline-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-pointer',
  {
    variants: {
      variant: {
        default: 'bg-walnut text-bone hover:bg-ochre hover:text-ink',
        outline: 'border border-stone bg-transparent text-ink hover:border-ochre',
        ghost: 'text-ink hover:bg-walnut/10',
        quiet: 'text-walnut underline-offset-4 hover:text-ochre hover:underline',
      },
      size: {
        default: 'h-9 px-4 text-base',
        sm: 'h-8 px-3 text-sm',
        xs: 'h-7 px-2.5 text-sm',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : 'button'
  return (
    <Comp className={cn(buttonVariants({ variant, size, className }))} {...props} />
  )
}

export { Button, buttonVariants }
