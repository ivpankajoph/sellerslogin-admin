import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  Check,
  ChevronsUpDown,
  ImageOff,
  Loader2,
  Plus,
  Trash2,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import type { Variant } from '../types/type'
import {
  StudioFieldLabel,
  studioCardClass,
  studioInputClass,
} from './studio-ui'
import Step3Specifications from './Step3Specifications'
import type { ProductSpecification } from '../types/type'

type WebsiteOption = {
  _id: string
  template_key?: string
  template_name?: string
  name?: string
  business_name?: string
}

interface Props {
  productName: string
  variants: Variant[]
  specifications: ProductSpecification[]
  recommendedAttributeKeys: string[]
  variantKeySuggestions: string[]
  variantKeyContextLabel: string
  websiteOptions: WebsiteOption[]
  selectedWebsiteIds: string[]
  isWebsiteLoading: boolean
  isAvailable: boolean
  aiLoading: boolean
  specificationAiLoading: boolean
  onPrimaryVariantNameChange: (value: string) => void
  onAddAttributeKey: (variantIndex: number, key: string) => void
  onAddSuggestedAttributeKeys: (variantIndex: number, keys: string[]) => void
  onRemoveAttributeKey: (variantIndex: number, key: string) => void
  onToggleAvailable: () => void
  onSelectedWebsiteIdsChange: (websiteIds: string[]) => void
  onGenerateSuggestedKeys: (variantIndex: number) => void
  onAddVariant: (keys: string[]) => void
  onCopyFromPreviousVariant: (index: number) => void
  onRemoveVariant: (index: number) => void
  onVariantFieldChange: (
    index: number,
    field: keyof Variant,
    value: string | number | boolean
  ) => void
  onVariantAttributeChange: (
    variantIndex: number,
    attributeKey: string,
    value: string
  ) => void
  onVariantImageUpload: (
    variantIndex: number,
    event: React.ChangeEvent<HTMLInputElement>
  ) => void
  onVariantImageDrop: (variantIndex: number, files: File[]) => void
  onVariantImageDelete: (variantIndex: number, imageIndex: number) => void
  onSpecificationChange: (key: string, value: string) => void
  onAddSpecificationKey: (key: string) => void
  onReplaceVariants: (variants: Variant[]) => void
}

type SelectOption = {
  value: string
  label: string
}

type VariantRow = {
  id: string
  key: string
  values: string[]
}

const SHOPIFY_VARIANT_KEYS = [
  'Color',
  'Size',
  'Storage',
  'Material',
  'Style',
  'Finish',
  'Pack Size',
  'Capacity',
  'Length',
  'Width',
  'Weight',
  'Flavor',
]

const MAX_VARIANT_IMAGES = 3
const VARIANT_IMAGE_GRID_CLASS =
  'grid-cols-[minmax(0,1.4fr)_repeat(3,96px)]'

const PRESET_VARIANT_VALUE_OPTIONS: Record<string, string[]> = {
  color: [
    'Black',
    'White',
    'Blue',
    'Brown',
    'Green',
    'Grey',
    'Pink',
    'Purple',
    'Red',
    'Silver',
    'Gold',
    'Yellow',
    'Orange',
  ],
  size: ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'],
  storage: ['64 GB', '128 GB', '256 GB', '512 GB', '1 TB'],
  material: [
    'Cotton',
    'Leather',
    'Metal',
    'Plastic',
    'Polyester',
    'Silicone',
    'Stainless Steel',
    'Wood',
  ],
  style: ['Regular', 'Slim', 'Oversized', 'Classic', 'Modern', 'Sport'],
  finish: ['Matte', 'Glossy', 'Satin', 'Brushed', 'Polished'],
  flavor: ['Vanilla', 'Chocolate', 'Strawberry', 'Mango', 'Mixed Fruit'],
  'pack size': [
    'Pack of 1',
    'Pack of 2',
    'Pack of 3',
    'Pack of 5',
    'Pack of 10',
  ],
  capacity: ['250 ml', '500 ml', '750 ml', '1 L', '2 L'],
}

const COLOR_SWATCHES: Record<string, string> = {
  black: '#111827',
  white: '#ffffff',
  blue: '#2563eb',
  brown: '#92400e',
  green: '#16a34a',
  grey: '#6b7280',
  gray: '#6b7280',
  pink: '#ec4899',
  purple: '#7c3aed',
  red: '#dc2626',
  silver: '#9ca3af',
  gold: '#d4a017',
  yellow: '#eab308',
  orange: '#f97316',
}

const sanitizeStringList = (values: string[]) =>
  Array.from(
    new Set(values.map((value) => String(value || '').trim()).filter(Boolean))
  )

