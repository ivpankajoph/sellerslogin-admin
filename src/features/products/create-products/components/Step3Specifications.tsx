import React, { useMemo, useState } from 'react'
import { Loader2, Plus, Sparkles } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface Props {
  specificationKeys: string[]
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
  specificationKeys,
  specifications,
  isAvailable,
  aiLoading,
  onToggleAvailable,
  onSpecChange,
  onGenerate,
  onAddKey,
}) => {
  const [newKey, setNewKey] = useState('')

  const activeSpecs = specifications[0] || {}
  const filledCount = useMemo(
    () =>
      specificationKeys.filter(
        (key) => String(activeSpecs[key] || '').trim().length > 0
      ).length,
    [activeSpecs, specificationKeys]
  )

  const handleAddKey = () => {
    const normalized = newKey.trim()
    if (!normalized) return
    onAddKey(normalized)
    setNewKey('')
  }

  return (
    <section className='space-y-5'>
      <div className='rounded-2xl border border-cyan-200/70 bg-gradient-to-br from-cyan-50/80 via-white to-sky-50/70 p-5'>
        <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
          <div>
            <h2 className='text-2xl font-extrabold tracking-tight text-slate-900'>
              Specifications
            </h2>
            <p className='mt-1 text-sm text-slate-600'>
              Build clean, searchable product specs for catalogs and filters.
            </p>
          </div>
          <button
            type='button'
            onClick={onGenerate}
            disabled={aiLoading}
            className='inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60'
          >
            {aiLoading ? (
              <Loader2 className='h-4 w-4 animate-spin' />
            ) : (
              <Sparkles className='h-4 w-4' />
            )}
            Generate with AI
          </button>
        </div>
        <div className='mt-4 flex flex-wrap gap-2'>
          <Badge className='border border-cyan-200 bg-cyan-100/70 text-cyan-800'>
            Keys: {specificationKeys.length}
          </Badge>
          <Badge className='border border-emerald-200 bg-emerald-100/70 text-emerald-800'>
            Filled: {filledCount}
          </Badge>
          <Badge className='border border-slate-200 bg-white text-slate-700'>
            Status: {isAvailable ? 'Available' : 'Hidden'}
          </Badge>
        </div>
      </div>

      <div className='grid gap-4 sm:grid-cols-2'>
        {specificationKeys.map((key) => (
          <label
            key={key}
            className='rounded-xl border border-slate-200 bg-white/90 p-3 shadow-sm'
          >
            <span className='mb-2 block text-xs font-semibold uppercase tracking-[0.11em] text-slate-500'>
              {toLabel(key)}
            </span>
            <input
              type='text'
              value={activeSpecs[key] || ''}
              onChange={(event) => onSpecChange(key, event.target.value)}
              className='h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-200'
              placeholder={`Enter ${toLabel(key).toLowerCase()}`}
            />
          </label>
        ))}
      </div>

      <div className='rounded-xl border border-slate-200 bg-white/90 p-4 shadow-sm'>
        <div className='mb-2 text-sm font-semibold text-slate-800'>
          Add Custom Specification
        </div>
        <div className='flex flex-col gap-2 sm:flex-row'>
          <input
            type='text'
            value={newKey}
            onChange={(event) => setNewKey(event.target.value)}
            placeholder='e.g. battery_type'
            className='h-10 flex-1 rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-200'
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                handleAddKey()
              }
            }}
          />
          <button
            type='button'
            onClick={handleAddKey}
            className='inline-flex h-10 items-center justify-center gap-1 rounded-lg border border-slate-300 bg-slate-100 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-200'
          >
            <Plus className='h-4 w-4' />
            Add
          </button>
        </div>
      </div>

      <label className='inline-flex w-fit items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm'>
        <input
          type='checkbox'
          checked={isAvailable}
          onChange={onToggleAvailable}
          className='h-4 w-4 rounded text-cyan-600 focus:ring-cyan-500'
        />
        Product Available
      </label>
    </section>
  )
}

export default Step3Specifications
