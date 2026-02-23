import { motion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import { useSelector } from 'react-redux'
import {
  Check,
  ChevronsUpDown,
  KeyRound,
  Loader2,
  Plus,
  Search as SearchIcon,
  Sparkles,
  Trash2,
} from 'lucide-react'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Input } from '@/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import type { RootState } from '@/store'

type MainCategory = {
  _id: string
  name: string
}

type KeyMapping = {
  _id: string
  main_category_id: { _id: string; name: string } | string
  keys: string[]
  updatedAt?: string
}

type MainCategorySelectProps = {
  categories: MainCategory[]
  value: string
  onChange: (value: string) => void
}

const parseKeysInput = (raw: string) =>
  Array.from(
    new Set(
      raw
        .split(/[\n,]/g)
        .map((value) => value.trim())
        .filter(Boolean)
    )
  )

const getMainCategoryId = (mapping: KeyMapping) =>
  typeof mapping.main_category_id === 'string'
    ? mapping.main_category_id
    : (mapping.main_category_id?._id ?? '')

const getMainCategoryName = (
  mapping: KeyMapping,
  mainCategoryNameById: Record<string, string>
) => {
  if (typeof mapping.main_category_id === 'string') {
    return mainCategoryNameById[mapping.main_category_id] || mapping.main_category_id
  }
  return mapping.main_category_id?.name || 'Unknown Main Category'
}

const formatUpdatedAt = (value?: string) => {
  if (!value) return 'Unknown'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return 'Unknown'
  return parsed.toLocaleString()
}

