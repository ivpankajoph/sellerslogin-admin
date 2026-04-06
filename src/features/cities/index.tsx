import { useCallback, useEffect, useMemo, useState } from 'react'
import type { AppDispatch, RootState } from '@/store'
import { setUser } from '@/store/slices/authSlice'
import { fetchVendorProfile } from '@/store/slices/vendor/profileSlice'
import {
  Check,
  ChevronsUpDown,
  Globe2,
  Info,
  Loader2,
  MapPin,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  X,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useDispatch, useSelector } from 'react-redux'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
} from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Switch } from '@/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { ServerPagination } from '@/components/data-table/server-pagination'
import { TablePageHeader } from '@/components/data-table/table-page-header'
import { TableShell } from '@/components/data-table/table-shell'
import { Main } from '@/components/layout/main'

type CityRow = {
  _id: string
  name: string
  slug: string
  state?: string
  country?: string
  locationType?: 'city' | 'country'
  isActive: boolean
  createdBy?: string
  canEdit?: boolean
  canDelete?: boolean
  createdAt?: string
}

type CountryOption = {
  code: string
  name: string
  dialCode?: string
  flagUrl?: string
  states?: string[]
}

type CountryMeta = {
  code: string
  flag: string
  flagUrl: string
  name: string
}

type MultiSelectOption = {
  value: string
  label: string
  flag?: string
  meta?: string
}

type LocationManagerView = 'cities' | 'countries'

type QueuedCity = {
  name: string
  state: string
  country: string
}

type CountrySummaryRow = {
  activeCityCount: number
  cityCount: number
  country: CountryMeta
  defaultLocationId: string
  stateCount: number
}

const API_BASE = String(import.meta.env.VITE_PUBLIC_API_URL || '').replace(
  /\/$/,
  ''
)

const FALLBACK_COUNTRY_CONFIGS: CountryOption[] = [
  {
    code: 'IN',
    name: 'India',
    states: [
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
    ],
  },
  {
    code: 'US',
    name: 'United States',
    states: [
      'Alabama',
      'Alaska',
      'Arizona',
      'Arkansas',
      'California',
      'Colorado',
      'Connecticut',
      'Delaware',
      'Florida',
      'Georgia',
      'Hawaii',
      'Idaho',
      'Illinois',
      'Indiana',
      'Iowa',
      'Kansas',
      'Kentucky',
      'Louisiana',
      'Maine',
      'Maryland',
      'Massachusetts',
      'Michigan',
      'Minnesota',
      'Mississippi',
      'Missouri',
      'Montana',
      'Nebraska',
      'Nevada',
      'New Hampshire',
      'New Jersey',
      'New Mexico',
      'New York',
      'North Carolina',
      'North Dakota',
      'Ohio',
      'Oklahoma',
      'Oregon',
      'Pennsylvania',
      'Rhode Island',
      'South Carolina',
      'South Dakota',
      'Tennessee',
      'Texas',
      'Utah',
      'Vermont',
      'Virginia',
      'Washington',
      'West Virginia',
      'Wisconsin',
      'Wyoming',
    ],
  },
  {
    code: 'GB',
    name: 'United Kingdom',
    states: ['England', 'Scotland', 'Wales', 'Northern Ireland'],
  },
  {
    code: 'CA',
    name: 'Canada',
    states: [
      'Alberta',
      'British Columbia',
      'Manitoba',
      'New Brunswick',
      'Newfoundland and Labrador',
      'Northwest Territories',
      'Nova Scotia',
      'Nunavut',
      'Ontario',
      'Prince Edward Island',
      'Quebec',
      'Saskatchewan',
      'Yukon',
    ],
  },
  {
    code: 'AU',
    name: 'Australia',
    states: [
      'Australian Capital Territory',
      'New South Wales',
      'Northern Territory',
      'Queensland',
      'South Australia',
      'Tasmania',
      'Victoria',
      'Western Australia',
    ],
  },
  {
    code: 'AE',
    name: 'United Arab Emirates',
    states: [
      'Abu Dhabi',
      'Ajman',
      'Dubai',
      'Fujairah',
      'Ras Al Khaimah',
      'Sharjah',
      'Umm Al Quwain',
    ],
  },
  { code: 'SG', name: 'Singapore', states: ['Singapore'] },
]

export const INDIAN_CITIES = [
  { name: 'Mumbai', state: 'Maharashtra', country: 'India' },
  { name: 'Delhi', state: 'Delhi', country: 'India' },
  { name: 'Bangalore', state: 'Karnataka', country: 'India' },
  { name: 'Hyderabad', state: 'Telangana', country: 'India' },
  { name: 'Ahmedabad', state: 'Gujarat', country: 'India' },
  { name: 'Chennai', state: 'Tamil Nadu', country: 'India' },
  { name: 'Kolkata', state: 'West Bengal', country: 'India' },
  { name: 'Surat', state: 'Gujarat', country: 'India' },
  { name: 'Pune', state: 'Maharashtra', country: 'India' },
  { name: 'Jaipur', state: 'Rajasthan', country: 'India' },
  { name: 'Lucknow', state: 'Uttar Pradesh', country: 'India' },
  { name: 'Kanpur', state: 'Uttar Pradesh', country: 'India' },
  { name: 'Nagpur', state: 'Maharashtra', country: 'India' },
  { name: 'Indore', state: 'Madhya Pradesh', country: 'India' },
  { name: 'Thane', state: 'Maharashtra', country: 'India' },
  { name: 'Bhopal', state: 'Madhya Pradesh', country: 'India' },
  { name: 'Visakhapatnam', state: 'Andhra Pradesh', country: 'India' },
  { name: 'Pimpri-Chinchwad', state: 'Maharashtra', country: 'India' },
  { name: 'Patna', state: 'Bihar', country: 'India' },
  { name: 'Vadodara', state: 'Gujarat', country: 'India' },
  { name: 'Ghaziabad', state: 'Uttar Pradesh', country: 'India' },
  { name: 'Ludhiana', state: 'Punjab', country: 'India' },
  { name: 'Agra', state: 'Uttar Pradesh', country: 'India' },
  { name: 'Nashik', state: 'Maharashtra', country: 'India' },
  { name: 'Faridabad', state: 'Haryana', country: 'India' },
  { name: 'Meerut', state: 'Uttar Pradesh', country: 'India' },
  { name: 'Rajkot', state: 'Gujarat', country: 'India' },
  { name: 'Kalyan-Dombivli', state: 'Maharashtra', country: 'India' },
  { name: 'Vasai-Virar', state: 'Maharashtra', country: 'India' },
  { name: 'Varanasi', state: 'Uttar Pradesh', country: 'India' },
  { name: 'Srinagar', state: 'Jammu and Kashmir', country: 'India' },
  { name: 'Aurangabad', state: 'Maharashtra', country: 'India' },
  { name: 'Dhanbad', state: 'Jharkhand', country: 'India' },
  { name: 'Amritsar', state: 'Punjab', country: 'India' },
  { name: 'Navi Mumbai', state: 'Maharashtra', country: 'India' },
  { name: 'Allahabad', state: 'Uttar Pradesh', country: 'India' },
  { name: 'Ranchi', state: 'Jharkhand', country: 'India' },
  { name: 'Howrah', state: 'West Bengal', country: 'India' },
  { name: 'Jabalpur', state: 'Madhya Pradesh', country: 'India' },
  { name: 'Gwalior', state: 'Madhya Pradesh', country: 'India' },
  { name: 'Vijayawada', state: 'Andhra Pradesh', country: 'India' },
  { name: 'Jodhpur', state: 'Rajasthan', country: 'India' },
  { name: 'Madurai', state: 'Tamil Nadu', country: 'India' },
  { name: 'Raipur', state: 'Chhattisgarh', country: 'India' },
  { name: 'Kota', state: 'Rajasthan', country: 'India' },
  { name: 'Guwahati', state: 'Assam', country: 'India' },
  { name: 'Chandigarh', state: 'Chandigarh', country: 'India' },
  { name: 'Solapur', state: 'Maharashtra', country: 'India' },
  { name: 'Hubli–Dharwad', state: 'Karnataka', country: 'India' },
  { name: 'Bareilly', state: 'Uttar Pradesh', country: 'India' },
  { name: 'Moradabad', state: 'Uttar Pradesh', country: 'India' },
  { name: 'Mysore', state: 'Karnataka', country: 'India' },
  { name: 'Gurgaon', state: 'Haryana', country: 'India' },
  { name: 'Aligarh', state: 'Uttar Pradesh', country: 'India' },
  { name: 'Jalandhar', state: 'Punjab', country: 'India' },
  { name: 'Tiruchirappalli', state: 'Tamil Nadu', country: 'India' },
  { name: 'Bhubaneswar', state: 'Odisha', country: 'India' },
  { name: 'Salem', state: 'Tamil Nadu', country: 'India' },
  { name: 'Mira-Bhayandar', state: 'Maharashtra', country: 'India' },
  { name: 'Warangal', state: 'Telangana', country: 'India' },
  { name: 'Guntur', state: 'Andhra Pradesh', country: 'India' },
  { name: 'Bhiwandi', state: 'Maharashtra', country: 'India' },
  { name: 'Saharanpur', state: 'Uttar Pradesh', country: 'India' },
  { name: 'Gorakhpur', state: 'Uttar Pradesh', country: 'India' },
  { name: 'Bikaner', state: 'Rajasthan', country: 'India' },
  { name: 'Amravati', state: 'Maharashtra', country: 'India' },
  { name: 'Noida', state: 'Uttar Pradesh', country: 'India' },
  { name: 'Jamshedpur', state: 'Jharkhand', country: 'India' },
  { name: 'Bhilai', state: 'Chhattisgarh', country: 'India' },
  { name: 'Cuttack', state: 'Odisha', country: 'India' },
  { name: 'Firozabad', state: 'Uttar Pradesh', country: 'India' },
  { name: 'Kochi', state: 'Kerala', country: 'India' },
  { name: 'Bhavnagar', state: 'Gujarat', country: 'India' },
  { name: 'Dehradun', state: 'Uttarakhand', country: 'India' },
  { name: 'Durgapur', state: 'West Bengal', country: 'India' },
  { name: 'Asansol', state: 'West Bengal', country: 'India' },
  { name: 'Nanded', state: 'Maharashtra', country: 'India' },
  { name: 'Kolhapur', state: 'Maharashtra', country: 'India' },
  { name: 'Ajmer', state: 'Rajasthan', country: 'India' },
  { name: 'Gulbarga', state: 'Karnataka', country: 'India' },
  { name: 'Jamnagar', state: 'Gujarat', country: 'India' },
  { name: 'Ujjain', state: 'Madhya Pradesh', country: 'India' },
  { name: 'Loni', state: 'Uttar Pradesh', country: 'India' },
  { name: 'Siliguri', state: 'West Bengal', country: 'India' },
  { name: 'Jhansi', state: 'Uttar Pradesh', country: 'India' },
  { name: 'Ulhasnagar', state: 'Maharashtra', country: 'India' },
  { name: 'Nellore', state: 'Andhra Pradesh', country: 'India' },
  { name: 'Jammu', state: 'Jammu and Kashmir', country: 'India' },
  { name: 'Sangli-Miraj & Kupwad', state: 'Maharashtra', country: 'India' },
  { name: 'Belgaum', state: 'Karnataka', country: 'India' },
  { name: 'Mangalore', state: 'Karnataka', country: 'India' },
  { name: 'Ambattur', state: 'Tamil Nadu', country: 'India' },
  { name: 'Tirunelveli', state: 'Tamil Nadu', country: 'India' },
  { name: 'Malegaon', state: 'Maharashtra', country: 'India' },
  { name: 'Gaya', state: 'Bihar', country: 'India' },
  { name: 'Jalgaon', state: 'Maharashtra', country: 'India' },
  { name: 'Udaipur', state: 'Rajasthan', country: 'India' },
  { name: 'Maheshtala', state: 'West Bengal', country: 'India' },
]

