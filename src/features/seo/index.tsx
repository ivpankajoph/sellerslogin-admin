import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  BadgeCheck,
  Boxes,
  Globe,
  Link2,
  Package,
  Plus,
  RefreshCcw,
  Save,
  Search,
  Store,
  Trash2,
} from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { toast } from 'sonner'
import api from '@/lib/axios'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'

type SeoAppSource = 'ophmate_frontend' | 'vendor_template_frontend'
type SeoMatchType = 'exact' | 'pattern'

type SeoConfig = {
  _id: string
  app_source: SeoAppSource
  page_name: string
  route_pattern: string
  match_type: SeoMatchType
  priority: number
  meta_title: string
  meta_description: string
  meta_keywords: string[]
  is_active: boolean
  updated_by?: string
  updatedAt?: string
}

type SeoDraft = {
  app_source: SeoAppSource
  page_name: string
  route_pattern: string
  match_type: SeoMatchType
  priority: number
  meta_title: string
  meta_description: string
  meta_keywords: string
  is_active: boolean
}

type InventoryEntityType =
  | 'all'
  | 'ophmate_product'
  | 'vendor_catalog'
  | 'template_home'
  | 'template_product'

type InventoryPage = {
  id: string
  entity_type: Exclude<InventoryEntityType, 'all'>
  app_source: SeoAppSource
  label: string
  route_pattern: string
  suggested_title?: string
  suggested_description?: string
  suggested_keywords?: string[]
}

const APP_LABELS: Record<SeoAppSource, string> = {
  ophmate_frontend: 'Ophmate Frontend',
  vendor_template_frontend: 'Vendor Template Frontend',
}

const MATCH_TYPE_LABELS: Record<SeoMatchType, string> = {
  exact: 'Exact path',
  pattern: 'Dynamic pattern',
}

const QUICK_PATTERNS: Array<{ label: string; route: string; appSource: SeoAppSource }> = [
  { label: 'Home', route: '/', appSource: 'ophmate_frontend' },
  { label: 'Product detail', route: '/product/[category]/[id]', appSource: 'ophmate_frontend' },
  { label: 'Category detail', route: '/categories/[slug]', appSource: 'ophmate_frontend' },
  { label: 'Subcategory detail', route: '/sub-categories/[slug]', appSource: 'ophmate_frontend' },
  { label: 'Checkout bag', route: '/checkout/bag', appSource: 'ophmate_frontend' },
  { label: 'Template home', route: '/template/[vendor_id]', appSource: 'vendor_template_frontend' },
  {
    label: 'Template product detail',
    route: '/template/[vendor_id]/product/[product_id]',
    appSource: 'vendor_template_frontend',
  },
  {
    label: 'Template custom page',
    route: '/template/[vendor_id]/page/[slug]',
    appSource: 'vendor_template_frontend',
  },
]

const createEmptyDraft = (): SeoDraft => ({
  app_source: 'ophmate_frontend',
  page_name: '',
  route_pattern: '/',
  match_type: 'pattern',
  priority: 0,
  meta_title: '',
  meta_description: '',
  meta_keywords: '',
  is_active: true,
})

