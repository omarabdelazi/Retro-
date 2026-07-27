import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

// Status colour stays inside the palette: walnut for live states, stone for
// terminal ones, ink outline for the rest. Meaning comes from the label.
const badgeVariants = cva(
  'inline-flex items-center rounded-xs border px-1.5 py-0.5 text-sm leading-tight whitespace-nowrap',
  {
    variants: {
      variant: {
        outline: 'border-stone/70 text-ink',
        solid: 'border-walnut bg-walnut text-bone',
        walnut: 'border-walnut/60 text-walnut',
        muted: 'border-stone/50 text-stone',
      },
    },
    defaultVariants: {
      variant: 'outline',
    },
  },
)

function Badge({
  className,
  variant,
  ...props
}: React.ComponentProps<'span'> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />
}

// order and job statuses → palette roles
export function statusVariant(
  status: string,
): NonNullable<VariantProps<typeof badgeVariants>['variant']> {
  switch (status) {
    case 'paid':
    case 'admin_review':
    case 'ready':
      return 'solid'
    case 'routed':
    case 'in_production':
    case 'accepted':
    case 'in_progress':
      return 'walnut'
    case 'delivered':
    case 'completed':
    case 'cancelled':
    case 'rejected':
      return 'muted'
    default:
      return 'outline'
  }
}

export { Badge, badgeVariants }
