import React, { useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
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

const REQUIRED_SPECIFICATION_KEYS = [
  'Product Features',
  'Packaging Type',
  'Net Quantity',
  'Units per Pack',
  'Sales Package / In The Box',
  'Minimum Order Quantity (MOQ)',
  'Country of Origin',
  'Supply Ability',
  'Dispatch Time',
  'Delivery Time',
  'Shipping Charges',
  'Replacement Policy',
  'Customer Support',
  'Connectivity',
  'Compatibility',
  'Battery Life',
]

const normalizeKey = (value: string) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')

const Step3Specifications: React.FC<Props> = ({
  specifications,
  onSpecChange,
  onAddKey,
}) => {
  const [newKey, setNewKey] = useState('')
  const [showCustomInput, setShowCustomInput] = useState(false)

  const activeSpecs = useMemo(() => specifications[0] || {}, [specifications])
  const activeSpecKeys = useMemo(() => Object.keys(activeSpecs), [activeSpecs])
  const missingRequiredKeys = useMemo(() => {
    const activeKeySet = new Set(activeSpecKeys.map(normalizeKey))
    return REQUIRED_SPECIFICATION_KEYS.filter(
      (key) => !activeKeySet.has(normalizeKey(key))
    )
  }, [activeSpecKeys])

  const handleAddKey = () => {
    const normalized = newKey.trim()
    if (!normalized) return
    onAddKey(normalized)
    setNewKey('')
    setShowCustomInput(false)
  }

  return (
    <section className={studioCardClass}>
      {activeSpecKeys.length ? (
        <div className='grid gap-4 lg:grid-cols-2'>
          {activeSpecKeys.map((key) => {
            const value = activeSpecs[key] || ''
            const isLongField =
              value.length > 80 || key.toLowerCase().includes('instruction')

            return (
              <div key={key} className={studioCardClass}>
                <label className='text-foreground text-sm font-medium'>
                  {toLabel(key)}
                </label>
                {isLongField ||
                key.toLowerCase().includes('features') ||
                key.toLowerCase().includes('package') ||
                key.toLowerCase().includes('policy') ||
                key.toLowerCase().includes('support') ? (
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
      ) : null}

      <div className='border-border/60 mt-6 border-t pt-4'>
        {missingRequiredKeys.length ? (
          <div className='mb-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4'>
            <div className='flex flex-wrap gap-2'>
              {missingRequiredKeys.map((key) => (
                <Button
                  key={key}
                  type='button'
                  variant='outline'
                  onClick={() => onAddKey(key)}
                  className='h-9 rounded-xl bg-white px-3 text-xs hover:bg-white hover:text-black'
                >
                  <Plus className='mr-1.5 h-3.5 w-3.5' />
                  {key}
                </Button>
              ))}
            </div>
          </div>
        ) : null}

        {showCustomInput ? (
          <div className='space-y-3'>
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
                className='border-border bg-card text-foreground h-11 rounded-xl border px-5 hover:bg-white hover:text-black'
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
