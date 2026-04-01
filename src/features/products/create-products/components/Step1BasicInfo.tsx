import React, { useEffect, useMemo, useState } from 'react'
import {
  Building2,
  Check,
  ChevronsUpDown,
  FileText,
  FolderOpen,
  Loader2,
  Package,
  Plus,
  Sparkles,
} from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import RichTextEditor from '@/components/product/RichTextEditor'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  StudioFieldLabel,
  StudioSection,
  studioCardClass,
  studioInputClass,
  studioSubtleCardClass,
  studioTextareaClass,
} from './studio-ui'

type SelectOption = {
  value: string
  label: string
}

const normalizeSearchText = (value: string) =>
  String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()

const filterOptions = (options: SelectOption[], search: string) => {
  const normalizedSearch = normalizeSearchText(search)
  if (!normalizedSearch) return options

  return options
    .map((option, index) => {
      const normalizedLabel = normalizeSearchText(option.label)
      const normalizedValue = normalizeSearchText(option.value)
      const labelWords = normalizedLabel.split(/[\s,/-]+/).filter(Boolean)

      let rank = Number.POSITIVE_INFINITY
      if (normalizedLabel === normalizedSearch) {
        rank = 0
      } else if (normalizedLabel.startsWith(normalizedSearch)) {
        rank = 1
      } else if (labelWords.some((word) => word.startsWith(normalizedSearch))) {
        rank = 2
      } else if (normalizedLabel.includes(normalizedSearch)) {
        rank = 3
      } else if (normalizedValue.includes(normalizedSearch)) {
        rank = 4
      }

      if (!Number.isFinite(rank)) return null

      return {
        option,
        rank,
        index,
      }
    })
    .filter((item): item is { option: SelectOption; rank: number; index: number } => Boolean(item))
    .sort(
      (a, b) =>
        a.rank - b.rank ||
        a.option.label.localeCompare(b.option.label, undefined, { sensitivity: 'base' }) ||
        a.index - b.index
    )
    .map((item) => item.option)
}

interface Props {
  formData: any
  setFormData: React.Dispatch<React.SetStateAction<any>>
  mainCategories: any[]
  selectedMainCategoryIds: string[]
  setSelectedMainCategoryIds: React.Dispatch<React.SetStateAction<string[]>>
  categories: any[]
  selectedCategoryIds: string[]
  setSelectedCategoryIds: React.Dispatch<React.SetStateAction<string[]>>
  filteredSubcategories: any[]
  isMainCategoryLoading: boolean
  isCategoryLoading: boolean
  aiLoading: Record<string, boolean>
  generateWithAI: () => void
  generateDescription: () => void
  onCreateMainCategory: (name: string) => Promise<void>
  onCreateCategory: (name: string) => Promise<void>
  onCreateSubcategory: (payload: { name: string; categoryId: string }) => Promise<void>
}