function MainCategorySelect({ categories, value, onChange }: MainCategorySelectProps) {
  const [open, setOpen] = useState(false)
  const selected = useMemo(
    () => categories.find((category) => category._id === value),
    [categories, value]
  )

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant='outline'
          role='combobox'
          aria-expanded={open}
          className={cn(
            'h-11 w-full justify-between rounded-xl border-slate-300 bg-white text-left shadow-sm hover:bg-slate-50',
            !selected && 'text-muted-foreground'
          )}
        >
          <span className='truncate'>
            {selected?.name || 'Choose main category'}
          </span>
          <ChevronsUpDown className='h-4 w-4 shrink-0 opacity-60' />
        </Button>
      </PopoverTrigger>
      <PopoverContent className='w-[--radix-popover-trigger-width] p-0' align='start'>
        <Command>
          <CommandInput placeholder='Search main category...' />
          <CommandList className='max-h-72'>
            <CommandEmpty>No category found.</CommandEmpty>
            <CommandGroup>
              {categories.map((category) => (
                <CommandItem
                  key={category._id}
                  value={`${category.name} ${category._id}`}
                  onSelect={() => {
                    onChange(category._id)
                    setOpen(false)
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      value === category._id ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  {category.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

export default function SpecificationKeysPage() {
  const token = useSelector((state: RootState) => state.auth?.token)
  const role = useSelector((state: RootState) => state.auth?.user?.role)

  const [mainCategories, setMainCategories] = useState<MainCategory[]>([])
  const [mappings, setMappings] = useState<KeyMapping[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [generatingKeys, setGeneratingKeys] = useState(false)
  const [selectedMainCategoryId, setSelectedMainCategoryId] = useState('')
  const [keysInput, setKeysInput] = useState('')
  const [quickKeyInput, setQuickKeyInput] = useState('')
  const [mappingSearch, setMappingSearch] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const isAdmin = role === 'admin'
  const baseUrl = `${import.meta.env.VITE_PUBLIC_API_URL}/v1`

  const authHeaders = useMemo(
    () => ({
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }),
    [token]
  )

  const sortedMainCategories = useMemo(
    () =>
      [...mainCategories].sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
      ),
    [mainCategories]
  )

  const mainCategoryNameById = useMemo(
    () =>
      mainCategories.reduce<Record<string, string>>((acc, category) => {
        acc[category._id] = category.name
        return acc
      }, {}),
    [mainCategories]
  )

  const selectedMainCategory = useMemo(
    () => mainCategories.find((category) => category._id === selectedMainCategoryId),
    [mainCategories, selectedMainCategoryId]
  )

  const parsedKeys = useMemo(() => parseKeysInput(keysInput), [keysInput])

  const filteredMappings = useMemo(() => {
    const query = mappingSearch.trim().toLowerCase()
    if (!query) return mappings

    return mappings.filter((mapping) => {
      const categoryName = getMainCategoryName(mapping, mainCategoryNameById).toLowerCase()
      const hasKey = mapping.keys.some((key) => key.toLowerCase().includes(query))
      return categoryName.includes(query) || hasKey
    })
  }, [mappings, mappingSearch, mainCategoryNameById])

  const fetchMainCategories = async () => {
    try {
      const res = await fetch(`${baseUrl}/maincategories/getall?limit=500`)
      if (!res.ok) throw new Error('Failed to fetch main categories')
      const json = await res.json()
      setMainCategories(Array.isArray(json?.data) ? json.data : [])
    } catch {
      setMainCategories([])
    }
  }

  const fetchMappings = async () => {
    if (!isAdmin) return
    try {
      setLoading(true)
      setError('')
      const res = await fetch(`${baseUrl}/admin/specification-keys`, {
        headers: authHeaders,
      })
      if (!res.ok) throw new Error('Failed to fetch specification keys')
      const json = await res.json()
      setMappings(Array.isArray(json?.data) ? json.data : [])
    } catch (err: any) {
      setMappings([])
      setError(err?.message || 'Failed to fetch specification key mappings')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMainCategories()
  }, [])

  useEffect(() => {
    fetchMappings()
  }, [isAdmin, token])

  const handleSave = async () => {
    if (!selectedMainCategoryId) {
      setError('Please select a main category.')
      return
    }

    if (!parsedKeys.length) {
      setError('Please enter at least one specification key.')
      return
    }

    try {
      setSaving(true)
      setError('')
      setMessage('')
      const res = await fetch(`${baseUrl}/admin/specification-keys`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          main_category_id: selectedMainCategoryId,
          keys: parsedKeys,
        }),
      })

      const json = await res.json()
      if (!res.ok || !json?.success) {
        throw new Error(json?.message || 'Failed to save specification keys')
      }

      setMessage('Specification keys saved successfully.')
      await fetchMappings()
    } catch (err: any) {
      setError(err?.message || 'Failed to save specification keys')
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (mapping: KeyMapping) => {
    setSelectedMainCategoryId(getMainCategoryId(mapping))
    setKeysInput(Array.isArray(mapping.keys) ? mapping.keys.join('\n') : '')
    setQuickKeyInput('')
    setMessage('Loaded mapping into editor.')
    setError('')
  }

  const handleDelete = async (id: string) => {
    try {
      setError('')
      setMessage('')
      const res = await fetch(`${baseUrl}/admin/specification-keys/${id}`, {
        method: 'DELETE',
        headers: authHeaders,
      })
      const json = await res.json()
      if (!res.ok || !json?.success) {
        throw new Error(json?.message || 'Failed to delete mapping')
      }

      setMessage('Mapping deleted successfully.')
      await fetchMappings()
    } catch (err: any) {
      setError(err?.message || 'Failed to delete mapping')
    }
  }

  const handleReset = () => {
    setSelectedMainCategoryId('')
    setKeysInput('')
    setQuickKeyInput('')
    setMessage('')
    setError('')
  }

  const handleAddQuickKey = () => {
    const nextKey = quickKeyInput.trim()
    if (!nextKey) return

    const nextKeys = Array.from(new Set([...parsedKeys, nextKey]))
    setKeysInput(nextKeys.join('\n'))
    setQuickKeyInput('')
  }

  const handleRemoveKey = (keyToRemove: string) => {
    const nextKeys = parsedKeys.filter((key) => key !== keyToRemove)
    setKeysInput(nextKeys.join('\n'))
  }

  const handleGenerateKeysWithAI = async () => {
    if (!selectedMainCategory?.name) {
      setError('Select a main category first to generate keys with AI.')
      return
    }

    try {
      setGeneratingKeys(true)
      setError('')
      setMessage('')

      const res = await fetch(`${baseUrl}/products/generate-specification-keys`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          category: selectedMainCategory.name,
        }),
      })

      const json = await res.json()
      if (!res.ok || !json?.success) {
        throw new Error(json?.message || 'Failed to generate specification keys')
      }

      const generatedKeys = Array.isArray(json?.data)
        ? json.data
            .map((value: unknown) => String(value || '').trim())
            .filter(Boolean)
        : []

      if (!generatedKeys.length) {
        throw new Error('AI did not return any keys. Please try again.')
      }

      const mergedKeys = Array.from(new Set([...parsedKeys, ...generatedKeys]))
      setKeysInput(mergedKeys.join('\n'))
      setMessage(
        `AI generated ${generatedKeys.length} keys for "${selectedMainCategory.name}" and merged them into the editor.`
      )
    } catch (err: any) {
      setError(err?.message || 'Failed to generate specification keys')
    } finally {
      setGeneratingKeys(false)
    }
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

      <Main className='relative flex flex-1 flex-col gap-5 overflow-x-clip pb-10 font-manrope sm:gap-6'>
        <div className='pointer-events-none absolute inset-0 -z-10 overflow-hidden'>
          <div className='absolute -left-24 -top-28 h-72 w-72 rounded-full bg-amber-300/20 blur-3xl' />
          <div className='absolute -right-24 top-8 h-96 w-96 rounded-full bg-cyan-300/15 blur-3xl' />
          <div className='absolute bottom-[-8rem] left-1/3 h-80 w-80 rounded-full bg-rose-200/20 blur-3xl' />
        </div>

        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className='rounded-3xl border border-amber-200/70 bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 p-6 shadow-[0_18px_45px_-28px_rgba(15,23,42,0.55)]'
        >
          <div className='flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between'>
            <div>
              <div className='mb-3 inline-flex items-center gap-2 rounded-full border border-amber-300 bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-700'>
                <Sparkles className='h-3.5 w-3.5' />
                Admin Controls
              </div>
              <h1 className='text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl'>
                Specification Keys
              </h1>
              <p className='mt-1 text-sm text-slate-600 sm:text-base'>
                Build clean, category-specific specification templates for product
                creation.
              </p>
            </div>
            <div className='grid grid-cols-2 gap-2 sm:grid-cols-3'>
              <div className='rounded-xl border border-white/80 bg-white/80 px-3 py-2'>
                <div className='text-[11px] uppercase tracking-[0.12em] text-slate-500'>
                  Main Categories
                </div>
                <div className='text-lg font-bold text-slate-900'>
                  {mainCategories.length}
                </div>
              </div>
              <div className='rounded-xl border border-white/80 bg-white/80 px-3 py-2'>
                <div className='text-[11px] uppercase tracking-[0.12em] text-slate-500'>
                  Key Sets
                </div>
                <div className='text-lg font-bold text-slate-900'>{mappings.length}</div>
              </div>
              <div className='rounded-xl border border-white/80 bg-white/80 px-3 py-2'>
                <div className='text-[11px] uppercase tracking-[0.12em] text-slate-500'>
                  Draft Keys
                </div>
                <div className='text-lg font-bold text-slate-900'>{parsedKeys.length}</div>
              </div>
            </div>
          </div>
        </motion.section>

        {!isAdmin ? (
          <Card className='border border-amber-200 bg-amber-50/90 shadow-sm'>
            <CardContent className='pt-6 text-sm text-amber-800'>
              Only admins can access this page.
            </CardContent>
          </Card>
        ) : (
          <>
            {message ? (
              <div className='rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700'>
                {message}
              </div>
            ) : null}
            {error ? (
              <div className='rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700'>
                {error}
              </div>
            ) : null}

            <div className='grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]'>
              <Card className='border border-slate-200 bg-white/90 shadow-sm backdrop-blur-sm'>
                <CardHeader className='pb-3'>
                  <CardTitle className='flex items-center gap-2 text-xl text-slate-900'>
                    <KeyRound className='h-5 w-5 text-cyan-600' />
                    Compose Key Set
                  </CardTitle>
                  <CardDescription>
                    Pick a main category and manage specification keys like a reusable
                    template.
                  </CardDescription>
                </CardHeader>
                <CardContent className='space-y-4'>
                  <div>
                    <label className='mb-2 block text-sm font-semibold text-slate-700'>
                      Main Category
                    </label>
                    <MainCategorySelect
                      categories={sortedMainCategories}
                      value={selectedMainCategoryId}
                      onChange={setSelectedMainCategoryId}
                    />
                    <p className='mt-2 text-xs text-slate-500'>
                      Selected:{' '}
                      <span className='font-semibold text-slate-700'>
                        {selectedMainCategory?.name || 'None'}
                      </span>
                    </p>
                  </div>

                  <div>
                    <label className='mb-2 block text-sm font-semibold text-slate-700'>
                      Add Key Quickly
                    </label>
                    <div className='flex flex-col gap-2 sm:flex-row'>
                      <Input
                        value={quickKeyInput}
                        onChange={(event) => setQuickKeyInput(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            event.preventDefault()
                            handleAddQuickKey()
                          }
                        }}
                        placeholder='Example: warranty, material, net_weight'
                        className='h-11 rounded-xl border-slate-300 bg-white'
                      />
                      <Button
                        type='button'
                        onClick={handleAddQuickKey}
                        className='h-11 rounded-xl bg-slate-900 text-white hover:bg-slate-800'
                      >
                        <Plus className='mr-1 h-4 w-4' />
                        Add
                      </Button>
                    </div>
                  </div>

                  <div>
                    <div className='mb-2 flex items-center justify-between gap-2'>
                      <label className='text-sm font-semibold text-slate-700'>
                        Bulk Editor
                      </label>
                      <Button
                        type='button'
                        onClick={handleGenerateKeysWithAI}
                        disabled={generatingKeys || !selectedMainCategoryId}
                        className='h-9 rounded-lg bg-slate-900 px-3 text-white hover:bg-slate-800'
                      >
                        {generatingKeys ? (
                          <>
                            <Loader2 className='mr-1 h-4 w-4 animate-spin' />
                            Generating...
                          </>
                        ) : (
                          <>
                            <Sparkles className='mr-1 h-4 w-4' />
                            Generate with AI
                          </>
                        )}
                      </Button>
                    </div>
                    <Textarea
                      value={keysInput}
                      onChange={(event) => setKeysInput(event.target.value)}
                      placeholder='Enter keys separated by comma or new line'
                      rows={7}
                      className='rounded-xl border-slate-300 bg-slate-50 font-mono text-sm'
                    />
                    <p className='mt-2 text-xs text-slate-500'>
                      Example: `warranty`, `weight`, `material`, `power_consumption`
                    </p>
                  </div>

                  <div className='rounded-xl border border-slate-200 bg-slate-50/70 p-3'>
                    <div className='mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500'>
                      Key Preview
                    </div>
                    {parsedKeys.length ? (
                      <div className='flex flex-wrap gap-2'>
                        {parsedKeys.map((key) => (
                          <Badge
                            key={key}
                            variant='outline'
                            className='group flex items-center gap-1 rounded-lg border-cyan-200 bg-cyan-50 px-2.5 py-1 text-cyan-800'
                          >
                            {key}
                            <button
                              type='button'
                              onClick={() => handleRemoveKey(key)}
                              className='rounded p-0.5 text-cyan-700/70 transition hover:bg-cyan-100 hover:text-cyan-900'
                              aria-label={`Remove ${key}`}
                            >
                              <Trash2 className='h-3 w-3' />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <p className='text-sm text-slate-500'>
                        No keys added yet. Use quick add or bulk editor.
                      </p>
                    )}
                  </div>

                  <div className='flex flex-wrap items-center gap-2 pt-1'>
                    <Button
                      onClick={handleSave}
                      disabled={saving}
                      className='rounded-xl bg-cyan-600 text-white hover:bg-cyan-700'
                    >
                      {saving ? (
                        <>
                          <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                          Saving...
                        </>
                      ) : (
                        'Save Keys'
                      )}
                    </Button>
                    <Button
                      variant='outline'
                      onClick={handleReset}
                      className='rounded-xl border-slate-300 bg-white hover:bg-slate-50'
                    >
                      Reset
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className='border border-slate-200 bg-white/90 shadow-sm backdrop-blur-sm'>
                <CardHeader className='pb-3'>
                  <div className='flex flex-wrap items-center justify-between gap-3'>
                    <div>
                      <CardTitle className='text-xl text-slate-900'>Saved Mappings</CardTitle>
                      <CardDescription>
                        Search, edit, and clean up existing category key sets.
                      </CardDescription>
                    </div>
                    <Button
                      variant='outline'
                      onClick={fetchMappings}
                      disabled={loading}
                      className='rounded-xl border-slate-300 bg-white hover:bg-slate-50'
                    >
                      {loading ? 'Refreshing...' : 'Refresh'}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className='space-y-4'>
                  <div className='relative'>
                    <SearchIcon className='pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400' />
                    <Input
                      value={mappingSearch}
                      onChange={(event) => setMappingSearch(event.target.value)}
                      placeholder='Search by category or key...'
                      className='h-11 rounded-xl border-slate-300 bg-white pl-9'
                    />
                  </div>

                  <div className='max-h-[62vh] space-y-3 overflow-y-auto pr-1'>
                    {loading ? (
                      <div className='rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600'>
                        Loading mappings...
                      </div>
                    ) : filteredMappings.length === 0 ? (
                      <div className='rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600'>
                        No mappings found. Add your first main category specification keys.
                      </div>
                    ) : (
                      filteredMappings.map((mapping) => {
                        const mainCategoryName = getMainCategoryName(
                          mapping,
                          mainCategoryNameById
                        )

                        return (
                          <div
                            key={mapping._id}
                            className='rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300'
                          >
                            <div className='flex flex-wrap items-start justify-between gap-3'>
                              <div className='min-w-0'>
                                <h3 className='truncate text-sm font-bold text-slate-900'>
                                  {mainCategoryName}
                                </h3>
                                <p className='mt-0.5 text-xs text-slate-500'>
                                  {mapping.keys.length} keys • Updated{' '}
                                  {formatUpdatedAt(mapping.updatedAt)}
                                </p>
                              </div>
                              <div className='flex items-center gap-2'>
                                <Button
                                  size='sm'
                                  variant='outline'
                                  onClick={() => handleEdit(mapping)}
                                  className='rounded-lg'
                                >
                                  Edit
                                </Button>
                                <Button
                                  size='sm'
                                  variant='destructive'
                                  onClick={() => handleDelete(mapping._id)}
                                  className='rounded-lg'
                                >
                                  Delete
                                </Button>
                              </div>
                            </div>

                            <div className='mt-3 flex flex-wrap gap-1.5'>
                              {mapping.keys.map((key) => (
                                <Badge
                                  key={`${mapping._id}-${key}`}
                                  variant='outline'
                                  className='rounded-md border-slate-200 bg-slate-50 text-slate-700'
                                >
                                  {key}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </Main>
    </>
  )
}