const normalizeRoutePattern = (value: string) => {
  const source = String(value || '').trim().split(/[?#]/)[0] || '/'
  const withLeadingSlash = source.startsWith('/') ? source : `/${source}`
  if (withLeadingSlash.length > 1 && withLeadingSlash.endsWith('/')) {
    return withLeadingSlash.slice(0, -1)
  }
  return withLeadingSlash
}

const buildRuleKey = (
  appSource: SeoAppSource,
  routePattern: string,
  matchType: SeoMatchType,
) => `${appSource}::${matchType}::${normalizeRoutePattern(routePattern)}`

const toKeywordInput = (keywords: string[] = []) => keywords.join(', ')

const fromKeywordInput = (input: string) =>
  input
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)

const toDraft = (config: SeoConfig): SeoDraft => ({
  app_source: config.app_source,
  page_name: config.page_name || '',
  route_pattern: config.route_pattern || '/',
  match_type: config.match_type || 'pattern',
  priority: Number.isFinite(Number(config.priority)) ? Number(config.priority) : 0,
  meta_title: config.meta_title || '',
  meta_description: config.meta_description || '',
  meta_keywords: toKeywordInput(config.meta_keywords || []),
  is_active: Boolean(config.is_active),
})

type SeoManagerPageProps = {
  section?: 'rules' | 'entities'
}

export default function SeoManagerPage({ section = 'rules' }: SeoManagerPageProps) {
  const isEntitySection = section === 'entities'
  const [configs, setConfigs] = useState<SeoConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string>('')
  const [draft, setDraft] = useState<SeoDraft>(createEmptyDraft())
  const [inventoryLoading, setInventoryLoading] = useState(false)
  const [inventoryError, setInventoryError] = useState('')
  const [inventorySearchInput, setInventorySearchInput] = useState('')
  const [inventorySearch, setInventorySearch] = useState('')
  const [inventoryType, setInventoryType] = useState<InventoryEntityType>('all')
  const [inventoryPage, setInventoryPage] = useState(1)
  const [inventoryLimit, setInventoryLimit] = useState(20)
  const [inventoryTotal, setInventoryTotal] = useState(0)
  const [inventoryTotalPages, setInventoryTotalPages] = useState(1)
  const [inventoryItems, setInventoryItems] = useState<InventoryPage[]>([])
  const lastAutoFillKeyRef = useRef<string>('')
  const editorCardRef = useRef<HTMLDivElement | null>(null)
  const routePatternInputRef = useRef<HTMLInputElement | null>(null)

  const selectedConfig = useMemo(
    () => configs.find((item) => item._id === selectedId) || null,
    [configs, selectedId],
  )

  const configsByKey = useMemo(() => {
    const map = new Map<string, SeoConfig>()
    configs.forEach((item) => {
      map.set(buildRuleKey(item.app_source, item.route_pattern, item.match_type), item)
    })
    return map
  }, [configs])

  const fetchConfigs = async (query = search) => {
    try {
      setLoading(true)
      const response = await api.get('/seo', {
        params: {
          q: query || undefined,
          include_inactive: true,
        },
      })
      const data = Array.isArray(response?.data?.data)
        ? (response.data.data as SeoConfig[])
        : []
      setConfigs(data)
      if (selectedId && !data.some((item) => item._id === selectedId)) {
        setSelectedId('')
        setDraft(createEmptyDraft())
      }
    } catch (error: any) {
      const message = error?.response?.data?.message || 'Failed to load SEO configs'
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  const loadInventory = useCallback(async () => {
    try {
      setInventoryLoading(true)
      setInventoryError('')
      const response = await api.get('/seo/inventory', {
        params: {
          entity_type: inventoryType,
          q: inventorySearch || undefined,
          page: inventoryPage,
          limit: inventoryLimit,
        },
      })

      const data = Array.isArray(response?.data?.data) ? (response.data.data as InventoryPage[]) : []
      const pagination = response?.data?.pagination || {}
      const total = Number(pagination.total) || 0
      const totalPages = Math.max(Number(pagination.totalPages) || 1, 1)

      setInventoryItems(data)
      setInventoryTotal(total)
      setInventoryTotalPages(totalPages)

      if (inventoryPage > totalPages) {
        setInventoryPage(totalPages)
      }
    } catch (error: any) {
      setInventoryItems([])
      setInventoryTotal(0)
      setInventoryTotalPages(1)
      setInventoryError(error?.response?.data?.message || 'Failed to load page inventory')
    } finally {
      setInventoryLoading(false)
    }
  }, [inventoryType, inventorySearch, inventoryPage, inventoryLimit])

  useEffect(() => {
    fetchConfigs('')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!isEntitySection) return
    loadInventory()
  }, [isEntitySection, loadInventory])

  useEffect(() => {
    if (!selectedConfig) return
    setDraft(toDraft(selectedConfig))
  }, [selectedConfig])

  const loadExistingRuleForDraft = (nextDraft: SeoDraft, showToast = false) => {
    const key = buildRuleKey(nextDraft.app_source, nextDraft.route_pattern, nextDraft.match_type)
    const existing = configsByKey.get(key)
    if (!existing) return false
    if (selectedId === existing._id) return true

    setSelectedId(existing._id)
    setDraft(toDraft(existing))
    if (showToast && lastAutoFillKeyRef.current !== key) {
      toast.info('Existing SEO rule loaded into form for editing')
      lastAutoFillKeyRef.current = key
    }
    return true
  }

  const setDraftField = <K extends keyof SeoDraft>(key: K, value: SeoDraft[K]) => {
    setDraft((prev) => ({ ...prev, [key]: value }))
  }

  const bringEditorIntoView = useCallback((focusInput = false) => {
    if (typeof window === 'undefined') return
    window.requestAnimationFrame(() => {
      editorCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      if (focusInput) {
        window.setTimeout(() => {
          routePatternInputRef.current?.focus()
        }, 220)
      }
    })
  }, [])

  const handleNew = () => {
    setSelectedId('')
    setDraft(createEmptyDraft())
    bringEditorIntoView(true)
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      const payload = {
        app_source: draft.app_source,
        page_name: draft.page_name,
        route_pattern: normalizeRoutePattern(draft.route_pattern),
        match_type: draft.match_type,
        priority: Number.isFinite(Number(draft.priority)) ? Number(draft.priority) : 0,
        meta_title: draft.meta_title,
        meta_description: draft.meta_description,
        meta_keywords: fromKeywordInput(draft.meta_keywords),
        is_active: draft.is_active,
      }

      const maybeExisting = configsByKey.get(
        buildRuleKey(payload.app_source, payload.route_pattern, payload.match_type),
      )
      const targetId = selectedId || maybeExisting?._id || ''

      if (targetId) {
        const response = await api.put(`/seo/${targetId}`, payload)
        const updated = response?.data?.data as SeoConfig
        setConfigs((prev) => prev.map((item) => (item._id === targetId ? updated : item)))
        setSelectedId(targetId)
        toast.success('SEO config updated')
      } else {
        const response = await api.post('/seo', payload)
        const created = response?.data?.data as SeoConfig
        setConfigs((prev) => [created, ...prev])
        setSelectedId(created._id)
        toast.success('SEO config created')
      }
    } catch (error: any) {
      const message = error?.response?.data?.message || 'Failed to save SEO config'
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedId) return
    try {
      setSaving(true)
      await api.delete(`/seo/${selectedId}`)
      setConfigs((prev) => prev.filter((item) => item._id !== selectedId))
      setSelectedId('')
      setDraft(createEmptyDraft())
      toast.success('SEO config deleted')
    } catch (error: any) {
      const message = error?.response?.data?.message || 'Failed to delete SEO config'
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  const useDiscoveredPageForSeo = (page: InventoryPage) => {
    setSelectedId('')
    const nextDraft: SeoDraft = {
      app_source: page.app_source,
      page_name: page.label,
      route_pattern: page.route_pattern,
      match_type: 'exact',
      priority: 0,
      meta_title: page.suggested_title || '',
      meta_description: page.suggested_description || '',
      meta_keywords: (page.suggested_keywords || []).join(', '),
      is_active: true,
    }
    setDraft(nextDraft)
    loadExistingRuleForDraft(nextDraft, true)
    bringEditorIntoView(true)
  }

  const handleInventorySearch = () => {
    setInventoryPage(1)
    setInventorySearch(inventorySearchInput.trim())
  }

  const filteredCount = configs.length

  return (
    <div className='space-y-6 pb-4'>
      <Card className='border-0 bg-gradient-to-r from-sky-600 via-cyan-600 to-emerald-600 text-white shadow-xl'>
        <CardHeader className='flex flex-wrap items-start justify-between gap-4'>
          <div>
            <Badge className='border-white/40 bg-white/20 text-white'>SEO Control Center</Badge>
            <CardTitle className='mt-2 text-2xl font-bold'>
              {isEntitySection ? 'Entity SEO Manager' : 'Page SEO Manager'}
            </CardTitle>
            <p className='mt-1 max-w-2xl text-sm text-cyan-50'>
              {isEntitySection
                ? 'Manage SEO for each dynamic page entry (products, vendor pages, and template pages).'
                : 'Manage meta title, description, and keywords for static and reusable route patterns.'}
            </p>
            <div className='mt-3 flex flex-wrap gap-2'>
              <Button asChild size='sm' variant={isEntitySection ? 'secondary' : 'default'}>
                <Link to='/seo'>SEO Rules</Link>
              </Button>
              <Button asChild size='sm' variant={isEntitySection ? 'default' : 'secondary'}>
                <Link to='/seo/entities'>Entity SEO</Link>
              </Button>
            </div>
          </div>
          <div className='grid grid-cols-2 gap-2 text-sm'>
            <div className='rounded-lg border border-white/30 bg-white/15 px-3 py-2'>
              <p className='text-cyan-100'>Configs</p>
              <p className='font-semibold'>{filteredCount}</p>
            </div>
            <div className='rounded-lg border border-white/30 bg-white/15 px-3 py-2'>
              <p className='text-cyan-100'>Active</p>
              <p className='font-semibold'>{configs.filter((item) => item.is_active).length}</p>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className='grid gap-4 xl:grid-cols-[1.2fr_1fr]'>
        <Card
          ref={editorCardRef}
          className='self-start border-slate-200/70 bg-gradient-to-b from-white via-white to-cyan-50/30 shadow-md xl:sticky xl:top-4'
        >
          <CardHeader className='flex flex-row flex-wrap items-center justify-between gap-2'>
            <CardTitle className='text-base font-semibold'>Create / Edit SEO Rule</CardTitle>
            <div className='flex gap-2'>
              <Button variant='outline' size='sm' onClick={handleNew} disabled={saving}>
                <Plus className='mr-1 h-4 w-4' />
                New
              </Button>
              <Button size='sm' onClick={handleSave} disabled={saving}>
                <Save className='mr-1 h-4 w-4' />
                {saving ? 'Saving...' : selectedId ? 'Update' : 'Create'}
              </Button>
              <Button
                size='sm'
                variant='destructive'
                onClick={handleDelete}
                disabled={saving || !selectedId}
              >
                <Trash2 className='mr-1 h-4 w-4' />
                Delete
              </Button>
            </div>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div className='grid gap-3 md:grid-cols-2'>
              <div className='space-y-1'>
                <label className='text-xs font-semibold uppercase tracking-wide text-slate-500'>
                  Frontend app
                </label>
                <Select
                  value={draft.app_source}
                  onValueChange={(value) => {
                    const next = { ...draft, app_source: value as SeoAppSource }
                    setDraft(next)
                    loadExistingRuleForDraft(next, true)
                  }}
                >
                  <SelectTrigger className='w-full'>
                    <SelectValue placeholder='Select app source' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='ophmate_frontend'>Ophmate Frontend</SelectItem>
                    <SelectItem value='vendor_template_frontend'>
                      Vendor Template Frontend
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className='space-y-1'>
                <label className='text-xs font-semibold uppercase tracking-wide text-slate-500'>
                  Match type
                </label>
                <Select
                  value={draft.match_type}
                  onValueChange={(value) => {
                    const next = { ...draft, match_type: value as SeoMatchType }
                    setDraft(next)
                    loadExistingRuleForDraft(next, true)
                  }}
                >
                  <SelectTrigger className='w-full'>
                    <SelectValue placeholder='Select match type' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='pattern'>Dynamic pattern</SelectItem>
                    <SelectItem value='exact'>Exact path</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className='space-y-1'>
              <label className='text-xs font-semibold uppercase tracking-wide text-slate-500'>
                Rule label
              </label>
              <Input
                placeholder='Example: Product detail SEO'
                value={draft.page_name}
                onChange={(event) => setDraftField('page_name', event.target.value)}
              />
            </div>

            <div className='grid gap-3 md:grid-cols-[1fr_120px]'>
              <div className='space-y-1'>
                <label className='text-xs font-semibold uppercase tracking-wide text-slate-500'>
                  Route pattern / path
                </label>
                <Input
                  ref={routePatternInputRef}
                  placeholder='/product/[category]/[id]'
                  value={draft.route_pattern}
                  onChange={(event) => setDraftField('route_pattern', event.target.value)}
                  onBlur={(event) => {
                    const normalized = normalizeRoutePattern(event.target.value)
                    const next = { ...draft, route_pattern: normalized }
                    setDraft(next)
                    loadExistingRuleForDraft(next, true)
                  }}
                />
              </div>
              <div className='space-y-1'>
                <label className='text-xs font-semibold uppercase tracking-wide text-slate-500'>
                  Priority
                </label>
                <Input
                  type='number'
                  value={String(draft.priority)}
                  onChange={(event) =>
                    setDraftField('priority', Number.parseInt(event.target.value || '0', 10))
                  }
                />
              </div>
            </div>

            <div className='space-y-1'>
              <label className='text-xs font-semibold uppercase tracking-wide text-slate-500'>
                Meta title
              </label>
              <Input
                placeholder='SEO title'
                value={draft.meta_title}
                onChange={(event) => setDraftField('meta_title', event.target.value)}
              />
            </div>

            <div className='space-y-1'>
              <label className='text-xs font-semibold uppercase tracking-wide text-slate-500'>
                Meta description
              </label>
              <Textarea
                placeholder='SEO description'
                className='min-h-24'
                value={draft.meta_description}
                onChange={(event) => setDraftField('meta_description', event.target.value)}
              />
            </div>

            <div className='space-y-1'>
              <label className='text-xs font-semibold uppercase tracking-wide text-slate-500'>
                Meta keywords
              </label>
              <Input
                placeholder='keyword 1, keyword 2, keyword 3'
                value={draft.meta_keywords}
                onChange={(event) => setDraftField('meta_keywords', event.target.value)}
              />
            </div>

            <div className='flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2'>
              <div>
                <p className='text-sm font-semibold text-slate-900'>Rule active</p>
                <p className='text-xs text-slate-500'>
                  Inactive rules are ignored in frontend meta resolution.
                </p>
              </div>
              <Switch
                checked={draft.is_active}
                onCheckedChange={(checked) => setDraftField('is_active', Boolean(checked))}
              />
            </div>
          </CardContent>
        </Card>

        <div className='space-y-4'>
          {!isEntitySection && (
            <Card className='border-slate-200/70 shadow-md'>
              <CardHeader className='pb-3'>
                <CardTitle className='flex items-center gap-2 text-base font-semibold'>
                  <Globe className='h-4 w-4 text-cyan-600' />
                  SEO Rules
                </CardTitle>
                <div className='flex gap-2'>
                  <div className='relative flex-1'>
                    <Search className='absolute left-2 top-2.5 h-4 w-4 text-slate-400' />
                    <Input
                      className='pl-8'
                      placeholder='Search by page, route, title...'
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          fetchConfigs(search)
                        }
                      }}
                    />
                  </div>
                  <Button variant='outline' size='icon' onClick={() => fetchConfigs(search)}>
                    <RefreshCcw className='h-4 w-4' />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className='max-h-[620px] space-y-2 overflow-y-auto'>
                {loading && <p className='text-sm text-slate-500'>Loading SEO configs...</p>}
                {!loading && configs.length === 0 && (
                  <p className='text-sm text-slate-500'>No SEO configs found.</p>
                )}
                {!loading &&
                  configs.map((item) => {
                    const active = selectedId === item._id
                    return (
                      <button
                        key={item._id}
                        onClick={() => {
                          setSelectedId(item._id)
                          bringEditorIntoView()
                        }}
                        className={`w-full rounded-xl border px-3 py-3 text-left transition ${
                          active
                            ? 'border-cyan-300 bg-cyan-50 shadow-sm'
                            : 'border-slate-200 bg-white hover:-translate-y-0.5 hover:border-cyan-300 hover:shadow-sm'
                        }`}
                      >
                        <div className='flex items-start justify-between gap-2'>
                          <p className='line-clamp-1 text-sm font-semibold text-slate-900'>
                            {item.page_name || item.route_pattern}
                          </p>
                          <Badge variant={item.is_active ? 'default' : 'secondary'}>
                            {item.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                        <p className='mt-1 line-clamp-1 text-xs text-slate-500'>{item.route_pattern}</p>
                        <div className='mt-2 flex flex-wrap gap-2'>
                          <Badge variant='outline'>{APP_LABELS[item.app_source]}</Badge>
                          <Badge variant='outline'>{MATCH_TYPE_LABELS[item.match_type]}</Badge>
                          <Badge variant='outline'>P{item.priority}</Badge>
                        </div>
                      </button>
                    )
                  })}
              </CardContent>
            </Card>
          )}

          {!isEntitySection && (
            <Card className='border-emerald-200/80 bg-gradient-to-br from-emerald-50 via-teal-50 to-white shadow-md'>
              <CardHeader className='pb-2'>
                <CardTitle className='flex items-center gap-2 text-sm text-emerald-700'>
                  <BadgeCheck className='h-4 w-4' />
                  Quick Route Patterns
                </CardTitle>
              </CardHeader>
              <CardContent className='space-y-2'>
                {QUICK_PATTERNS.map((item) => (
                  <button
                    key={`${item.appSource}-${item.route}`}
                    onClick={() => {
                      const next: SeoDraft = {
                        ...draft,
                        app_source: item.appSource,
                        route_pattern: item.route,
                        match_type: 'pattern',
                      }
                      setDraft(next)
                      loadExistingRuleForDraft(next, true)
                      bringEditorIntoView(true)
                    }}
                    className='w-full rounded-lg border border-emerald-200 bg-white px-3 py-2 text-left text-xs transition hover:bg-emerald-100'
                  >
                    <p className='font-semibold text-slate-900'>{item.label}</p>
                    <p className='text-slate-500'>{item.route}</p>
                  </button>
                ))}
              </CardContent>
            </Card>
          )}

          {isEntitySection && <Card className='border-sky-200/80 bg-gradient-to-br from-sky-50 via-cyan-50 to-white shadow-md'>
            <CardHeader className='pb-2'>
              <CardTitle className='flex items-center gap-2 text-sm text-sky-700'>
                <Boxes className='h-4 w-4' />
                Entity SEO (Per Dynamic Page)
              </CardTitle>
              <p className='text-xs text-slate-600'>
                Manage exact SEO per item page. If you have 100 products, you can create/edit 100
                separate SEO entries here.
              </p>
            </CardHeader>
            <CardContent className='space-y-3'>
              <div className='flex gap-2'>
                <div className='relative flex-1'>
                  <Search className='absolute left-2 top-2.5 h-4 w-4 text-slate-400' />
                  <Input
                    className='pl-8'
                    placeholder='Search products/vendors/pages...'
                    value={inventorySearchInput}
                    onChange={(event) => setInventorySearchInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        handleInventorySearch()
                      }
                    }}
                  />
                </div>
                <Button variant='outline' size='sm' onClick={handleInventorySearch} disabled={inventoryLoading}>
                  Search
                </Button>
                <Button variant='outline' size='icon' onClick={loadInventory} disabled={inventoryLoading}>
                  <RefreshCcw className={`h-4 w-4 ${inventoryLoading ? 'animate-spin' : ''}`} />
                </Button>
              </div>

              <Select
                value={inventoryType}
                onValueChange={(value) => {
                  setInventoryType(value as InventoryEntityType)
                  setInventoryPage(1)
                }}
              >
                <SelectTrigger className='w-full'>
                  <SelectValue placeholder='Filter entity type' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='all'>All dynamic pages</SelectItem>
                  <SelectItem value='ophmate_product'>Ophmate product pages</SelectItem>
                  <SelectItem value='vendor_catalog'>Vendor catalog pages</SelectItem>
                  <SelectItem value='template_home'>Template home pages</SelectItem>
                  <SelectItem value='template_product'>Template product pages</SelectItem>
                </SelectContent>
              </Select>

              {inventoryError && (
                <div className='rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700'>
                  {inventoryError}
                </div>
              )}

              <div className='max-h-[420px] space-y-2 overflow-y-auto'>
                {inventoryItems.length === 0 && (
                  <p className='text-xs text-slate-500'>
                    {inventoryLoading ? 'Loading page inventory...' : 'No item pages found.'}
                  </p>
                )}
                {inventoryItems.map((page) => {
                  const key = buildRuleKey(page.app_source, page.route_pattern, 'exact')
                  const configured = configsByKey.has(key)
                  const typeIcon =
                    page.entity_type === 'ophmate_product'
                      ? Package
                      : page.entity_type === 'template_product'
                        ? Package
                        : page.entity_type === 'vendor_catalog'
                          ? Store
                          : Globe
                  const TypeIcon = typeIcon
                  const selectedForEdit =
                    draft.match_type === 'exact' &&
                    draft.app_source === page.app_source &&
                    normalizeRoutePattern(draft.route_pattern) === normalizeRoutePattern(page.route_pattern)
                  return (
                    <div
                      key={page.id}
                      className={`rounded-xl border px-3 py-3 shadow-sm transition ${
                        selectedForEdit
                          ? 'border-cyan-300 bg-cyan-50/90 ring-2 ring-cyan-100'
                          : 'border-white/90 bg-white/90 hover:-translate-y-0.5 hover:border-sky-200 hover:shadow-md'
                      }`}
                    >
                      <div className='flex items-start justify-between gap-2'>
                        <div className='min-w-0'>
                          <p className='line-clamp-1 text-sm font-semibold text-slate-900'>
                            {page.label}
                          </p>
                          <p className='line-clamp-1 text-xs text-slate-500'>{page.route_pattern}</p>
                          <div className='mt-1 flex items-center gap-2'>
                            <Badge variant='outline' className='text-xs'>
                              <TypeIcon className='mr-1 h-3 w-3' />
                              {page.app_source === 'ophmate_frontend' ? 'Ophmate' : 'Template'}
                            </Badge>
                            <Badge variant={configured ? 'default' : 'secondary'}>
                              {configured ? 'SEO configured' : 'SEO missing'}
                            </Badge>
                            {selectedForEdit && <Badge className='bg-cyan-600 text-white'>Editing now</Badge>}
                          </div>
                        </div>
                        <Button
                          size='sm'
                          variant={selectedForEdit ? 'default' : 'outline'}
                          onClick={() => useDiscoveredPageForSeo(page)}
                        >
                          <Link2 className='mr-1 h-3 w-3' />
                          {configured ? 'Edit SEO' : 'Create SEO'}
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className='flex flex-wrap items-center justify-between gap-2 border-t border-sky-100 pt-2 text-xs text-slate-600'>
                <p>
                  Showing{' '}
                  {inventoryTotal === 0 ? 0 : (inventoryPage - 1) * inventoryLimit + 1} -{' '}
                  {Math.min(inventoryPage * inventoryLimit, inventoryTotal)} of {inventoryTotal}
                </p>
                <div className='flex items-center gap-2'>
                  <Select
                    value={String(inventoryLimit)}
                    onValueChange={(value) => {
                      setInventoryLimit(Number.parseInt(value, 10) || 20)
                      setInventoryPage(1)
                    }}
                  >
                    <SelectTrigger className='h-8 w-[88px] text-xs'>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='10'>10 / page</SelectItem>
                      <SelectItem value='20'>20 / page</SelectItem>
                      <SelectItem value='50'>50 / page</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    size='sm'
                    variant='outline'
                    className='h-8 px-2 text-xs'
                    disabled={inventoryLoading || inventoryPage <= 1}
                    onClick={() => setInventoryPage((prev) => Math.max(1, prev - 1))}
                  >
                    Prev
                  </Button>
                  <span className='min-w-[72px] text-center'>
                    {inventoryPage} / {inventoryTotalPages}
                  </span>
                  <Button
                    size='sm'
                    variant='outline'
                    className='h-8 px-2 text-xs'
                    disabled={inventoryLoading || inventoryPage >= inventoryTotalPages}
                    onClick={() =>
                      setInventoryPage((prev) => Math.min(inventoryTotalPages, prev + 1))
                    }
                  >
                    Next
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>}
        </div>
      </div>
    </div>
  )
}
