import React, { useMemo, useState } from 'react'
import {
  Check,
  ChevronsUpDown,
  CircleHelp,
  Copy,
  Layers3,
  Loader2,
  Package2,
  Plus,
  Tag,
  ToggleLeft,
  Trash2,
  Upload,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import type { Variant } from '../types/type'
import {
  StudioFieldLabel,
  StudioInfo,
  studioCardClass,
  studioInputClass,
  studioSubtleCardClass,
} from './studio-ui'

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
  recommendedAttributeKeys: string[]
  variantKeySuggestions: string[]
  variantKeyContextLabel: string
  websiteOptions: WebsiteOption[]
  selectedWebsiteIds: string[]
  isWebsiteLoading: boolean
  isAvailable: boolean
  aiLoading: boolean
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
}

type SelectOption = {
  value: string
  label: string
}

const sanitizeKeyList = (values: string[]) =>
  Array.from(new Set(values.map((value) => String(value || '').trim()).filter(Boolean)))

const normalizeSearchText = (value: string) =>
  String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()

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

const getVariantDisplayName = (
  variant: Variant,
  variantIndex: number,
  productName?: string
) => {
  if (variantIndex === 0) {
    const baseProductName = String(productName || '').trim()
    if (baseProductName) return baseProductName
  }

  const customName = String(variant.variantDisplayName || '').trim()
  if (customName) return customName

  const summary = Object.values(variant.variantAttributes || {})
    .map((value) => String(value || '').trim())
    .filter(Boolean)
    .join(' / ')

  if (summary) return summary
  return `Variant ${variantIndex + 1}`
}

