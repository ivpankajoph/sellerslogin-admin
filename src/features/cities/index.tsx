import { useCallback, useEffect, useMemo, useState } from 'react'
import type { RootState } from '@/store'
import { Globe2, Loader2, Pencil, Plus, RefreshCw, Trash2 } from 'lucide-react'
import { useSelector } from 'react-redux'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
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
  isActive: boolean
  createdBy?: string
  canEdit?: boolean
  canDelete?: boolean
  createdAt?: string
}

type CountryConfig = {
  code: string
  name: string
  states: string[]
}

const API_BASE = String(import.meta.env.VITE_PUBLIC_API_URL || '').replace(
  /\/$/,
  ''
)

const COUNTRY_CONFIGS: CountryConfig[] = [
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

const DEFAULT_FORM = {
  name: '',
  state: '',
  country: 'India',
  isActive: true,
}

const normalizeText = (value: unknown) => String(value || '').trim()

const normalizeSearchValue = (value: unknown) =>
  normalizeText(value).toLowerCase().replace(/\s+/g, ' ')

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

const getFlagEmoji = (countryCode?: string) => {
  const code = normalizeText(countryCode).toUpperCase()
  if (code.length !== 2) return ''
  return String.fromCodePoint(
    ...Array.from(code).map((char) => 127397 + char.charCodeAt(0))
  )
}

const getCountryConfig = (countryName?: string) => {
  const normalizedCountry = normalizeSearchValue(countryName)
  return (
    COUNTRY_CONFIGS.find(
      (country) => normalizeSearchValue(country.name) === normalizedCountry
    ) || null
  )
}

const getCountryMeta = (countryName?: string) => {
  const config = getCountryConfig(countryName)
  const name = normalizeText(countryName) || config?.name || 'Unknown'
  return {
    name,
    code: config?.code || '',
    flag: getFlagEmoji(config?.code),
  }
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

export default function CitiesPage() {
  const token = useSelector((state: RootState) => state.auth?.token || '')
  const authUser = useSelector((state: RootState) => state.auth?.user || null)
  const role = normalizeRole(authUser?.role)
  const isAdmin = role === 'admin' || role === 'superadmin'
  const isVendor = role === 'vendor'
  const canAccess = isAdmin || isVendor
  const currentUserId = normalizeText(authUser?.id || authUser?._id)

  const [cities, setCities] = useState<CityRow[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [countryFilter, setCountryFilter] = useState('all')
  const [stateFilter, setStateFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingCity, setEditingCity] = useState<CityRow | null>(null)
  const [form, setForm] = useState(DEFAULT_FORM)
  const [discoveredCities, setDiscoveredCities] = useState<string[]>([])
  const [discoveredSearch, setDiscoveredSearch] = useState('')
  const [selectedSuggestedCity, setSelectedSuggestedCity] = useState('')
  const [queuedCities, setQueuedCities] = useState<string[]>([])
  const [loadingStateCities, setLoadingStateCities] = useState(false)

  const resetSheetState = useCallback(() => {
    setEditingCity(null)
    setForm(DEFAULT_FORM)
    setDiscoveredCities([])
    setDiscoveredSearch('')
    setSelectedSuggestedCity('')
    setQueuedCities([])
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

  const loadStateCities = useCallback(
    async (stateName: string, countryName: string) => {
      const safeState = normalizeText(stateName)
      const safeCountry = normalizeText(countryName) || 'India'

      if (!safeState || !token) {
        setDiscoveredCities([])
        setSelectedSuggestedCity('')
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
        setSelectedSuggestedCity((current) =>
          options.includes(current) ? current : ''
        )
      } catch (fetchError: any) {
        setDiscoveredCities([])
        setSelectedSuggestedCity('')
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
    if (!sheetOpen || !form.state) {
      setDiscoveredCities([])
      setSelectedSuggestedCity('')
      setDiscoveredSearch('')
      return
    }

    loadStateCities(form.state, form.country)
  }, [form.country, form.state, loadStateCities, sheetOpen])

  const countryOptions = useMemo(() => {
    const countryNames = uniqueStrings([
      ...COUNTRY_CONFIGS.map((country) => country.name),
      ...cities.map((city) => city.country || ''),
    ])

    return countryNames
      .map((countryName) => getCountryMeta(countryName))
      .sort((left, right) => {
        if (left.name === 'India') return -1
        if (right.name === 'India') return 1
        return left.name.localeCompare(right.name)
      })
  }, [cities])

  const tableStateOptions = useMemo(() => {
    const visibleCities =
      countryFilter === 'all'
        ? cities
        : cities.filter(
            (city) =>
              normalizeSearchValue(city.country || 'India') ===
              normalizeSearchValue(countryFilter)
          )

    return uniqueStrings(visibleCities.map((city) => city.state || '')).sort(
      (a, b) => a.localeCompare(b)
    )
  }, [cities, countryFilter])

  const formStateOptions = useMemo(() => {
    const configStates = getCountryConfig(form.country)?.states || []
    const dynamicStates = cities
      .filter(
        (city) =>
          normalizeSearchValue(city.country || 'India') ===
          normalizeSearchValue(form.country)
      )
      .map((city) => city.state || '')

    return uniqueStrings([...configStates, ...dynamicStates]).sort((a, b) =>
      a.localeCompare(b)
    )
  }, [cities, form.country])

  const filteredDiscoveredCities = useMemo(() => {
    const query = normalizeSearchValue(discoveredSearch)
    if (!query) return discoveredCities

    return discoveredCities.filter((city) =>
      normalizeSearchValue(city).includes(query)
    )
  }, [discoveredCities, discoveredSearch])

  const filteredCities = useMemo(() => {
    const query = normalizeSearchValue(searchTerm)

    return [...cities]
      .filter((city) => {
        const matchesCountry =
          countryFilter === 'all' ||
          normalizeSearchValue(city.country || 'India') ===
            normalizeSearchValue(countryFilter)

        const matchesState =
          stateFilter === 'all' ||
          normalizeSearchValue(city.state) === normalizeSearchValue(stateFilter)

        if (!matchesCountry || !matchesState) return false
        if (!query) return true

        return normalizeSearchValue(
          `${city.name} ${city.slug} ${city.state || ''} ${city.country || ''}`
        ).includes(query)
      })
      .sort((left, right) => left.name.localeCompare(right.name))
  }, [cities, countryFilter, searchTerm, stateFilter])

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
    setDiscoveredCities([])
    setDiscoveredSearch('')
    setSelectedSuggestedCity('')
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
    setDiscoveredCities([])
    setDiscoveredSearch('')
    setSelectedSuggestedCity('')
    setQueuedCities([])
  }

  const handleStateChange = (nextState: string) => {
    setForm((current) => ({
      ...current,
      state: nextState,
      name: editingCity ? current.name : '',
    }))
    setDiscoveredSearch('')
    setSelectedSuggestedCity('')
    setQueuedCities([])
  }

  const handleQueueCities = () => {
    if (editingCity) return
    if (!form.state) {
      toast.error('Select a state first')
      return
    }

    const nextQueued = uniqueStrings([selectedSuggestedCity, form.name])
    if (!nextQueued.length) {
      toast.error('Select a city or type a manual city name')
      return
    }

    setQueuedCities((current) =>
      uniqueStrings([...current, ...nextQueued]).sort((a, b) =>
        a.localeCompare(b)
      )
    )
    setSelectedSuggestedCity('')
    setForm((current) => ({ ...current, name: '' }))
  }

  const handleQueueAllFiltered = () => {
    if (editingCity) return
    if (!filteredDiscoveredCities.length) {
      toast.error('No state cities available to add')
      return
    }

    setQueuedCities((current) =>
      uniqueStrings([...current, ...filteredDiscoveredCities]).sort((a, b) =>
        a.localeCompare(b)
      )
    )
    setSelectedSuggestedCity('')
    setForm((current) => ({ ...current, name: '' }))
  }

  const handleRemoveQueuedCity = (cityName: string) => {
    setQueuedCities((current) => current.filter((item) => item !== cityName))
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!token) return
    if (!form.country) {
      toast.error('Country is required')
      return
    }
    if (!form.state) {
      toast.error('State is required')
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
          ...queuedCities,
          selectedSuggestedCity,
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

  if (!canAccess) {
    return (
      <Main className='flex flex-1 flex-col gap-4 sm:gap-6'>
        <div className='rounded-md border border-rose-200 bg-rose-50 px-4 py-5 text-sm text-rose-700'>
          Only admins and vendors can manage cities.
        </div>
      </Main>
    )
  }

  const selectedFormCountry = getCountryMeta(form.country)

  return (
    <>
      <TablePageHeader
        title='Cities'
        stacked
        actionsClassName='gap-2'
        showHeaderChrome={false}
      >
        <Input
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder='Search city, state, or country'
          className='h-10 w-[320px] shrink-0'
        />
        <Select value={countryFilter} onValueChange={setCountryFilter}>
          <SelectTrigger className='h-10 w-[220px] shrink-0'>
            {countryFilter === 'all' ? (
              <span className='truncate'>All countries</span>
            ) : (
              <span className='flex items-center gap-2 truncate'>
                <span className='text-base leading-none'>
                  {getCountryMeta(countryFilter).flag || 'Global'}
                </span>
                <span className='truncate'>{countryFilter}</span>
              </span>
            )}
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='all'>All countries</SelectItem>
            {countryOptions.map((country) => (
              <SelectItem key={country.name} value={country.name}>
                <span className='flex items-center gap-2'>
                  <span>{country.flag || 'Global'}</span>
                  <span>{country.name}</span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={stateFilter} onValueChange={setStateFilter}>
          <SelectTrigger className='h-10 w-[220px] shrink-0'>
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
          className='h-10 shrink-0'
          onClick={() => loadCities()}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className='mr-2 h-4 w-4 animate-spin' />
          ) : (
            <RefreshCw className='mr-2 h-4 w-4' />
          )}
          Refresh
        </Button>
        <Button className='h-10 shrink-0' onClick={openCreateSheet}>
          <Plus className='mr-2 h-4 w-4' />
          Create City
        </Button>
      </TablePageHeader>

      <Main className='flex flex-1 flex-col gap-4 md:gap-6'>
        {error ? (
          <div className='rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700'>
            {error}
          </div>
        ) : null}

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
                  const countryMeta = getCountryMeta(city.country || 'India')
                  const canMutate = canMutateCity({
                    city,
                    isAdmin,
                    isVendor,
                    currentUserId,
                  })

                  return (
                    <TableRow key={city._id}>
                      <TableCell>
                        <div className='space-y-1'>
                          <div className='text-sm font-medium'>{city.name}</div>
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
                          {countryMeta.flag ? (
                            <span className='text-base leading-none'>
                              {countryMeta.flag}
                            </span>
                          ) : (
                            <Globe2 className='text-muted-foreground h-4 w-4' />
                          )}
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
                          <Button
                            variant='destructive'
                            size='sm'
                            className='rounded-md'
                            onClick={() => handleDelete(city)}
                            disabled={!canMutate || deletingId === city._id}
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
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </TableShell>
      </Main>

      <Sheet
        open={sheetOpen}
        onOpenChange={(open) => {
          setSheetOpen(open)
          if (!open) resetSheetState()
        }}
      >
        <SheetContent side='right' className='w-full gap-0 p-0 sm:max-w-2xl'>
          <SheetHeader className='border-b px-5 py-5 pr-14 text-left'>
            <SheetTitle>{editingCity ? 'Edit City' : 'Create City'}</SheetTitle>
            <SheetDescription>
              {editingCity
                ? 'Update one city from your current list.'
                : 'Choose a country, state, and city from the dropdown or add one manually.'}
            </SheetDescription>
          </SheetHeader>
          <form
            onSubmit={handleSubmit}
            className='flex min-h-0 flex-1 flex-col overflow-hidden'
          >
            <div className='flex-1 overflow-y-auto px-5 py-5'>
              <div className='grid gap-3 sm:grid-cols-3'>
                <div className='bg-background rounded-md border px-4 py-3 shadow-sm'>
                  <p className='text-muted-foreground text-xs font-medium'>
                    Country
                  </p>
                  <div className='mt-1 flex items-center gap-2 text-sm font-semibold'>
                    {selectedFormCountry.flag ? (
                      <span className='text-base leading-none'>
                        {selectedFormCountry.flag}
                      </span>
                    ) : (
                      <Globe2 className='h-4 w-4' />
                    )}
                    <span>{selectedFormCountry.name}</span>
                  </div>
                </div>
                <div className='bg-background rounded-md border px-4 py-3 shadow-sm'>
                  <p className='text-muted-foreground text-xs font-medium'>
                    Selected state
                  </p>
                  <p className='mt-1 text-sm font-semibold'>
                    {form.state || 'Choose state'}
                  </p>
                </div>
                <div className='bg-background rounded-md border px-4 py-3 shadow-sm'>
                  <p className='text-muted-foreground text-xs font-medium'>
                    Available state cities
                  </p>
                  <p className='mt-1 text-sm font-semibold'>
                    {loadingStateCities
                      ? 'Loading...'
                      : discoveredCities.length}
                  </p>
                </div>
              </div>

              <div className='mt-5 grid gap-4 sm:grid-cols-2'>
                <div className='space-y-2'>
                  <label className='text-sm font-medium'>Country</label>
                  <Select
                    value={form.country}
                    onValueChange={handleCountryChange}
                  >
                    <SelectTrigger className='h-11'>
                      <span className='flex items-center gap-2 truncate'>
                        <span className='text-base leading-none'>
                          {selectedFormCountry.flag || 'Global'}
                        </span>
                        <span className='truncate'>
                          {selectedFormCountry.name}
                        </span>
                      </span>
                    </SelectTrigger>
                    <SelectContent>
                      {countryOptions.map((country) => (
                        <SelectItem key={country.name} value={country.name}>
                          <span className='flex items-center gap-2'>
                            <span>{country.flag || 'Global'}</span>
                            <span>{country.name}</span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className='space-y-2'>
                  <label className='text-sm font-medium'>State</label>
                  <Select value={form.state} onValueChange={handleStateChange}>
                    <SelectTrigger className='h-11'>
                      <span className='truncate'>
                        {form.state || 'Select state'}
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
                <div className='bg-background mt-5 rounded-md border p-4 shadow-sm'>
                  <div className='grid gap-4 sm:grid-cols-2'>
                    <div className='space-y-2'>
                      <label className='text-sm font-medium'>
                        Search available cities
                      </label>
                      <Input
                        value={discoveredSearch}
                        onChange={(event) =>
                          setDiscoveredSearch(event.target.value)
                        }
                        placeholder={
                          form.state
                            ? 'Filter selected state cities'
                            : 'Select state first'
                        }
                        disabled={!form.state || loadingStateCities}
                      />
                    </div>

                    <div className='space-y-2'>
                      <label className='text-sm font-medium'>
                        City from selected state
                      </label>
                      <Select
                        value={selectedSuggestedCity}
                        onValueChange={setSelectedSuggestedCity}
                      >
                        <SelectTrigger className='h-11'>
                          <span className='truncate'>
                            {selectedSuggestedCity ||
                              (loadingStateCities
                                ? 'Loading cities...'
                                : form.state
                                  ? 'Select available city'
                                  : 'Select state first')}
                          </span>
                        </SelectTrigger>
                        <SelectContent>
                          {filteredDiscoveredCities.length ? (
                            filteredDiscoveredCities.map((cityName) => (
                              <SelectItem key={cityName} value={cityName}>
                                {cityName}
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value='__placeholder' disabled>
                              {form.state
                                ? 'No cities found'
                                : 'Select state first'}
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className='mt-4 space-y-2'>
                    <label className='text-sm font-medium'>
                      Manual city name
                    </label>
                    <Input
                      value={form.name}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          name: toTitleCase(event.target.value),
                        }))
                      }
                      placeholder='Type a new city if it is not in the dropdown'
                    />
                  </div>

                  <div className='mt-4 flex flex-wrap gap-2'>
                    <Button
                      type='button'
                      variant='outline'
                      onClick={handleQueueCities}
                    >
                      <Plus className='mr-2 h-4 w-4' />
                      Add City
                    </Button>
                    <Button
                      type='button'
                      variant='outline'
                      onClick={handleQueueAllFiltered}
                      disabled={!filteredDiscoveredCities.length}
                    >
                      Add All Visible Cities
                    </Button>
                    <Button
                      type='button'
                      variant='ghost'
                      onClick={() => {
                        setQueuedCities([])
                        setSelectedSuggestedCity('')
                        setForm((current) => ({ ...current, name: '' }))
                      }}
                      disabled={
                        !queuedCities.length &&
                        !selectedSuggestedCity &&
                        !normalizeText(form.name)
                      }
                    >
                      Clear Selection
                    </Button>
                  </div>

                  <div className='mt-4 rounded-md border border-dashed px-4 py-3'>
                    <p className='text-muted-foreground text-xs font-medium tracking-[0.2em] uppercase'>
                      Cities To Create
                    </p>
                    {queuedCities.length ? (
                      <div className='mt-3 flex flex-wrap gap-2'>
                        {queuedCities.map((cityName) => (
                          <Badge
                            key={cityName}
                            variant='secondary'
                            className='gap-2 rounded-md px-2 py-1'
                          >
                            <span>{cityName}</span>
                            <button
                              type='button'
                              className='text-xs'
                              onClick={() => handleRemoveQueuedCity(cityName)}
                            >
                              x
                            </button>
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <p className='text-muted-foreground mt-2 text-sm'>
                        Add one or more cities from the dropdown or manual
                        input.
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className='bg-background mt-5 rounded-md border p-4 shadow-sm'>
                  <div className='space-y-2'>
                    <label className='text-sm font-medium'>City name</label>
                    <Input
                      value={form.name}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          name: toTitleCase(event.target.value),
                        }))
                      }
                      placeholder='e.g. Bangalore'
                    />
                  </div>
                </div>
              )}

              <div className='bg-background mt-5 rounded-md border p-4 shadow-sm'>
                <div className='flex items-center justify-between gap-3'>
                  <div>
                    <p className='text-sm font-medium'>City status</p>
                    <p className='text-muted-foreground text-sm'>
                      Control whether the city remains available in your list.
                    </p>
                  </div>
                  <div className='flex items-center gap-3'>
                    <span className='text-sm text-slate-600'>
                      {form.isActive ? 'Active' : 'Inactive'}
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

              {!editingCity && discoveredCities.length ? (
                <div className='bg-background mt-5 rounded-md border p-4 shadow-sm'>
                  <div className='mb-3 flex items-center justify-between gap-3'>
                    <div>
                      <p className='text-sm font-medium'>
                        Available in selected state
                      </p>
                      <p className='text-muted-foreground text-sm'>
                        Quick-pick cities from the discovered state list.
                      </p>
                    </div>
                    <Badge variant='outline' className='rounded-md'>
                      {filteredDiscoveredCities.length} shown
                    </Badge>
                  </div>

                  <div className='grid gap-2 sm:grid-cols-2'>
                    {filteredDiscoveredCities.slice(0, 12).map((cityName) => {
                      const checked = queuedCities.includes(cityName)
                      return (
                        <label
                          key={cityName}
                          className='flex items-center gap-2 rounded-md border px-3 py-2'
                        >
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(checkedState) => {
                              setQueuedCities((current) =>
                                checkedState === true
                                  ? uniqueStrings([...current, cityName]).sort(
                                      (a, b) => a.localeCompare(b)
                                    )
                                  : current.filter((item) => item !== cityName)
                              )
                            }}
                          />
                          <span className='text-sm'>{cityName}</span>
                        </label>
                      )
                    })}
                  </div>
                  {filteredDiscoveredCities.length > 12 ? (
                    <p className='text-muted-foreground mt-3 text-xs'>
                      Narrow with search to pick more cities from this state.
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>

            <SheetFooter className='border-t px-5 py-4 sm:flex-row sm:justify-end'>
              <Button
                type='button'
                variant='outline'
                onClick={() => {
                  setSheetOpen(false)
                  resetSheetState()
                }}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button type='submit' disabled={saving}>
                {saving ? (
                  <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                ) : null}
                {editingCity ? 'Update City' : 'Save Cities'}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </>
  )
}
