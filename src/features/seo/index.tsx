import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  BadgeCheck,
  Boxes,
  Globe,
  Link2,
  Package,
  Pencil,
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
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { ThemeSwitch } from '@/components/theme-switch'
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
  ophmate_frontend: 'SellersLogin Frontend',
  vendor_template_frontend: 'Vendor Template Frontend',
}

const MATCH_TYPE_LABELS: Record<SeoMatchType, string> = {
  exact: 'Exact path',
  pattern: 'Dynamic pattern',
}

const ENTITY_TYPE_LABELS: Record<Exclude<InventoryEntityType, 'all'>, string> = {
  ophmate_product: 'Product',
  vendor_catalog: 'Vendor Catalog',
  template_home: 'Template Home',
  template_product: 'Template Product',
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

const getErrorMessage = (error: unknown, fallback: string) => {
  if (
    error &&
    typeof error === 'object' &&
    'response' in error &&
    error.response &&
    typeof error.response === 'object' &&
    'data' in error.response &&
    error.response.data &&
    typeof error.response.data === 'object' &&
    'message' in error.response.data &&
    typeof error.response.data.message === 'string'
  ) {
    return error.response.data.message
  }

  return fallback
}

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
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string>('')
  const [draft, setDraft] = useState<SeoDraft>(createEmptyDraft())
  const [sheetOpen, setSheetOpen] = useState(false)
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
      setSearchInput(query)
      setSearch(query)
      if (selectedId && !data.some((item) => item._id === selectedId)) {
        setSelectedId('')
        setDraft(createEmptyDraft())
        setSheetOpen(false)
      }
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Failed to load SEO configs'))
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

      const data = Array.isArray(response?.data?.data)
        ? (response.data.data as InventoryPage[])
        : []
      const pagination = response?.data?.pagination || {}
      const total = Number(pagination.total) || 0
      const totalPages = Math.max(Number(pagination.totalPages) || 1, 1)

      setInventoryItems(data)
      setInventoryTotal(total)
      setInventoryTotalPages(totalPages)

      if (inventoryPage > totalPages) {
        setInventoryPage(totalPages)
      }
    } catch (error: unknown) {
      setInventoryItems([])
      setInventoryTotal(0)
      setInventoryTotalPages(1)
      setInventoryError(getErrorMessage(error, 'Failed to load page inventory'))
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

  const setDraftField = <K extends keyof SeoDraft>(key: K, value: SeoDraft[K]) => {
    setDraft((prev) => ({ ...prev, [key]: value }))
  }

  const openCreateSheet = () => {
    setSelectedId('')
    setDraft(createEmptyDraft())
    setSheetOpen(true)
  }

  const openEditSheet = (config: SeoConfig) => {
    setSelectedId(config._id)
    setDraft(toDraft(config))
    setSheetOpen(true)
  }

  const loadExistingRuleForDraft = (nextDraft: SeoDraft, showToast = false) => {
    const key = buildRuleKey(nextDraft.app_source, nextDraft.route_pattern, nextDraft.match_type)
    const existing = configsByKey.get(key)

    if (!existing) {
      setSelectedId('')
      setDraft(nextDraft)
      return false
    }

    setSelectedId(existing._id)
    setDraft(toDraft(existing))
    if (showToast) {
      toast.info('Existing SEO rule loaded for editing')
    }
    return true
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
        setDraft(toDraft(updated))
        toast.success('SEO config updated')
      } else {
        const response = await api.post('/seo', payload)
        const created = response?.data?.data as SeoConfig
        setConfigs((prev) => [created, ...prev])
        setSelectedId(created._id)
        setDraft(toDraft(created))
        toast.success('SEO config created')
      }

      setSheetOpen(false)
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Failed to save SEO config'))
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
      setSheetOpen(false)
      toast.success('SEO config deleted')
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Failed to delete SEO config'))
    } finally {
      setSaving(false)
    }
  }

  const openDiscoveredPageForSeo = (page: InventoryPage) => {
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

    loadExistingRuleForDraft(nextDraft, true)
    setSheetOpen(true)
  }

  const handleRuleSearch = () => {
    fetchConfigs(searchInput.trim())
  }

  const handleInventorySearch = () => {
    setInventoryPage(1)
    setInventorySearch(inventorySearchInput.trim())
  }

  const activeConfigCount = configs.filter((item) => item.is_active).length

  return (
    <>
      <Header fixed>
        <div className='flex w-full flex-col gap-3 lg:flex-row lg:items-center lg:justify-between'>
          <div>
            <div className='text-lg font-semibold tracking-tight'>
              {isEntitySection ? 'Entity SEO' : 'SEO Rules'}
            </div>
            <p className='text-muted-foreground text-sm'>
              {isEntitySection
                ? 'Dynamic pages ke SEO ko table view me manage karo.'
                : 'Static aur route-based SEO rules ko table view me manage karo.'}
            </p>
          </div>

          <div className='flex w-full flex-col gap-2 sm:flex-row lg:w-auto'>
            {isEntitySection ? (
              <>
                <Input
                  placeholder='Search products, pages...'
                  value={inventorySearchInput}
                  onChange={(event) => setInventorySearchInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      handleInventorySearch()
                    }
                  }}
                  className='h-9 w-full sm:w-64'
                />
                <Select
                  value={inventoryType}
                  onValueChange={(value) => {
                    setInventoryType(value as InventoryEntityType)
                    setInventoryPage(1)
                  }}
                >
                  <SelectTrigger className='h-9 w-full sm:w-52'>
                    <SelectValue placeholder='Filter entity type' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='all'>All dynamic pages</SelectItem>
                    <SelectItem value='ophmate_product'>SellersLogin product pages</SelectItem>
                    <SelectItem value='vendor_catalog'>Vendor catalog pages</SelectItem>
                    <SelectItem value='template_home'>Template home pages</SelectItem>
                    <SelectItem value='template_product'>Template product pages</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={handleInventorySearch}
                  disabled={inventoryLoading}
                >
                  <Search className='mr-2 h-4 w-4' />
                  Search
                </Button>
              </>
            ) : (
              <>
                <Input
                  placeholder='Search by page, route, title...'
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      handleRuleSearch()
                    }
                  }}
                  className='h-9 w-full sm:w-72'
                />
                <Button variant='outline' size='sm' onClick={handleRuleSearch} disabled={loading}>
                  <Search className='mr-2 h-4 w-4' />
                  Search
                </Button>
                <Button size='sm' onClick={openCreateSheet}>
                  <Plus className='mr-2 h-4 w-4' />
                  New Rule
                </Button>
              </>
            )}
          </div>
        </div>

        <div className='ms-auto flex items-center space-x-4'>
          <ThemeSwitch />
          <ConfigDrawer />
          <ProfileDropdown />
        </div>
      </Header>

      <Main className='flex flex-1 flex-col gap-4 sm:gap-6'>
        <div className='grid gap-4 md:grid-cols-3'>
          <Card>
            <CardContent className='flex items-center justify-between p-5'>
              <div>
                <p className='text-muted-foreground text-sm'>Total Configs</p>
                <p className='text-2xl font-semibold'>{configs.length}</p>
              </div>
              <Globe className='text-muted-foreground h-5 w-5' />
            </CardContent>
          </Card>

          <Card>
            <CardContent className='flex items-center justify-between p-5'>
              <div>
                <p className='text-muted-foreground text-sm'>Active Configs</p>
                <p className='text-2xl font-semibold'>{activeConfigCount}</p>
              </div>
              <BadgeCheck className='text-muted-foreground h-5 w-5' />
            </CardContent>
          </Card>

          <Card>
            <CardContent className='flex items-center justify-between p-5'>
              <div>
                <p className='text-muted-foreground text-sm'>
                  {isEntitySection ? 'Dynamic Pages' : 'Quick Patterns'}
                </p>
                <p className='text-2xl font-semibold'>
                  {isEntitySection ? inventoryTotal : QUICK_PATTERNS.length}
                </p>
              </div>
              <Boxes className='text-muted-foreground h-5 w-5' />
            </CardContent>
          </Card>
        </div>

        <div className='flex flex-wrap gap-2'>
          <Button asChild variant={isEntitySection ? 'outline' : 'default'}>
            <Link to='/seo'>SEO Rules</Link>
          </Button>
          <Button asChild variant={isEntitySection ? 'default' : 'outline'}>
            <Link to='/seo/entities'>Entity SEO</Link>
          </Button>
          <Button asChild variant='outline'>
            <Link to='/seo/sitemaps'>Sitemap</Link>
          </Button>
        </div>

        {!isEntitySection && (
          <Card>
            <CardHeader className='flex flex-row items-center justify-between'>
              <div>
                <CardTitle>SEO Rules Table</CardTitle>
                <p className='text-muted-foreground text-sm'>
                  Saare SEO rules ek simple table me.
                </p>
              </div>
              <Button
                variant='outline'
                size='sm'
                onClick={() => fetchConfigs(search)}
                disabled={loading}
              >
                <RefreshCcw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </CardHeader>
            <CardContent>
              <div className='overflow-hidden rounded-md border'>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Rule</TableHead>
                      <TableHead>App</TableHead>
                      <TableHead>Route</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className='text-right'>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell
                          colSpan={7}
                          className='h-24 text-center text-sm text-muted-foreground'
                        >
                          Loading SEO rules...
                        </TableCell>
                      </TableRow>
                    ) : configs.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={7}
                          className='h-24 text-center text-sm text-muted-foreground'
                        >
                          No SEO rules found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      configs.map((item) => (
                        <TableRow key={item._id}>
                          <TableCell>
                            <div className='font-medium'>{item.page_name || 'Untitled rule'}</div>
                            <div className='text-muted-foreground text-xs'>
                              {item.meta_title || 'No meta title'}
                            </div>
                          </TableCell>
                          <TableCell>{APP_LABELS[item.app_source]}</TableCell>
                          <TableCell className='font-mono text-xs'>{item.route_pattern}</TableCell>
                          <TableCell>{MATCH_TYPE_LABELS[item.match_type]}</TableCell>
                          <TableCell>{item.priority}</TableCell>
                          <TableCell>
                            <Badge variant={item.is_active ? 'default' : 'secondary'}>
                              {item.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                          <TableCell className='text-right'>
                            <Button
                              variant='outline'
                              size='sm'
                              onClick={() => openEditSheet(item)}
                            >
                              <Pencil className='mr-2 h-4 w-4' />
                              Edit
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {!isEntitySection && (
          <Card>
            <CardHeader>
              <CardTitle>Quick Route Patterns</CardTitle>
              <p className='text-muted-foreground text-sm'>
                Common routes ko ek click me form me load karo.
              </p>
            </CardHeader>
            <CardContent>
              <div className='overflow-hidden rounded-md border'>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Pattern</TableHead>
                      <TableHead>App</TableHead>
                      <TableHead>Route</TableHead>
                      <TableHead className='text-right'>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {QUICK_PATTERNS.map((item) => (
                      <TableRow key={`${item.appSource}-${item.route}`}>
                        <TableCell className='font-medium'>{item.label}</TableCell>
                        <TableCell>{APP_LABELS[item.appSource]}</TableCell>
                        <TableCell className='font-mono text-xs'>{item.route}</TableCell>
                        <TableCell className='text-right'>
                          <Button
                            variant='outline'
                            size='sm'
                            onClick={() => {
                              const nextDraft: SeoDraft = {
                                ...createEmptyDraft(),
                                app_source: item.appSource,
                                route_pattern: item.route,
                                match_type: 'pattern',
                                page_name: item.label,
                              }
                              loadExistingRuleForDraft(nextDraft, true)
                              setSheetOpen(true)
                            }}
                          >
                            <Plus className='mr-2 h-4 w-4' />
                            Use Pattern
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {isEntitySection && (
          <Card>
            <CardHeader className='flex flex-row items-center justify-between'>
              <div>
                <CardTitle>Entity SEO Table</CardTitle>
                <p className='text-muted-foreground text-sm'>
                  Products, vendor pages aur template pages ko yahin se manage karo.
                </p>
              </div>
              <Button variant='outline' size='sm' onClick={loadInventory} disabled={inventoryLoading}>
                <RefreshCcw className={`mr-2 h-4 w-4 ${inventoryLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </CardHeader>
            <CardContent className='space-y-4'>
              {inventoryError && (
                <div className='rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700'>
                  {inventoryError}
                </div>
              )}

              <div className='overflow-hidden rounded-md border'>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Page</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>App</TableHead>
                      <TableHead>Route</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className='text-right'>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {inventoryLoading ? (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className='h-24 text-center text-sm text-muted-foreground'
                        >
                          Loading dynamic pages...
                        </TableCell>
                      </TableRow>
                    ) : inventoryItems.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className='h-24 text-center text-sm text-muted-foreground'
                        >
                          No item pages found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      inventoryItems.map((page) => {
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

                        return (
                          <TableRow key={page.id}>
                            <TableCell>
                              <div className='font-medium'>{page.label}</div>
                              <div className='text-muted-foreground text-xs'>
                                {page.suggested_title || 'No suggested title'}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className='flex items-center gap-2'>
                                <TypeIcon className='h-4 w-4 text-muted-foreground' />
                                {ENTITY_TYPE_LABELS[page.entity_type]}
                              </div>
                            </TableCell>
                            <TableCell>{APP_LABELS[page.app_source]}</TableCell>
                            <TableCell className='font-mono text-xs'>{page.route_pattern}</TableCell>
                            <TableCell>
                              <Badge variant={configured ? 'default' : 'secondary'}>
                                {configured ? 'Configured' : 'Missing'}
                              </Badge>
                            </TableCell>
                            <TableCell className='text-right'>
                              <Button
                                variant='outline'
                                size='sm'
                                onClick={() => openDiscoveredPageForSeo(page)}
                              >
                                <Link2 className='mr-2 h-4 w-4' />
                                {configured ? 'Edit SEO' : 'Create SEO'}
                              </Button>
                            </TableCell>
                          </TableRow>
                        )
                      })
                    )}
                  </TableBody>
                </Table>
              </div>

              <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
                <p className='text-muted-foreground text-sm'>
                  Showing {inventoryTotal === 0 ? 0 : (inventoryPage - 1) * inventoryLimit + 1} -{' '}
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
                    <SelectTrigger className='h-9 w-[110px]'>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='10'>10 / page</SelectItem>
                      <SelectItem value='20'>20 / page</SelectItem>
                      <SelectItem value='50'>50 / page</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button
                    variant='outline'
                    size='sm'
                    disabled={inventoryLoading || inventoryPage <= 1}
                    onClick={() => setInventoryPage((prev) => Math.max(1, prev - 1))}
                  >
                    Prev
                  </Button>
                  <div className='min-w-16 text-center text-sm'>
                    {inventoryPage} / {inventoryTotalPages}
                  </div>
                  <Button
                    variant='outline'
                    size='sm'
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
          </Card>
        )}
      </Main>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className='w-full overflow-y-auto sm:max-w-xl'>
          <SheetHeader>
            <SheetTitle>{selectedId ? 'Edit SEO Rule' : 'Create SEO Rule'}</SheetTitle>
            <SheetDescription>
              Meta title, description aur keywords yahin se update karo.
            </SheetDescription>
          </SheetHeader>

          <div className='space-y-4 px-4 pb-4'>
            <div className='grid gap-3 md:grid-cols-2'>
              <div className='space-y-1'>
                <label className='text-xs font-semibold uppercase tracking-wide text-slate-500'>
                  Frontend app
                </label>
                <Select
                  value={draft.app_source}
                  onValueChange={(value) => {
                    const next = { ...draft, app_source: value as SeoAppSource }
                    loadExistingRuleForDraft(next, true)
                  }}
                >
                  <SelectTrigger className='w-full'>
                    <SelectValue placeholder='Select app source' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='ophmate_frontend'>SellersLogin Frontend</SelectItem>
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
                  placeholder='/product/[category]/[id]'
                  value={draft.route_pattern}
                  onChange={(event) => setDraftField('route_pattern', event.target.value)}
                  onBlur={(event) => {
                    const next = {
                      ...draft,
                      route_pattern: normalizeRoutePattern(event.target.value),
                    }
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
                className='min-h-28'
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

            <div className='flex items-center justify-between rounded-md border px-3 py-3'>
              <div>
                <p className='text-sm font-medium'>Rule active</p>
                <p className='text-muted-foreground text-xs'>
                  Inactive rules frontend me apply nahi honge.
                </p>
              </div>
              <Switch
                checked={draft.is_active}
                onCheckedChange={(checked) => setDraftField('is_active', Boolean(checked))}
              />
            </div>
          </div>

          <SheetFooter className='border-t'>
            <div className='flex w-full flex-col gap-2 sm:flex-row sm:justify-between'>
              <Button
                variant='destructive'
                onClick={handleDelete}
                disabled={saving || !selectedId}
              >
                <Trash2 className='mr-2 h-4 w-4' />
                Delete
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                <Save className='mr-2 h-4 w-4' />
                {saving ? 'Saving...' : selectedId ? 'Update Rule' : 'Create Rule'}
              </Button>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  )
}