const normalizeSearchText = (value: string) =>
  String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()

const normalizeOptionKey = (value: string) =>
  normalizeSearchText(value).replace(/\s+/g, ' ')

const filterOptions = (options: SelectOption[], search: string) => {
  const normalizedSearch = normalizeSearchText(search)
  if (!normalizedSearch) return options

  return options.filter((option) => {
    const normalizedLabel = normalizeSearchText(option.label)
    const normalizedValue = normalizeSearchText(option.value)
    return (
      normalizedLabel.includes(normalizedSearch) ||
      normalizedValue.includes(normalizedSearch)
    )
  })
}

const buildVariantSignature = (attributes: Record<string, string>) =>
  Object.entries(attributes)
    .filter(([, value]) => String(value || '').trim())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}:${String(value || '').trim()}`)
    .join('|')

const buildRowSignature = (rows: VariantRow[]) =>
  rows
    .map((row) => `${row.key}:${sanitizeStringList(row.values).join(',')}`)
    .join('|')

const buildVariantKey = (variant: Variant, index?: number) =>
  variant._id ||
  buildVariantSignature(variant.variantAttributes || {}) ||
  `variant-${index || 0}`

const createRowId = () =>
  `variant-row-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

const isColorKey = (key: string) => normalizeOptionKey(key) === 'color'

const getColorSwatch = (value: string) =>
  COLOR_SWATCHES[normalizeOptionKey(value)] || null

const getVariantDisplayName = (
  variant: Variant,
  productName?: string,
  index?: number
) => {
  const customName = String(variant.variantDisplayName || '').trim()
  if (customName) return customName

  const summary = Object.values(variant.variantAttributes || {})
    .map((value) => String(value || '').trim())
    .filter(Boolean)
    .join(' / ')

  if (summary) return summary
  if (index === 0 && String(productName || '').trim())
    return String(productName)
  return `Variant ${(index || 0) + 1}`
}

const getPresetValueOptions = (key: string, values: string[] = []) =>
  sanitizeStringList([
    ...(PRESET_VARIANT_VALUE_OPTIONS[normalizeOptionKey(key)] || []),
    ...values,
  ])

const hasPresetValueOptions = (key: string) =>
  Boolean(PRESET_VARIANT_VALUE_OPTIONS[normalizeOptionKey(key)]?.length)

const buildVariantRowsFromVariants = (variants: Variant[]): VariantRow[] => {
  const keys = sanitizeStringList(
    variants.flatMap((variant) => Object.keys(variant.variantAttributes || {}))
  )

  return keys.map((key) => ({
    id: createRowId(),
    key,
    values: sanitizeStringList(
      variants.map((variant) => String(variant.variantAttributes?.[key] || ''))
    ),
  }))
}

const buildVariantCombinations = (rows: VariantRow[]) => {
  const filledRows = rows.filter((row) => row.key && row.values.length)
  if (!filledRows.length) return []

  return filledRows.reduce<Record<string, string>[]>(
    (combinations, row) =>
      combinations.flatMap((combination) =>
        row.values.map((value) => ({
          ...combination,
          [row.key]: value,
        }))
      ),
    [{}]
  )
}

const serializeVariants = (variants: Variant[]) =>
  JSON.stringify(
    variants.map((variant) => ({
      variantDisplayName: variant.variantDisplayName || '',
      variantAttributes: variant.variantAttributes || {},
      actualPrice: Number(variant.actualPrice || 0),
      finalPrice: Number(variant.finalPrice || 0),
      stockQuantity: Number(variant.stockQuantity || 0),
      isActive: Boolean(variant.isActive),
      variantsImageUrls: (variant.variantsImageUrls || []).map((image) => ({
        url: image.url,
        publicId: image.publicId,
      })),
      variantMetaTitle: variant.variantMetaTitle || '',
      variantMetaDescription: variant.variantMetaDescription || '',
      variantMetaKeywords: variant.variantMetaKeywords || [],
      variantCanonicalUrl: variant.variantCanonicalUrl || '',
    }))
  )

