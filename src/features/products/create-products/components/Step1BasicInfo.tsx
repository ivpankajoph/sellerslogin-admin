import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Check, ChevronsUpDown, Loader2, Plus, Sparkles, X } from 'lucide-react'
import { toast } from 'sonner'
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
  CommandSeparator,
} from '@/components/ui/command'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

type SelectOption = {
  value: string
  label: string
}

const INDIA_STATES = [
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
  'Andaman and Nicobar Islands',
  'Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi',
  'Jammu and Kashmir',
  'Ladakh',
  'Lakshadweep',
  'Puducherry',
]

const DEFAULT_COUNTRIES = [
  'India',
  'United States',
  'United Kingdom',
  'Canada',
  'Australia',
  'United Arab Emirates',
  'Singapore',
]

const normalizeSearchText = (value: string) =>
  String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()

const toTitleCase = (value: string) =>
  String(value || '')
    .trimStart()
    .replace(/\s+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())

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
  onCreateMainCategory: (name: string) => Promise<void>
  onCreateCategory: (name: string) => Promise<void>
  onCreateSubcategory: (payload: { name: string; categoryId: string }) => Promise<void>
  onDiscoverStateCities: (state: string, country: string) => Promise<string[]>
  onCreateCities: (payload: {
    name: string
    state: string
    country: string
    cities: string[]
  }) => Promise<{
    message?: string
    cityIds: string[]
  }>
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
  const [search, setSearch] = useState('')
  const selectedOption = useMemo(
    () => options.find((opt) => opt.value === value),
    [options, value]
  )
  const visibleOptions = useMemo(
    () => filterOptions(options, search),
    [options, search]
  )

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
        <Command shouldFilter={false}>
          <CommandInput
            value={search}
            onValueChange={setSearch}
            placeholder={`Search ${placeholder.toLowerCase()}...`}
          />
          <CommandList key={search || 'all'} className='max-h-72'>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup>
              {visibleOptions.map((option) => (
                <CommandItem
                  key={option.value}
                  value={`${option.label} ${option.value}`}
                  onSelect={() => {
                    onChange(option.value)
                    setSearch('')
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
            'h-11 w-full justify-between rounded-xl border-slate-300 bg-white text-left shadow-sm hover:bg-slate-50',
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
  onCreateMainCategory,
  onCreateCategory,
  onCreateSubcategory,
  onDiscoverStateCities,
  onCreateCities,
}) => {
  const [subCategorySearch, setSubCategorySearch] = useState('')
  const [showMainCategoryCreator, setShowMainCategoryCreator] = useState(false)
  const [showCategoryCreator, setShowCategoryCreator] = useState(false)
  const [showSubCategoryCreator, setShowSubCategoryCreator] = useState(false)
  const [showCityCreator, setShowCityCreator] = useState(false)
  const [newMainCategoryName, setNewMainCategoryName] = useState('')
  const [newCategoryName, setNewCategoryName] = useState('')
  const [newSubCategoryName, setNewSubCategoryName] = useState('')
  const [newCityName, setNewCityName] = useState('')
  const [newCityState, setNewCityState] = useState('')
  const [newCityCountry, setNewCityCountry] = useState('India')
  const [stateCityOptions, setStateCityOptions] = useState<string[]>([])
  const [selectedStateCities, setSelectedStateCities] = useState<string[]>([])
  const [stateCitySearch, setStateCitySearch] = useState('')
  const [isLoadingStateCities, setIsLoadingStateCities] = useState(false)
  const [newSubCategoryCategoryId, setNewSubCategoryCategoryId] = useState('')
  const [isCreatingMainCategory, setIsCreatingMainCategory] = useState(false)
  const [isCreatingCategory, setIsCreatingCategory] = useState(false)
  const [isCreatingSubCategory, setIsCreatingSubCategory] = useState(false)
  const [isCreatingCity, setIsCreatingCity] = useState(false)
  const shortDescriptionRef = useRef<HTMLTextAreaElement>(null)
  const descriptionRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    setSubCategorySearch('')
  }, [selectedCategoryIds.join('|')])

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

  const selectedCategoryCreateOptions = useMemo(
    () => categoryOptions.filter((option) => selectedCategoryIds.includes(option.value)),
    [categoryOptions, selectedCategoryIds]
  )

  const selectedCities = useMemo<Array<{ id: string; label: string }>>(() => {
    const map = new Map(cityOptions.map((option) => [option.value, option.label]))
    return (formData.availableCities || [])
      .map((id: string) => ({
        id,
        label: map.get(id),
      }))
      .filter((item: { id: string; label: string | undefined }): item is { id: string; label: string } =>
        Boolean(item.label)
      )
  }, [cityOptions, formData.availableCities])

  const allCityIds = useMemo(
    () => cityOptions.map((option) => option.value),
    [cityOptions]
  )

  const hasAllCitiesSelected = useMemo(() => {
    if (!allCityIds.length) return false
    const selectedCityIds = new Set((formData.availableCities || []).map((id: string) => String(id)))
    return allCityIds.every((cityId) => selectedCityIds.has(cityId))
  }, [allCityIds, formData.availableCities])

  const stateOptions = useMemo(() => {
    const dynamicStates = cities
      .map((city: any) => String(city?.state || '').trim())
      .filter(Boolean)

    return Array.from(new Set([...INDIA_STATES, ...dynamicStates])).sort((a, b) =>
      a.localeCompare(b)
    )
  }, [cities])

  const countryOptions = useMemo(() => {
    const dynamicCountries = cities
      .map((city: any) => String(city?.country || '').trim())
      .filter(Boolean)
    const allCountries = Array.from(new Set([...DEFAULT_COUNTRIES, ...dynamicCountries]))
    const india = allCountries.find((country) => country.toLowerCase() === 'india')
    const rest = allCountries.filter((country) => country.toLowerCase() !== 'india')

    return india ? [india, ...rest.sort((a, b) => a.localeCompare(b))] : rest
  }, [cities])

  const filteredStateCityOptions = useMemo(() => {
    const search = stateCitySearch.trim().toLowerCase()
    if (!search) return stateCityOptions
    return stateCityOptions.filter((cityName) =>
      cityName.toLowerCase().includes(search)
    )
  }, [stateCityOptions, stateCitySearch])

  const resetCityCreator = () => {
    setShowCityCreator(false)
    setNewCityName('')
    setNewCityState('')
    setNewCityCountry('India')
    setStateCityOptions([])
    setSelectedStateCities([])
    setStateCitySearch('')
  }

  const openCityCreator = (prefillName = '') => {
    const safeName = String(prefillName || '').trim()
    setShowCityCreator(true)
    if (safeName) {
      setNewCityName(toTitleCase(safeName.split(',')[0] || safeName))
    }
  }

  useEffect(() => {
    if (!showCityCreator) return
    if (!newCityState) {
      setStateCityOptions([])
      setSelectedStateCities([])
      setStateCitySearch('')
      return
    }

    let isMounted = true
    setIsLoadingStateCities(true)

    onDiscoverStateCities(newCityState, newCityCountry)
      .then((options) => {
        if (!isMounted) return
        setStateCityOptions(options)
        setSelectedStateCities((prev) => {
          const optionSet = new Set(options.map((item) => item.toLowerCase()))
          return prev.filter((item) => optionSet.has(item.toLowerCase()))
        })
      })
      .catch((error: any) => {
        if (!isMounted) return
        toast.error(error?.message || 'Failed to fetch cities for selected state.')
        setStateCityOptions([])
        setSelectedStateCities([])
      })
      .finally(() => {
        if (isMounted) {
          setIsLoadingStateCities(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [newCityCountry, newCityState, onDiscoverStateCities, showCityCreator])

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
    if (!selectedMainCategoryId) {
      toast.error('Select a main category first.')
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

  const handleCreateCity = async () => {
    const trimmedName = newCityName.trim()
    const bulkCities = Array.from(
      new Set(
        selectedStateCities
          .map((cityName) => String(cityName || '').trim())
          .filter(Boolean)
      )
    )

    if (!trimmedName && !bulkCities.length) {
      toast.error('City name is required.')
      return
    }

    setIsCreatingCity(true)
    try {
      const response = await onCreateCities({
        name: trimmedName,
        state: newCityState,
        country: newCityCountry,
        cities: bulkCities,
      })
      setFormData((prev: any) => ({
        ...prev,
        availableCities: Array.from(
          new Set([...(prev.availableCities || []), ...(response.cityIds || [])])
        ),
      }))

      toast.success(
        response?.message ||
          (bulkCities.length
            ? 'Cities added to your list and selected.'
            : 'City created and selected.')
      )
      resetCityCreator()
    } catch (error: any) {
      toast.error(error?.message || 'Failed to create city.')
    } finally {
      setIsCreatingCity(false)
    }
  }

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
          <button
            type='button'
            onClick={() => setShowMainCategoryCreator((prev) => !prev)}
            className='mt-3 inline-flex items-center gap-1 text-xs font-semibold text-cyan-700 transition hover:text-cyan-800'
          >
            <Plus className='h-3.5 w-3.5' />
            Can&apos;t find it? Create main category
          </button>
          {showMainCategoryCreator ? (
            <div className='mt-3 rounded-xl border border-dashed border-cyan-300 bg-cyan-50/60 p-3'>
              <p className='text-xs text-slate-600'>
                Create a new main category directly in the database and select it automatically.
              </p>
              <div className='mt-3 flex flex-col gap-2 sm:flex-row'>
                <Input
                  value={newMainCategoryName}
                  onChange={(event) => setNewMainCategoryName(event.target.value)}
                  placeholder='Enter main category name'
                  className='h-10 rounded-lg border-slate-300 bg-white'
                />
                <div className='flex gap-2'>
                  <Button
                    type='button'
                    onClick={handleCreateMainCategory}
                    disabled={isCreatingMainCategory}
                    className='h-10 rounded-lg bg-cyan-600 px-4 text-white hover:bg-cyan-700'
                  >
                    {isCreatingMainCategory ? (
                      <Loader2 className='h-4 w-4 animate-spin' />
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
                    className='h-10 rounded-lg border-slate-300 bg-white px-4'
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          ) : null}
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
          <button
            type='button'
            onClick={() => setShowCategoryCreator((prev) => !prev)}
            disabled={!selectedMainCategoryId}
            className='mt-3 inline-flex items-center gap-1 text-xs font-semibold text-cyan-700 transition hover:text-cyan-800 disabled:cursor-not-allowed disabled:text-slate-400'
          >
            <Plus className='h-3.5 w-3.5' />
            Can&apos;t find it? Create category
          </button>
          {showCategoryCreator ? (
            <div className='mt-3 rounded-xl border border-dashed border-cyan-300 bg-cyan-50/60 p-3'>
              <p className='text-xs text-slate-600'>
                This category will be created under the selected main category and added to your current selection.
              </p>
              <div className='mt-3 flex flex-col gap-2 sm:flex-row'>
                <Input
                  value={newCategoryName}
                  onChange={(event) => setNewCategoryName(event.target.value)}
                  placeholder='Enter category name'
                  className='h-10 rounded-lg border-slate-300 bg-white'
                />
                <div className='flex gap-2'>
                  <Button
                    type='button'
                    onClick={handleCreateCategory}
                    disabled={isCreatingCategory || !selectedMainCategoryId}
                    className='h-10 rounded-lg bg-cyan-600 px-4 text-white hover:bg-cyan-700'
                  >
                    {isCreatingCategory ? (
                      <Loader2 className='h-4 w-4 animate-spin' />
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
                    className='h-10 rounded-lg border-slate-300 bg-white px-4'
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
          onSelectAll={() =>
            setFormData((prev: any) => ({
              ...prev,
              availableCities: allCityIds,
            }))
          }
          selectAllLabel='Select all cities'
          selectAllDisabled={isCityLoading || !allCityIds.length || hasAllCitiesSelected}
          onCreateOption={openCityCreator}
          createOptionLabel="Can't find it? Create city"
        />
        <div className='mt-2 flex flex-wrap items-center justify-between gap-2'>
          <span className='text-xs text-slate-500'>
            {selectedCities.length} of {cityOptions.length} cities selected
          </span>
          <div className='flex flex-wrap items-center gap-3'>
            <button
              type='button'
              onClick={() => openCityCreator()}
              className='text-xs font-semibold text-cyan-700 transition hover:text-cyan-800'
            >
              Can&apos;t find it? Create city
            </button>
            {selectedCities.length ? (
              <button
                type='button'
                onClick={() =>
                  setFormData((prev: any) => ({
                    ...prev,
                    availableCities: [],
                  }))
                }
                className='text-xs font-medium text-slate-500 transition hover:text-slate-700'
              >
                Clear all cities
              </button>
            ) : null}
          </div>
        </div>
        {selectedCities.length ? (
          <div className='mt-2 space-y-2'>
              <div className='flex flex-wrap gap-1.5'>
              {selectedCities.map((city: { id: string; label: string }) => (
                <Badge
                  key={city.id}
                  variant='outline'
                  className='border-emerald-200 bg-emerald-100/70 pr-1 text-emerald-800'
                >
                  <span>{city.label}</span>
                  <button
                    type='button'
                    onClick={() =>
                      setFormData((prev: any) => ({
                        ...prev,
                        availableCities: (prev.availableCities || []).filter(
                          (id: string) => id !== city.id
                        ),
                      }))
                    }
                    className='rounded-full p-0.5 text-emerald-700 transition hover:bg-emerald-200'
                    aria-label={`Remove ${city.label}`}
                    title={`Remove ${city.label}`}
                  >
                    <X className='h-3 w-3' />
                  </button>
                </Badge>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <Dialog
        open={showCityCreator}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            resetCityCreator()
            return
          }

          setShowCityCreator(true)
        }}
      >
        <DialogContent className='max-h-[90vh] overflow-y-auto sm:max-w-2xl'>
          <DialogHeader>
            <DialogTitle>Create City</DialogTitle>
            <DialogDescription>
              Add a city to your private city list without leaving the product form.
            </DialogDescription>
          </DialogHeader>

          <div className='space-y-4'>
            <div>
              <label className='mb-1 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500'>
                City Name
              </label>
              <Input
                value={newCityName}
                onChange={(event) => setNewCityName(toTitleCase(event.target.value))}
                placeholder={
                  selectedStateCities.length
                    ? 'Bulk mode active: using selected cities below'
                    : 'e.g. Bangalore'
                }
                disabled={selectedStateCities.length > 0}
              />
              <p className='mt-1 text-xs text-slate-500'>
                Enter one city manually, or select multiple cities from the selected state.
              </p>
            </div>

            <div className='grid gap-3 sm:grid-cols-2'>
              <div>
                <label className='mb-1 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500'>
                  State
                </label>
                <select
                  value={newCityState}
                  onChange={(event) => setNewCityState(event.target.value)}
                  className='h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-200'
                >
                  <option value=''>Select state</option>
                  {stateOptions.map((state) => (
                    <option key={state} value={state}>
                      {state}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className='mb-1 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500'>
                  Country
                </label>
                <select
                  value={newCityCountry}
                  onChange={(event) => setNewCityCountry(event.target.value)}
                  className='h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-200'
                >
                  {countryOptions.map((country) => (
                    <option key={country} value={country}>
                      {country}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <div className='mb-1 flex items-center justify-between gap-2'>
                <label className='block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500'>
                  Cities In Selected State
                </label>
                <div className='flex gap-1'>
                  <Button
                    type='button'
                    size='sm'
                    variant='outline'
                    onClick={() =>
                      setSelectedStateCities((prev) => {
                        const merged = new Set([...prev, ...filteredStateCityOptions])
                        return Array.from(merged)
                      })
                    }
                    disabled={!filteredStateCityOptions.length || isLoadingStateCities}
                  >
                    Select All
                  </Button>
                  <Button
                    type='button'
                    size='sm'
                    variant='outline'
                    onClick={() => setSelectedStateCities([])}
                    disabled={!selectedStateCities.length}
                  >
                    Clear
                  </Button>
                </div>
              </div>

              <Input
                value={stateCitySearch}
                onChange={(event) => setStateCitySearch(event.target.value)}
                placeholder='Search state cities...'
                disabled={!newCityState || isLoadingStateCities}
                className='mb-2'
              />

              <div className='max-h-[220px] space-y-1 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-2 text-sm'>
                {isLoadingStateCities ? (
                  <div className='flex items-center gap-2 py-2 text-xs text-slate-500'>
                    <Loader2 className='h-4 w-4 animate-spin' />
                    Loading state cities...
                  </div>
                ) : !filteredStateCityOptions.length ? (
                  <p className='py-2 text-xs text-slate-500'>
                    {newCityState ? 'No cities found.' : 'Select state to load cities.'}
                  </p>
                ) : (
                  filteredStateCityOptions.map((cityName) => {
                    const checked = selectedStateCities.includes(cityName)
                    return (
                      <label
                        key={cityName}
                        className='flex cursor-pointer items-center gap-2 rounded px-1 py-1 hover:bg-white'
                      >
                        <input
                          type='checkbox'
                          checked={checked}
                          onChange={(event) =>
                            setSelectedStateCities((prev) =>
                              event.target.checked
                                ? [...prev, cityName]
                                : prev.filter((item) => item !== cityName)
                            )
                          }
                          className='h-4 w-4 rounded text-cyan-600 focus:ring-cyan-500'
                        />
                        <span>{cityName}</span>
                      </label>
                    )
                  })
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type='button'
              variant='outline'
              onClick={resetCityCreator}
              disabled={isCreatingCity}
            >
              Cancel
            </Button>
            <Button
              type='button'
              onClick={handleCreateCity}
              disabled={isCreatingCity}
              className='bg-cyan-600 text-white hover:bg-cyan-700'
            >
              {isCreatingCity ? <Loader2 className='h-4 w-4 animate-spin' /> : null}
              {selectedStateCities.length ? 'Add Selected Cities' : 'Create City'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
        <button
          type='button'
          onClick={() => setShowSubCategoryCreator((prev) => !prev)}
          disabled={!selectedCategoryIds.length}
          className='mb-3 inline-flex items-center gap-1 text-xs font-semibold text-cyan-700 transition hover:text-cyan-800 disabled:cursor-not-allowed disabled:text-slate-400'
        >
          <Plus className='h-3.5 w-3.5' />
          Can&apos;t find it? Create subcategory
        </button>
        {showSubCategoryCreator ? (
          <div className='mb-3 rounded-xl border border-dashed border-cyan-300 bg-cyan-50/60 p-3'>
            <p className='text-xs text-slate-600'>
              Create a subcategory under one of the selected categories and add it to this product immediately.
            </p>
            <div className='mt-3 grid gap-2 sm:grid-cols-[minmax(0,220px)_minmax(0,1fr)_auto]'>
              <select
                value={newSubCategoryCategoryId}
                onChange={(event) => setNewSubCategoryCategoryId(event.target.value)}
                className='h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-200'
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
                className='h-10 rounded-lg border-slate-300 bg-white'
              />
              <div className='flex gap-2'>
                <Button
                  type='button'
                  onClick={handleCreateSubCategory}
                  disabled={isCreatingSubCategory || !selectedCategoryIds.length}
                  className='h-10 rounded-lg bg-cyan-600 px-4 text-white hover:bg-cyan-700'
                >
                  {isCreatingSubCategory ? (
                    <Loader2 className='h-4 w-4 animate-spin' />
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
                  className='h-10 rounded-lg border-slate-300 bg-white px-4'
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        ) : null}

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
