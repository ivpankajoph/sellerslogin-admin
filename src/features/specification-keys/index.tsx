import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSelector } from 'react-redux'
import {
  Check,
  ChevronsUpDown,
  KeyRound,
  Loader2,
  Plus,
  RefreshCcw,
  Search as SearchIcon,
  Sparkles,
  Trash2,
  Edit3,
} from 'lucide-react'
import { Main } from '@/components/layout/main'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { StatisticsDialog } from '@/components/data-table/statistics-dialog'
import { TablePageHeader } from '@/components/data-table/table-page-header'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
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

function MainCategorySelect({ categories, value, onChange, disabled }: {
  categories: MainCategory[]
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}) {
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
          disabled={disabled}
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
  const [mappingSearch, setMappingSearch] = useState('')
  const [mainFilter, setMainFilter] = useState('all')
  const [statsOpen, setStatsOpen] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  
  // Editor State
  const [editingId, setEditingId] = useState<string | null>(null)
  const [selectedMainCategoryId, setSelectedMainCategoryId] = useState('')
  const [keysInput, setKeysInput] = useState('')
  const [quickKeyInput, setQuickKeyInput] = useState('')
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
    const mappingsByMain = mainFilter === 'all' 
      ? mappings 
      : mappings.filter(m => getMainCategoryId(m) === mainFilter)

    if (!query) return mappingsByMain

    return mappingsByMain.filter((mapping) => {
      const categoryName = getMainCategoryName(mapping, mainCategoryNameById).toLowerCase()
      const hasKey = mapping.keys.some((key) => key.toLowerCase().includes(query))
      return categoryName.includes(query) || hasKey
    })
  }, [mappings, mainFilter, mappingSearch, mainCategoryNameById])

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

  const fetchMappings = useCallback(async () => {
    if (!isAdmin) return
    try {
      setLoading(true)
      const res = await fetch(`${baseUrl}/admin/specification-keys`, {
        headers: authHeaders,
      })
      if (!res.ok) throw new Error('Failed to fetch specification keys')
      const json = await res.json()
      setMappings(Array.isArray(json?.data) ? json.data : [])
    } catch {
      setMappings([])
    } finally {
      setLoading(false)
    }
  }, [isAdmin, authHeaders, baseUrl])

  useEffect(() => {
    fetchMainCategories()
  }, [])

  useEffect(() => {
    fetchMappings()
  }, [fetchMappings])

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

      setModalOpen(false)
      fetchMappings()
    } catch (err: any) {
      setError(err?.message || 'Failed to save specification keys')
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (mapping: KeyMapping) => {
    setEditingId(mapping._id)
    setSelectedMainCategoryId(getMainCategoryId(mapping))
    setKeysInput(Array.isArray(mapping.keys) ? mapping.keys.join('\n') : '')
    setQuickKeyInput('')
    setError('')
    setMessage('')
    setModalOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this mapping?')) return
    try {
      const res = await fetch(`${baseUrl}/admin/specification-keys/${id}`, {
        method: 'DELETE',
        headers: authHeaders,
      })
      const json = await res.json()
      if (!res.ok || !json?.success) {
        throw new Error(json?.message || 'Failed to delete mapping')
      }
      fetchMappings()
    } catch (err: any) {
      alert(err?.message || 'Failed to delete mapping')
    }
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
      setError('Select a main category first.')
      return
    }
    try {
      setGeneratingKeys(true)
      setError('')
      const res = await fetch(`${baseUrl}/products/generate-specification-keys`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: selectedMainCategory.name }),
      })
      const json = await res.json()
      if (!res.ok || !json?.success) throw new Error('AI Error')
      const generated = Array.isArray(json?.data) ? json.data : []
      const merged = Array.from(new Set([...parsedKeys, ...generated]))
      setKeysInput(merged.join('\n'))
    } catch {
      setError('Failed to generate keys.')
    } finally {
      setGeneratingKeys(false)
    }
  }

  const closeModal = () => {
    setModalOpen(false)
    setEditingId(null)
    setSelectedMainCategoryId('')
    setKeysInput('')
    setQuickKeyInput('')
    setError('')
    setMessage('')
  }

  const statsItems = [
    { label: 'Main Categories', value: mainCategories.length },
    { label: 'Saved Mappings', value: mappings.length },
    { label: 'Total Unique Keys', value: mappings.reduce((acc, m) => acc + m.keys.length, 0) },
  ]
  return (
    <>
      <TablePageHeader 
        title={
          <div className='flex items-center gap-2'>
            <h2 className='text-sm font-bold tracking-widest text-slate-800 uppercase sm:text-base'>
              Specification Keys
            </h2>
          </div>
        }
      >
        <Button variant='outline' onClick={() => setStatsOpen(true)} className='rounded-xl'>
          Statistics
        </Button>
        <Button variant='outline' onClick={fetchMappings} disabled={loading} className='rounded-xl'>
          <RefreshCcw className={cn('mr-2 h-4 w-4', loading && 'animate-spin')} />
          Refresh
        </Button>
        <Button
          onClick={() => {
            closeModal()
            setModalOpen(true)
          }}
          className='rounded-xl bg-slate-900 text-white'
        >
          <Plus className='mr-2 h-4 w-4' />
          Add Key Set
        </Button>
      </TablePageHeader>

      <Main className='relative flex flex-1 flex-col gap-4 overflow-x-clip pb-10 font-manrope sm:gap-6'>
        {!isAdmin ? (
          <div className='flex h-64 items-center justify-center text-slate-500'>
            Access Denied. Admins Only.
          </div>
        ) : (
          <>
            <section className='rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm backdrop-blur-sm sm:p-5'>
              <div className='flex flex-wrap items-center gap-3'>
                <div className='relative min-w-0 flex-1'>
                  <SearchIcon className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400' />
                  <Input
                    value={mappingSearch}
                    onChange={(e) => setMappingSearch(e.target.value)}
                    placeholder='Search category name or keys...'
                    className='h-11 rounded-xl border-slate-300 bg-white pl-9'
                  />
                </div>
                <div className='flex shrink-0 items-center gap-3'>
                  <select
                    value={mainFilter}
                    onChange={(e) => setMainFilter(e.target.value)}
                    className='h-11 min-w-[200px] rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none hover:border-slate-400'
                  >
                    <option value='all'>All main categories</option>
                    {sortedMainCategories.map((opt) => (
                      <option key={opt._id} value={opt._id}>
                        {opt.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type='button'
                    onClick={() => {
                      setMainFilter('all')
                      setMappingSearch('')
                    }}
                    className='h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50'
                  >
                    Reset
                  </button>
                </div>
                <div className='flex items-center text-xs font-semibold text-slate-500'>
                  Showing {filteredMappings.length} mappings
                </div>
              </div>
            </section>

            <section className='rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-sm backdrop-blur-sm sm:p-4'>
              <div className='overflow-x-auto'>
                <Table>
                  <TableHeader>
                    <TableRow className='bg-slate-100/80'>
                      <TableHead className='h-11 px-4'>Main Category</TableHead>
                      <TableHead className='h-11'>Key Count</TableHead>
                      <TableHead className='h-11 px-4'>Keys Preview</TableHead>
                      <TableHead className='h-11'>Last Updated</TableHead>
                      <TableHead className='h-11 pr-4 text-right'>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={5} className='h-32 text-center text-slate-500'>
                          Loading mappings...
                        </TableCell>
                      </TableRow>
                    ) : filteredMappings.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className='h-32 text-center text-slate-500'>
                          No records found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredMappings.map((mapping) => {
                        const mainName = getMainCategoryName(mapping, mainCategoryNameById)
                        return (
                          <TableRow key={mapping._id} className='transition hover:bg-slate-50/50'>
                            <TableCell className='px-4 py-3 font-semibold text-slate-900'>
                              {mainName}
                            </TableCell>
                            <TableCell className='py-3'>
                              <Badge variant='outline' className='bg-slate-100/50'>
                                {mapping.keys.length} keys
                              </Badge>
                            </TableCell>
                            <TableCell className='max-w-[300px] px-4 py-3'>
                              <div className='flex flex-wrap gap-1'>
                                {mapping.keys.slice(0, 5).map((k) => (
                                  <Badge key={k} variant='outline' className='text-[10px] text-slate-500'>
                                    {k}
                                  </Badge>
                                ))}
                                {mapping.keys.length > 5 && (
                                  <span className='text-[10px] text-slate-400'>
                                    +{mapping.keys.length - 5} more
                                  </span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className='py-3 text-xs text-slate-500'>
                              {formatUpdatedAt(mapping.updatedAt)}
                            </TableCell>
                            <TableCell className='pr-4 text-right'>
                              <div className='flex items-center justify-end gap-1'>
                                <Button
                                  variant='ghost'
                                  size='icon'
                                  onClick={() => handleEdit(mapping)}
                                  className='h-8 w-8 text-indigo-600 hover:bg-indigo-50'
                                >
                                  <Edit3 className='h-4 w-4' />
                                </Button>
                                <Button
                                  variant='ghost'
                                  size='icon'
                                  onClick={() => handleDelete(mapping._id)}
                                  className='h-8 w-8 text-red-600 hover:bg-red-50'
                                >
                                  <Trash2 className='h-4 w-4' />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </section>
          </>
        )}
      </Main>

      <StatisticsDialog
        open={statsOpen}
        onOpenChange={setStatsOpen}
        title='Key Mappings Overview'
        description='Overview of specification keys assigned per main category.'
        items={statsItems}
      />

      <Dialog open={modalOpen} onOpenChange={(open) => !open && closeModal()}>
        <DialogContent className='max-h-[92vh] w-[min(96vw,840px)] max-w-[min(96vw,840px)] overflow-hidden p-0'>
          <DialogHeader className='border-b border-slate-200/90 bg-gradient-to-r from-slate-50 to-white px-6 py-5'>
            <div className='flex items-center gap-3'>
              <div className='flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900'>
                <KeyRound className='h-5 w-5 text-white' />
              </div>
              <div>
                <DialogTitle className='text-xl font-bold text-slate-900'>
                  {editingId ? 'Edit Mapping' : 'Compose New Key Set'}
                </DialogTitle>
                <DialogDescription>
                  Category-specific specification templates for product creation.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className='grid gap-6 overflow-y-auto p-6 lg:grid-cols-2'>
            <div className='space-y-5'>
              <div className='grid gap-2'>
                <Label className='text-xs font-bold uppercase tracking-wider text-slate-500'>
                  Main Category
                </Label>
                <MainCategorySelect
                  categories={sortedMainCategories}
                  value={selectedMainCategoryId}
                  onChange={setSelectedMainCategoryId}
                  disabled={!!editingId}
                />
              </div>

              <div className='grid gap-2'>
                <Label className='text-xs font-bold uppercase tracking-wider text-slate-500'>
                  Quick Add
                </Label>
                <div className='flex gap-2'>
                  <Input
                    value={quickKeyInput}
                    onChange={(e) => setQuickKeyInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddQuickKey()}
                    placeholder='Add single key...'
                    className='h-11 rounded-xl'
                  />
                  <Button onClick={handleAddQuickKey} className='h-11 rounded-xl bg-slate-900'>
                    Add
                  </Button>
                </div>
              </div>

              <div className='flex flex-wrap gap-2 pt-1'>
                {parsedKeys.map((key) => (
                  <Badge key={key} className='flex items-center gap-1 bg-slate-100 text-slate-700 hover:bg-slate-200 px-2 py-1'>
                    {key}
                    <button onClick={() => handleRemoveKey(key)} className='ml-1 text-slate-400 hover:text-red-500'>
                      <Plus className='h-3 w-3 rotate-45' />
                    </button>
                  </Badge>
                ))}
                {parsedKeys.length === 0 && <p className='text-xs text-slate-400'>No keys added yet.</p>}
              </div>
            </div>

            <div className='space-y-4'>
              <div className='flex items-center justify-between'>
                <Label className='text-xs font-bold uppercase tracking-wider text-slate-500'>
                  Bulk Editor
                </Label>
                <Button
                  size='sm'
                  onClick={handleGenerateKeysWithAI}
                  disabled={generatingKeys || !selectedMainCategoryId}
                  className='h-8 bg-slate-900 text-[11px]'
                >
                  {generatingKeys ? <Loader2 className='mr-1 h-3 w-3 animate-spin' /> : <Sparkles className='mr-1 h-3 w-3' />}
                  AI Generate
                </Button>
              </div>
              <Textarea
                value={keysInput}
                onChange={(e) => setKeysInput(e.target.value)}
                placeholder='Enter keys (one per line or comma separated)'
                className='h-[200px] rounded-xl bg-slate-50/50 font-mono text-sm'
              />
              {error && <p className='text-xs font-medium text-red-500'>{error}</p>}
              {message && <p className='text-xs font-medium text-emerald-600'>{message}</p>}
            </div>
          </div>

          <DialogFooter className='border-t border-slate-200/90 bg-white px-6 py-4'>
            <Button variant='outline' onClick={closeModal} className='rounded-xl'>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving} className='rounded-xl bg-slate-900'>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
