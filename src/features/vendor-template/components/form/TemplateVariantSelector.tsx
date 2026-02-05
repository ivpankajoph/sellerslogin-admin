import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type TemplateVariant = {
  key: string
  name: string
  description?: string
  previewImage?: string
}

type Props = {
  templates: TemplateVariant[]
  selectedKey: string
  activeKey: string
  previewBaseUrl?: string
  onSelect: (key: string) => void
  onApply: () => void
  isApplying?: boolean
}

export function TemplateVariantSelector({
  templates,
  selectedKey,
  activeKey,
  previewBaseUrl,
  onSelect,
  onApply,
  isApplying,
}: Props) {
  if (!templates.length) return null

  return (
    <div className='rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm'>
      <div className='flex flex-col gap-2'>
        <h3 className='text-lg font-semibold text-slate-900'>
          Choose a storefront template
        </h3>
        <p className='text-sm text-slate-500'>
          Pick a layout style for your vendor storefront. Set one as default to
          apply it across the live template and preview.
        </p>
      </div>

      <div className='mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3'>
        {templates.map((template) => {
          const isSelected = selectedKey === template.key
          const isActive = activeKey === template.key
          return (
            <button
              key={template.key}
              type='button'
              onClick={() => onSelect(template.key)}
              className={cn(
                'group flex h-full flex-col overflow-hidden rounded-2xl border text-left transition',
                isSelected
                  ? 'border-slate-900 shadow-lg shadow-slate-900/10'
                  : 'border-slate-200 hover:border-slate-300'
              )}
            >
              <div className='relative h-32 w-full overflow-hidden bg-slate-100'>
                {template.previewImage ? (
                  <img
                    src={template.previewImage}
                    alt={template.name}
                    className='h-full w-full object-cover transition-transform duration-300 group-hover:scale-105'
                  />
                ) : null}
                {isActive ? (
                  <span className='absolute left-3 top-3 rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white'>
                    Default
                  </span>
                ) : null}
              </div>
              <div className='flex flex-1 flex-col gap-2 p-4'>
                <h4 className='text-base font-semibold text-slate-900'>
                  {template.name}
                </h4>
                <p className='text-xs text-slate-500'>
                  {template.description || 'Template layout'}
                </p>
                <span
                  className={cn(
                    'mt-auto inline-flex w-fit items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold',
                    isSelected
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600'
                  )}
                >
                  {isSelected ? 'Selected' : 'Select'}
                </span>
                {previewBaseUrl ? (
                  <a
                    href={`${previewBaseUrl}?preview=${template.key}`}
                    target='_blank'
                    rel='noopener noreferrer'
                    className='mt-2 text-xs font-semibold text-slate-600 underline underline-offset-4 hover:text-slate-900'
                  >
                    Preview template
                  </a>
                ) : null}
              </div>
            </button>
          )
        })}
      </div>

      <div className='mt-6 flex flex-wrap items-center gap-3'>
        <Button
          type='button'
          onClick={onApply}
          disabled={isApplying || selectedKey === activeKey}
          className='rounded-full bg-slate-900 text-white shadow-lg shadow-slate-900/20 hover:bg-slate-800'
        >
          {isApplying ? 'Applying...' : 'Set as Default'}
        </Button>
        <span className='text-xs text-slate-500'>
          Current default: {templates.find((t) => t.key === activeKey)?.name}
        </span>
      </div>
    </div>
  )
}