const WebsiteMultiSelect: React.FC<{
  values: string[]
  options: SelectOption[]
  loading: boolean
  onChange: (values: string[]) => void
  triggerClassName?: string
}> = ({ values, options, loading, onChange, triggerClassName }) => {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const allSelected = options.length > 0 && values.length === options.length

  const visibleOptions = useMemo(
    () => filterOptions(options, search),
    [options, search]
  )

  const buttonText = useMemo(() => {
    if (loading) return 'Loading websites...'
    if (allSelected) return 'All websites'
    if (!values.length) return 'Websites'
    return `Websites (${values.length})`
  }, [allSelected, loading, values.length])

  const toggleAll = () => {
    if (allSelected) {
      onChange([])
      return
    }

    onChange(options.map((option) => option.value))
  }

  const toggleValue = (value: string) => {
    if (values.includes(value)) {
      onChange(values.filter((item) => item !== value))
      return
    }

    onChange([...values, value])
  }

  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen)
        if (!nextOpen) setSearch('')
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type='button'
          variant='outline'
          role='combobox'
          aria-expanded={open}
          className={cn(
            'border-input bg-white h-9 rounded-full border px-4 text-sm shadow-sm hover:bg-white hover:text-black',
            triggerClassName
          )}
        >
          <span className='truncate'>{buttonText}</span>
          <ChevronsUpDown className='ml-2 h-4 w-4 shrink-0 opacity-50' />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className='w-[--radix-popover-trigger-width] p-0'
        align='end'
      >
        <Command shouldFilter={false}>
          <CommandInput
            value={search}
            onValueChange={setSearch}
            placeholder='Search websites...'
          />
          <CommandList className='max-h-72'>
            <CommandEmpty>No websites found.</CommandEmpty>
            <CommandGroup>
              <CommandItem value='__all__' onSelect={toggleAll}>
                <Check
                  className={cn(
                    'mr-2 h-4 w-4',
                    allSelected ? 'opacity-100' : 'opacity-0'
                  )}
                />
                Select all websites
              </CommandItem>
              {visibleOptions.map((option) => (
                <CommandItem
                  key={option.value}
                  value={`${option.label} ${option.value}`}
                  onSelect={() => toggleValue(option.value)}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      values.includes(option.value)
                        ? 'opacity-100'
                        : 'opacity-0'
                    )}
                  />
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

const VariantValuesMultiSelect: React.FC<{
  rowKey: string
  values: string[]
  onChange: (values: string[]) => void
}> = ({ rowKey, values, onChange }) => {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  const presetOptions = useMemo(
    () =>
      getPresetValueOptions(
        rowKey,
        search.trim() ? [...values, search.trim()] : values
      ).map((value) => ({ value, label: value })),
    [rowKey, search, values]
  )

  const visibleOptions = useMemo(
    () => filterOptions(presetOptions, search),
    [presetOptions, search]
  )

  const normalizedSearch = String(search || '').trim()
  const canCreate =
    Boolean(normalizedSearch) &&
    !presetOptions.some(
      (option) =>
        normalizeSearchText(option.value) === normalizeSearchText(search)
    )

  const toggleValue = (value: string) => {
    if (values.includes(value)) {
      onChange(values.filter((item) => item !== value))
      return
    }

    onChange([...values, value])
  }

  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen)
        if (!nextOpen) setSearch('')
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type='button'
          variant='outline'
          className='border-input bg-white h-11 w-full justify-between rounded-xl border px-4 text-left shadow-sm hover:bg-white hover:text-black'
          disabled={!rowKey}
        >
          <span className='truncate'>
            {values.length
              ? `${values.length} values selected`
              : 'Select values'}
          </span>
          <ChevronsUpDown className='ml-2 h-4 w-4 shrink-0 opacity-50' />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className='w-[--radix-popover-trigger-width] p-0'
        onOpenAutoFocus={(event) => event.preventDefault()}
        onCloseAutoFocus={(event) => event.preventDefault()}
      >
        <Command shouldFilter={false}>
          <CommandInput
            value={search}
            onValueChange={setSearch}
            placeholder={`Search ${rowKey.toLowerCase()} values...`}
          />
          <CommandList className='max-h-72'>
            <CommandEmpty>No values found.</CommandEmpty>
            <CommandGroup>
              {visibleOptions.map((option) => (
                <CommandItem
                  key={`${rowKey}-${option.value}`}
                  value={option.value}
                  onSelect={() => toggleValue(option.value)}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      values.includes(option.value)
                        ? 'opacity-100'
                        : 'opacity-0'
                    )}
                  />
                  {isColorKey(rowKey) && getColorSwatch(option.value) ? (
                    <span
                      className='mr-2 h-3 w-3 rounded-full border border-black/10'
                      style={{
                        backgroundColor:
                          getColorSwatch(option.value) || undefined,
                      }}
                    />
                  ) : null}
                  {option.label}
                </CommandItem>
              ))}
              {canCreate ? (
                <CommandItem
                  value={`create-${normalizedSearch}`}
                  onSelect={() => {
                    onChange(sanitizeStringList([...values, normalizedSearch]))
                    setSearch('')
                  }}
                >
                  <Plus className='mr-2 h-4 w-4' />
                  Add {normalizedSearch}
                </CommandItem>
              ) : null}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

