import React, { useMemo, useState } from 'react'
import { FileText, Loader2, Plus, Settings2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  studioCardClass,
  studioInputClass,
  studioTextareaClass,
} from './studio-ui'

interface Props {
  specifications: Record<string, string>[]
  aiLoading: boolean
  onSpecChange: (key: string, value: string) => void
  onAddKey: (key: string) => void
}

const toLabel = (value: string) =>
  value
    .replace(/[_-]/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase())

const Step3Specifications: React.FC<Props> = ({
  specifications,
  aiLoading,
  onSpecChange,
  onAddKey,
}) => {
  const [newKey, setNewKey] = useState('')
  const [showCustomInput, setShowCustomInput] = useState(false)

  const activeSpecs = useMemo(() => specifications[0] || {}, [specifications])
  const activeSpecKeys = useMemo(() => Object.keys(activeSpecs), [activeSpecs])

  const handleAddKey = () => {
    const normalized = newKey.trim()
    if (!normalized) return
    onAddKey(normalized)
    setNewKey('')
    setShowCustomInput(false)
  }

  return (
    <section className={studioCardClass}>
      <div className='flex flex-col gap-3 border-b border-border/60 pb-4'>
        <div className='flex items-center gap-2 text-base font-semibold text-foreground'>
          <Settings2 className='h-4 w-4 text-emerald-600' />
          Product Details
        </div>
        <div className='text-sm text-muted-foreground'>
          {aiLoading ? (
            <span className='inline-flex items-center gap-2'>
              <Loader2 className='h-4 w-4 animate-spin text-emerald-600' />
              Generating fields from the categories selected in Basics...
            </span>
          ) : (
            'Fields are generated automatically from the categories selected in Basics.'
          )}
        </div>
      </div>

      {activeSpecKeys.length ? (
        <div className='mt-6 grid gap-4 lg:grid-cols-2'>
          {activeSpecKeys.map((key) => {
            const value = activeSpecs[key] || ''
            const isLongField =
              value.length > 80 || key.toLowerCase().includes('instruction')

            return (
              <div key={key} className={studioCardClass}>
                <label className='text-sm font-medium text-foreground'>
                  {toLabel(key)}
                </label>
                {isLongField ? (
                  <textarea
                    rows={4}
                    value={value}
                    onChange={(event) => onSpecChange(key, event.target.value)}
                    className={studioTextareaClass}
                    placeholder={`Enter ${toLabel(key).toLowerCase()}`}
                  />
                ) : (
                  <input
                    type='text'
                    value={value}
                    onChange={(event) => onSpecChange(key, event.target.value)}
                    className={studioInputClass}
                    placeholder={`Enter ${toLabel(key).toLowerCase()}`}
                  />
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <div className='mt-6 rounded-2xl border border-dashed border-border/70 bg-background/40 px-5 py-6'>
          <div className='flex items-center gap-2 text-base font-semibold text-foreground'>
            <FileText className='h-4 w-4 text-emerald-600' />
            No fields available yet
          </div>
          <p className='mt-2 text-sm text-muted-foreground'>
            Select categories in Basics and the product detail fields will appear
            here automatically.
          </p>
        </div>
      )}

      <div className='mt-6 border-t border-border/60 pt-4'>
        {showCustomInput ? (
          <div className='space-y-3'>
            <p className='text-sm font-medium text-foreground'>
              Create custom product detail key
            </p>
            <div className='grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]'>
              <input
                type='text'
                value={newKey}
                onChange={(event) => setNewKey(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    handleAddKey()
                  }
                }}
                placeholder='e.g. Warranty Period'
                className={studioInputClass}
              />
              <Button
                type='button'
                onClick={handleAddKey}
                className='h-11 rounded-xl border border-border bg-card px-5 text-foreground hover:bg-white hover:text-black'
              >
                <Plus className='mr-2 h-4 w-4' />
                Add Field
              </Button>
            </div>
          </div>
        ) : (
          <button
            type='button'
            onClick={() => setShowCustomInput(true)}
            className='text-sm font-medium text-emerald-700 underline underline-offset-4 hover:text-emerald-800'
          >
            Can&apos;t find your key? Create custom
          </button>
        )}
      </div>
    </section>
  )
}

export default Step3Specifications
