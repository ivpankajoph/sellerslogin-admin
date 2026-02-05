import { Reorder } from 'framer-motion'
import { ChevronDown, ChevronUp, GripVertical } from 'lucide-react'
import { Button } from '@/components/ui/button'

export type TemplateSectionMeta = {
  id: string
  title: string
  description?: string
}

interface TemplateSectionOrderProps {
  title?: string
  items: TemplateSectionMeta[]
  order: string[]
  setOrder: (order: string[]) => void
}

export function TemplateSectionOrder({
  title = 'Section Order',
  items,
  order,
  setOrder,
}: TemplateSectionOrderProps) {
  const byId = new Map(items.map((item) => [item.id, item]))
  const orderedItems = order
    .map((id) => byId.get(id))
    .filter((item): item is TemplateSectionMeta => Boolean(item))

  const move = (from: number, to: number) => {
    if (to < 0 || to >= order.length) return
    const next = [...order]
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved)
    setOrder(next)
  }

  return (
    <div className='rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm'>
      <div className='flex items-center justify-between'>
        <div>
          <p className='text-xs font-semibold uppercase tracking-[0.3em] text-slate-400'>
            Layout
          </p>
          <h3 className='text-lg font-semibold text-slate-900'>{title}</h3>
        </div>
        <p className='text-xs text-slate-500'>Drag or use arrows</p>
      </div>

      <Reorder.Group
        axis='y'
        values={order}
        onReorder={setOrder}
        className='mt-4 space-y-3'
      >
        {orderedItems.map((item, index) => (
          <Reorder.Item
            key={item.id}
            value={item.id}
            className='flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/80 p-3 shadow-sm'
            whileDrag={{ scale: 1.02 }}
          >
            <div className='flex items-start gap-3'>
              <div className='mt-1 rounded-lg border border-slate-200 bg-white p-2 text-slate-500'>
                <GripVertical className='h-4 w-4' />
              </div>
              <div>
                <p className='text-sm font-semibold text-slate-900'>
                  {item.title}
                </p>
                {item.description ? (
                  <p className='text-xs text-slate-500'>{item.description}</p>
                ) : null}
              </div>
            </div>
            <div className='flex items-center gap-1'>
              <Button
                type='button'
                variant='ghost'
                size='icon'
                className='h-8 w-8'
                onClick={() => move(index, index - 1)}
              >
                <ChevronUp className='h-4 w-4' />
              </Button>
              <Button
                type='button'
                variant='ghost'
                size='icon'
                className='h-8 w-8'
                onClick={() => move(index, index + 1)}
              >
                <ChevronDown className='h-4 w-4' />
              </Button>
            </div>
          </Reorder.Item>
        ))}
      </Reorder.Group>
    </div>
  )
}
