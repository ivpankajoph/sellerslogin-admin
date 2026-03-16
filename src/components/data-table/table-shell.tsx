import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type TableShellProps = {
  title?: string
  description?: string
  children: ReactNode
  footer?: ReactNode
  className?: string
}

export function TableShell({

  description,
  children,
  footer,
  className,
}: TableShellProps) {
  return (
    <div className={cn('flex flex-col', className)}>
      <section className='overflow-hidden rounded-md border bg-background'>
        <div className=''>

          {description ? (
            <p className='mt-1 text-sm text-muted-foreground'>{description}</p>
          ) : null}
        </div>
        {children}
      </section>
      {footer ? <div className='mt-auto pt-4'>{footer}</div> : null}
    </div>
  )
}
