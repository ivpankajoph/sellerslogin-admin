import React, { useEffect, useMemo, useState } from 'react'
import {
  Building2,
  Check,
  ChevronsUpDown,
  FileText,
  FolderOpen,
  Loader2,
  Plus,
  Sparkles,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
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
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { StudioFieldLabel, studioInputClass, studioTextareaClass } from './studio-ui'

type SelectOption = {
  value: string
  label: string
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



const panelClass =
  'rounded-[28px] border border-border bg-card p-5 shadow-[0_20px_60px_-48px_rgba(15,23,42,0.45)] sm:p-6 dark:shadow-[0_20px_60px_-48px_rgba(0,0,0,0.8)]'

const innerCardClass =
  'rounded-2xl border border-border bg-background/80 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]'

const aiButtonClass =
  'inline-flex items-center gap-1 rounded-full border border-cyan-500/25 bg-background px-4 py-2 text-xs font-semibold text-cyan-700 shadow-sm transition hover:border-cyan-500/40 hover:bg-cyan-500/10 disabled:cursor-not-allowed disabled:opacity-60 dark:text-cyan-200'

const helperTextClass = 'mt-2 text-xs leading-5 text-muted-foreground'

const linkButtonClass =
  'mt-3 inline-flex items-center gap-1 text-xs font-semibold text-cyan-700 transition hover:text-cyan-900 disabled:cursor-not-allowed disabled:text-muted-foreground dark:text-cyan-300 dark:hover:text-cyan-100'

const selectionChipClass =
  'inline-flex items-center gap-1.5 rounded-lg border border-cyan-500/25 bg-cyan-500/10 px-2.5 py-1 text-xs font-medium text-cyan-800 transition hover:border-cyan-500/40 hover:bg-cyan-500/15 dark:text-cyan-200'

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

      return { option, rank, index }
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

const SearchableMultiSelect: React.FC<{
  values: string[]
  onChange: (values: string[]) => void
  options: SelectOption[]
  placeholder: string
  disabled?: boolean
  loading?: boolean
  searchPlaceholder?: string
  emptyLabel?: string
}> = ({ values, onChange, options, placeholder, disabled, loading, searchPlaceholder, emptyLabel }) => {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  const selectedLabels = useMemo(() => {
    const map = new Map(options.map((opt) => [opt.value, opt.label]))
    return values.map((id) => map.get(id)).filter(Boolean) as string[]
  }, [options, values])

  const visibleOptions = useMemo(() => filterOptions(options, search), [options, search])

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
            'h-11 w-full justify-between rounded-xl border-border bg-background text-left text-foreground shadow-sm hover:bg-accent',
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
            <CommandEmpty>{emptyLabel || 'No options found.'}</CommandEmpty>
            <CommandGroup>
              {visibleOptions.map((option) => {
                const checked = values.includes(option.value)
                return (
                  <CommandItem
                    key={option.value}
                    value={`${option.label} ${option.value}`}
                    onMouseDown={(event) => event.preventDefault()}
                    onSelect={() => toggleValue(option.value)}
                  >
                    <Check
                      className={cn('mr-2 h-4 w-4', checked ? 'opacity-100' : 'opacity-0')}
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

const SelectedOptionsChips: React.FC<{
  values: string[]
  options: SelectOption[]
  onRemove: (value: string) => void
}> = ({ values, options, onRemove }) => {
  const selectedOptions = useMemo(() => {
    const optionMap = new Map(options.map((option) => [option.value, option.label]))
    return values
      .map((value) => {
        const label = optionMap.get(value)
        return label ? { value, label } : null
      })
      .filter(Boolean) as Array<{ value: string; label: string }>
  }, [options, values])

  if (!selectedOptions.length) return null

  return (
    <div className='mt-2 flex flex-wrap gap-2'>
      {selectedOptions.map((option) => (
        <span key={option.value} className={selectionChipClass}>
          <span>{option.label}</span>
          <button
            type='button'
            onClick={() => onRemove(option.value)}
            className='inline-flex h-4 w-4 items-center justify-center rounded-full text-cyan-700 transition hover:bg-cyan-500/15 hover:text-cyan-900 dark:text-cyan-200 dark:hover:text-white'
            aria-label={`Remove ${option.label}`}
          >
            <X className='h-3 w-3' />
          </button>
        </span>
      ))}
    </div>
  )
}

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
        .map((cat: any) => ({ value: cat._id, label: cat.name }))
        .sort((a: SelectOption, b: SelectOption) =>
          a.label.localeCompare(b.label, undefined, { sensitivity: 'base' })
        ),
    [mainCategories]
  )

  const categoryOptions = useMemo(
    () =>
      categories
        .map((cat: any) => ({ value: cat._id, label: cat.name }))
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

  const categoryMetaById = useMemo(
    () =>
      categories.reduce((acc: Record<string, any>, cat: any) => {
        acc[String(cat?._id || '')] = cat
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

  const selectedCategoryCreateOptions = useMemo(
    () => categoryOptions.filter((option) => selectedCategoryIds.includes(option.value)),
    [categoryOptions, selectedCategoryIds]
  )

  const subcategoryIdsByCategoryId = useMemo(
    () =>
      filteredSubcategories.reduce((acc: Record<string, string[]>, subcategory: any) => {
        const categoryId = String(subcategory?.category_id || '')
        if (!categoryId) return acc
        acc[categoryId] = [...(acc[categoryId] || []), String(subcategory?._id || '')]
        return acc
      }, {}),
    [filteredSubcategories]
  )

  // const completionItems = [
  //   {
  //     label: 'Product identity',
  //     detail: formData.productName?.trim() ? formData.productName : 'Add a clear product name',
  //     done: Boolean(formData.productName?.trim()),
  //   },
  //   {
  //     label: 'Category mapping',
  //     detail:
  //       selectedMainCategoryIds.length || selectedCategoryIds.length || formData.productSubCategories.length
  //         ? `${selectedMainCategoryIds.length} main, ${selectedCategoryIds.length} category, ${formData.productSubCategories.length} subcategory selected`
  //         : 'Choose where this product should appear',
  //     done: Boolean(selectedMainCategoryIds.length || selectedCategoryIds.length),
  //   },
  //   {
  //     label: 'Buyer-facing copy',
  //     detail: formData.shortDescription?.trim()
  //       ? 'Short description added'
  //       : 'Write a short summary for buyers',
  //     done: Boolean(formData.shortDescription?.trim() || formData.description?.trim()),
  //   },
  // ]

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

  const applyMainCategorySelection = (nextMainCategoryIds: string[]) => {
    const removedMainCategoryIds = selectedMainCategoryIds.filter(
      (id) => !nextMainCategoryIds.includes(id)
    )

    const removedCategoryIds = selectedCategoryIds.filter((categoryId) => {
      const category = categoryMetaById[categoryId]
      const mainCategoryId = String(
        category?.main_category_id || category?.mainCategoryId || ''
      )

      return removedMainCategoryIds.includes(mainCategoryId)
    })

    const removedSubcategoryIds = new Set(
      removedCategoryIds.flatMap((categoryId) => subcategoryIdsByCategoryId[categoryId] || [])
    )

    const nextCategoryIds = selectedCategoryIds.filter(
      (categoryId) => !removedCategoryIds.includes(categoryId)
    )
    const nextSubcategoryIds = formData.productSubCategories.filter(
      (subcategoryId: string) => !removedSubcategoryIds.has(subcategoryId)
    )

    setSelectedMainCategoryIds(nextMainCategoryIds)
    setSelectedCategoryIds(nextCategoryIds)
    setFormData((prev: any) => ({
      ...prev,
      mainCategory: nextMainCategoryIds[0] || '',
      mainCategories: nextMainCategoryIds,
      productCategory: nextCategoryIds[0] || '',
      productCategories: nextCategoryIds,
      productSubCategories: nextSubcategoryIds,
    }))
  }

  return (
    <div className='space-y-6'>
      <section className={panelClass}>
        <div className='mb-5 flex items-start gap-4'>
          <div className='flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-500/20 bg-cyan-500/10'>
            <Building2 className='h-5 w-5 text-cyan-700 dark:text-cyan-300' />
          </div>
          <div className='space-y-1'>
            <p className='text-xs font-semibold uppercase tracking-[0.2em] text-cyan-700 dark:text-cyan-300'>
              Product Identity
            </p>
            <h3 className='text-xl font-semibold tracking-tight text-foreground'>
              Basic details buyers see first
            </h3>
            {/* <p className='max-w-3xl text-sm leading-6 text-muted-foreground'>
              These two fields define how the product appears in the catalog and on the product page. Keep the name precise and the brand optional.
            </p> */}
          </div>
        </div>

        <div className='grid gap-4 lg:grid-cols-2'>
          <div className={innerCardClass}>
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
              placeholder='Example: Stainless Steel Water Bottle 1L'
              required
            />
            <p className={helperTextClass}>
              Keep it clear and searchable. Avoid vendor-only naming.
            </p>
          </div>

          <div className={innerCardClass}>
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
            <p className={helperTextClass}>If the product is unbranded, you can leave this blank.</p>
          </div>
        </div>
      </section>

      <section className={panelClass}>
        <div className='mb-5 flex items-start gap-4'>
          <div className='flex h-11 w-11 items-center justify-center rounded-2xl border border-indigo-500/20 bg-indigo-500/10'>
            <FolderOpen className='h-5 w-5 text-indigo-700 dark:text-indigo-300' />
          </div>
          <div className='space-y-1'>
            <p className='text-xs font-semibold uppercase tracking-[0.2em] text-indigo-700 dark:text-indigo-300'>
              Category Mapping
            </p>
            <h3 className='text-xl font-semibold tracking-tight text-foreground'>
              Place the product where buyers expect to find it
            </h3>
            
          </div>
        </div>

       

        <div className='grid gap-4 xl:grid-cols-2'>
          <div className={innerCardClass}>
            <StudioFieldLabel
              label='Main Category'
              required
              help='Choose the high-level catalog bucket first so the rest of the form can adapt correctly.'
            />
            <SearchableMultiSelect
              values={selectedMainCategoryIds}
              onChange={applyMainCategorySelection}
              options={mainCategoryOptions}
              placeholder='Select one or more main categories'
              loading={isMainCategoryLoading}
            />
            <SelectedOptionsChips
              values={selectedMainCategoryIds}
              options={mainCategoryOptions}
              onRemove={(value) => {
                const nextValues = selectedMainCategoryIds.filter((id) => id !== value)
                applyMainCategorySelection(nextValues)
              }}
            />
            <p className={helperTextClass}>Main category controls the category list shown below.</p>
            <button
              type='button'
              onClick={() => setShowMainCategoryCreator((prev) => !prev)}
              className={linkButtonClass}
            >
              <Plus className='h-3.5 w-3.5' />
              Can&apos;t find it? Create main category
            </button>
            {showMainCategoryCreator ? (
              <div className='mt-3 rounded-2xl border border-cyan-500/20 bg-background p-4'>
                <p className='text-sm font-semibold text-foreground'>Create a new main category</p>
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

          <div className={innerCardClass}>
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
            <SelectedOptionsChips
              values={selectedCategoryIds}
              options={categoryOptions}
              onRemove={(value) => {
                const nextValues = selectedCategoryIds.filter((id) => id !== value)
                setSelectedCategoryIds(nextValues)
                setFormData((prev: any) => ({
                  ...prev,
                  productCategory: nextValues[0] || '',
                  productCategories: nextValues,
                  productSubCategories: [],
                }))
              }}
            />
            <p className={helperTextClass}>Choose only the categories that genuinely match this product.</p>
            <button
              type='button'
              onClick={() => setShowCategoryCreator((prev) => !prev)}
              disabled={!selectedMainCategoryIds.length}
              className={linkButtonClass}
            >
              <Plus className='h-3.5 w-3.5' />
              Can&apos;t find it? Create category
            </button>
            {showCategoryCreator ? (
              <div className='mt-3 rounded-2xl border border-cyan-500/20 bg-background p-4'>
                <p className='text-sm font-semibold text-foreground'>Create a new category</p>
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
          </div>
        </div>

        <div className='mt-4'>
          <div className={innerCardClass}>
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
                selectedCategoryIds.length ? 'No subcategories found.' : 'Select categories first.'
              }
            />
            <SelectedOptionsChips
              values={formData.productSubCategories}
              options={subCategoryOptions}
              onRemove={(value) =>
                setFormData((prev: any) => ({
                  ...prev,
                  productSubCategories: prev.productSubCategories.filter((id: string) => id !== value),
                }))
              }
            />
            <p className={helperTextClass}>
              Subcategories are optional, but useful when buyers expect a more specific product path.
            </p>
            <button
              type='button'
              onClick={() => setShowSubCategoryCreator((prev) => !prev)}
              disabled={!selectedCategoryIds.length}
              className={linkButtonClass}
            >
              <Plus className='h-3.5 w-3.5' />
              Can&apos;t find it? Create subcategory
            </button>
            {showSubCategoryCreator ? (
              <div className='mt-3 rounded-2xl border border-cyan-500/20 bg-background p-4'>
                <p className='text-sm font-semibold text-foreground'>Create a new subcategory</p>
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
        </div>
      </section>

      <section className={panelClass}>
        <div className='mb-5 flex items-start gap-4'>
          <div className='flex h-11 w-11 items-center justify-center rounded-2xl border border-rose-500/20 bg-rose-500/10'>
            <FileText className='h-5 w-5 text-rose-700 dark:text-rose-300' />
          </div>
          <div className='space-y-1'>
            <p className='text-xs font-semibold uppercase tracking-[0.2em] text-rose-700 dark:text-rose-300'>
              Sales Copy
            </p>
            <h3 className='text-xl font-semibold tracking-tight text-foreground'>
              Write the information buyers will read before purchasing
            </h3>
           
          </div>
        </div>

        <div className='space-y-4'>
          <div className={innerCardClass}>
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
                  Generate with AI
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
              placeholder='Example: Durable stainless steel bottle with leak-proof lid, easy-carry handle, and 1 litre capacity.'
              className={studioTextareaClass}
            />
            <p className={helperTextClass}>Aim for 1-2 sentences. This is useful for quick catalog scanning.</p>
          </div>

          <div className={innerCardClass}>
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
                  Generate with AI
                </button>
              }
            />
            <RichTextEditor
              value={formData.description}
              onChange={(nextValue) =>
                setFormData((prev: any) => ({ ...prev, description: nextValue }))
              }
              placeholder='Write the full product description here. Include features, materials, sizes, benefits, and any usage or care information.'
              minHeight='min-h-[320px]'
              className='mt-3'
            />
           
          </div>
        </div>
      </section>
    </div>
  )
}

export default Step1BasicInfo