const CustomVariantValuesInput: React.FC<{
  rowKey: string
  values: string[]
  onChange: (values: string[]) => void
}> = ({ rowKey, values, onChange }) => {
  const [inputValue, setInputValue] = useState('')

  const addValue = () => {
    const nextValue = String(inputValue || '').trim()
    if (!nextValue) return
    onChange(sanitizeStringList([...values, nextValue]))
    setInputValue('')
  }

  return (
    <div className='flex gap-2'>
      <input
        type='text'
        value={inputValue}
        onChange={(event) => setInputValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault()
            addValue()
          }
        }}
        placeholder={
          rowKey
            ? `Type ${rowKey.toLowerCase()} value and press Enter`
            : 'Type value'
        }
        className={studioInputClass}
        disabled={!rowKey}
      />
      <Button
        type='button'
        variant='outline'
        className='h-11 rounded-xl px-4 hover:bg-white hover:text-black'
        onClick={addValue}
        disabled={!String(inputValue || '').trim() || !rowKey}
      >
        Add
      </Button>
    </div>
  )
}

const VariantValuesEditor: React.FC<{
  rowKey: string
  values: string[]
  onChange: (values: string[]) => void
}> = ({ rowKey, values, onChange }) => {
  if (!rowKey) {
    return (
      <input
        type='text'
        disabled
        placeholder='Select variant first'
        className={studioInputClass}
      />
    )
  }

  if (!hasPresetValueOptions(rowKey)) {
    return (
      <CustomVariantValuesInput
        rowKey={rowKey}
        values={values}
        onChange={onChange}
      />
    )
  }

  return (
    <VariantValuesMultiSelect rowKey={rowKey} values={values} onChange={onChange} />
  )
}

