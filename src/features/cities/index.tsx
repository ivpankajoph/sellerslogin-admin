import { useCallback, useEffect, useMemo, useState } from 'react'
import { Loader2, MapPin, Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useSelector } from 'react-redux'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { ConfigDrawer } from '@/components/config-drawer'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

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

export default function CitiesPage() {
  const token = useSelector((state: any) => state.auth?.token || '')
  const authUser = useSelector((state: any) => state.auth?.user || null)
  const role = normalizeRole(useSelector((state: any) => state.auth?.user?.role))
  const isAdmin = role === 'admin' || role === 'superadmin'
  const isVendor = role === 'vendor'
  const canAccess = isAdmin || isVendor
  const currentUserId = String(authUser?.id || authUser?._id || '')

  const [cities, setCities] = useState<CityRow[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [form, setForm] = useState({
    name: '',
    state: '',
    country: 'India',
    isActive: true,
  })

  const loadCities = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(
        `${import.meta.env.VITE_PUBLIC_API_URL}/v1/cities?includeInactive=true`,
        {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        }
      )
      const data = await res.json()
      if (!res.ok || data?.success === false) {
        throw new Error(data?.message || `Failed to load cities (HTTP ${res.status})`)
      }
      setCities(Array.isArray(data?.data) ? data.data : [])
    } catch (error: any) {
      toast.error(error?.message || 'Failed to load cities')
      setCities([])
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    if (!canAccess) return
    loadCities()
  }, [canAccess, loadCities])

  const resetForm = () => {
    setEditingId(null)
    setForm({
      name: '',
      state: '',
      country: 'India',
      isActive: true,
    })
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!form.name.trim()) {
      toast.error('City name is required')
      return
    }
    setSaving(true)
    try {
      const endpoint = editingId
        ? `${import.meta.env.VITE_PUBLIC_API_URL}/v1/cities/${editingId}`
        : `${import.meta.env.VITE_PUBLIC_API_URL}/v1/cities`
      const method = editingId ? 'PUT' : 'POST'

      const res = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok || data?.success === false) {
        throw new Error(data?.message || `Failed to save city (HTTP ${res.status})`)
      }
      toast.success(editingId ? 'City updated' : 'City created')
      resetForm()
      loadCities()
    } catch (error: any) {
      toast.error(error?.message || 'Failed to save city')
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (city: CityRow) => {
    const canMutate =
      isAdmin ||
      city.canEdit === true ||
      (isVendor && String(city.createdBy || '') === currentUserId)
    if (!canMutate) {
      toast.error('You can edit only cities created by you')
      return
    }

    setEditingId(city._id)
    setForm({
      name: city.name || '',
      state: city.state || '',
      country: city.country || 'India',
      isActive: city.isActive !== false,
    })
  }

  const handleDelete = async (city: CityRow) => {
    const canMutate =
      isAdmin ||
      city.canDelete === true ||
      (isVendor && String(city.createdBy || '') === currentUserId)
    if (!canMutate) {
      toast.error('You can delete only cities created by you')
      return
    }

    if (!window.confirm(`Delete city "${city.name}"?`)) return
    setDeletingId(city._id)
    try {
      const res = await fetch(
        `${import.meta.env.VITE_PUBLIC_API_URL}/v1/cities/${city._id}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )
      const data = await res.json()
      if (!res.ok || data?.success === false) {
        throw new Error(data?.message || `Failed to delete city (HTTP ${res.status})`)
      }
      toast.success('City deleted')
      loadCities()
    } catch (error: any) {
      toast.error(error?.message || 'Failed to delete city')
    } finally {
      setDeletingId(null)
    }
  }

  const filteredCities = useMemo(() => {
    const search = searchTerm.trim().toLowerCase()
    if (!search) return cities
    return cities.filter((city) =>
      `${city.name} ${city.slug} ${city.state || ''} ${city.country || ''}`
        .toLowerCase()
        .includes(search)
    )
  }, [cities, searchTerm])

  const stateOptions = useMemo(() => {
    const dynamicStates = cities
      .map((city) => city.state?.trim())
      .filter((state): state is string => Boolean(state))

    return Array.from(new Set([...INDIA_STATES, ...dynamicStates])).sort((a, b) =>
      a.localeCompare(b)
    )
  }, [cities])

  const countryOptions = useMemo(() => {
    const dynamicCountries = cities
      .map((city) => city.country?.trim())
      .filter((country): country is string => Boolean(country))
    const allCountries = Array.from(new Set([...DEFAULT_COUNTRIES, ...dynamicCountries]))
    const india = allCountries.find((country) => country.toLowerCase() === 'india')
    const rest = allCountries.filter((country) => country.toLowerCase() !== 'india')
    return india ? [india, ...rest.sort((a, b) => a.localeCompare(b))] : rest
  }, [cities])

  if (!canAccess) {
    return (
      <Main className='flex flex-1 flex-col gap-4 sm:gap-6'>
        <div className='rounded-xl border border-rose-200 bg-rose-50 px-4 py-5 text-sm text-rose-700'>
          Only admins and vendors can manage cities.
        </div>
      </Main>
    )
  }

  return (
    <>
      <Header fixed>
        <Search />
        <div className='ms-auto flex items-center space-x-4'>
          <ThemeSwitch />
          <ConfigDrawer />
          <ProfileDropdown />
        </div>
      </Header>

      <Main className='flex flex-1 flex-col gap-4 sm:gap-6'>
        <div className='flex flex-wrap items-end justify-between gap-2'>
          <div>
            <h2 className='text-2xl font-bold tracking-tight'>Manage Cities</h2>
            <p className='text-muted-foreground'>
              Create city list for city-wise product visibility in templates.
            </p>
          </div>
          <Button variant='outline' onClick={loadCities} disabled={loading}>
            {loading ? <Loader2 className='h-4 w-4 animate-spin' /> : <MapPin className='h-4 w-4' />}
            Refresh
          </Button>
        </div>

        <div className='grid gap-4 xl:grid-cols-[340px_1fr]'>
          <form
            onSubmit={handleSubmit}
            className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'
          >
            <h3 className='text-lg font-semibold text-slate-900'>
              {editingId ? 'Edit City' : 'Create City'}
            </h3>
            <div className='mt-4 space-y-3'>
              <div>
                <label className='mb-1 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500'>
                  City Name
                </label>
                <Input
                  value={form.name}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, name: toTitleCase(e.target.value) }))
                  }
                  placeholder='e.g. Bangalore'
                />
              </div>
              <div>
                <label className='mb-1 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500'>
                  State
                </label>
                <select
                  value={form.state}
                  onChange={(e) => setForm((prev) => ({ ...prev, state: e.target.value }))}
                  className='border-input focus-visible:border-ring focus-visible:ring-ring/50 dark:bg-input/30 dark:hover:bg-input/50 h-9 w-full rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-[3px]'
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
                  value={form.country}
                  onChange={(e) => setForm((prev) => ({ ...prev, country: e.target.value }))}
                  className='border-input focus-visible:border-ring focus-visible:ring-ring/50 dark:bg-input/30 dark:hover:bg-input/50 h-9 w-full rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-[3px]'
                >
                  {countryOptions.map((country) => (
                    <option key={country} value={country}>
                      {country}
                    </option>
                  ))}
                </select>
              </div>
              <label className='flex items-center gap-2 text-sm text-slate-700'>
                <input
                  type='checkbox'
                  checked={form.isActive}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, isActive: e.target.checked }))
                  }
                  className='h-4 w-4'
                />
                Active
              </label>
            </div>
            <div className='mt-5 flex gap-2'>
              <Button type='submit' disabled={saving} className='flex-1'>
                {saving ? <Loader2 className='h-4 w-4 animate-spin' /> : <Plus className='h-4 w-4' />}
                {editingId ? 'Update' : 'Create'}
              </Button>
              {editingId ? (
                <Button type='button' variant='outline' onClick={resetForm}>
                  Cancel
                </Button>
              ) : null}
            </div>
          </form>

          <div className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
            <div className='mb-4 flex flex-wrap items-center justify-between gap-2'>
              <h3 className='text-lg font-semibold text-slate-900'>
                City List ({filteredCities.length})
              </h3>
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder='Search cities...'
                className='max-w-xs'
              />
            </div>

            <div className='overflow-x-auto'>
              <table className='w-full min-w-[560px]'>
                <thead>
                  <tr className='border-b border-slate-200 text-left text-xs uppercase tracking-[0.2em] text-slate-500'>
                    <th className='pb-2'>City</th>
                    <th className='pb-2'>Slug</th>
                    <th className='pb-2'>State</th>
                    <th className='pb-2'>Status</th>
                    <th className='pb-2 text-right'>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCities.map((city) => (
                    <tr key={city._id} className='border-b border-slate-100'>
                      <td className='py-3 pr-3 font-medium text-slate-900'>{city.name}</td>
                      <td className='py-3 pr-3 text-slate-600'>{city.slug}</td>
                      <td className='py-3 pr-3 text-slate-600'>{city.state || '-'}</td>
                      <td className='py-3 pr-3'>
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                            city.isActive
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {city.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className='py-3 text-right'>
                        {(() => {
                          const canMutate =
                            isAdmin ||
                            city.canEdit === true ||
                            city.canDelete === true ||
                            (isVendor && String(city.createdBy || '') === currentUserId)
                          return (
                            <div className='inline-flex gap-2'>
                              <Button
                                size='sm'
                                variant='outline'
                                onClick={() => handleEdit(city)}
                                disabled={!canMutate}
                                title={canMutate ? 'Edit city' : 'Only your cities can be edited'}
                              >
                                <Pencil className='h-4 w-4' />
                              </Button>
                              <Button
                                size='sm'
                                variant='destructive'
                                disabled={!canMutate || deletingId === city._id}
                                onClick={() => handleDelete(city)}
                                title={canMutate ? 'Delete city' : 'Only your cities can be deleted'}
                              >
                                {deletingId === city._id ? (
                                  <Loader2 className='h-4 w-4 animate-spin' />
                                ) : (
                                  <Trash2 className='h-4 w-4' />
                                )}
                              </Button>
                            </div>
                          )
                        })()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {!loading && filteredCities.length === 0 ? (
              <div className='mt-4 rounded-lg border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500'>
                No cities found.
              </div>
            ) : null}
          </div>
        </div>
      </Main>
    </>
  )
}