const DEFAULT_FORM = {
  name: '',
  state: '',
  country: 'India',
  isActive: true,
}

const MANAGER_VIEW_OPTIONS: Array<{
  description: string
  label: string
  value: LocationManagerView
}> = [
  {
    value: 'cities',
    label: 'Manage Cities',
    description: 'City list and actions',
  },
  {
    value: 'countries',
    label: 'Manage Countries',
    description: 'Country summary',
  },
]

const normalizeText = (value: unknown) => String(value || '').trim()

const normalizeLocationType = (value: unknown) =>
  normalizeText(value).toLowerCase() === 'country' ? 'country' : 'city'

const normalizeSearchValue = (value: unknown) =>
  normalizeText(value).toLowerCase().replace(/\s+/g, ' ')

const normalizeCitySlug = (value: unknown) =>
  normalizeText(value)
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')

const toTitleCase = (value: string) =>
  value
    .trimStart()
    .replace(/\s+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())

const normalizeRole = (value: unknown) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[\s_-]/g, '')

const uniqueStrings = (values: string[]) =>
  Array.from(
    new Set(values.map((value) => normalizeText(value)).filter(Boolean))
  )

const buildFallbackFlagUrl = (countryCode?: string) => {
  const code = normalizeText(countryCode).toLowerCase()
  if (!code) return ''
  return `https://flagcdn.com/w20/${code}.png`
}

const getFlagEmoji = (countryCode?: string) => {
  const code = normalizeText(countryCode).toUpperCase()
  if (code.length !== 2) return ''
  return String.fromCodePoint(
    ...Array.from(code).map((char) => 127397 + char.charCodeAt(0))
  )
}

const mergeCountryOption = (
  current: CountryOption | undefined,
  next: CountryOption
): CountryOption => ({
  code: normalizeText(next.code) || current?.code || '',
  dialCode: normalizeText(next.dialCode) || current?.dialCode || '',
  flagUrl: normalizeText(next.flagUrl) || current?.flagUrl || '',
  name: normalizeText(next.name) || current?.name || '',
  states:
    next.states && next.states.length
      ? uniqueStrings(next.states).sort((a, b) => a.localeCompare(b))
      : current?.states || [],
})

const buildCountryLookup = (countries: CountryOption[]) => {
  const lookup = new Map<string, CountryOption>()

  countries.forEach((country) => {
    const normalizedCountry = normalizeSearchValue(country.name)
    if (!normalizedCountry) return

    const current = lookup.get(normalizedCountry)
    lookup.set(normalizedCountry, mergeCountryOption(current, country))
  })

  return lookup
}

const getFallbackCountryConfig = (countryName?: string) => {
  const normalizedCountry = normalizeSearchValue(countryName)
  return (
    FALLBACK_COUNTRY_CONFIGS.find(
      (country) => normalizeSearchValue(country.name) === normalizedCountry
    ) || null
  )
}

const getCountryConfig = (
  countryName?: string,
  countryLookup?: Map<string, CountryOption>
) => {
  const normalizedCountry = normalizeSearchValue(countryName)
  if (!normalizedCountry) return null
  return (
    countryLookup?.get(normalizedCountry) ||
    getFallbackCountryConfig(countryName) ||
    null
  )
}

const getCountryMeta = (
  countryName?: string,
  countryLookup?: Map<string, CountryOption>
): CountryMeta => {
  const config = getCountryConfig(countryName, countryLookup)
  const name = normalizeText(countryName) || config?.name || 'Unknown'
  const code = config?.code || ''

  return {
    name,
    code,
    flag: getFlagEmoji(code),
    flagUrl: normalizeText(config?.flagUrl) || buildFallbackFlagUrl(code),
  }
}

const getCountryStateOptions = (
  countryName?: string,
  countryLookup?: Map<string, CountryOption>,
  statesByCountry: Record<string, string[]> = {}
) => {
  const normalizedCountry = normalizeSearchValue(countryName)
  const cachedStates = normalizedCountry
    ? statesByCountry[normalizedCountry] || []
    : []
  const configStates =
    getCountryConfig(countryName, countryLookup)?.states || []

  return uniqueStrings([...cachedStates, ...configStates]).sort((a, b) =>
    a.localeCompare(b)
  )
}

const CountryFlag = ({
  country,
  className,
}: {
  country: CountryMeta
  className?: string
}) => {
  if (country.flagUrl) {
    return (
      <img
        src={country.flagUrl}
        alt=''
        className={cn(
          'h-4 w-6 rounded-sm border border-slate-200 object-cover',
          className
        )}
      />
    )
  }

  if (country.flag) {
    return (
      <span className={cn('text-base leading-none', className)}>
        {country.flag}
      </span>
    )
  }

  return <Globe2 className={cn('text-muted-foreground h-4 w-4', className)} />
}

const formatDate = (value?: string) => {
  const raw = normalizeText(value)
  if (!raw) return 'N/A'
  const parsed = Date.parse(raw)
  if (!Number.isFinite(parsed)) return raw
  return new Date(parsed).toLocaleDateString()
}

const canMutateCity = ({
  city,
  isAdmin,
  isVendor,
  currentUserId,
}: {
  city: CityRow
  isAdmin: boolean
  isVendor: boolean
  currentUserId: string
}) =>
  isAdmin ||
  city.canEdit === true ||
  city.canDelete === true ||
  (isVendor && String(city.createdBy || '') === currentUserId)

const filterMultiSelectOptions = (
  options: MultiSelectOption[],
  search: string
) => {
  const query = normalizeSearchValue(search)
  if (!query) return options

  return options.filter((option) =>
    normalizeSearchValue(
      `${option.label} ${option.value} ${option.meta || ''}`
    ).includes(query)
  )
}

