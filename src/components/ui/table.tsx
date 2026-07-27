import * as React from 'react'
import { cn } from '@/lib/utils'

function Table({ className, ...props }: React.ComponentProps<'table'>) {
  return (
    <div className="w-full overflow-x-auto">
      <table className={cn('w-full caption-bottom border-collapse', className)} {...props} />
    </div>
  )
}

function TableHeader({ className, ...props }: React.ComponentProps<'thead'>) {
  return <thead className={cn('border-b border-stone/60', className)} {...props} />
}

function TableBody({ className, ...props }: React.ComponentProps<'tbody'>) {
  return <tbody className={className} {...props} />
}

function TableRow({ className, ...props }: React.ComponentProps<'tr'>) {
  return (
    <tr
      className={cn('border-b border-stone/30 hover:bg-walnut/5', className)}
      {...props}
    />
  )
}

function TableHead({ className, ...props }: React.ComponentProps<'th'>) {
  return (
    <th
      className={cn(
        'px-2.5 py-1.5 text-start align-middle text-sm font-medium text-stone',
        className,
      )}
      {...props}
    />
  )
}

function TableCell({ className, ...props }: React.ComponentProps<'td'>) {
  return (
    <td className={cn('px-2.5 py-2 align-middle', className)} {...props} />
  )
}

export { Table, TableHeader, TableBody, TableRow, TableHead, TableCell }
