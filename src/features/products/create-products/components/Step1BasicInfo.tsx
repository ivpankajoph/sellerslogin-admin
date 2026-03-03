import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Check, ChevronsUpDown, Loader2, Sparkles } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import HyperlinkInsert from '@/components/product/HyperlinkInsert'
import { cn } from '@/lib/utils'
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

type SelectOption = {
  value: string
  label: string
}

interface Props {
  formData: any
  setFormData: React.Dispatch<React.SetStateAction<any>>
  mainCategories: any[]
  selectedMainCategoryId: string
  setSelectedMainCategoryId: React.Dispatch<React.SetStateAction<string>>
  categories: any[]
  selectedCategoryIds: string[]
  setSelectedCategoryIds: React.Dispatch<React.SetStateAction<string[]>>
  cities: any[]
  filteredSubcategories: any[]
  isMainCategoryLoading: boolean
  isCategoryLoading: boolean
  isCityLoading: boolean
  aiLoading: Record<string, boolean>
  generateWithAI: () => void
  generateDescription: () => void
}

const SearchableSelect: React.FC<{
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  placeholder: string
  disabled?: boolean
  loading?: boolean
}> = ({ value, onChange, options, placeholder, disabled, loading }) => {
  const [open, setOpen] = useState(false)
  const selectedOption = useMemo(
    () => options.find((opt) => opt.value === value),
    [options, value]
  )

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant='outline'
          role='combobox'
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            'h-11 w-full justify-between rounded-xl border-slate-300 bg-white text-left shadow-sm hover:bg-slate-50',
            !selectedOption && 'text-muted-foreground'
          )}
        >
          <span className='truncate'>
            {loading ? 'Loading...' : selectedOption?.label || placeholder}
          </span>
          <ChevronsUpDown className='h-4 w-4 shrink-0 opacity-50' />
        </Button>
      </PopoverTrigger>
      <PopoverContent className='w-[--radix-popover-trigger-width] p-0' align='start'>
        <Command>
          <CommandInput placeholder={`Search ${placeholder.toLowerCase()}...`} />
          <CommandList className='max-h-72'>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={`${option.label} ${option.value}`}
                  onSelect={() => {
                    onChange(option.value)
                    setOpen(false)
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      value === option.value ? 'opacity-100' : 'opacity-0'
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

const SearchableMultiSelect: React.FC<{
  values: string[]
  onChange: (values: string[]) => void
  options: SelectOption[]
  placeholder: string
  disabled?: boolean
  loading?: boolean
  searchPlaceholder?: string
  emptyLabel?: string
}> = ({
  values,
  onChange,
  options,
  placeholder,
  disabled,
  loading,
  searchPlaceholder,
  emptyLabel,
}) => {
  const [open, setOpen] = useState(false)

  const selectedLabels = useMemo(() => {
    const map = new Map(options.map((opt) => [opt.value, opt.label]))
    return values.map((id) => map.get(id)).filter(Boolean) as string[]
  }, [options, values])

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
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant='outline'
          role='combobox'
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            'h-11 w-full justify-between rounded-xl border-slate-300 bg-white text-left shadow-sm hover:bg-slate-50',
            !selectedLabels.length && 'text-muted-foreground'
          )}
        >
          <span className='truncate'>{loading ? 'Loading...' : buttonText}</span>
          <ChevronsUpDown className='h-4 w-4 shrink-0 opacity-50' />
        </Button>
      </PopoverTrigger>
      <PopoverContent className='w-[--radix-popover-trigger-width] p-0' align='start'>
        <Command>
          <CommandInput placeholder={searchPlaceholder || 'Search options...'} />
          <CommandList className='max-h-72'>
            <CommandEmpty>{emptyLabel || 'No options found.'}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => {
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

const aiButtonClass =
  'inline-flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60'

const Step1BasicInfo: React.FC<Props> = ({
  formData,
  setFormData,
  mainCategories,
  selectedMainCategoryId,
  setSelectedMainCategoryId,
  categories,
  selectedCategoryIds,
  setSelectedCategoryIds,
  cities,
  filteredSubcategories,
  isMainCategoryLoading,
  isCategoryLoading,
  isCityLoading,
  aiLoading,
  generateWithAI,
  generateDescription,
}) => {
  const [subCategorySearch, setSubCategorySearch] = useState('')
  const shortDescriptionRef = useRef<HTMLTextAreaElement>(null)
  const descriptionRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    setSubCategorySearch('')
  }, [selectedCategoryIds.join('|')])

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

  const cityOptions = useMemo(
    () =>
      cities
        .map((city: any) => ({
          value: city._id,
          label: [city.name, city.state].filter(Boolean).join(', '),
        }))
        .sort((a: SelectOption, b: SelectOption) =>
          a.label.localeCompare(b.label, undefined, { sensitivity: 'base' })
        ),
    [cities]
  )

  const visibleSubcategories = useMemo(() => {
    if (!subCategorySearch.trim()) return filteredSubcategories
    const search = subCategorySearch.trim().toLowerCase()
    return filteredSubcategories.filter((sub: any) => {
      const categoryLabel =
        sub.categoryName ||
        categoryNameById[String(sub.category_id)] ||
        String(sub.category_id || '')
      return `${sub.name || ''} ${sub.slug || ''} ${categoryLabel}`
        .toLowerCase()
        .includes(search)
    })
  }, [filteredSubcategories, subCategorySearch, categoryNameById])

  const selectedCategoryLabels = useMemo(() => {
    const map = new Map(categoryOptions.map((option) => [option.value, option.label]))
    return selectedCategoryIds.map((id) => map.get(id)).filter(Boolean) as string[]
  }, [categoryOptions, selectedCategoryIds])

  const selectedCityLabels = useMemo(() => {
    const map = new Map(cityOptions.map((option) => [option.value, option.label]))
    return (formData.availableCities || [])
      .map((id: string) => map.get(id))
      .filter(Boolean) as string[]
  }, [cityOptions, formData.availableCities])

  return (
    <section className='space-y-5'>
      <div className='rounded-2xl border border-cyan-200/70 bg-gradient-to-br from-cyan-50/80 via-white to-indigo-50/70 p-5'>
        <h2 className='text-2xl font-extrabold tracking-tight text-slate-900'>
          Basic Information
        </h2>
        <p className='mt-1 text-sm text-slate-600'>
          Define core product identity, category mapping, and sales copy.
        </p>
      </div>

      <div className='grid gap-4 sm:grid-cols-2'>
        <label className='rounded-xl border border-slate-200 bg-white/90 p-4 shadow-sm'>
          <span className='mb-2 block text-sm font-semibold text-slate-700'>
            Product Name *
          </span>
          <input
            type='text'
            value={formData.productName}
            onChange={(event) =>
              setFormData((prev: any) => ({
                ...prev,
                productName: event.target.value,
              }))
            }
            className='h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-200'
            required
          />
        </label>

        <label className='rounded-xl border border-slate-200 bg-white/90 p-4 shadow-sm'>
          <span className='mb-2 block text-sm font-semibold text-slate-700'>
            Brand *
          </span>
          <input
            type='text'
            value={formData.brand}
            onChange={(event) =>
              setFormData((prev: any) => ({
                ...prev,
                brand: event.target.value,
              }))
            }
            className='h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-200'
            required
          />
        </label>
      </div>

      <div className='grid gap-4 lg:grid-cols-2'>
        <div className='rounded-xl border border-slate-200 bg-white/90 p-4 shadow-sm'>
          <label className='mb-2 block text-sm font-semibold text-slate-700'>
            Main Category *
          </label>
          <SearchableSelect
            value={selectedMainCategoryId}
            onChange={(value) => {
              setSelectedMainCategoryId(value)
              setSelectedCategoryIds([])
              setFormData((prev: any) => ({
                ...prev,
                mainCategory: value,
                productCategory: '',
                productCategories: [],
                productSubCategories: [],
              }))
            }}
            options={mainCategoryOptions}
            placeholder='Select main category'
            loading={isMainCategoryLoading}
          />
        </div>

        <div className='rounded-xl border border-slate-200 bg-white/90 p-4 shadow-sm'>
          <label className='mb-2 block text-sm font-semibold text-slate-700'>
            Categories *
          </label>
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
              selectedMainCategoryId
                ? 'Select one or more categories'
                : 'Select main category first'
            }
            loading={isCategoryLoading}
            disabled={!selectedMainCategoryId}
          />
          <div className='mt-2 flex flex-wrap gap-1.5'>
            {selectedCategoryLabels.map((label) => (
              <Badge
                key={label}
                variant='outline'
                className='border-cyan-200 bg-cyan-100/70 text-cyan-800'
              >
                {label}
              </Badge>
            ))}
          </div>
        </div>
      </div>

      <div className='rounded-xl border border-slate-200 bg-white/90 p-4 shadow-sm'>
        <label className='mb-2 block text-sm font-semibold text-slate-700'>
          Available Cities *
        </label>
        <SearchableMultiSelect
          values={formData.availableCities || []}
          onChange={(values) =>
            setFormData((prev: any) => ({
              ...prev,
              availableCities: values,
            }))
          }
          options={cityOptions}
          placeholder='Select one or more cities'
          loading={isCityLoading}
          searchPlaceholder='Search cities...'
          emptyLabel='No cities found.'
        />
        <div className='mt-2 flex flex-wrap gap-1.5'>
          {selectedCityLabels.map((label) => (
            <Badge
              key={label}
              variant='outline'
              className='border-emerald-200 bg-emerald-100/70 text-emerald-800'
            >
              {label}
            </Badge>
          ))}
        </div>
      </div>

      <div className='rounded-xl border border-slate-200 bg-white/90 p-4 shadow-sm'>
        <label className='mb-2 block text-sm font-semibold text-slate-700'>
          Sub Categories
        </label>
        <Input
          value={subCategorySearch}
          onChange={(event) => setSubCategorySearch(event.target.value)}
          placeholder={
            selectedCategoryIds.length
              ? 'Search subcategories...'
              : 'Select categories first'
          }
          disabled={!selectedCategoryIds.length}
          className='mb-3 h-10 rounded-lg border-slate-300'
        />

        <div className='max-h-64 space-y-2 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50/70 p-3'>
          {!selectedCategoryIds.length ? (
            <p className='text-sm text-slate-500'>
              Select categories to see subcategories.
            </p>
          ) : visibleSubcategories.length === 0 ? (
            <p className='text-sm text-slate-500'>No subcategories found.</p>
          ) : (
            visibleSubcategories.map((sub: any) => {
              const categoryLabel =
                sub.categoryName ||
                categoryNameById[String(sub.category_id)] ||
                'Unknown Category'

              return (
                <label
                  key={sub._id}
                  className='flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 transition hover:border-cyan-300'
                >
                  <span className='flex items-center gap-2'>
                    <input
                      type='checkbox'
                      checked={formData.productSubCategories.includes(sub._id)}
                      onChange={(event) => {
                        setFormData((prev: any) => ({
                          ...prev,
                          productSubCategories: event.target.checked
                            ? [...prev.productSubCategories, sub._id]
                            : prev.productSubCategories.filter(
                                (id: string) => id !== sub._id
                              ),
                        }))
                      }}
                      className='h-4 w-4 rounded text-cyan-600 focus:ring-cyan-500'
                    />
                    <span className='text-sm font-medium text-slate-700'>{sub.name}</span>
                  </span>
                  <span className='text-xs font-medium text-slate-500'>
                    {categoryLabel}
                  </span>
                </label>
              )
            })
          )}
        </div>
      </div>

      <div className='rounded-xl border border-slate-200 bg-white/90 p-4 shadow-sm'>
        <label className='mb-2 flex items-center justify-between gap-3 text-sm font-semibold text-slate-700'>
          <span>Short Description *</span>
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
        </label>
        <textarea
          ref={shortDescriptionRef}
          value={formData.shortDescription}
          onChange={(event) =>
            setFormData((prev: any) => ({
              ...prev,
              shortDescription: event.target.value,
            }))
          }
          rows={3}
          className='w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-200'
          required
        />
        <HyperlinkInsert
          fieldLabel='Short Description'
          value={formData.shortDescription}
          textareaRef={shortDescriptionRef}
          onValueChange={(nextValue) =>
            setFormData((prev: any) => ({
              ...prev,
              shortDescription: nextValue,
            }))
          }
        />
      </div>

      <div className='rounded-xl border border-slate-200 bg-white/90 p-4 shadow-sm'>
        <label className='mb-2 flex items-center justify-between gap-3 text-sm font-semibold text-slate-700'>
          <span>Description *</span>
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
        </label>
        <textarea
          ref={descriptionRef}
          value={formData.description}
          onChange={(event) =>
            setFormData((prev: any) => ({ ...prev, description: event.target.value }))
          }
          rows={5}
          className='w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-200'
          required
        />
        <HyperlinkInsert
          fieldLabel='Description'
          value={formData.description}
          textareaRef={descriptionRef}
          onValueChange={(nextValue) =>
            setFormData((prev: any) => ({
              ...prev,
              description: nextValue,
            }))
          }
        />
      </div>
    </section>
  )
}

export default Step1BasicInfo
