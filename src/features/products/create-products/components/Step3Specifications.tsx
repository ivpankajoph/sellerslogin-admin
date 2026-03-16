import React, { useMemo, useState } from 'react'
import { FileText, Loader2, Plus, Settings2, Sparkles, ToggleLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import {
  StudioFieldLabel,
  studioCardClass,
  studioInputClass,
  studioSubtleCardClass,
  studioTextareaClass,
} from './studio-ui'

interface Props {
  variantAttributeKeys: string[]
  specifications: Record<string, string>[]
  isAvailable: boolean
  aiLoading: boolean
  onToggleAvailable: () => void
  onSpecChange: (key: string, value: string) => void
  onGenerate: () => void
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
  isAvailable,
  aiLoading,
  onToggleAvailable,
  onSpecChange,
  onGenerate,
  onAddKey,
}) => {
  const [newKey, setNewKey] = useState('')

  const activeSpecs = useMemo(() => specifications[0] || {}, [specifications])
  const activeSpecKeys = useMemo(() => Object.keys(activeSpecs), [activeSpecs])

  const handleAddKey = () => {
    const normalized = newKey.trim()
    if (!normalized) return
    onAddKey(normalized)
    setNewKey('')
  }

  return (
    <div className='space-y-6'>
      <div className={studioCardClass}>
        <div className='flex flex-col gap-4 border-b border-border/60 pb-4 lg:flex-row lg:items-center lg:justify-between'>
          <div className='flex items-center gap-2 text-base font-semibold text-foreground'>
            <Settings2 className='h-4 w-4 text-emerald-600' />
            Specifications
          </div>
          <Button
            type='button'
            onClick={onGenerate}
            disabled={aiLoading}
            className='h-11 rounded-xl bg-emerald-600 px-5 text-white hover:bg-emerald-700 disabled:opacity-70'
          >
            {aiLoading ? (
              <Loader2 className='mr-2 h-4 w-4 animate-spin' />
            ) : (
              <Sparkles className='mr-2 h-4 w-4' />
            )}
            Generate Specs
          </Button>
        </div>

        <div className='grid gap-4 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]'>
          <div className={studioSubtleCardClass}>
            <StudioFieldLabel label='Fields' />
            <div className='mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]'>
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
                placeholder='e.g. warranty_period'
                className={studioInputClass}
              />
              <Button
                type='button'
                onClick={handleAddKey}
                className='h-11 rounded-xl border border-border bg-card px-5 text-foreground hover:bg-secondary'
              >
                <Plus className='mr-2 h-4 w-4' />
                Add Field
              </Button>
            </div>
          </div>

          <div className={studioSubtleCardClass}>
            <StudioFieldLabel label='Availability' />
            <div className='flex items-center justify-between gap-4 rounded-2xl bg-background/50 px-4 py-3'>
              <span className='text-sm font-medium text-foreground'>
                {isAvailable ? 'Available' : 'Hidden'}
              </span>
              <div className='flex items-center gap-3'>
                <ToggleLeft className='h-4 w-4 text-emerald-600' />
                <Switch checked={isAvailable} onCheckedChange={onToggleAvailable} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {activeSpecKeys.length ? (
        <div className='grid gap-4 lg:grid-cols-2'>
          {activeSpecKeys.map((key) => {
            const value = activeSpecs[key] || ''
            const isLongField =
              value.length > 80 || key.toLowerCase().includes('instruction')

            return (
              <div key={key} className={studioCardClass}>
                <StudioFieldLabel label={toLabel(key)} />
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
        <div className={studioCardClass}>
          <div className='flex items-center gap-3'>
            <div className='inline-flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-500/20 bg-emerald-500/10'>
              <FileText className='h-4 w-4 text-emerald-600' />
            </div>
            <h3 className='text-base font-semibold text-foreground'>No fields added yet</h3>
          </div>
        </div>
      )}
    </div>
  )
}

export default Step3Specifications
