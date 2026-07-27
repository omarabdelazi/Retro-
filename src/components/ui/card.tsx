import * as React from 'react'
import { cn } from '@/lib/utils'

function Card({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn('rounded-xs border border-stone/50 bg-bone', className)}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('px-4 pt-3 pb-1', className)} {...props} />
}

function CardTitle({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div className={cn('text-sm text-stone', className)} {...props} />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('px-4 pb-3', className)} {...props} />
}

export { Card, CardHeader, CardTitle, CardContent }