const SearchableMultiSelect = ({
  values,
  options,
  onChange,
  placeholder,
  searchPlaceholder,
  emptyLabel,
  disabled,
  loading,
  triggerFlag,
  headerAction,
}: {
  values: string[]
  options: MultiSelectOption[]
  onChange: (values: string[]) => void
  placeholder: string
  searchPlaceholder: string
  emptyLabel: string
  disabled?: boolean
  loading?: boolean
  triggerFlag?: string
  headerAction?: React.ReactNode | ((close: () => void) => React.ReactNode)
}) => {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  const visibleOptions = useMemo(
    () => filterMultiSelectOptions(options, search),
    [options, search]
  )

  const selectedLabels = useMemo(() => {
    const optionMap = new Map(
      options.map((option) => [option.value, option.label])
    )
    return values
      .map((value) => optionMap.get(value))
      .filter(Boolean) as string[]
  }, [options, values])

  const buttonText = useMemo(() => {
    if (loading) return 'Loading cities...'
    if (!selectedLabels.length) return placeholder
    if (selectedLabels.length <= 2) return selectedLabels.join(', ')
    return `${selectedLabels[0]}, ${selectedLabels[1]} +${selectedLabels.length - 2} more`
  }, [loading, placeholder, selectedLabels])

  const toggleValue = (value: string) => {
    if (values.includes(value)) {
      onChange(values.filter((item) => item !== value))
      return
    }

    onChange(
      uniqueStrings([...values, value]).sort((a, b) => a.localeCompare(b))
    )
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
        <button
          type='button'
          role='combobox'
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            'bg-background flex h-11 w-full items-center justify-between rounded-md border px-3 text-left text-sm shadow-sm transition-none disabled:cursor-not-allowed disabled:opacity-60',
            !selectedLabels.length && 'text-muted-foreground'
          )}
        >
          <span className='flex min-w-0 items-center gap-2'>
            {triggerFlag ? (
              <span className='shrink-0 text-base leading-none'>
                {triggerFlag}
              </span>
            ) : null}
            <span className='truncate'>{buttonText}</span>
          </span>
          <ChevronsUpDown className='h-4 w-4 shrink-0 opacity-50' />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className='w-[--radix-popover-trigger-width] p-0'
        align='start'
      >
        <div className='border-b p-2'>
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={searchPlaceholder}
            className='h-10 rounded-md'
          />
        </div>

        {headerAction ? (
          <div className='bg-muted/30 border-b px-2 py-1.5'>
            {typeof headerAction === 'function'
              ? headerAction(() => setOpen(false))
              : headerAction}
          </div>
        ) : null}

        <div
          className='max-h-72 overflow-y-auto overscroll-contain'
          onWheelCapture={(event) => {
            event.stopPropagation()
          }}
        >
          {loading ? (
            <div className='text-muted-foreground flex items-center gap-2 px-3 py-3 text-sm'>
              <Loader2 className='h-4 w-4 animate-spin' />
              Loading cities...
            </div>
          ) : null}

          {!loading && !visibleOptions.length ? (
            <div className='text-muted-foreground px-3 py-3 text-sm'>
              {emptyLabel}
            </div>
          ) : null}

          {visibleOptions.map((option, index) => {
            const checked = values.includes(option.value)

            return (
              <button
                key={option.value}
                type='button'
                onClick={() => toggleValue(option.value)}
                className={cn(
                  'flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-none',
                  index !== visibleOptions.length - 1 && 'border-b',
                  checked && 'bg-muted/20'
                )}
              >
                <span className='flex h-4 w-4 items-center justify-center rounded-sm border'>
                  <Check
                    className={cn(
                      'h-3.5 w-3.5',
                      checked ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                </span>
                {option.flag ? (
                  <span className='shrink-0 text-base leading-none'>
                    {option.flag}
                  </span>
                ) : null}
                <div className='min-w-0'>
                  <div className='truncate'>{option.label}</div>
                  {option.meta ? (
                    <div className='text-muted-foreground text-xs'>
                      {option.meta}
                    </div>
                  ) : null}
                </div>
              </button>
            )
          })}
        </div>

        <div className='flex items-center justify-between gap-2 border-t px-2 py-2'>
          <Button
            type='button'
            variant='ghost'
            size='sm'
            onClick={() =>
              onChange(
                uniqueStrings([
                  ...values,
                  ...visibleOptions.map((option) => option.value),
                ]).sort((a, b) => a.localeCompare(b))
              )
            }
            disabled={!visibleOptions.length}
          >
            Select all shown
          </Button>
          <Button
            type='button'
            variant='ghost'
            size='sm'
            onClick={() => onChange([])}
            disabled={!values.length}
          >
            Clear
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}

export default function CitiesPage() {
  const dispatch = useDispatch<AppDispatch>()
  const token = useSelector((state: RootState) => state.auth?.token || '')
  const authUser = useSelector((state: RootState) => state.auth?.user || null)
  const vendorProfile = useSelector((state: RootState) => {
    const profile = (state as any).vendorprofile?.profile
    return profile?.vendor || profile?.data || profile || null
  })
  const role = normalizeRole(authUser?.role)
  const isAdmin = role === 'admin' || role === 'superadmin'
  const isVendor = role === 'vendor'
  const canAccess = isAdmin || isVendor
  const currentUserId = normalizeText(authUser?.id || authUser?._id)

  const [cities, setCities] = useState<CityRow[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [managerView, setManagerView] = useState<LocationManagerView>('cities')
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [countryFilter, setCountryFilter] = useState('all')
  const [stateFilter, setStateFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingCity, setEditingCity] = useState<CityRow | null>(null)
  const [form, setForm] = useState(DEFAULT_FORM)
  const [defaultCitySavingId, setDefaultCitySavingId] = useState<string | null>(
    null
  )
  const [countries, setCountries] = useState<CountryOption[]>([])
  const [countriesLoading, setCountriesLoading] = useState(false)
  const [, setCountriesError] = useState('')
  const [statesByCountry, setStatesByCountry] = useState<
    Record<string, string[]>
  >({})
  const [statesLoading, setStatesLoading] = useState(false)
  const [, setStatesError] = useState('')
  const [discoveredCities, setDiscoveredCities] = useState<string[]>([])
  const [queuedCities, setQueuedCities] = useState<QueuedCity[]>([])
  const [loadingStateCities, setLoadingStateCities] = useState(false)
  const [manualCityDialogOpen, setManualCityDialogOpen] = useState(false)

  const vendorRegistrationCountry =
    normalizeText(vendorProfile?.country || authUser?.country) || 'India'
  const vendorRegistrationState = normalizeText(
    vendorProfile?.state || authUser?.state
  )
  const vendorRegistrationCity = toTitleCase(
    normalizeText(vendorProfile?.city || authUser?.city)
  )
  const vendorDefaultCitySlug = normalizeCitySlug(
    vendorProfile?.default_city_slug ||
      vendorProfile?.defaultCitySlug ||
      authUser?.default_city_slug ||
      authUser?.defaultCitySlug
  )
  const vendorDefaultCityName = normalizeText(
    vendorProfile?.default_city_name ||
      vendorProfile?.defaultCityName ||
      authUser?.default_city_name ||
      authUser?.defaultCityName
  )

  const cityLocationRows = useMemo(
    () =>
      cities.filter(
        (city) => normalizeLocationType(city.locationType) !== 'country'
      ),
    [cities]
  )

  const countryLocationByName = useMemo(
    () =>
      new Map(
        cities
          .filter(
            (city) => normalizeLocationType(city.locationType) === 'country'
          )
          .map((city) => [normalizeSearchValue(city.name), city])
      ),
    [cities]
  )

  const activeLocations = useMemo(
    () =>
      [...cities]
        .filter((city) => city?.isActive !== false)
        .sort((left, right) =>
          String(left?.name || '').localeCompare(
            String(right?.name || ''),
            undefined,
            {
              sensitivity: 'base',
            }
          )
        ),
    [cities]
  )

  const defaultCityMeta = useMemo(() => {
    const defaultSlug =
      vendorDefaultCitySlug && vendorDefaultCitySlug !== 'all'
        ? vendorDefaultCitySlug
        : normalizeCitySlug(vendorRegistrationCity)
    const defaultName = vendorDefaultCityName || vendorRegistrationCity

    const matchedCity =
      activeLocations.find((city) => {
        const citySlug = normalizeCitySlug(city.slug || city.name)
        return Boolean(
          (defaultSlug && citySlug === defaultSlug) ||
            (defaultName &&
              normalizeSearchValue(city.name) ===
                normalizeSearchValue(defaultName))
        )
      }) || null

    if (matchedCity) {
      return {
        id: normalizeText(matchedCity._id),
        name: matchedCity.name,
        state: matchedCity.state || '',
        country: matchedCity.country || vendorRegistrationCountry,
      }
    }

    if (vendorRegistrationCity) {
      return {
        id: '',
        name: vendorRegistrationCity,
        state: vendorRegistrationState,
        country: vendorRegistrationCountry,
      }
    }

    if (vendorDefaultCitySlug === 'all') {
      return {
        id: '',
        name: 'All Cities',
        state: '',
        country: '',
      }
    }

    return {
      id: '',
      name: vendorDefaultCityName || '',
      state: vendorRegistrationState,
      country: vendorRegistrationCountry,
    }
  }, [
    activeLocations,
    vendorDefaultCityName,
    vendorDefaultCitySlug,
    vendorRegistrationCity,
    vendorRegistrationCountry,
    vendorRegistrationState,
  ])

  const currentDefaultCityId = normalizeText(defaultCityMeta.id)

  useEffect(() => {
    if (!isVendor || vendorProfile) return
    void dispatch(fetchVendorProfile())
  }, [dispatch, isVendor, vendorProfile])

  const defaultCityLabel = useMemo(() => {
    if (defaultCityMeta.name === 'All Cities') return defaultCityMeta.name
    return [
      defaultCityMeta.name,
      defaultCityMeta.state,
      defaultCityMeta.country,
    ]
      .filter(Boolean)
      .filter(
        (part, index, items) =>
          items.findIndex(
            (candidate) =>
              normalizeSearchValue(candidate) === normalizeSearchValue(part)
          ) === index
      )
      .join(', ')
  }, [defaultCityMeta])

  const currentViewMeta =
    MANAGER_VIEW_OPTIONS.find((view) => view.value === managerView) ||
    MANAGER_VIEW_OPTIONS[0]

  const handleManagerViewChange = (nextView: LocationManagerView) => {
    setManagerView(nextView)
    setPage(1)
    setSearchTerm('')
    if (nextView !== 'cities') {
      setCountryFilter('all')
      setStateFilter('all')
    }
  }

  const resetSheetState = useCallback(() => {
    setEditingCity(null)
    setForm(DEFAULT_FORM)
    setStatesError('')
    setDiscoveredCities([])
    setQueuedCities([])
    setManualCityDialogOpen(false)
  }, [])

  const loadCities = useCallback(async () => {
    if (!token) {
      setCities([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError('')
    try {
      const response = await fetch(
        `${API_BASE}/v1/cities?includeInactive=true`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )
      const body = await response.json()
      if (!response.ok || body?.success === false) {
        throw new Error(
          body?.message || `Failed to load cities (HTTP ${response.status})`
        )
      }

      setCities(Array.isArray(body?.data) ? body.data : [])
    } catch (fetchError: any) {
      setCities([])
      setError(fetchError?.message || 'Failed to load cities')
      toast.error(fetchError?.message || 'Failed to load cities')
    } finally {
      setLoading(false)
    }
  }, [token])

  const loadCountries = useCallback(async () => {
    if (!token) {
      setCountries([])
      setCountriesLoading(false)
      return
    }

    setCountriesLoading(true)
    setCountriesError('')
    try {
      const response = await fetch(`${API_BASE}/v1/cities/countries`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      const body = await response.json()
      if (!response.ok || body?.success === false) {
        throw new Error(
          body?.message || `Failed to load countries (HTTP ${response.status})`
        )
      }

      setCountries(
        Array.isArray(body?.data)
          ? body.data.map((country: CountryOption) => ({
              code: normalizeText(country?.code),
              dialCode: normalizeText(country?.dialCode),
              flagUrl: normalizeText(country?.flagUrl),
              name: normalizeText(country?.name),
            }))
          : []
      )
    } catch (fetchError: any) {
      setCountries([])
    } finally {
      setCountriesLoading(false)
    }
  }, [token])

  const loadStateCities = useCallback(
    async (stateName: string, countryName: string) => {
      const safeState = normalizeText(stateName)
      const safeCountry = normalizeText(countryName) || 'India'

      if (!safeState || !token) {
        setDiscoveredCities([])
        return
      }

      setLoadingStateCities(true)
      try {
        const response = await fetch(
          `${API_BASE}/v1/cities/discover?state=${encodeURIComponent(
            safeState
          )}&country=${encodeURIComponent(safeCountry)}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        )
        const body = await response.json()
        if (!response.ok || body?.success === false) {
          throw new Error(
            body?.message ||
              `Failed to fetch cities for selected state (HTTP ${response.status})`
          )
        }

        const options = uniqueStrings(
          Array.isArray(body?.cities) ? body.cities.map(String) : []
        ).sort((a, b) => a.localeCompare(b))

        setDiscoveredCities(options)
      } catch (fetchError: any) {
        setDiscoveredCities([])
        toast.error(
          fetchError?.message || 'Failed to fetch cities for selected state'
        )
      } finally {
        setLoadingStateCities(false)
      }
    },
    [token]
  )

  useEffect(() => {
    if (!canAccess) return
    loadCities()
  }, [canAccess, loadCities])

  useEffect(() => {
    if (!canAccess) return
    loadCountries()
  }, [canAccess, loadCountries])

  useEffect(() => {
    if (!sheetOpen || !token) {
      setStatesLoading(false)
      return
    }

    const safeCountry = normalizeText(form.country) || DEFAULT_FORM.country
    const countryKey = normalizeSearchValue(safeCountry)
    if (!countryKey) {
      setStatesLoading(false)
      return
    }

    if (Object.prototype.hasOwnProperty.call(statesByCountry, countryKey)) {
      setStatesLoading(false)
      return
    }

    const controller = new AbortController()
    let isMounted = true

    const loadCountryStates = async () => {
      setStatesLoading(true)
      setStatesError('')

      try {
        const response = await fetch(
          `${API_BASE}/v1/cities/states?country=${encodeURIComponent(safeCountry)}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            signal: controller.signal,
          }
        )
        const body = await response.json()
        if (!response.ok || body?.success === false) {
          throw new Error(
            body?.message || `Failed to load states (HTTP ${response.status})`
          )
        }

        if (!isMounted || controller.signal.aborted) return

        const nextStates = uniqueStrings(
          Array.isArray(body?.states) ? body.states.map(String) : []
        ).sort((a, b) => a.localeCompare(b))

        setStatesByCountry((current) => ({
          ...current,
          [countryKey]: nextStates,
        }))
      } catch (fetchError: any) {
        if (!isMounted || controller.signal.aborted) return
        setStatesError(fetchError?.message || 'Failed to load states')
      } finally {
        if (isMounted && !controller.signal.aborted) {
          setStatesLoading(false)
        }
      }
    }

    void loadCountryStates()

    return () => {
      isMounted = false
      controller.abort()
    }
  }, [canAccess, form.country, sheetOpen, statesByCountry, token])

  useEffect(() => {
    if (!sheetOpen || !form.state) {
      setDiscoveredCities([])
      return
    }

    loadStateCities(form.state, form.country)
  }, [form.country, form.state, loadStateCities, sheetOpen])

  const countryLookup = useMemo(
    () =>
      buildCountryLookup([
        ...FALLBACK_COUNTRY_CONFIGS,
        ...countries,
        ...uniqueStrings([
          ...cityLocationRows.map((city) => city.country || ''),
          authUser?.country || '',
          form.country,
        ]).map((countryName) => ({
          code: '',
          name: countryName,
        })),
      ]),
    [authUser?.country, cityLocationRows, countries, form.country]
  )

  const countryOptions = useMemo(() => {
    return Array.from(countryLookup.values())
      .map((country) => getCountryMeta(country.name, countryLookup))
      .sort((left, right) => {
        if (left.name === 'India') return -1
        if (right.name === 'India') return 1
        return left.name.localeCompare(right.name)
      })
  }, [countryLookup])

  const formStateOptions = useMemo(() => {
    const apiStates = getCountryStateOptions(
      form.country,
      countryLookup,
      statesByCountry
    )
    const dynamicStates = cityLocationRows
      .filter(
        (city) =>
          normalizeSearchValue(city.country || 'India') ===
          normalizeSearchValue(form.country)
      )
      .map((city) => city.state || '')

    return uniqueStrings([...apiStates, ...dynamicStates, form.state]).sort(
      (a, b) => a.localeCompare(b)
    )
  }, [
    cityLocationRows,
    countryLookup,
    form.country,
    form.state,
    statesByCountry,
  ])

  const getResolvedCountryMeta = useCallback(
    (countryName?: string) => getCountryMeta(countryName, countryLookup),
    [countryLookup]
  )

  const selectedFormCountry = getResolvedCountryMeta(form.country)

  const tableStateOptions = useMemo(() => {
    const visibleCities =
      countryFilter === 'all'
        ? cityLocationRows
        : cityLocationRows.filter(
            (city) =>
              normalizeSearchValue(city.country || 'India') ===
              normalizeSearchValue(countryFilter)
          )

    return uniqueStrings(
      visibleCities
        .map((city) => city.state || '')
        .filter((stateName) => normalizeText(stateName))
    ).sort((a, b) => a.localeCompare(b))
  }, [cityLocationRows, countryFilter])

  const globalCitiesOptions = useMemo<MultiSelectOption[]>(() => {
    const options: MultiSelectOption[] = []
    const seen = new Set<string>()

    // Add static known cities first
    INDIAN_CITIES.forEach((city) => {
      const key = normalizeSearchValue(city.name)
      if (seen.has(key)) return
      seen.add(key)
      options.push({
        value: city.name,
        label: city.name,
        flag: getFlagEmoji('IN'),
        meta: `${city.state}, India`,
      })
    })

    // Add discovered cities from API if any
    discoveredCities.forEach((city) => {
      const key = normalizeSearchValue(city)
      if (seen.has(key)) return
      seen.add(key)
      options.push({
        value: city,
        label: city,
        flag: getResolvedCountryMeta(form.country).flag,
        meta: `${form.state || ''}, ${form.country}`,
      })
    })

    return options.sort((a, b) => a.label.localeCompare(b.label))
  }, [discoveredCities, form.country, form.state, getResolvedCountryMeta])

  const selectedDiscoveredCities = useMemo(
    () =>
      queuedCities.filter((city) => {
        const isDiscovered = discoveredCities.includes(city.name)
        const isStatic = INDIAN_CITIES.some((c) => c.name === city.name)
        return isDiscovered || isStatic
      }),
    [discoveredCities, queuedCities]
  )

  const searchQuery = normalizeSearchValue(searchTerm)

  const countrySummaryRows = useMemo<CountrySummaryRow[]>(() => {
    const summary = new Map<
      string,
      { activeCityCount: number; cityCount: number; states: Set<string> }
    >()

    cityLocationRows.forEach((city) => {
      const countryName = normalizeText(city.country) || 'India'
      const current = summary.get(countryName) || {
        activeCityCount: 0,
        cityCount: 0,
        states: new Set<string>(),
      }

      current.cityCount += 1
      if (city.isActive !== false) {
        current.activeCityCount += 1
      }
      if (normalizeText(city.state)) {
        current.states.add(normalizeText(city.state))
      }

      summary.set(countryName, current)
    })

    return uniqueStrings([
      ...cityLocationRows.map((city) => city.country || 'India'),
      ...Array.from(countryLocationByName.values()).map(
        (city) => city.country || city.name || 'India'
      ),
      vendorRegistrationCountry,
    ])
      .map((countryName) => {
        const current = summary.get(countryName)
        const defaultLocationId = normalizeText(
          countryLocationByName.get(normalizeSearchValue(countryName))?._id
        )
        const apiStates = getCountryStateOptions(
          countryName,
          countryLookup,
          statesByCountry
        )

        return {
          activeCityCount: current?.activeCityCount || 0,
          cityCount: current?.cityCount || 0,
          country: getResolvedCountryMeta(countryName),
          defaultLocationId,
          stateCount: uniqueStrings([
            ...apiStates,
            ...(current ? Array.from(current.states) : []),
          ]).length,
        }
      })
      .filter((countryRow) => {
        if (!searchQuery) return true
        return normalizeSearchValue(countryRow.country.name).includes(
          searchQuery
        )
      })
      .sort((left, right) =>
        left.country.name.localeCompare(right.country.name)
      )
  }, [
    cityLocationRows,
    countryLookup,
    countryLocationByName,
    getResolvedCountryMeta,
    searchQuery,
    statesByCountry,
    vendorRegistrationCountry,
  ])

  const filteredCities = useMemo(() => {
    return [...cityLocationRows]
      .filter((city) => {
        const matchesCountry =
          countryFilter === 'all' ||
          normalizeSearchValue(city.country || 'India') ===
            normalizeSearchValue(countryFilter)

        const matchesState =
          stateFilter === 'all' ||
          normalizeSearchValue(city.state) === normalizeSearchValue(stateFilter)

        if (!matchesCountry || !matchesState) return false
        if (!searchQuery) return true

        return normalizeSearchValue(
          `${city.name} ${city.slug} ${city.state || ''} ${city.country || ''}`
        ).includes(searchQuery)
      })
      .sort((left, right) => left.name.localeCompare(right.name))
  }, [cityLocationRows, countryFilter, searchQuery, stateFilter])

  useEffect(() => {
    setPage(1)
  }, [countryFilter, searchTerm, stateFilter, pageSize])

  useEffect(() => {
    if (stateFilter !== 'all' && !tableStateOptions.includes(stateFilter)) {
      setStateFilter('all')
    }
  }, [stateFilter, tableStateOptions])

  const totalPages = Math.max(Math.ceil(filteredCities.length / pageSize), 1)
  const currentPage = Math.min(page, totalPages)
  const paginatedCities = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredCities.slice(start, start + pageSize)
  }, [currentPage, filteredCities, pageSize])

  const openCreateSheet = () => {
    resetSheetState()
    setForm({
      name: !cityLocationRows.length ? vendorRegistrationCity : '',
      state: !cityLocationRows.length ? vendorRegistrationState : '',
      country: !cityLocationRows.length
        ? vendorRegistrationCountry
        : DEFAULT_FORM.country,
      isActive: true,
    })
    setSheetOpen(true)
  }

  const openEditSheet = (city: CityRow) => {
    if (!canMutateCity({ city, isAdmin, isVendor, currentUserId })) {
      toast.error('You can edit only cities created by you')
      return
    }

    setEditingCity(city)
    setForm({
      name: city.name || '',
      state: city.state || '',
      country: city.country || 'India',
      isActive: city.isActive !== false,
    })
    setStatesError('')
    setDiscoveredCities([])
    setQueuedCities([])
    setSheetOpen(true)
  }

  const handleCountryChange = (nextCountry: string) => {
    setForm((current) => ({
      ...current,
      country: nextCountry,
      state: '',
      name: editingCity ? current.name : '',
    }))
    setStatesError('')
    setDiscoveredCities([])
    setQueuedCities([])
  }

  const handleStateChange = (nextState: string) => {
    setForm((current) => ({
      ...current,
      state: nextState,
      name: editingCity ? current.name : '',
    }))
    setQueuedCities([])
  }

  const handleSuggestedCitiesChange = (values: string[]) => {
    // Detect if a new city was added
    const lastAdded = values.length > queuedCities.length ? values[values.length - 1] : null
    
    if (lastAdded) {
      // Find the full city metadata
      const staticCity = INDIAN_CITIES.find((c) => c.name === lastAdded)
      const nextCity: QueuedCity = staticCity
        ? {
            name: staticCity.name,
            state: staticCity.state,
            country: staticCity.country,
          }
        : {
            name: lastAdded,
            state: form.state,
            country: form.country,
          }

      // Update form state for auto-selection if it's a known city
      if (staticCity) {
        setForm((current) => ({
          ...current,
          state: staticCity.state,
          country: staticCity.country,
        }))
      }

      setQueuedCities((current) => {
        const next = [...current, nextCity]
        return next.sort((a, b) => a.name.localeCompare(b.name))
      })
    } else {
      // It's a removal
      setQueuedCities((current) => {
        const next = current.filter((city) => values.includes(city.name))
        return next.sort((a, b) => a.name.localeCompare(b.name))
      })
    }
  }

  const handleAddManualCity = () => {
    if (editingCity) return

    const manualCity: QueuedCity = {
      name: toTitleCase(normalizeText(form.name)),
      state: form.state,
      country: form.country,
    }

    if (!manualCity.name) {
      toast.error('Type a manual city name first')
      return
    }

    setQueuedCities((current) =>
      [...current, manualCity].sort((a, b) => a.name.localeCompare(b.name))
    )
    setForm((current) => ({ ...current, name: '' }))
    setManualCityDialogOpen(false) // Close the popup after adding
  }

  const handleDiscoveredCitiesChange = (discoveredCities: string[]) => {
    const nextCities: QueuedCity[] = discoveredCities.map((cityName) => ({
      name: cityName,
      state: form.state,
      country: form.country,
    }))

    setQueuedCities((current) => {
      const merged = [...current]
      nextCities.forEach((city) => {
        if (!merged.some((m) => m.name === city.name && m.state === city.state)) {
          merged.push(city)
        }
      })
      return merged.sort((a, b) => a.name.localeCompare(b.name))
    })
  }

  const handleQueueAllDiscovered = () => {
    handleDiscoveredCitiesChange(discoveredCities)
  }

  const handleRemoveQueuedCity = (cityToRemove: QueuedCity) => {

    setQueuedCities((current) =>
      current.filter(
        (city) =>
          city.name !== cityToRemove.name ||
          city.state !== cityToRemove.state ||
          city.country !== cityToRemove.country
      )
    )
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!token) return
    if (!form.country) {
      toast.error('Country is required')
      return
    }

    setSaving(true)
    try {
      if (editingCity?._id) {
        if (!normalizeText(form.name)) {
          throw new Error('City name is required')
        }

        const response = await fetch(
          `${API_BASE}/v1/cities/${editingCity._id}`,
          {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              name: normalizeText(form.name),
              state: form.state,
              country: form.country,
              isActive: form.isActive,
            }),
          }
        )
        const body = await response.json()
        if (!response.ok || body?.success === false) {
          throw new Error(
            body?.message || `Failed to update city (HTTP ${response.status})`
          )
        }

        toast.success(body?.message || 'City updated')
      } else {
        const cityNames = uniqueStrings([
          ...queuedCities.map((city) => city.name),
          form.name,
        ])

        if (!cityNames.length) {
          throw new Error('Add at least one city before saving')
        }

        if (cityNames.length > 1) {
          const response = await fetch(`${API_BASE}/v1/cities/bulk`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              state: form.state,
              country: form.country,
              isActive: form.isActive,
              cities: cityNames,
            }),
          })
          const body = await response.json()
          if (!response.ok || body?.success === false) {
            throw new Error(
              body?.message ||
                `Failed to create cities (HTTP ${response.status})`
            )
          }

          const createdCount = Number(body?.createdCount || 0)
          const addedCount = Number(body?.addedCount || 0)
          const skippedCount = Number(body?.skippedCount || 0)
          toast.success(
            body?.message ||
              `${createdCount} created${addedCount ? `, ${addedCount} added` : ''}${skippedCount ? `, ${skippedCount} skipped` : ''}`
          )
        } else {
          const response = await fetch(`${API_BASE}/v1/cities`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              name: cityNames[0],
              state: form.state,
              country: form.country,
              isActive: form.isActive,
            }),
          })
          const body = await response.json()
          if (!response.ok || body?.success === false) {
            throw new Error(
              body?.message || `Failed to create city (HTTP ${response.status})`
            )
          }

          toast.success(body?.message || 'City created')
        }
      }

      setSheetOpen(false)
      resetSheetState()
      loadCities()
    } catch (saveError: any) {
      toast.error(saveError?.message || 'Failed to save city')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (city: CityRow) => {
    if (!canMutateCity({ city, isAdmin, isVendor, currentUserId })) {
      toast.error('You can delete only cities created by you')
      return
    }

    const isOwnedByCurrentVendor =
      isVendor && String(city.createdBy || '') === currentUserId
    const confirmMessage =
      isVendor && !isOwnedByCurrentVendor
        ? `Remove city "${city.name}" from your list?`
        : `Delete city "${city.name}"?`

    if (!window.confirm(confirmMessage)) return

    setDeletingId(city._id)
    try {
      const response = await fetch(`${API_BASE}/v1/cities/${city._id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      const body = await response.json()
      if (!response.ok || body?.success === false) {
        throw new Error(
          body?.message || `Failed to delete city (HTTP ${response.status})`
        )
      }

      toast.success(body?.message || 'City deleted')
      loadCities()
    } catch (deleteError: any) {
      toast.error(deleteError?.message || 'Failed to delete city')
    } finally {
      setDeletingId(null)
    }
  }

  const handleUpdateDefaultCity = async (city: CityRow) => {
    if (!token) {
      toast.error('Your session has expired. Please sign in again.')
      return
    }

    if (!normalizeText(city?._id)) {
      toast.error('This city cannot be used as the default location.')
      return
    }

    if (city.isActive === false) {
      toast.error('Only active cities can be used as the default location.')
      return
    }

    if (normalizeText(city._id) === currentDefaultCityId) {
      toast.message(`${city.name} is already your default city`)
      return
    }

    setDefaultCitySavingId(city._id)
    try {
      const response = await fetch(
        `${API_BASE}/v1/vendor/profile/default-city`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            cityId: city._id,
          }),
        }
      )

      const body = await response.json().catch(() => null)
      if (!response.ok || body?.success === false) {
        throw new Error(body?.message || 'Failed to update default city')
      }

      if (body?.vendor) {
        dispatch(
          setUser({
            ...(authUser || {}),
            ...body.vendor,
            default_city_name:
              body?.city?.name || body?.vendor?.default_city_name || city.name,
          })
        )
      }

      await dispatch(fetchVendorProfile())
      await loadCities()
      toast.success(`${city.name} is now your default city`)
    } catch (saveError: any) {
      toast.error(saveError?.message || 'Failed to update default city')
    } finally {
      setDefaultCitySavingId(null)
    }
  }

  const handleUpdateDefaultCountry = async (countryName: string) => {
    const safeCountryName = normalizeText(countryName)
    if (!token || !safeCountryName) {
      toast.error('Country default update ke liye valid session required hai.')
      return
    }

    const normalizedCountryKey = normalizeSearchValue(safeCountryName)
    const currentDefaultMatchesCountry =
      normalizeSearchValue(defaultCityMeta.name) === normalizedCountryKey &&
      !normalizeText(defaultCityMeta.state)

    if (
      normalizeText(countryLocationByName.get(normalizedCountryKey)?._id) ===
        currentDefaultCityId ||
      currentDefaultMatchesCountry
    ) {
      toast.message(`${safeCountryName} is already your default city`)
      return
    }

    setDefaultCitySavingId(`country:${safeCountryName}`)
    try {
      const response = await fetch(
        `${API_BASE}/v1/vendor/profile/default-city`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            countryName: safeCountryName,
          }),
        }
      )

      const body = await response.json().catch(() => null)
      if (!response.ok || body?.success === false) {
        throw new Error(body?.message || 'Failed to update default country')
      }

      if (body?.vendor) {
        dispatch(
          setUser({
            ...(authUser || {}),
            ...body.vendor,
            default_city_name:
              body?.city?.name ||
              body?.vendor?.default_city_name ||
              safeCountryName,
          })
        )
      }

      await dispatch(fetchVendorProfile())
      await loadCities()
      toast.success(`${safeCountryName} is now your default city`)
    } catch (saveError: any) {
      toast.error(saveError?.message || 'Failed to update default country')
    } finally {
      setDefaultCitySavingId(null)
    }
  }

  if (!canAccess) {
    return (
      <Main className='flex flex-1 flex-col gap-4 sm:gap-6'>
        <div className='rounded-md border border-rose-200 bg-rose-50 px-4 py-5 text-sm text-rose-700'>
          Only admins and vendors can manage cities.
        </div>
      </Main>
    )
  }

  return (
    <>
      <TablePageHeader
        title={
          <div className='flex flex-wrap items-center gap-2'>
            <span>{currentViewMeta.label}</span>
            {managerView === 'cities' && isVendor && defaultCityLabel ? (
              <div className='flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700'>
                <span className='text-[11px] tracking-[0.18em] text-slate-500 uppercase'>
                  Default City
                </span>
                <span className='tracking-normal text-slate-900 normal-case'>
                  {defaultCityLabel}
                </span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type='button'
                      className='text-slate-400 transition-colors hover:text-slate-700'
                      aria-label='Default city info'
                    >
                      <Info className='h-3.5 w-3.5' />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side='bottom' className='max-w-72'>
                    {defaultCityMeta.name === 'All Cities'
                      ? 'Your storefront still falls back to all cities. Use a city row or a country row to choose one default location.'
                      : 'This default city starts from the location chosen during vendor registration and can be changed from the city row or Manage Countries anytime.'}
                  </TooltipContent>
                </Tooltip>
              </div>
            ) : null}
          </div>
        }
        stacked
        actionsClassName='flex-wrap items-stretch gap-3 overflow-visible pb-0'
        showHeaderChrome={false}
      >
        <div className='flex w-full flex-wrap gap-2'>
          {MANAGER_VIEW_OPTIONS.map((view) => (
            <Button
              key={view.value}
              type='button'
              variant={managerView === view.value ? 'default' : 'outline'}
              className='h-10'
              onClick={() => handleManagerViewChange(view.value)}
            >
              {view.label}
            </Button>
          ))}
        </div>

        {managerView === 'cities' ? (
          <div className='grid w-full gap-2 xl:grid-cols-[minmax(0,1fr)_220px_220px_auto_auto]'>
            <Input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder='Search city, state, or country'
              className='h-10 w-full'
            />
            <Select value={countryFilter} onValueChange={setCountryFilter}>
              <SelectTrigger className='h-10 w-full'>
                {countryFilter === 'all' ? (
                  <span className='truncate'>All countries</span>
                ) : (
                  <span className='flex items-center gap-2 truncate'>
                    <CountryFlag
                      country={getResolvedCountryMeta(countryFilter)}
                    />
                    <span className='truncate'>{countryFilter}</span>
                  </span>
                )}
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>All countries</SelectItem>
                {countryOptions.map((country) => (
                  <SelectItem key={country.name} value={country.name}>
                    <span className='flex items-center gap-2'>
                      <CountryFlag country={country} />
                      <span>{country.name}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={stateFilter} onValueChange={setStateFilter}>
              <SelectTrigger className='h-10 w-full'>
                <span className='truncate'>
                  {stateFilter === 'all' ? 'All states' : stateFilter}
                </span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>All states</SelectItem>
                {tableStateOptions.map((stateName) => (
                  <SelectItem key={stateName} value={stateName}>
                    {stateName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant='outline'
              className='h-10'
              onClick={() => {
                void loadCities()
                void loadCountries()
              }}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
              ) : (
                <RefreshCw className='mr-2 h-4 w-4' />
              )}
              Refresh
            </Button>
            <Button className='h-10' onClick={openCreateSheet}>
              <Plus className='mr-2 h-4 w-4' />
              Create City
            </Button>
          </div>
        ) : (
          <div className='grid w-full gap-2 xl:grid-cols-[minmax(0,1fr)_auto]'>
            <Input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder='Search country'
              className='h-10 w-full'
            />
            <Button
              variant='outline'
              className='h-10'
              onClick={() => {
                void loadCities()
                void loadCountries()
              }}
              disabled={loading || countriesLoading}
            >
              {loading || countriesLoading ? (
                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
              ) : (
                <RefreshCw className='mr-2 h-4 w-4' />
              )}
              Refresh
            </Button>
          </div>
        )}
      </TablePageHeader>

      <Main className='flex flex-1 flex-col gap-4 md:gap-6'>
        {error ? (
          <div className='rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700'>
            {error}
          </div>
        ) : null}

        {managerView === 'cities' ? (
          <TableShell
            className='flex-1'
            title='Available cities'
            description=''
            footer={
              <ServerPagination
                page={currentPage}
                totalPages={totalPages}
                totalItems={filteredCities.length}
                pageSize={pageSize}
                pageSizeOptions={[10, 20, 30, 50]}
                onPageChange={(nextPage) => {
                  setPage(nextPage)
                  window.scrollTo({ top: 0, behavior: 'smooth' })
                }}
                onPageSizeChange={setPageSize}
                disabled={loading}
              />
            }
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className='min-w-[220px]'>City</TableHead>
                  <TableHead className='min-w-[180px]'>State</TableHead>
                  <TableHead className='min-w-[180px]'>Country</TableHead>
                  <TableHead className='min-w-[120px]'>Status</TableHead>
                  <TableHead className='min-w-[120px]'>Created</TableHead>
                  <TableHead className='text-right'>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className='h-24 text-center'>
                      <div className='text-muted-foreground flex items-center justify-center gap-2 text-sm'>
                        <Loader2 className='h-4 w-4 animate-spin' />
                        Loading cities...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : paginatedCities.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className='text-muted-foreground h-24 text-center'
                    >
                      No cities found for the current filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedCities.map((city) => {
                    const countryMeta = getResolvedCountryMeta(
                      city.country || 'India'
                    )
                    const canMutate = canMutateCity({
                      city,
                      isAdmin,
                      isVendor,
                      currentUserId,
                    })
                    const isRowDefaultCity =
                      isVendor &&
                      normalizeText(city._id) === currentDefaultCityId
                    const isSettingDefault =
                      isVendor && defaultCitySavingId === city._id
                    const canSetAsDefault =
                      isVendor &&
                      city.isActive !== false &&
                      normalizeText(city._id) !== currentDefaultCityId

                    return (
                      <TableRow key={city._id}>
                        <TableCell>
                          <div className='space-y-1'>
                            <div className='text-sm font-medium'>
                              {city.name}
                            </div>
                            <div className='text-muted-foreground text-xs'>
                              {city.slug}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant='outline'
                            className='rounded-md border-slate-200 bg-slate-50 text-slate-700'
                          >
                            {city.state || 'N/A'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className='flex items-center gap-2 text-sm'>
                            <CountryFlag country={countryMeta} />
                            <span>{countryMeta.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant='outline'
                            className={cn(
                              'rounded-md',
                              city.isActive
                                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                : 'border-slate-200 bg-slate-50 text-slate-600'
                            )}
                          >
                            {city.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell className='text-sm text-slate-600'>
                          {formatDate(city.createdAt)}
                        </TableCell>
                        <TableCell className='text-right'>
                          <div className='flex justify-end gap-2'>
                            {isVendor ? (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span>
                                    <Button
                                      variant='outline'
                                      size='sm'
                                      className={cn(
                                        'rounded-md',
                                        isRowDefaultCity &&
                                          'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-700'
                                      )}
                                      onClick={() =>
                                        void handleUpdateDefaultCity(city)
                                      }
                                      disabled={
                                        !canSetAsDefault ||
                                        Boolean(defaultCitySavingId)
                                      }
                                    >
                                      {isSettingDefault ? (
                                        <Loader2 className='h-4 w-4 animate-spin' />
                                      ) : (
                                        <MapPin className='h-4 w-4' />
                                      )}
                                    </Button>
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent side='top'>
                                  {isRowDefaultCity
                                    ? 'Current default city'
                                    : city.isActive === false
                                      ? 'Only active cities can be set as default'
                                      : 'Set as default city'}
                                </TooltipContent>
                              </Tooltip>
                            ) : null}
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span>
                                  <Button
                                    variant='outline'
                                    size='sm'
                                    className='rounded-md'
                                    onClick={() => openEditSheet(city)}
                                    disabled={!canMutate}
                                    title={
                                      canMutate
                                        ? 'Edit city'
                                        : 'Only your cities can be edited'
                                    }
                                  >
                                    <Pencil className='h-4 w-4' />
                                  </Button>
                                </span>
                              </TooltipTrigger>
                              <TooltipContent side='top'>
                                {canMutate
                                  ? 'Edit city'
                                  : 'Only your cities can be edited'}
                              </TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span>
                                  <Button
                                    variant='destructive'
                                    size='sm'
                                    className='rounded-md'
                                    onClick={() => handleDelete(city)}
                                    disabled={
                                      !canMutate || deletingId === city._id
                                    }
                                    title={
                                      canMutate
                                        ? 'Delete city'
                                        : 'Only your cities can be deleted'
                                    }
                                  >
                                    {deletingId === city._id ? (
                                      <Loader2 className='h-4 w-4 animate-spin' />
                                    ) : (
                                      <Trash2 className='h-4 w-4' />
                                    )}
                                  </Button>
                                </span>
                              </TooltipTrigger>
                              <TooltipContent side='top'>
                                {canMutate
                                  ? 'Delete city'
                                  : 'Only your cities can be deleted'}
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </TableShell>
        ) : (
          <TableShell
            className='flex-1'
            title='Available countries'
            description=''
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className='min-w-[220px]'>Country</TableHead>
                  <TableHead className='min-w-[120px]'>States</TableHead>
                  <TableHead className='min-w-[120px]'>Cities</TableHead>
                  <TableHead className='min-w-[140px]'>Active Cities</TableHead>
                  <TableHead className='text-right'>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading || countriesLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className='h-24 text-center'>
                      <div className='text-muted-foreground flex items-center justify-center gap-2 text-sm'>
                        <Loader2 className='h-4 w-4 animate-spin' />
                        Loading countries...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : countrySummaryRows.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className='text-muted-foreground h-24 text-center'
                    >
                      No countries found for the current filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  countrySummaryRows.map((countryRow) => (
                    <TableRow key={countryRow.country.name}>
                      <TableCell>
                        <div className='flex items-center gap-3 text-sm font-medium'>
                          <CountryFlag country={countryRow.country} />
                          <div className='space-y-1'>
                            <div>{countryRow.country.name}</div>
                            <div className='text-muted-foreground text-xs'>
                              {countryRow.country.code || 'N/A'}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant='outline'
                          className='rounded-md border-slate-200 bg-slate-50 text-slate-700'
                        >
                          {countryRow.stateCount}
                        </Badge>
                      </TableCell>
                      <TableCell className='text-sm text-slate-600'>
                        {countryRow.cityCount}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant='outline'
                          className='rounded-md border-emerald-200 bg-emerald-50 text-emerald-700'
                        >
                          {countryRow.activeCityCount} active
                        </Badge>
                      </TableCell>
                      <TableCell className='text-right'>
                        <div className='flex justify-end gap-2'>
                          <Button
                            type='button'
                            variant='outline'
                            size='sm'
                            className='rounded-md'
                            onClick={() =>
                              void handleUpdateDefaultCountry(
                                countryRow.country.name
                              )
                            }
                            disabled={
                              defaultCitySavingId ===
                                `country:${countryRow.country.name}` ||
                              countryRow.defaultLocationId ===
                                currentDefaultCityId ||
                              (normalizeSearchValue(defaultCityMeta.name) ===
                                normalizeSearchValue(countryRow.country.name) &&
                                !normalizeText(defaultCityMeta.state))
                            }
                          >
                            {defaultCitySavingId ===
                            `country:${countryRow.country.name}` ? (
                              <Loader2 className='h-4 w-4 animate-spin' />
                            ) : null}
                            {countryRow.defaultLocationId ===
                              currentDefaultCityId ||
                            (normalizeSearchValue(defaultCityMeta.name) ===
                              normalizeSearchValue(countryRow.country.name) &&
                              !normalizeText(defaultCityMeta.state))
                              ? 'Default Country'
                              : 'Use As Default'}
                          </Button>
                          <Button
                            type='button'
                            variant='outline'
                            size='sm'
                            className='rounded-md'
                            onClick={() => {
                              setManagerView('cities')
                              setCountryFilter(countryRow.country.name)
                              setStateFilter('all')
                              setPage(1)
                            }}
                          >
                            View Cities
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableShell>
        )}
      </Main>

      <Sheet
        open={sheetOpen}
        onOpenChange={(open) => {
          setSheetOpen(open)
          if (!open) resetSheetState()
        }}
      >
        <SheetContent side='right' className='w-full gap-0 p-0 sm:max-w-2xl text-slate-900'>
          <SheetHeader className='border-b px-5 py-5 pr-14 text-left'>
            <SheetTitle>{editingCity ? 'Edit City' : 'Create City'}</SheetTitle>
            <SheetDescription>
              {editingCity
                ? 'Update one city from your current list.'
                : 'Search for any city directly. We will auto-detect the state and country for you.'}
            </SheetDescription>
          </SheetHeader>
          <form
            onSubmit={handleSubmit}
            className='flex min-h-0 flex-1 flex-col overflow-hidden'
          >
            <div className='flex-1 overflow-y-auto px-5 py-5'>

              <div className='mt-3 grid gap-4 sm:grid-cols-2'>
                <div className='space-y-1.5'>
                  <label className='text-[10px] font-bold text-slate-500 uppercase tracking-wider'>Country</label>
                  <Select
                    value={form.country}
                    onValueChange={handleCountryChange}
                  >
                    <SelectTrigger className='h-11 bg-slate-50 border-slate-200'>
                      <span className='flex items-center gap-2 truncate'>
                        <CountryFlag country={selectedFormCountry} />
                        <span className='truncate font-medium'>
                          {countriesLoading && !countryOptions.length
                            ? 'Loading countries...'
                            : selectedFormCountry.name}
                        </span>
                      </span>
                    </SelectTrigger>
                    <SelectContent>
                      {countryOptions.map((country) => (
                        <SelectItem key={country.name} value={country.name}>
                          <span className='flex items-center gap-2'>
                            <CountryFlag country={country} />
                            <span>{country.name}</span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className='space-y-1.5'>
                  <label className='text-[10px] font-bold text-slate-500 uppercase tracking-wider'>State</label>
                  <Select value={form.state} onValueChange={handleStateChange}>
                    <SelectTrigger className='h-11 bg-slate-50 border-slate-200'>
                      <span className='truncate font-medium'>
                        {form.state ||
                          (statesLoading
                            ? 'Loading...'
                            : 'Select state')}
                      </span>
                    </SelectTrigger>
                    <SelectContent>
                      {formStateOptions.length ? (
                        formStateOptions.map((stateName) => (
                          <SelectItem key={stateName} value={stateName}>
                            {stateName}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value='__placeholder' disabled>
                          No states available
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {!editingCity ? (
                <div className='bg-background mt-5 rounded-md border p-6 shadow-sm space-y-6'>
                  <div className='space-y-3'>
                    <div className='flex items-center justify-between gap-3'>
                      <label className='text-sm font-bold text-slate-800'>
                        Cities Discovery
                      </label>
                      <Badge variant='outline' className='rounded-md bg-primary/5 text-primary border-primary/20 font-semibold'>
                        {queuedCities.length} In Queue
                      </Badge>
                    </div>
                    <SearchableMultiSelect
                      values={queuedCities.map((c) => c.name)}
                      options={globalCitiesOptions}
                      onChange={handleSuggestedCitiesChange}
                      placeholder='Search and select cities (e.g. Mumbai)'
                      searchPlaceholder='Type city name...'
                      emptyLabel='City not found.'
                      loading={loadingStateCities}
                      triggerFlag={selectedFormCountry.flag}
                      headerAction={(close) => (
                        <Button
                          type='button'
                          variant='ghost'
                          size='sm'
                          className='w-full justify-start text-xs text-primary hover:text-primary hover:bg-primary/5 h-9 px-3 font-bold border-b border-primary/10 rounded-none'
                          onClick={() => {
                             close();
                             setManualCityDialogOpen(true);
                          }}
                        >
                          <Plus className='mr-2 h-4 w-4' />
                          Can't find your city? Add manually
                        </Button>
                      )}
                    />
                    <p className='text-muted-foreground text-[10px] italic'>
                      Search results depend on your Selected State ({form.state || 'None'}).
                    </p>
                  </div>

                  {queuedCities.length > 0 && (
                    <div className='rounded-xl border border-slate-100 bg-slate-50/30 p-4'>
                      <div className='flex items-center justify-between mb-3'>
                         <span className='text-[10px] font-bold uppercase tracking-widest text-slate-400'>Added to Queue</span>
                         <Button
                            type='button'
                            variant='ghost'
                            size='sm'
                            onClick={() => {
                              setQueuedCities([])
                              setForm((current) => ({ ...current, name: '' }))
                            }}
                            className='h-6 px-2 text-[10px] font-bold text-slate-400'
                          >
                            Clear All
                          </Button>
                      </div>
                      <div className='flex flex-wrap gap-2'>
                        {queuedCities.map((city) => (
                          <Badge
                            key={`${city.name}-${city.state}`}
                            variant='secondary'
                            className='gap-2 rounded-lg px-3 py-1.5 bg-white border border-slate-100 shadow-sm transition-all hover:bg-slate-50'
                          >
                            <span className='font-medium text-slate-700'>
                              {city.name}
                              {city.state ? <span className='ml-1 text-[10px] text-slate-400 font-normal'>({city.state})</span> : null}
                            </span>
                            <button
                              type='button'
                              className='text-slate-300 hover:text-rose-500 transition-colors'
                              onClick={() => handleRemoveQueuedCity(city)}
                            >
                              <X className='h-3.5 w-3.5' />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedDiscoveredCities.length > 0 && (
                    <div className='space-y-3 border-t pt-2'>
                      <div className='flex items-center justify-between gap-3'>
                        <span className='text-[10px] font-bold uppercase tracking-widest text-slate-400'>
                          Selected From Discovery
                        </span>
                        <Badge
                          variant='outline'
                          className='rounded-md border-slate-200 bg-white text-[10px] font-semibold text-slate-500'
                        >
                          {selectedDiscoveredCities.length} selected
                        </Badge>
                      </div>
                      <div className='flex flex-wrap gap-2'>
                        {selectedDiscoveredCities.map((city) => (
                          <Badge
                            key={`selected-${city.name}-${city.state}-${city.country}`}
                            variant='secondary'
                            className='gap-2 rounded-lg border border-slate-100 bg-white px-3 py-1.5 shadow-sm transition-all hover:bg-slate-50'
                          >
                            <span className='font-medium text-slate-700'>
                              {city.name}
                              {city.state ? (
                                <span className='ml-1 text-[10px] font-normal text-slate-400'>
                                  ({city.state})
                                </span>
                              ) : null}
                            </span>
                            <button
                              type='button'
                              className='text-slate-300 transition-colors hover:text-rose-500'
                              onClick={() => handleRemoveQueuedCity(city)}
                            >
                              <X className='h-3.5 w-3.5' />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div className='pt-2 border-t flex flex-wrap gap-3'>
                    <Button
                      type='button'
                      variant='outline'
                      size='sm'
                      className='h-9 rounded-lg border-slate-200 bg-white shadow-none text-xs font-semibold'
                      onClick={handleQueueAllDiscovered}
                      disabled={!discoveredCities.length}
                    >
                      <Plus className='mr-2 h-3.5 w-3.5' />
                      Add all {discoveredCities.length} cities from {form.state}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className='bg-background mt-5 rounded-md border p-6 shadow-sm space-y-4'>
                   <div>
                      <label className='text-sm font-bold text-slate-800 mb-2 block'>City Name</label>
                      <Input
                        value={form.name}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            name: toTitleCase(event.target.value),
                          }))
                        }
                        placeholder='e.g. Bangalore'
                        className='h-11'
                      />
                   </div>
                </div>
              )}

              <div className='bg-background mt-6 rounded-md border p-6 shadow-sm transition-all hover:border-primary/20'>
                <div className='flex items-center justify-between gap-3'>
                  <div>
                    <p className='text-sm font-bold text-slate-800 transition-none'>City Status</p>
                    <p className='text-muted-foreground text-xs'>
                      Control whether the city remains available for selection.
                    </p>
                  </div>
                  <div className='flex items-center gap-3'>
                    <span className={cn('text-xs font-bold uppercase tracking-wider', form.isActive ? 'text-emerald-600' : 'text-slate-400')}>
                      {form.isActive ? 'Live' : 'Hidden'}
                    </span>
                    <Switch
                      checked={form.isActive}
                      onCheckedChange={(checked) =>
                        setForm((current) => ({
                          ...current,
                          isActive: checked,
                        }))
                      }
                    />
                  </div>
                </div>
              </div>
            </div>

            <SheetFooter className='border-t px-5 py-4 sm:flex-row sm:justify-end bg-slate-50/50'>
              <Button
                type='button'
                variant='ghost'
                className='font-semibold text-slate-500'
                onClick={() => {
                  setSheetOpen(false)
                  resetSheetState()
                }}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button type='submit' disabled={saving} className='min-w-[120px] font-bold shadow-md shadow-primary/20'>
                {saving ? (
                  <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                ) : null}
                {editingCity ? 'Update City' : 'Save Cities'}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      {/* Manual City Entry Dialog (Pop-up) */}
      <Dialog open={manualCityDialogOpen} onOpenChange={setManualCityDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" />
              Add City Manually
            </DialogTitle>
            <DialogDescription>
              {form.state 
                ? `Adding city for ${form.state}, ${form.country}.` 
                : "Enter the city name and state below."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {!form.state && (
              <div className="space-y-2">
                 <label className='text-sm font-medium'>State</label>
                 <Select value={form.state} onValueChange={handleStateChange}>
                    <SelectTrigger className='h-11 bg-slate-50 border-slate-200'>
                      <span className='truncate font-medium'>
                        {form.state || (statesLoading ? 'Loading...' : 'Choose state')}
                      </span>
                    </SelectTrigger>
                    <SelectContent>
                      {formStateOptions.length ? (
                        formStateOptions.map((stateName) => (
                          <SelectItem key={stateName} value={stateName}>
                            {stateName}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value='__placeholder' disabled>
                          No states available
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
              </div>
            )}
            <div className="space-y-2">
              <label className="text-sm font-medium">City Name</label>
              <Input
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    name: toTitleCase(event.target.value),
                  }))
                }
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    handleAddManualCity()
                  }
                }}
                placeholder='Enter city name manually'
                className='h-11'
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type='button'
              variant='ghost'
              onClick={() => setManualCityDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type='button'
              onClick={handleAddManualCity}
              disabled={!normalizeText(form.name)}
              className="font-bold"
            >
              Add to Queue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