const WebsiteMultiSelect: React.FC<{
  values: string[]
  options: SelectOption[]
  loading: boolean
  onChange: (values: string[]) => void
}> = ({ values, options, loading, onChange }) => {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  const selectedLabels = useMemo(() => {
    const optionMap = new Map(options.map((option) => [option.value, option.label]))
    return values.map((value) => optionMap.get(value)).filter(Boolean) as string[]
  }, [options, values])

  const visibleOptions = useMemo(
    () => filterOptions(options, search),
    [options, search]
  )

  const buttonText = useMemo(() => {
    if (loading) return 'Loading websites...'
    if (!selectedLabels.length) return 'All websites'
    return `${selectedLabels.length} website${selectedLabels.length > 1 ? 's' : ''} selected`
  }, [loading, selectedLabels])

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
            'h-11 w-full justify-between rounded-xl border-border bg-background text-left text-foreground shadow-sm hover:bg-secondary',
            !selectedLabels.length && 'text-muted-foreground'
          )}
        >
          <span className='truncate'>{buttonText}</span>
          <ChevronsUpDown className='h-4 w-4 shrink-0 opacity-50' />
        </Button>
      </PopoverTrigger>
      <PopoverContent className='w-[--radix-popover-trigger-width] p-0' align='start'>
        <Command shouldFilter={false}>
          <CommandInput
            value={search}
            onValueChange={setSearch}
            placeholder='Search websites...'
          />
          <CommandList className='max-h-72'>
            <CommandEmpty>No websites found.</CommandEmpty>
            <CommandGroup>
              {visibleOptions.map((option) => {
                const checked = values.includes(option.value)
                return (
                  <CommandItem
                    key={option.value}
                    value={`${option.label} ${option.value}`}
                    onSelect={() => toggleValue(option.value)}
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4',
                        checked ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    {option.label}
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

const Step5Variants: React.FC<Props> = ({
  productName,
  variants,
  recommendedAttributeKeys,
  variantKeySuggestions,
  variantKeyContextLabel,
  websiteOptions,
  selectedWebsiteIds,
  isWebsiteLoading,
  isAvailable,
  aiLoading,
  onAddAttributeKey,
  onAddSuggestedAttributeKeys,
  onRemoveAttributeKey,
  onToggleAvailable,
  onSelectedWebsiteIdsChange,
  onGenerateSuggestedKeys,
  onAddVariant,
  onCopyFromPreviousVariant,
  onRemoveVariant,
  onVariantFieldChange,
  onVariantAttributeChange,
  onVariantImageUpload,
  onVariantImageDrop,
  onVariantImageDelete,
}) => {
  const [dragOverVariantIndex, setDragOverVariantIndex] = useState<number | null>(null)
  const [variantCustomKeyInputs, setVariantCustomKeyInputs] = useState<
    Record<number, string>
  >({})
  const [variantCustomInputOpen, setVariantCustomInputOpen] = useState<
    Record<number, boolean>
  >({})
  const [variantOptionPickerOpen, setVariantOptionPickerOpen] = useState<
    Record<number, boolean>
  >({})
  const [variantOptionSearch, setVariantOptionSearch] = useState<Record<number, string>>({})
  const [variantOptionSelections, setVariantOptionSelections] = useState<
    Record<number, string[]>
  >({})
  const [addVariantDialogOpen, setAddVariantDialogOpen] = useState(false)
  const [selectedSuggestedVariantKey, setSelectedSuggestedVariantKey] = useState('')
  const [newVariantCustomKey, setNewVariantCustomKey] = useState('')
  const [showCustomVariantKeyInput, setShowCustomVariantKeyInput] = useState(false)

  const websiteSelectOptions = useMemo(
    () =>
      websiteOptions.map((website) => ({
        value: website._id,
        label:
          website.name ||
          website.business_name ||
          website.template_name ||
          website.template_key ||
          'Untitled website',
      })),
    [websiteOptions]
  )

  const suggestedVariantKeys = useMemo(
    () => sanitizeKeyList(variantKeySuggestions).slice(0, 2),
    [variantKeySuggestions]
  )
  const resolvedSuggestedVariantKey =
    selectedSuggestedVariantKey && suggestedVariantKeys.includes(selectedSuggestedVariantKey)
      ? selectedSuggestedVariantKey
      : suggestedVariantKeys[0] || ''

  const handleAddVariantClick = () => {
    onGenerateSuggestedKeys(variants.length)
    setSelectedSuggestedVariantKey((currentValue) =>
      currentValue || suggestedVariantKeys[0] || ''
    )
    setAddVariantDialogOpen(true)
  }

  const getVariantKeys = (variant: Variant) =>
    Object.keys(variant.variantAttributes || {})
      .map((key) => String(key || '').trim())
      .filter(Boolean)

  const closeAddVariantDialog = () => {
    setAddVariantDialogOpen(false)
    setSelectedSuggestedVariantKey('')
    setNewVariantCustomKey('')
    setShowCustomVariantKeyInput(false)
  }

  const handleAddVariantWithKeys = (keys: string[]) => {
    const normalizedKeys = sanitizeKeyList(keys)
    if (!normalizedKeys.length) return
    onAddVariant(normalizedKeys)
    closeAddVariantDialog()
  }

  const handleAddVariantWithCustomKey = () => {
    handleAddVariantWithKeys([newVariantCustomKey])
  }

  const toggleRecommendedKeySelection = (variantIndex: number, key: string) => {
    setVariantOptionSelections((prev) => {
      const currentSelections = prev[variantIndex] || []
      const nextSelections = currentSelections.includes(key)
        ? currentSelections.filter((selectedKey) => selectedKey !== key)
        : [...currentSelections, key]

      return {
        ...prev,
        [variantIndex]: nextSelections,
      }
    })
  }

  const handleAddSelectedRecommendedKeys = (variantIndex: number) => {
    const selectedKeys = sanitizeKeyList(variantOptionSelections[variantIndex] || [])
    if (!selectedKeys.length) return

    onAddSuggestedAttributeKeys(variantIndex, selectedKeys)

    setVariantOptionSelections((prev) => ({
      ...prev,
      [variantIndex]: [],
    }))
    setVariantOptionPickerOpen((prev) => ({ ...prev, [variantIndex]: false }))
    setVariantOptionSearch((prev) => ({ ...prev, [variantIndex]: '' }))
  }

  const handleOptionPickerOpenChange = (variantIndex: number, open: boolean) => {
    setVariantOptionPickerOpen((prev) => ({
      ...prev,
      [variantIndex]: open,
    }))

    if (open) {
      setVariantOptionSelections((prev) => ({
        ...prev,
        [variantIndex]: [],
      }))
      onGenerateSuggestedKeys(variantIndex)
      return
    }

    setVariantOptionSelections((prev) => ({
      ...prev,
      [variantIndex]: [],
    }))
    setVariantOptionSearch((prev) => ({
      ...prev,
      [variantIndex]: '',
    }))
  }

  const handleCustomKeySubmit = (variantIndex: number) => {
    const normalizedKey = String(variantCustomKeyInputs[variantIndex] || '').trim()
    if (!normalizedKey) return

    onAddAttributeKey(variantIndex, normalizedKey)
    setVariantCustomKeyInputs((prev) => ({ ...prev, [variantIndex]: '' }))
    setVariantCustomInputOpen((prev) => ({ ...prev, [variantIndex]: false }))
  }

  return (
    <div className='space-y-6'>
      <div className={studioCardClass}>
        <div className='flex flex-col gap-4 border-b border-border/60 pb-4 lg:flex-row lg:items-start lg:justify-between'>
            <div>
              <div className='flex items-center gap-2 text-base font-semibold text-foreground'>
                <Layers3 className='h-4 w-4 text-cyan-600' />
                Variants and visibility
              </div>
              <p className='mt-2 max-w-2xl text-sm leading-6 text-muted-foreground'>
                Set product visibility, then manage each variant card separately for option
                values, pricing, stock, and images.
              </p>
            </div>
          </div>

        <div className='mt-5'>
          <div className='rounded-3xl border border-border/70 bg-gradient-to-br from-background via-background to-cyan-50/30 p-4 shadow-sm'>
            <div className='grid gap-4 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.35fr)] lg:items-start'>
              <div className={cn(studioSubtleCardClass, 'h-full border-0 bg-background/70 shadow-none')}>
                <StudioFieldLabel
                  label='Availability'
                  help='Turn this off if the product should stay hidden even after approval.'
                />
                <div className='mt-3 flex items-center justify-between gap-4 rounded-2xl border border-emerald-100 bg-emerald-50/60 px-4 py-3'>
                  <div>
                    <div className='text-sm font-medium text-foreground'>
                      {isAvailable ? 'Visible' : 'Hidden'}
                    </div>
                    <p className='text-xs text-muted-foreground'>
                      Product-level availability for the listing.
                    </p>
                  </div>
                  <div className='flex items-center gap-3'>
                    <ToggleLeft className='h-4 w-4 text-emerald-600' />
                    <Switch checked={isAvailable} onCheckedChange={onToggleAvailable} />
                  </div>
                </div>
              </div>

              <div className={cn(studioSubtleCardClass, 'h-full border-0 bg-background/70 shadow-none')}>
                <StudioFieldLabel
                  label='Show on websites'
                  help='Pick only the vendor websites where this product should appear. Leave empty to keep it available across all websites.'
                />
                {websiteSelectOptions.length ? (
                  <>
                    <div className='mt-3 rounded-2xl border border-border/70 bg-background px-3 py-3'>
                      <WebsiteMultiSelect
                        values={selectedWebsiteIds}
                        options={websiteSelectOptions}
                        loading={isWebsiteLoading}
                        onChange={onSelectedWebsiteIdsChange}
                      />
                    </div>
                    {selectedWebsiteIds.length ? (
                      <div className='mt-3 flex flex-wrap gap-2'>
                        {selectedWebsiteIds
                          .map(
                            (websiteId) =>
                              websiteSelectOptions.find(
                                (option) => option.value === websiteId
                              )?.label
                          )
                          .filter(Boolean)
                          .map((label) => (
                            <button
                              key={label}
                              type='button'
                              onClick={() =>
                                onSelectedWebsiteIdsChange(
                                  selectedWebsiteIds.filter((websiteId) => {
                                    const optionLabel = websiteSelectOptions.find(
                                      (option) => option.value === websiteId
                                    )?.label
                                    return optionLabel !== label
                                  })
                                )
                              }
                              className='inline-flex items-center gap-1.5 rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-medium text-cyan-900 transition hover:border-cyan-300 hover:bg-cyan-100'
                            >
                              {label}
                              <X className='h-3.5 w-3.5' />
                            </button>
                          ))}
                      </div>
                    ) : null}
                    <p className='mt-3 text-xs leading-5 text-muted-foreground'>
                      Multi-select supported. This only controls storefront website visibility.
                    </p>
                  </>
                ) : (
                  <div className='mt-3 rounded-2xl border border-dashed border-border/70 bg-background/50 px-4 py-3 text-sm text-muted-foreground'>
                    No vendor websites found yet. Create a website first if you want to limit product
                    visibility by storefront.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {variants.length === 0 ? (
        <div className={studioCardClass}>
          <h3 className='text-base font-semibold text-foreground'>No variants yet</h3>
          <p className='mt-2 text-sm text-muted-foreground'>
            Add the first variant to start with a key like Size, Color, or Lens Power.
            You can also create a custom key and keep adding more product details
            inside each variant card.
          </p>
          <span className='mt-4 inline-flex'>
            <Button
              type='button'
              onClick={handleAddVariantClick}
              className='h-11 bg-cyan-600 px-5 text-white hover:bg-cyan-700'
            >
              <Plus className='mr-2 h-4 w-4' />
              Add Variant
            </Button>
          </span>
        </div>
      ) : (
        <div className='space-y-5'>
          {variants.map((variant, variantIndex) => {
            const variantKeys = getVariantKeys(variant)
            const summary = variantKeys
              .map((key) => variant.variantAttributes[key])
              .filter(Boolean)
              .join(' / ')
            const customVariantName = String(variant.variantDisplayName || '').trim()
            const isPrimaryVariant = variantIndex === 0
            const recommendedOptions = filterOptions(
              recommendedAttributeKeys
                .map((key) => ({
                  value: key,
                  label: key,
                }))
                .filter((option) => !variantKeys.includes(option.value)),
              variantOptionSearch[variantIndex] || ''
            )
            const isCustomInputVisible = Boolean(variantCustomInputOpen[variantIndex])
            const selectedRecommendedKeys = variantOptionSelections[variantIndex] || []
            const primaryVariantKey = variantKeys[0] || ''
            const variantTitle = primaryVariantKey
              ? `${primaryVariantKey} variant`
              : `Variant ${variantIndex + 1}`
            const customerFacingVariantName = getVariantDisplayName(
              variant,
              variantIndex,
              productName
            )
            const variantSubtitle = summary
              ? summary
              : primaryVariantKey
                ? `Set ${primaryVariantKey.toLowerCase()} details, pricing, stock, and images.`
                : 'Choose product details, then set pricing, stock, and images.'

            return (
              <article
                key={variantIndex}
                className={cn(
                  studioCardClass,
                  'overflow-hidden border-cyan-200/70 bg-gradient-to-br from-white via-cyan-50/20 to-slate-50/70 shadow-[0_16px_40px_-24px_rgba(8,145,178,0.35)]'
                )}
              >
                <div className='-mx-5 -mt-5 mb-5 flex flex-col gap-4 border-b border-cyan-100 bg-gradient-to-r from-cyan-50/70 via-white to-white px-5 py-5 lg:flex-row lg:items-start lg:justify-between'>
                  <div>
                    <div className='mb-2 inline-flex items-center gap-2 border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-700 dark:text-cyan-300'>
                      {variantTitle}
                    </div>
                    <h3 className='text-lg font-semibold text-foreground'>
                      {customerFacingVariantName}
                    </h3>
                    <p className='text-sm text-muted-foreground'>
                      Variant {variantIndex + 1}
                      {variantSubtitle ? ` • ${variantSubtitle}` : ''}
                    </p>
                  </div>

                  <div className='flex flex-wrap items-center gap-3'>
                    <div className='flex items-center gap-2 rounded-xl border border-cyan-100 bg-white/90 px-3 py-2 shadow-sm'>
                      <Switch
                        checked={variant.isActive}
                        onCheckedChange={(checked) =>
                          onVariantFieldChange(variantIndex, 'isActive', checked)
                        }
                      />
                      <span className='text-sm font-medium text-foreground'>
                        {variant.isActive ? 'Active' : 'Paused'}
                      </span>
                    </div>
                    <Button
                      type='button'
                      variant='outline'
                      onClick={() => onCopyFromPreviousVariant(variantIndex)}
                      disabled={variantIndex === 0}
                      className='h-11 border-amber-500/25 bg-amber-500/10 px-4 text-amber-700 hover:bg-amber-500/15 hover:text-amber-800 disabled:border-border disabled:bg-background disabled:text-muted-foreground'
                    >
                      <Copy className='mr-2 h-4 w-4' />
                      Copy Above
                    </Button>
                  </div>
                </div>

                <div className='grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]'>
                  <div className='space-y-4'>
                    <section
                      className={cn(
                        studioSubtleCardClass,
                        'rounded-3xl border border-border/70 bg-white shadow-sm'
                      )}
                    >
                      <div className='mb-4 flex flex-col gap-3 border-b border-border/60 pb-4 xl:flex-row xl:items-start xl:justify-between'>
                        <div className='flex items-center gap-2 text-sm font-semibold text-foreground'>
                          <Tag className='h-4 w-4 text-cyan-600' />
                          Product details
                          <StudioInfo
                            content='Use suggested or custom keys like Size, Color, Lens Power, Fabric, or Material to make each variant easier to understand.'
                          />
                        </div>
                        <div className='flex flex-wrap items-center gap-2'>
                          <Popover
                            open={Boolean(variantOptionPickerOpen[variantIndex])}
                            onOpenChange={(open) =>
                              handleOptionPickerOpenChange(variantIndex, open)
                            }
                          >
                            <PopoverTrigger asChild>
                              <Button
                                type='button'
                                variant='outline'
                                className='h-10 border-border bg-background px-4'
                              >
                                <Plus className='mr-2 h-4 w-4' />
                                Add detail
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className='w-[340px] p-0' align='start'>
                              <Command shouldFilter={false}>
                                <CommandInput
                                  value={variantOptionSearch[variantIndex] || ''}
                                  onValueChange={(value) =>
                                    setVariantOptionSearch((prev) => ({
                                      ...prev,
                                      [variantIndex]: value,
                                    }))
                                  }
                                  placeholder='Search suggested keys...'
                                />
                                <CommandList className='max-h-72'>
                                  {!aiLoading && recommendedOptions.length === 0 ? (
                                    <div className='px-4 py-6 text-center text-sm text-muted-foreground'>
                                      No matching keys. Use the custom detail button below.
                                    </div>
                                  ) : null}
                                  <CommandGroup
                                    heading={
                                      aiLoading ? 'Loading suggestions' : 'Suggested details'
                                    }
                                  >
                                    {aiLoading ? (
                                      <div className='flex items-center gap-2 px-3 py-3 text-sm text-muted-foreground'>
                                        <Loader2 className='h-4 w-4 animate-spin' />
                                        Fetching category and AI suggestions...
                                      </div>
                                    ) : null}
                                    {recommendedOptions.map((option) => (
                                      <CommandItem
                                        key={`${variantIndex}-${option.value}`}
                                        value={`${option.label} ${option.value}`}
                                        onSelect={() =>
                                          toggleRecommendedKeySelection(
                                            variantIndex,
                                            option.value
                                          )
                                        }
                                      >
                                        <Check
                                          className={cn(
                                            'mr-2 h-4 w-4',
                                            selectedRecommendedKeys.includes(option.value)
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
                              <div className='grid gap-2 border-t border-border/60 p-2'>
                                <Button
                                  type='button'
                                  variant='outline'
                                  onClick={() =>
                                    handleAddSelectedRecommendedKeys(variantIndex)
                                  }
                                  disabled={!selectedRecommendedKeys.length}
                                  className='h-10 w-full justify-start px-3'
                                >
                                  <Plus className='mr-2 h-4 w-4' />
                                  Add selected details
                                  {selectedRecommendedKeys.length
                                    ? ` (${selectedRecommendedKeys.length})`
                                    : ''}
                                </Button>
                                <Button
                                  type='button'
                                  variant='ghost'
                                  onClick={() => {
                                    handleOptionPickerOpenChange(variantIndex, false)
                                    setVariantCustomInputOpen((prev) => ({
                                      ...prev,
                                      [variantIndex]: true,
                                    }))
                                  }}
                                  className='h-10 w-full justify-start px-3 text-sm font-semibold text-cyan-700 hover:bg-cyan-500/10 hover:text-cyan-800'
                                >
                                  <Plus className='mr-2 h-4 w-4' />
                                  Create custom detail
                                </Button>
                              </div>
                            </PopoverContent>
                          </Popover>

                          <Button
                            type='button'
                            variant='ghost'
                            onClick={() =>
                              setVariantCustomInputOpen((prev) => ({
                                ...prev,
                                [variantIndex]: !prev[variantIndex],
                              }))
                            }
                            className='h-10 px-3 text-sm font-semibold text-cyan-700 hover:bg-cyan-500/10 hover:text-cyan-800'
                          >
                            <Plus className='mr-2 h-4 w-4' />
                            Add custom detail
                          </Button>
                        </div>
                      </div>

                      {isPrimaryVariant ? (
                        <div className='mb-4 rounded-2xl border border-cyan-100 bg-cyan-50/40 p-4'>
                          <StudioFieldLabel
                            label='Variant Name'
                            help='The first variant uses the main product name from Step 1 so vendors do not need to name the base variant separately.'
                          />
                          <div className='rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700'>
                            {String(productName || '').trim() || 'This variant uses the main product name'}
                          </div>
                          <p className='mt-2 text-xs leading-5 text-muted-foreground'>
                            The first variant always uses the product name from Step 1.
                          </p>
                        </div>
                      ) : (
                        <div className='mb-4 rounded-2xl border border-cyan-100 bg-cyan-50/40 p-4'>
                          <StudioFieldLabel
                            label='Variant Name'
                            help='This is the customer-facing variant name. Vendors can keep it simple, like Black 256 GB, Large Blue, or Matte Finish.'
                          />
                          <input
                            type='text'
                            value={variant.variantDisplayName || ''}
                            onChange={(event) =>
                              onVariantFieldChange(
                                variantIndex,
                                'variantDisplayName',
                                event.target.value
                              )
                            }
                            placeholder={
                              customVariantName
                                ? customVariantName
                                : summary || `Variant ${variantIndex + 1}`
                            }
                            className={studioInputClass}
                          />
                          <p className='mt-2 text-xs leading-5 text-muted-foreground'>
                            Customers will see this name. If left blank, we will use the selected
                            variant details automatically.
                          </p>
                        </div>
                      )}

                      {isCustomInputVisible ? (
                        <div className='mb-4 border border-dashed border-cyan-500/30 bg-cyan-500/5 p-4'>
                          <div className='flex items-center justify-between gap-3'>
                            <StudioFieldLabel label='Create custom detail' className='mb-0' />
                            <Button
                              type='button'
                              variant='ghost'
                              onClick={() =>
                                setVariantCustomInputOpen((prev) => ({
                                  ...prev,
                                  [variantIndex]: false,
                                }))
                              }
                              className='h-auto px-2 text-xs font-semibold text-muted-foreground hover:bg-transparent hover:text-foreground'
                            >
                              <X className='mr-1 h-3.5 w-3.5' />
                              Hide
                            </Button>
                          </div>
                            <div className='mt-3 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]'>
                              <input
                                type='text'
                              value={variantCustomKeyInputs[variantIndex] || ''}
                              onChange={(event) =>
                                setVariantCustomKeyInputs((prev) => ({
                                  ...prev,
                                  [variantIndex]: event.target.value,
                                }))
                              }
                              onKeyDown={(event) => {
                                if (event.key === 'Enter') {
                                  event.preventDefault()
                                  handleCustomKeySubmit(variantIndex)
                                }
                              }}
                              placeholder='Add custom detail, e.g. color, material, finish'
                              className={studioInputClass}
                            />
                            <Button
                              type='button'
                              onClick={() => handleCustomKeySubmit(variantIndex)}
                              className='h-11 border border-border bg-card px-5 text-foreground hover:bg-secondary'
                            >
                              <Plus className='mr-2 h-4 w-4' />
                              Add Detail
                            </Button>
                          </div>
                        </div>
                      ) : null}

                      <div className='grid gap-4 sm:grid-cols-2 2xl:grid-cols-3'>
                        {variantKeys.length ? (
                          variantKeys.map((key) => (
                            <div
                              key={`${variantIndex}-${key}`}
                              className='flex h-full flex-col border border-border/60 bg-background/50 p-4'
                            >
                              <StudioFieldLabel
                                label={key}
                                action={
                                  <button
                                    type='button'
                                    onClick={() => onRemoveAttributeKey(variantIndex, key)}
                                    className='inline-flex h-7 w-7 items-center justify-center border border-border bg-background text-muted-foreground transition hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-600'
                                    aria-label={`Remove ${key}`}
                                  >
                                    <X className='h-3.5 w-3.5' />
                                  </button>
                                }
                              />
                              <input
                                type='text'
                                value={variant.variantAttributes[key] || ''}
                                onChange={(event) =>
                                  onVariantAttributeChange(
                                    variantIndex,
                                    key,
                                    event.target.value
                                  )
                                }
                                placeholder={`Enter ${key.toLowerCase()}`}
                                className={studioInputClass}
                              />
                            </div>
                          ))
                        ) : (
                          <div className='sm:col-span-2 2xl:col-span-3 bg-background/40 px-4 py-3 text-sm text-muted-foreground'>
                            Add detail dropdown se suggested keys choose karo, ya custom
                            detail button se apni key banao.
                          </div>
                        )}
                      </div>
                    </section>

                    <section
                      className={cn(
                        studioSubtleCardClass,
                        'rounded-3xl border border-border/70 bg-white shadow-sm'
                      )}
                    >
                      <div className='mb-4 flex items-center gap-2 text-sm font-semibold text-foreground'>
                        <Package2 className='h-4 w-4 text-emerald-600' />
                        Pricing and stock
                      </div>
                      <div className='grid gap-4 md:grid-cols-3'>
                        <div>
                          <StudioFieldLabel label='Actual Price' />
                          <input
                            type='number'
                            min='0'
                            step='0.01'
                            value={variant.actualPrice}
                            onChange={(event) =>
                              onVariantFieldChange(
                                variantIndex,
                                'actualPrice',
                                event.target.value
                              )
                            }
                            className={studioInputClass}
                          />
                        </div>
                        <div>
                          <StudioFieldLabel label='Final Price' />
                          <input
                            type='number'
                            min='0'
                            step='0.01'
                            value={variant.finalPrice}
                            onChange={(event) =>
                              onVariantFieldChange(
                                variantIndex,
                                'finalPrice',
                                event.target.value
                              )
                            }
                            className={studioInputClass}
                          />
                        </div>
                        <div>
                          <StudioFieldLabel label='Stock Quantity' />
                          <input
                            type='number'
                            min='0'
                            value={variant.stockQuantity}
                            onChange={(event) =>
                              onVariantFieldChange(
                                variantIndex,
                                'stockQuantity',
                                event.target.value
                              )
                            }
                            className={studioInputClass}
                          />
                        </div>
                      </div>
                    </section>
                  </div>

                  <section
                    className={cn(
                      studioSubtleCardClass,
                      'rounded-3xl border border-border/70 bg-white shadow-sm'
                    )}
                  >
                    <div className='mb-4 flex items-center gap-2 text-sm font-semibold text-foreground'>
                      <Upload className='h-4 w-4 text-indigo-600' />
                      Variant images
                    </div>

                    <div
                      onDragOver={(event) => {
                        event.preventDefault()
                        event.dataTransfer.dropEffect = 'copy'
                        setDragOverVariantIndex(variantIndex)
                      }}
                      onDragLeave={(event) => {
                        const nextTarget = event.relatedTarget as Node | null
                        if (nextTarget && event.currentTarget.contains(nextTarget)) return
                        if (dragOverVariantIndex === variantIndex) {
                          setDragOverVariantIndex(null)
                        }
                      }}
                      onDrop={(event) => {
                        event.preventDefault()
                        setDragOverVariantIndex(null)
                        const files = Array.from(event.dataTransfer.files || [])
                        if (files.length) {
                          onVariantImageDrop(variantIndex, files)
                        }
                      }}
                      className={`rounded-2xl p-6 text-center transition ${
                        dragOverVariantIndex === variantIndex
                          ? 'bg-cyan-500/10'
                          : 'bg-background/40'
                      }`}
                    >
                      <input
                        type='file'
                        multiple
                        accept='image/*'
                        onChange={(event) => onVariantImageUpload(variantIndex, event)}
                        className='hidden'
                        id={`variant-image-upload-${variantIndex}`}
                      />
                      <label
                        htmlFor={`variant-image-upload-${variantIndex}`}
                        className='flex cursor-pointer flex-col items-center gap-2'
                      >
                        <div className='inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-500/20 bg-cyan-500/10'>
                          <Upload className='h-5 w-5 text-cyan-600' />
                        </div>
                        <span className='text-sm font-semibold text-foreground'>
                          Upload or drop images
                        </span>
                      </label>
                    </div>

                    {variant.variantsImageUrls.length > 0 ? (
                      <div className='mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3'>
                        {variant.variantsImageUrls.map((image, imageIndex) => (
                          <div
                            key={image.tempId || image.publicId || imageIndex}
                            className='relative h-28 overflow-hidden rounded-2xl bg-card'
                          >
                            <img
                              src={image.url}
                              alt='Variant'
                              className={`h-full w-full object-cover ${
                                image.uploading ? 'opacity-45' : ''
                              }`}
                            />
                            {image.uploading ? (
                              <div className='absolute inset-0 flex items-center justify-center bg-background/55 backdrop-blur-sm'>
                                <Loader2 className='h-5 w-5 animate-spin text-cyan-600' />
                              </div>
                            ) : (
                              <button
                                type='button'
                                onClick={() =>
                                  onVariantImageDelete(variantIndex, imageIndex)
                                }
                                className='absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-black/65 text-white transition hover:bg-red-600'
                                aria-label='Delete variant image'
                              >
                                <Trash2 className='h-4 w-4' />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className='mt-4 text-sm text-muted-foreground'>No images yet.</p>
                    )}
                  </section>
                </div>

                <div className='mt-6 flex justify-center border-t border-cyan-100 pt-5'>
                  <Button
                    type='button'
                    variant='outline'
                    onClick={() => onRemoveVariant(variantIndex)}
                    className='h-11 border-red-500/25 bg-red-500/10 px-6 text-red-600 hover:bg-red-500/15 hover:text-red-700'
                  >
                    <Trash2 className='mr-2 h-4 w-4' />
                    Remove
                  </Button>
                </div>
              </article>
            )
          })}

          <div className='flex justify-end pt-1'>
            <Button
              type='button'
              variant='outline'
              onClick={handleAddVariantClick}
              className='h-11 border-cyan-500/20 bg-cyan-500/10 px-5 text-cyan-700 hover:bg-cyan-500/15 hover:text-cyan-800'
            >
              <Plus className='mr-2 h-4 w-4' />
              Add Variant
            </Button>
          </div>
        </div>
      )}

      <Dialog
        open={addVariantDialogOpen}
        onOpenChange={(open) => {
          if (open) {
            setAddVariantDialogOpen(true)
            return
          }

          closeAddVariantDialog()
        }}
      >
        <DialogContent className='sm:max-w-[560px]'>
          <DialogHeader>
            <DialogTitle className='flex items-center gap-2'>
              <CircleHelp className='h-5 w-5 text-cyan-600' />
              Choose variant key
            </DialogTitle>
            <DialogDescription>
              {variantKeyContextLabel
                ? `Based on ${variantKeyContextLabel}, start this variant with one common key.`
                : 'Start this variant with one common key so product variants are easier to understand.'}
            </DialogDescription>
          </DialogHeader>

          <div className='space-y-4'>
            <div className='space-y-3'>
              <StudioFieldLabel
                label='Suggested keys'
                help='These quick picks come from the selected category and the current product context.'
                className='mb-0'
              />
              {aiLoading ? (
                <div className='flex min-h-[72px] items-center gap-3 rounded-2xl border border-dashed border-border bg-background/40 px-4 py-3 text-sm text-muted-foreground'>
                  <Loader2 className='h-4 w-4 animate-spin text-cyan-600' />
                  Loading suggested keys...
                </div>
              ) : suggestedVariantKeys.length ? (
                <div className='grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]'>
                  <Select
                    value={resolvedSuggestedVariantKey}
                    onValueChange={setSelectedSuggestedVariantKey}
                  >
                    <SelectTrigger className='h-11 w-full'>
                      <SelectValue placeholder='Select suggested key' />
                    </SelectTrigger>
                    <SelectContent>
                      {suggestedVariantKeys.map((key) => (
                        <SelectItem key={key} value={key}>
                          {key}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Button
                    type='button'
                    variant='outline'
                    onClick={() =>
                      handleAddVariantWithKeys([resolvedSuggestedVariantKey])
                    }
                    disabled={!resolvedSuggestedVariantKey}
                  >
                    <Plus className='h-4 w-4' />
                    Add Variant
                  </Button>
                </div>
              ) : (
                <div className='border border-dashed border-border bg-background/40 px-4 py-3 text-sm text-muted-foreground'>
                  No direct suggestions available for this category yet.
                </div>
              )}

              <div className='rounded-2xl bg-cyan-50/60 px-4 py-3 text-sm text-cyan-900'>
                <button
                  type='button'
                  onClick={() => setShowCustomVariantKeyInput((prev) => !prev)}
                  className='font-medium underline decoration-cyan-300 underline-offset-4 transition hover:text-cyan-700'
                >
                  Can&apos;t find it? Create your key variant.
                </button>
              </div>

              {showCustomVariantKeyInput ? (
                <div className='grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto]'>
                  <input
                    type='text'
                    value={newVariantCustomKey}
                    onChange={(event) => setNewVariantCustomKey(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault()
                        handleAddVariantWithCustomKey()
                      }
                    }}
                    placeholder='Enter custom variant key'
                    className={studioInputClass}
                    autoFocus
                  />
                  <Button
                    type='button'
                    variant='outline'
                    onClick={handleAddVariantWithCustomKey}
                    disabled={!String(newVariantCustomKey || '').trim()}
                  >
                    <Plus className='h-4 w-4' />
                    Add Variant
                  </Button>
                  <Button
                    type='button'
                    variant='outline'
                    onClick={() => {
                      setShowCustomVariantKeyInput(false)
                      setNewVariantCustomKey('')
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              ) : null}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default Step5Variants
