import type { ReactNode } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

type StatisticsItem = {
  label: string
  value: ReactNode
  helper?: string
}

type StatisticsDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  items: StatisticsItem[]
}

export function StatisticsDialog({
  open,
  onOpenChange,
  title,
  description,
  items,
}: StatisticsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='w-[min(96vw,760px)] max-h-[90vh] overflow-y-auto rounded-none'>
        <DialogHeader className='text-left'>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        <div className='grid gap-3 sm:grid-cols-2 xl:grid-cols-3'>
          {items.map((item) => (
            <div
              key={item.label}
              className='rounded-md border bg-background px-4 py-4 shadow-sm'
            >
              <p className='text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground'>
                {item.label}
              </p>
              <div className='mt-3 text-2xl font-semibold tracking-tight'>
                {item.value}
              </div>
              {item.helper ? (
                <p className='mt-1 text-xs text-muted-foreground'>{item.helper}</p>
              ) : null}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
