import React, { useMemo, useState } from 'react'
import { Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  studioCardClass,
  studioInputClass,
  studioTextareaClass,
} from './studio-ui'

interface Props {
  specifications: Record<string, string>[]
  suggestedKeys?: string[]
  selectedKeys?: string[]
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
  suggestedKeys = [],
  selectedKeys = [],
  aiLoading,
  onSpecChange,
  onAddKey,
}) => {
  const [newKey, setNewKey] = useState('')
  const [showCustomInput, setShowCustomInput] = useState(false)

  const activeSpecs = useMemo(() => {
    const raw = specifications[0] || {}
    const filtered: Record<string, string> = {}
    const excludedKeys = [
      'size',
      'brand',
      'material',
      'type',
      'dispatch time',
      'delivery time',
    ]

    Object.keys(raw).forEach((key) => {
      if (!excludedKeys.includes(key.toLowerCase().trim())) {
        filtered[key] = raw[key]
      }
    })
    return filtered
  }, [specifications])

  const activeSpecKeys = useMemo(() => Object.keys(activeSpecs), [activeSpecs])
  const selectedKeySet = useMemo(
    () => new Set(selectedKeys.map(normalizeKey)),
    [selectedKeys]
  )
  const displayActiveSpecKeys = useMemo(
    () =>
      activeSpecKeys.filter(
        (key) =>
          selectedKeySet.has(normalizeKey(key)) ||
          Boolean(String(activeSpecs[key] || '').trim())
      ),
    [activeSpecKeys, activeSpecs, selectedKeySet]
  )
  const availableSuggestedKeys = useMemo(() => {
    const activeKeySet = new Set(displayActiveSpecKeys.map(normalizeKey))
    const sourceKeys = suggestedKeys.length
      ? suggestedKeys
      : REQUIRED_SPECIFICATION_KEYS

    return Array.from(
      new Set(sourceKeys.map((key) => key.trim()).filter(Boolean))
    ).filter((key) => !activeKeySet.has(normalizeKey(key)))
  }, [displayActiveSpecKeys, suggestedKeys])

  const sortedActiveSpecKeys = useMemo(
    () =>
      [...displayActiveSpecKeys].sort(
        (a, b) =>
          suggestedKeys.findIndex(
            (key) => normalizeKey(key) === normalizeKey(a)
          ) -
          suggestedKeys.findIndex(
            (key) => normalizeKey(key) === normalizeKey(b)
          )
      ),
    [displayActiveSpecKeys, suggestedKeys]
  )

  const visibleActiveSpecKeys = suggestedKeys.length
    ? sortedActiveSpecKeys.filter((key) =>
        suggestedKeys.some(
          (suggestedKey) => normalizeKey(suggestedKey) === normalizeKey(key)
        )
      )
    : sortedActiveSpecKeys

  const customActiveSpecKeys = suggestedKeys.length
    ? sortedActiveSpecKeys.filter(
        (key) =>
          !suggestedKeys.some(
            (suggestedKey) => normalizeKey(suggestedKey) === normalizeKey(key)
          )
      )
    : []

  const renderSpecField = (key: string) => {
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
  }

  const handleAddKey = () => {
    const normalized = newKey.trim()
    if (!normalized) return
    onAddKey(normalized)
    setNewKey('')
    setShowCustomInput(false)
  }

  return (
    <section className={studioCardClass}>
      <div className='border-border/60 mb-4 border-b pb-3'>
        <h3 className='text-foreground text-lg font-bold'>Product Features</h3>
      </div>
      {visibleActiveSpecKeys.length || customActiveSpecKeys.length ? (
        <div className='grid gap-4 lg:grid-cols-2'>
          {[...visibleActiveSpecKeys, ...customActiveSpecKeys].map(
            renderSpecField
          )}
        </div>
      ) : null}

      <div className='border-border/60 mt-6 border-t pt-4'>
        {aiLoading ? (
          <div className='text-muted-foreground mb-4 text-sm'>
            Generating product feature keys...
          </div>
        ) : null}

        {availableSuggestedKeys.length ? (
          <div className='mb-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4'>
            <div className='flex flex-wrap gap-2'>
              {availableSuggestedKeys.map((key) => (
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
            <div className='grid gap-3 md:grid-cols-[minmax(0,1fr)_auto_auto]'>
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
              <Button
                type='button'
                variant='ghost'
                onClick={() => setShowCustomInput(false)}
                className='text-muted-foreground h-11 w-11 rounded-xl p-0 hover:bg-red-50 hover:text-red-500'
              >
                <X className='h-4 w-4' />
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