const SearchableMultiSelect: React.FC<{
  values: string[]
  onChange: (values: string[]) => void
  options: SelectOption[]
  placeholder: string
  disabled?: boolean
  loading?: boolean
  searchPlaceholder?: string
  emptyLabel?: string
  onSelectAll?: () => void
  selectAllLabel?: string
  selectAllDisabled?: boolean
  onCreateOption?: (search: string) => void
  createOptionLabel?: string
}> = ({
  values,
  onChange,
  options,
  placeholder,
  disabled,
  loading,
  searchPlaceholder,
  emptyLabel,
  onSelectAll,
  selectAllLabel,
  selectAllDisabled,
  onCreateOption,
  createOptionLabel,
}) => {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  const selectedLabels = useMemo(() => {
    const map = new Map(options.map((opt) => [opt.value, opt.label]))
    return values.map((id) => map.get(id)).filter(Boolean) as string[]
  }, [options, values])
  const visibleOptions = useMemo(
    () => filterOptions(options, search),
    [options, search]
  )

  const buttonText = useMemo(() => {
    if (!selectedLabels.length) return placeholder
    if (selectedLabels.length <= 2) return selectedLabels.join(', ')
    return `${selectedLabels[0]}, ${selectedLabels[1]} +${selectedLabels.length - 2} more`
  }, [placeholder, selectedLabels])

  const toggleValue = (value: string) => {
    if (values.includes(value)) {
      onChange(values.filter((id) => id !== value))
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
          variant='outline'
          role='combobox'
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            'h-11 w-full justify-between rounded-xl border-border bg-background text-left text-foreground shadow-sm hover:bg-secondary',
            !selectedLabels.length && 'text-muted-foreground'
          )}
        >
          <span className='truncate'>{loading ? 'Loading...' : buttonText}</span>
          <ChevronsUpDown className='h-4 w-4 shrink-0 opacity-50' />
        </Button>
      </PopoverTrigger>
      <PopoverContent className='w-[--radix-popover-trigger-width] p-0' align='start'>
        <Command shouldFilter={false}>
          <CommandInput
            value={search}
            onValueChange={setSearch}
            placeholder={searchPlaceholder || 'Search options...'}
          />
          <CommandList key={search || 'all'} className='max-h-72'>
            {onSelectAll || onCreateOption ? (
              <>
                <CommandGroup>
                  {onSelectAll ? (
                    <CommandItem
                      value='__select_all__'
                      disabled={selectAllDisabled}
                      onSelect={() => {
                        onSelectAll()
                        setSearch('')
                        setOpen(false)
                      }}
                    >
                      <Check className='mr-2 h-4 w-4 opacity-100' />
                      {selectAllLabel || 'Select all'}
                    </CommandItem>
                  ) : null}
                  {onCreateOption ? (
                    <CommandItem
                      value='__create_option__'
                      onSelect={() => {
                        onCreateOption(search)
                        setSearch('')
                        setOpen(false)
                      }}
                    >
                      <Plus className='mr-2 h-4 w-4' />
                      {createOptionLabel || 'Create new option'}
                    </CommandItem>
                  ) : null}
                </CommandGroup>
                <CommandSeparator />
              </>
            ) : null}
            <CommandEmpty>{emptyLabel || 'No options found.'}</CommandEmpty>
            <CommandGroup>
              {visibleOptions.map((option) => {
                const checked = values.includes(option.value)
                return (
                  <CommandItem
                    key={option.value}
                    value={`${option.label} ${option.value}`}
                    onMouseDown={(event) => {
                      // Keep focus inside the popover so vendors can pick
                      // multiple categories without the menu collapsing.
                      event.preventDefault()
                    }}
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

const aiButtonClass =
  'inline-flex items-center gap-1 rounded-2xl border border-border bg-card px-4 py-2 text-xs font-semibold text-foreground transition hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-60'

const Step1BasicInfo: React.FC<Props> = ({
  formData,
  setFormData,
  mainCategories,
  selectedMainCategoryIds,
  setSelectedMainCategoryIds,
  categories,
  selectedCategoryIds,
  setSelectedCategoryIds,
  filteredSubcategories,
  isMainCategoryLoading,
  isCategoryLoading,
  aiLoading,
  generateWithAI,
  generateDescription,
  onCreateMainCategory,
  onCreateCategory,
  onCreateSubcategory,
}) => {
  const [showMainCategoryCreator, setShowMainCategoryCreator] = useState(false)
  const [showCategoryCreator, setShowCategoryCreator] = useState(false)
  const [showSubCategoryCreator, setShowSubCategoryCreator] = useState(false)
  const [newMainCategoryName, setNewMainCategoryName] = useState('')
  const [newCategoryName, setNewCategoryName] = useState('')
  const [newSubCategoryName, setNewSubCategoryName] = useState('')
  const [newSubCategoryCategoryId, setNewSubCategoryCategoryId] = useState('')
  const [isCreatingMainCategory, setIsCreatingMainCategory] = useState(false)
  const [isCreatingCategory, setIsCreatingCategory] = useState(false)
  const [isCreatingSubCategory, setIsCreatingSubCategory] = useState(false)

  useEffect(() => {
    setNewSubCategoryCategoryId((current) =>
      selectedCategoryIds.includes(current) ? current : selectedCategoryIds[0] || ''
    )
  }, [selectedCategoryIds])

  const mainCategoryOptions = useMemo(
    () =>
      mainCategories
        .map((cat: any) => ({
          value: cat._id,
          label: cat.name,
        }))
        .sort((a: SelectOption, b: SelectOption) =>
          a.label.localeCompare(b.label, undefined, { sensitivity: 'base' })
        ),
    [mainCategories]
  )

  const categoryOptions = useMemo(
    () =>
      categories
        .map((cat: any) => ({
          value: cat._id,
          label: cat.name,
        }))
        .sort((a: SelectOption, b: SelectOption) =>
          a.label.localeCompare(b.label, undefined, { sensitivity: 'base' })
        ),
    [categories]
  )

  const categoryNameById = useMemo(
    () =>
      categories.reduce((acc: Record<string, string>, cat: any) => {
        acc[cat._id] = cat.name
        return acc
      }, {}),
    [categories]
  )

  const subCategoryOptions = useMemo(
    () =>
      filteredSubcategories
        .map((sub: any) => {
          const categoryLabel =
            sub.categoryName ||
            categoryNameById[String(sub.category_id)] ||
            'Unknown Category'

          return {
            value: sub._id,
            label: `${sub.name} (${categoryLabel})`,
          }
        })
        .sort((a: SelectOption, b: SelectOption) =>
          a.label.localeCompare(b.label, undefined, { sensitivity: 'base' })
        ),
    [categoryNameById, filteredSubcategories]
  )

  const selectedCategoryLabels = useMemo(() => {
    const map = new Map(categoryOptions.map((option) => [option.value, option.label]))
    return selectedCategoryIds.map((id) => map.get(id)).filter(Boolean) as string[]
  }, [categoryOptions, selectedCategoryIds])

  const selectedCategoryCreateOptions = useMemo(
    () => categoryOptions.filter((option) => selectedCategoryIds.includes(option.value)),
    [categoryOptions, selectedCategoryIds]
  )

  const handleCreateMainCategory = async () => {
    const trimmedName = newMainCategoryName.trim()
    if (!trimmedName) {
      toast.error('Main category name is required.')
      return
    }

    setIsCreatingMainCategory(true)
    try {
      await onCreateMainCategory(trimmedName)
      toast.success('Main category created and selected.')
      setNewMainCategoryName('')
      setShowMainCategoryCreator(false)
    } catch (error: any) {
      toast.error(error?.message || 'Failed to create main category.')
    } finally {
      setIsCreatingMainCategory(false)
    }
  }

  const handleCreateCategory = async () => {
    const trimmedName = newCategoryName.trim()
    if (!selectedMainCategoryIds.length) {
      toast.error('Select at least one main category first.')
      return
    }
    if (!trimmedName) {
      toast.error('Category name is required.')
      return
    }

    setIsCreatingCategory(true)
    try {
      await onCreateCategory(trimmedName)
      toast.success('Category created and selected.')
      setNewCategoryName('')
      setShowCategoryCreator(false)
    } catch (error: any) {
      toast.error(error?.message || 'Failed to create category.')
    } finally {
      setIsCreatingCategory(false)
    }
  }

  const handleCreateSubCategory = async () => {
    const trimmedName = newSubCategoryName.trim()
    if (!newSubCategoryCategoryId) {
      toast.error('Choose a category for this subcategory.')
      return
    }
    if (!trimmedName) {
      toast.error('Subcategory name is required.')
      return
    }

    setIsCreatingSubCategory(true)
    try {
      await onCreateSubcategory({
        name: trimmedName,
        categoryId: newSubCategoryCategoryId,
      })
      toast.success('Subcategory created and selected.')
      setNewSubCategoryName('')
      setShowSubCategoryCreator(false)
    } catch (error: any) {
      toast.error(error?.message || 'Failed to create subcategory.')
    } finally {
      setIsCreatingSubCategory(false)
    }
  }

  return (
    <div className='space-y-6'>
        <StudioSection
          icon={Package}
          tone='cyan'
          eyebrow='Step 1'
          title='Product details'
          description='Start with the information a vendor naturally knows first: the product name, brand, and the copy buyers will read.'
          help='Keep this step simple. Fill product identity, buyer-facing copy, and category mapping in one clean flow.'
        >
          <div className='space-y-5'>
            <div className={studioSubtleCardClass}>
              <div className='mb-4 flex items-center gap-2 text-sm font-semibold text-foreground'>
                <Building2 className='h-4 w-4 text-cyan-600' />
                Product identity
              </div>
              <div className='grid gap-4 sm:grid-cols-2'>
                <div>
                  <StudioFieldLabel
                    label='Product Name'
                    required
                    help='Use the exact customer-facing name you want to publish.'
                  />
                  <input
                    type='text'
                    value={formData.productName}
                    onChange={(event) =>
                      setFormData((prev: any) => ({
                        ...prev,
                        productName: event.target.value,
                      }))
                    }
                    className={studioInputClass}
                    placeholder='Example: Industrial Dust Collector'
                    required
                  />
                </div>

                <div>
                  <StudioFieldLabel
                    label='Brand'
                    help='Optional. Add the brand only if it matters for buyers or cataloging.'
                  />
                  <input
                    type='text'
                    value={formData.brand}
                    onChange={(event) =>
                      setFormData((prev: any) => ({
                        ...prev,
                        brand: event.target.value,
                      }))
                    }
                    className={studioInputClass}
                    placeholder='Optional brand name'
                  />
                </div>
              </div>
            </div>
          </div>
        </StudioSection>

      <div className={studioCardClass}>
        <div className='mb-5 flex items-center gap-2 text-sm font-semibold text-foreground'>
          <FolderOpen className='h-4 w-4 text-indigo-600' />
          Category Mapping
        </div>
        <div className='grid gap-4 lg:grid-cols-2'>
          <div className={studioSubtleCardClass}>
            <StudioFieldLabel
              label='Main Category'
              required
              help='Choose the high-level catalog bucket first so the rest of the form can adapt correctly.'
            />
          <SearchableMultiSelect
            values={selectedMainCategoryIds}
            onChange={(values) => {
              setSelectedMainCategoryIds(values)
              setSelectedCategoryIds([])
              setFormData((prev: any) => ({
                ...prev,
                mainCategory: values[0] || '',
                mainCategories: values,
                productCategory: '',
                productCategories: [],
                productSubCategories: [],
              }))
            }}
            options={mainCategoryOptions}
            placeholder='Select one or more main categories'
            loading={isMainCategoryLoading}
          />
          <button
            type='button'
            onClick={() => setShowMainCategoryCreator((prev) => !prev)}
            className='mt-3 inline-flex items-center gap-1 text-xs font-semibold text-cyan-700 transition hover:text-cyan-800'
          >
            <Plus className='h-3.5 w-3.5' />
            Can&apos;t find it? Create main category
          </button>
          {showMainCategoryCreator ? (
            <div className='mt-3 rounded-2xl bg-background/40 p-4'>
              <div className='mt-3 flex flex-col gap-2 sm:flex-row'>
                <Input
                  value={newMainCategoryName}
                  onChange={(event) => setNewMainCategoryName(event.target.value)}
                  placeholder='Enter main category name'
                  className='h-11 rounded-xl border-border bg-background'
                />
                <div className='flex gap-2'>
                  <Button
                    type='button'
                    onClick={handleCreateMainCategory}
                    disabled={isCreatingMainCategory}
                    className='h-11 rounded-xl bg-cyan-600 px-4 text-white hover:bg-cyan-700'
                  >
                    {isCreatingMainCategory ? (
                      <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                    ) : null}
                    Create
                  </Button>
                  <Button
                    type='button'
                    variant='outline'
                    onClick={() => {
                      setShowMainCategoryCreator(false)
                      setNewMainCategoryName('')
                    }}
                    className='h-11 rounded-xl px-4'
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          ) : null}
          </div>

          <div className={studioSubtleCardClass}>
            <StudioFieldLabel
              label='Categories'
              required
              help='Pick the browsing categories customers should see. Keep the list focused to avoid confusion.'
            />
          <SearchableMultiSelect
            values={selectedCategoryIds}
            onChange={(values) => {
              setSelectedCategoryIds(values)
              setFormData((prev: any) => ({
                ...prev,
                productCategory: values[0] || '',
                productCategories: values,
                productSubCategories: [],
              }))
            }}
            options={categoryOptions}
            placeholder={
              selectedMainCategoryIds.length
                ? 'Select one or more categories'
                : 'Select main category first'
            }
            loading={isCategoryLoading}
            disabled={!selectedMainCategoryIds.length}
          />
          <button
            type='button'
            onClick={() => setShowCategoryCreator((prev) => !prev)}
            disabled={!selectedMainCategoryIds.length}
            className='mt-3 inline-flex items-center gap-1 text-xs font-semibold text-cyan-700 transition hover:text-cyan-800 disabled:cursor-not-allowed disabled:text-muted-foreground'
          >
            <Plus className='h-3.5 w-3.5' />
            Can&apos;t find it? Create category
          </button>
          {showCategoryCreator ? (
            <div className='mt-3 rounded-2xl bg-background/40 p-4'>
              <div className='mt-3 flex flex-col gap-2 sm:flex-row'>
                <Input
                  value={newCategoryName}
                  onChange={(event) => setNewCategoryName(event.target.value)}
                  placeholder='Enter category name'
                  className='h-11 rounded-xl border-border bg-background'
                />
                <div className='flex gap-2'>
                  <Button
                    type='button'
                    onClick={handleCreateCategory}
                    disabled={isCreatingCategory || !selectedMainCategoryIds.length}
                    className='h-11 rounded-xl bg-cyan-600 px-4 text-white hover:bg-cyan-700'
                  >
                    {isCreatingCategory ? (
                      <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                    ) : null}
                    Create
                  </Button>
                  <Button
                    type='button'
                    variant='outline'
                    onClick={() => {
                      setShowCategoryCreator(false)
                      setNewCategoryName('')
                    }}
                    className='h-11 rounded-xl px-4'
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          ) : null}
          <div className='mt-2 flex flex-wrap gap-1.5'>
            {selectedCategoryLabels.map((label) => (
              <Badge
                key={label}
                variant='outline'
                className='border-cyan-500/20 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300'
              >
                {label}
              </Badge>
            ))}
          </div>
        </div>
      </div>
      </div>

      <div className={studioCardClass}>
        <StudioFieldLabel
          label='Subcategories'
          help='Use subcategories to narrow down product placement only when they genuinely apply.'
        />
        <SearchableMultiSelect
          values={formData.productSubCategories}
          onChange={(values) =>
            setFormData((prev: any) => ({
              ...prev,
              productSubCategories: values,
            }))
          }
          options={subCategoryOptions}
          placeholder={
            selectedCategoryIds.length
              ? 'Select one or more subcategories'
              : 'Select categories first'
          }
          disabled={!selectedCategoryIds.length}
          searchPlaceholder='Search subcategories...'
          emptyLabel={
            selectedCategoryIds.length
              ? 'No subcategories found.'
              : 'Select categories first.'
          }
        />
        <button
          type='button'
          onClick={() => setShowSubCategoryCreator((prev) => !prev)}
          disabled={!selectedCategoryIds.length}
          className='mt-3 inline-flex items-center gap-1 text-xs font-semibold text-cyan-700 transition hover:text-cyan-800 disabled:cursor-not-allowed disabled:text-muted-foreground'
        >
          <Plus className='h-3.5 w-3.5' />
          Can&apos;t find it? Create subcategory
        </button>
        {showSubCategoryCreator ? (
          <div className='mb-3 rounded-2xl bg-background/40 p-4'>
            <div className='mt-3 grid gap-2 sm:grid-cols-[minmax(0,220px)_minmax(0,1fr)_auto]'>
              <select
                value={newSubCategoryCategoryId}
                onChange={(event) => setNewSubCategoryCategoryId(event.target.value)}
                className='h-11 rounded-xl border border-input bg-background px-4 text-sm outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/15'
              >
                <option value=''>Select parent category</option>
                {selectedCategoryCreateOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <Input
                value={newSubCategoryName}
                onChange={(event) => setNewSubCategoryName(event.target.value)}
                placeholder='Enter subcategory name'
                className='h-11 rounded-xl border-border bg-background'
              />
              <div className='flex gap-2'>
                <Button
                  type='button'
                  onClick={handleCreateSubCategory}
                  disabled={isCreatingSubCategory || !selectedCategoryIds.length}
                  className='h-11 rounded-xl bg-cyan-600 px-4 text-white hover:bg-cyan-700'
                >
                  {isCreatingSubCategory ? (
                    <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                  ) : null}
                  Create
                </Button>
                <Button
                  type='button'
                  variant='outline'
                  onClick={() => {
                    setShowSubCategoryCreator(false)
                    setNewSubCategoryName('')
                    setNewSubCategoryCategoryId(selectedCategoryIds[0] || '')
                  }}
                  className='h-11 rounded-xl px-4'
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <div className={studioCardClass}>
        <div className='mb-5 flex items-center gap-2 text-sm font-semibold text-foreground'>
          <FileText className='h-4 w-4 text-rose-600' />
          Sales Copy
        </div>
        <StudioFieldLabel
          label='Short Description'
          required
          help='Keep this concise and easy to scan. Buyers should understand the product quickly.'
          action={
            <button
              type='button'
              onClick={generateWithAI}
              disabled={aiLoading.shortDescription}
              className={aiButtonClass}
            >
              {aiLoading.shortDescription ? (
                <Loader2 className='h-3.5 w-3.5 animate-spin' />
              ) : (
                <Sparkles className='h-3.5 w-3.5' />
              )}
              Generate
            </button>
          }
        />
        <textarea
          rows={4}
          value={formData.shortDescription}
          onChange={(event) =>
            setFormData((prev: any) => ({
              ...prev,
              shortDescription: event.target.value,
            }))
          }
          placeholder='Write a concise buyer-facing summary. This should quickly explain what the product is for.'
          className={studioTextareaClass}
        />
      </div>

      <div className={studioCardClass}>
        <StudioFieldLabel
          label='Description'
          required
          help='Use this for full product explanation, buyer confidence points, and important usage details.'
          action={
            <button
              type='button'
              onClick={generateDescription}
              disabled={aiLoading.description}
              className={aiButtonClass}
            >
              {aiLoading.description ? (
                <Loader2 className='h-3.5 w-3.5 animate-spin' />
              ) : (
                <Sparkles className='h-3.5 w-3.5' />
              )}
              Generate
            </button>
          }
        />
        <RichTextEditor
          value={formData.description}
          onChange={(nextValue) =>
            setFormData((prev: any) => ({ ...prev, description: nextValue }))
          }
          placeholder='Design the full product description exactly how it should appear on the storefront. Use headings, lists, emphasis, and hyperlinks inside the editor.'
          minHeight='min-h-[320px]'
          className='mt-3'
        />
        <p className='mt-3 text-xs leading-5 text-muted-foreground'>
          The formatting you create here is saved as rich content and rendered on product detail
          pages with the same headings, lists, emphasis, and hyperlinks.
        </p>
      </div>
    </div>
  )
}

export default Step1BasicInfo