const VariantTypePickerPopover: React.FC<{
  options: SelectOption[]
  onSelect: (value: string) => void
  className?: string
  label?: string
  align?: 'start' | 'center' | 'end'
}> = ({
  options,
  onSelect,
  className,
  label = 'Add variant',
  align = 'start',
}) => {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const containerRef = useRef<HTMLDivElement | null>(null)

  const visibleOptions = useMemo(
    () => filterOptions(options, search),
    [options, search]
  )
  const normalizedSearch = String(search || '').trim()
  const canCreate =
    Boolean(normalizedSearch) &&
    !options.some(
      (option) =>
        normalizeSearchText(option.value) === normalizeSearchText(normalizedSearch)
    )

  useEffect(() => {
    if (!open) return

    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [open])

  return (
    <div ref={containerRef} className='relative inline-flex'>
      <Button
        type='button'
        className={className}
        onClick={() => {
          setOpen((prev) => !prev)
          if (open) setSearch('')
        }}
      >
        <Plus className='mr-2 h-4 w-4' />
        {label}
      </Button>

      {open ? (
        <div
          className={cn(
            'border-border bg-popover absolute top-full z-50 mt-2 w-[320px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border shadow-xl',
            align === 'end'
              ? 'right-0'
              : align === 'center'
                ? 'left-1/2 -translate-x-1/2'
                : 'left-0'
          )}
        >
          <Command shouldFilter={false}>
            <CommandInput
              value={search}
              onValueChange={setSearch}
              placeholder='Search variants...'
            />
            <CommandList className='max-h-72'>
              <CommandEmpty>No variants found.</CommandEmpty>
              <CommandGroup heading='Recommended'>
                {visibleOptions.map((option) => (
                  <CommandItem
                    key={option.value}
                    value={option.value}
                    onSelect={() => {
                      onSelect(option.value)
                      setOpen(false)
                      setSearch('')
                    }}
                  >
                    {option.label}
                  </CommandItem>
                ))}
              </CommandGroup>
              {canCreate ? (
                <CommandGroup heading='Custom'>
                  <CommandItem
                    value={`create-${normalizedSearch}`}
                    onSelect={() => {
                      onSelect(normalizedSearch)
                      setOpen(false)
                      setSearch('')
                    }}
                  >
                    <Plus className='mr-2 h-4 w-4' />
                    Add custom variant "{normalizedSearch}"
                  </CommandItem>
                </CommandGroup>
              ) : null}
            </CommandList>
          </Command>
        </div>
      ) : null}
    </div>
  )
}

const VariantImagesRow: React.FC<{
  index: number
  variant: Variant
  onUpload: (event: React.ChangeEvent<HTMLInputElement>) => void
  onDelete: (imageIndex: number) => void
  onRemoveVariant: () => void
}> = ({ index, variant, onUpload, onDelete, onRemoveVariant }) => {
  const images = variant.variantsImageUrls || []
  const slots = Array.from({ length: MAX_VARIANT_IMAGES }, (_, slotIndex) => ({
    slotIndex,
    image: images[slotIndex],
    inputId: `variant-images-upload-${index}-${slotIndex}`,
  }))

  return (
    <div
      className={cn(
        'border-border/70 bg-background grid min-w-[588px] gap-3 border-t px-4 py-4 first:border-t-0',
        VARIANT_IMAGE_GRID_CLASS
      )}
    >
      <div className='min-w-0'>
        <div className='flex items-start justify-between gap-3'>
          <div className='text-foreground truncate text-sm font-semibold'>
            {getVariantDisplayName(variant, undefined, index)}
          </div>
          <button
            type='button'
            onClick={onRemoveVariant}
            className='text-muted-foreground hover:text-destructive inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-transparent transition hover:border-red-200 hover:bg-red-50'
            aria-label={`Remove ${getVariantDisplayName(variant, undefined, index)}`}
            title='Remove this variant'
          >
            <X className='h-4 w-4' />
          </button>
        </div>
        <div className='mt-2 flex flex-wrap gap-2'>
          {Object.entries(variant.variantAttributes || {}).map(([key, value]) => (
            <span
              key={`${index}-${key}-${value}`}
              className='border-border bg-secondary text-foreground inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-medium'
            >
              {isColorKey(key) && getColorSwatch(value) ? (
                <span
                  className='h-2.5 w-2.5 rounded-full border border-black/10'
                  style={{
                    backgroundColor: getColorSwatch(value) || undefined,
                  }}
                />
              ) : null}
              <span className='text-muted-foreground'>{key}:</span>
              {value}
            </span>
          ))}
        </div>
      </div>

      {slots.map(({ slotIndex, image, inputId }) => (
        <div key={`${index}-${slotIndex}`} className='flex items-center justify-center'>
          <input
            id={inputId}
            type='file'
            accept='image/*'
            className='hidden'
            onChange={onUpload}
          />

          {image ? (
            <div className='group border-border bg-card relative h-24 w-24 overflow-hidden rounded-2xl border shadow-sm'>
              <img
                src={image.url}
                alt={`Variant ${index + 1} image ${slotIndex + 1}`}
                className={cn(
                  'h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]',
                  image.uploading && 'opacity-40'
                )}
              />

              <div className='absolute top-2 left-2 inline-flex rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-semibold text-white'>
                {slotIndex + 1}
              </div>

              {image.uploading ? (
                <div className='bg-background/70 absolute inset-0 flex items-center justify-center backdrop-blur-sm'>
                  <Loader2 className='h-4 w-4 animate-spin text-sky-600' />
                </div>
              ) : (
                <button
                  type='button'
                  onClick={() => onDelete(slotIndex)}
                  className='absolute top-2 right-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/95 text-slate-700 shadow-md transition hover:bg-red-500 hover:text-white'
                  aria-label={`Remove variant ${index + 1} image ${slotIndex + 1}`}
                >
                  <Trash2 className='h-3.5 w-3.5' />
                </button>
              )}
            </div>
          ) : (
            <label
              htmlFor={inputId}
              className='border-border bg-background hover:bg-secondary flex h-24 w-24 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed transition'
            >
              <ImageOff className='text-muted-foreground h-5 w-5' />
              <span className='text-muted-foreground mt-1 text-[11px] font-medium'>
                Add
              </span>
            </label>
          )}
        </div>
      ))}
    </div>
  )
}

const VariantImagesSection: React.FC<{
  variants: Variant[]
  onUpload: (
    variantIndex: number,
    event: React.ChangeEvent<HTMLInputElement>
  ) => void
  onDelete: (variantIndex: number, imageIndex: number) => void
  onRemoveVariant: (variantIndex: number) => void
}> = ({ variants, onUpload, onDelete, onRemoveVariant }) => {
  return (
    <section className={cn(studioCardClass, 'space-y-4 p-5')}>
      <div>
        <h3 className='text-foreground text-base font-semibold'>
          Variant Images
        </h3>
        <p className='text-muted-foreground mt-1 text-sm'>
          Upload up to {MAX_VARIANT_IMAGES} images per variant.
        </p>
      </div>

      {variants.length ? (
        <div className='border-border/70 overflow-x-auto rounded-2xl border'>
          <div
            className={cn(
              'bg-muted/30 text-muted-foreground grid min-w-[588px] gap-3 px-4 py-3 text-xs font-semibold tracking-[0.16em] uppercase',
              VARIANT_IMAGE_GRID_CLASS
            )}
          >
            <span>Variant</span>
            <span className='text-center'>Image 1</span>
            <span className='text-center'>Image 2</span>
            <span className='text-center'>Image 3</span>
          </div>

          {variants.map((variant, index) => (
            <VariantImagesRow
              key={
                variant._id ||
                buildVariantSignature(variant.variantAttributes || {}) ||
                `variant-images-${index}`
              }
              index={index}
              variant={variant}
              onUpload={(event) => onUpload(index, event)}
              onDelete={(imageIndex) => onDelete(index, imageIndex)}
              onRemoveVariant={() => onRemoveVariant(index)}
            />
          ))}
        </div>
      ) : (
        <div className='border-border text-muted-foreground rounded-2xl border border-dashed px-4 py-6 text-sm'>
          Add variant values first. Image rows will appear here automatically.
        </div>
      )}
    </section>
  )
}

const Step5Variants: React.FC<Props> = ({
  productName,
  variants,
  specifications,
  recommendedAttributeKeys,
  variantKeySuggestions,
  websiteOptions,
  selectedWebsiteIds,
  isWebsiteLoading,
  isAvailable,
  specificationAiLoading,
  onToggleAvailable,
  onSelectedWebsiteIdsChange,
  onVariantFieldChange,
  onVariantImageUpload,
  onVariantImageDelete,
  onSpecificationChange,
  onAddSpecificationKey,
  onReplaceVariants,
}) => {
  const [rows, setRows] = useState<VariantRow[]>(() => {
    const derivedRows = buildVariantRowsFromVariants(variants)
    return derivedRows.length ? derivedRows : []
  })
  const [excludedVariantSignatures, setExcludedVariantSignatures] = useState<string[]>([])

  const websiteSelectOptions = useMemo(
    () =>
      websiteOptions
        .map((website) => ({
          value: String(website._id || '').trim(),
          label: String(
            website.template_name ||
              website.business_name ||
              website.name ||
              website.template_key ||
              'Untitled website'
          ).trim(),
        }))
        .filter((option) => option.value && option.label),
    [websiteOptions]
  )

  const variantSuggestions = useMemo(
    () =>
      sanitizeStringList([
        ...recommendedAttributeKeys,
        ...variantKeySuggestions,
        ...SHOPIFY_VARIANT_KEYS,
      ]).map((value) => ({ value, label: value })),
    [recommendedAttributeKeys, variantKeySuggestions]
  )

  const visibleVariantSuggestions = useMemo(
    () =>
      variantSuggestions.filter(
        (option) => !rows.some((row) => row.key === option.value)
      ),
    [rows, variantSuggestions]
  )

  const serializedVariants = useMemo(
    () => serializeVariants(variants),
    [variants]
  )
  const serializedRows = useMemo(() => buildRowSignature(rows), [rows])
  const isSyncingLocalRowsRef = useRef(false)

  useEffect(() => {
    if (isSyncingLocalRowsRef.current) {
      isSyncingLocalRowsRef.current = false
      return
    }

    const nextRows = buildVariantRowsFromVariants(variants)
    setRows((currentRows) =>
      buildRowSignature(nextRows) === buildRowSignature(currentRows)
        ? currentRows
        : nextRows
    )
  }, [serializedVariants, variants])

  useEffect(() => {
    const availableSignatures = new Set(
      buildVariantCombinations(rows).map((attributes) =>
        buildVariantSignature(attributes)
      )
    )

    setExcludedVariantSignatures((current) => {
      const next = current.filter((signature) => availableSignatures.has(signature))
      return next.length === current.length ? current : next
    })
  }, [serializedRows, rows])

  useEffect(() => {
    const combinations = buildVariantCombinations(rows)
    const currentVariantMap = new Map(
      variants.map((variant) => [
        buildVariantSignature(variant.variantAttributes || {}),
        variant,
      ])
    )

    const nextVariants = combinations
      .filter((attributes) => {
        const signature = buildVariantSignature(attributes)
        return !excludedVariantSignatures.includes(signature)
      })
      .map((attributes) => {
      const signature = buildVariantSignature(attributes)
      const matchedVariant = currentVariantMap.get(signature)

      return {
        _id: matchedVariant?._id,
        variantDisplayName: matchedVariant?.variantDisplayName || '',
        variantAttributes: attributes,
        actualPrice: Number(matchedVariant?.actualPrice || 0),
        finalPrice: Number(matchedVariant?.finalPrice || 0),
        stockQuantity: Number(matchedVariant?.stockQuantity || 0),
        variantsImageUrls: matchedVariant?.variantsImageUrls || [],
        isActive: matchedVariant?.isActive ?? true,
        variantMetaTitle: matchedVariant?.variantMetaTitle,
        variantMetaDescription: matchedVariant?.variantMetaDescription,
        variantMetaKeywords: matchedVariant?.variantMetaKeywords,
        variantCanonicalUrl: matchedVariant?.variantCanonicalUrl,
      }
      })

    if (serializeVariants(nextVariants) === serializedVariants) return
    isSyncingLocalRowsRef.current = true
    onReplaceVariants(nextVariants)
  }, [
    excludedVariantSignatures,
    onReplaceVariants,
    rows,
    serializedVariants,
    variants,
  ])

  const handleRemoveGeneratedVariant = (variantIndex: number) => {
    const targetVariant = variants[variantIndex]
    if (!targetVariant) return

    const signature = buildVariantSignature(targetVariant.variantAttributes || {})
    if (!signature) return

    setExcludedVariantSignatures((current) =>
      current.includes(signature) ? current : [...current, signature]
    )
  }

  const addVariantRow = (key: string) => {
    const normalizedKey = String(key || '').trim()
    if (!normalizedKey) return
    if (
      rows.some(
        (row) => normalizeOptionKey(row.key) === normalizeOptionKey(normalizedKey)
      )
    ) {
      return
    }

    setRows((prev) => [
      ...prev,
      {
        id: createRowId(),
        key: normalizedKey,
        values: [],
      },
    ])
  }

  const updateRowValues = (rowId: string, values: string[]) => {
    setRows((prev) =>
      prev.map((row) =>
        row.id === rowId
          ? {
              ...row,
              values: sanitizeStringList(values),
            }
          : row
      )
    )
  }

  const removeRow = (rowId: string) => {
    setRows((prev) => prev.filter((row) => row.id !== rowId))
  }

  return (
    <div className='space-y-6'>
      <section className={cn(studioCardClass, 'space-y-5 p-5')}>
        <div className='flex flex-wrap items-start justify-between gap-4'>
          <div>
            <h3 className='text-foreground text-base font-semibold'>
              Variants
            </h3>
          </div>

          <div className='flex flex-wrap items-center justify-end gap-2'>
            <div className='border-border bg-white flex h-9 items-center gap-2 rounded-full border px-3'>
              <span className='text-muted-foreground text-xs font-medium'>
                Visible
              </span>
              <Switch
                checked={isAvailable}
                onCheckedChange={onToggleAvailable}
              />
            </div>

            {websiteSelectOptions.length ? (
              <WebsiteMultiSelect
                values={selectedWebsiteIds}
                options={websiteSelectOptions}
                loading={isWebsiteLoading}
                onChange={onSelectedWebsiteIdsChange}
                triggerClassName='min-w-[150px]'
              />
            ) : null}

            {rows.length === 0 ? (
              <VariantTypePickerPopover
                options={visibleVariantSuggestions}
                onSelect={addVariantRow}
                className='h-10 rounded-xl px-4'
                label='Add variant'
                align='end'
              />
            ) : null}
          </div>
        </div>

        <div className='space-y-4'>
          {rows.length ? (
            rows.map((row, index) => (
              <div
                key={row.id}
                className='border-border/70 bg-white rounded-2xl border p-4'
              >
                <div className='grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)_auto]'>
                  <div>
                    <StudioFieldLabel label={`Variant ${index + 1}`} />
                    <Select
                      value={row.key}
                      onValueChange={(value) => {
                        setRows((prev) =>
                          prev.map((item) =>
                            item.id === row.id
                              ? { ...item, key: value, values: [] }
                              : item
                          )
                        )
                      }}
                    >
                      <SelectTrigger className='border-input bg-white h-11 rounded-xl'>
                        <SelectValue placeholder='Select variant' />
                      </SelectTrigger>
                      <SelectContent>
                        {sanitizeStringList([
                          row.key,
                          ...variantSuggestions
                            .map((option) => option.value)
                            .filter(
                              (option) =>
                                normalizeOptionKey(option) ===
                                  normalizeOptionKey(row.key) ||
                                !rows.some(
                                  (item) =>
                                    item.id !== row.id &&
                                    normalizeOptionKey(item.key) ===
                                      normalizeOptionKey(option)
                                )
                            ),
                        ])
                          .filter(Boolean)
                          .map((option) => (
                            <SelectItem
                              key={`${row.id}-${option}`}
                              value={option}
                            >
                              {option}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <StudioFieldLabel label={row.key || 'Values'} />
                    <VariantValuesEditor
                      rowKey={row.key}
                      values={row.values}
                      onChange={(values) => updateRowValues(row.id, values)}
                    />
                    {row.values.length ? (
                      <div className='mt-3 flex flex-wrap gap-2'>
                        {row.values.map((value) => (
                          <button
                            type='button'
                            key={`${row.id}-${value}`}
                            onClick={() =>
                              updateRowValues(
                                row.id,
                                row.values.filter((item) => item !== value)
                              )
                            }
                            className='border-border bg-secondary text-foreground inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium'
                          >
                            {isColorKey(row.key) && getColorSwatch(value) ? (
                              <span
                                className='h-2.5 w-2.5 rounded-full border border-black/10'
                                style={{
                                  backgroundColor:
                                    getColorSwatch(value) || undefined,
                                }}
                              />
                            ) : null}
                            {value}
                            <X className='text-muted-foreground h-3 w-3' />
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  <div className='flex items-start justify-end'>
                    <Button
                      type='button'
                      variant='ghost'
                      onClick={() => removeRow(row.id)}
                      className='text-muted-foreground hover:text-destructive h-11 rounded-xl px-3'
                    >
                      <X className='h-4 w-4' />
                    </Button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className='border-border text-muted-foreground rounded-2xl border border-dashed px-4 py-6 text-sm'>
              Add variant and choose values like color, size, or storage.
            </div>
          )}

          {rows.length ? (
            <VariantTypePickerPopover
              options={visibleVariantSuggestions}
              onSelect={addVariantRow}
              className='h-10 rounded-xl hover:bg-white hover:text-black'
              label='Add another variant'
              align='start'
            />
          ) : null}
        </div>
      </section>

      <VariantImagesSection
        variants={variants}
        onUpload={onVariantImageUpload}
        onDelete={onVariantImageDelete}
        onRemoveVariant={handleRemoveGeneratedVariant}
      />

      <section className={cn(studioCardClass, 'space-y-4 p-5')}>
        <div>
          <h3 className='text-foreground text-base font-semibold'>Pricing</h3>
        </div>

        {variants.length ? (
          <div className='border-border/70 overflow-hidden rounded-2xl border'>
            <div className='bg-muted/30 text-muted-foreground grid grid-cols-[minmax(0,1.5fr)_150px_150px_150px] gap-3 px-4 py-3 text-xs font-semibold tracking-[0.16em] uppercase'>
              <span>Variant</span>
              <span>Actual price</span>
              <span>Final price</span>
              <span>Stock quantity</span>
            </div>

            {variants.map((variant, index) => (
              <div
                key={buildVariantKey(variant, index)}
                className='border-border/70 bg-background grid grid-cols-[minmax(0,1.5fr)_150px_150px_150px] gap-3 border-t px-4 py-4 first:border-t-0'
              >
                <div className='min-w-0'>
                  <div className='text-foreground truncate text-sm font-semibold'>
                    {getVariantDisplayName(variant, productName, index)}
                  </div>
                  <div className='mt-2 flex flex-wrap gap-2'>
                    {Object.entries(variant.variantAttributes || {}).map(
                      ([key, value]) => (
                        <span
                          key={`${index}-${key}-${value}`}
                          className='border-border bg-secondary text-foreground inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-medium'
                        >
                          {isColorKey(key) && getColorSwatch(value) ? (
                            <span
                              className='h-2.5 w-2.5 rounded-full border border-black/10'
                              style={{
                                backgroundColor:
                                  getColorSwatch(value) || undefined,
                              }}
                            />
                          ) : null}
                          <span className='text-muted-foreground'>{key}:</span>
                          {value}
                        </span>
                      )
                    )}
                  </div>
                </div>

                <input
                  type='number'
                  min='0'
                  value={variant.actualPrice || ''}
                  onChange={(event) =>
                    onVariantFieldChange(
                      index,
                      'actualPrice',
                      event.target.value
                    )
                  }
                  placeholder='0'
                  className={studioInputClass}
                />

                <input
                  type='number'
                  min='0'
                  value={variant.finalPrice || ''}
                  onChange={(event) =>
                    onVariantFieldChange(
                      index,
                      'finalPrice',
                      event.target.value
                    )
                  }
                  placeholder='0'
                  className={studioInputClass}
                />

                <input
                  type='number'
                  min='0'
                  value={variant.stockQuantity || ''}
                  onChange={(event) =>
                    onVariantFieldChange(
                      index,
                      'stockQuantity',
                      event.target.value
                    )
                  }
                  placeholder='0'
                  className={studioInputClass}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className='border-border text-muted-foreground rounded-2xl border border-dashed px-4 py-6 text-sm'>
            Add variant values first. Pricing rows will appear here
            automatically.
          </div>
        )}
      </section>

      <Step3Specifications
        specifications={specifications}
        aiLoading={specificationAiLoading}
        onSpecChange={onSpecificationChange}
        onAddKey={onAddSpecificationKey}
      />
    </div>
  )
}

export default Step5Variants
