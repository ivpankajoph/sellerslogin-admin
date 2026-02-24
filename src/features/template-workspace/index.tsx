import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ExternalLink,
  FilePenLine,
  LayoutTemplate,
  Loader2,
  MapPin,
  Save,
} from 'lucide-react'
import { useSelector } from 'react-redux'
import { toast } from 'sonner'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { ConfigDrawer } from '@/components/config-drawer'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  getVendorTemplatePreviewUrl,
  setStoredTemplatePreviewCity,
} from '@/lib/storefront-url'

type VendorRow = {
  _id: string
  name?: string
  registrar_name?: string
  business_name?: string
  email?: string
  default_city_slug?: string
  default_city_id?: string
}

type CityRow = {
  _id: string
  name: string
  slug: string
  isActive: boolean
}

type TemplateRow = {
  _id: string
  template_key: string
  template_name?: string
  name?: string
}

type WorkspaceProduct = {
  _id: string
  productName: string
  slug: string
  status: string
  isAvailable: boolean
  brand: string
  shortDescription: string
  description: string
  metaTitle: string
  metaDescription: string
  metaKeywords: string[]
  availableCities?: Array<{ _id: string; name: string; slug: string }>
}

type WorkspaceTemplateData = {
  template?: any
  products?: WorkspaceProduct[]
}

type ProductEditor = {
  _id: string
  productName: string
  slug: string
  brand: string
  shortDescription: string
  description: string
  metaTitle: string
  metaDescription: string
  metaKeywords: string
  status: string
  isAvailable: boolean
  availableCities: string[]
}

const normalizeRole = (value: unknown) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[\s_-]/g, '')

const normalizeCitySlug = (value?: string) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'all'

const getVendorLabel = (vendor: VendorRow) =>
  vendor.business_name || vendor.registrar_name || vendor.name || vendor.email || vendor._id

const defaultEditor = (product: WorkspaceProduct): ProductEditor => ({
  _id: product._id,
  productName: product.productName || '',
  slug: product.slug || '',
  brand: product.brand || '',
  shortDescription: product.shortDescription || '',
  description: product.description || '',
  metaTitle: product.metaTitle || '',
  metaDescription: product.metaDescription || '',
  metaKeywords: Array.isArray(product.metaKeywords)
    ? product.metaKeywords.join(', ')
    : '',
  status: product.status || 'pending',
  isAvailable: product.isAvailable !== false,
  availableCities: Array.isArray(product.availableCities)
    ? product.availableCities.map((city) => city?._id).filter(Boolean)
    : [],
})

export default function TemplateWorkspacePage() {
  const token = useSelector((state: any) => state.auth?.token || '')
  const authUser = useSelector((state: any) => state.auth?.user || null)
  const role = normalizeRole(useSelector((state: any) => state.auth?.user?.role))
  const isAdmin = role === 'admin' || role === 'superadmin'
  const isVendor = role === 'vendor'
  const canAccess = isAdmin || isVendor

  const [vendors, setVendors] = useState<VendorRow[]>([])
  const [cities, setCities] = useState<CityRow[]>([])
  const [templates, setTemplates] = useState<TemplateRow[]>([])
  const [templateData, setTemplateData] = useState<WorkspaceTemplateData>({})
  const [products, setProducts] = useState<WorkspaceProduct[]>([])
  const [loadingVendors, setLoadingVendors] = useState(false)
  const [loadingWorkspace, setLoadingWorkspace] = useState(false)
  const [savingProduct, setSavingProduct] = useState(false)
  const [selectedVendorId, setSelectedVendorId] = useState('')
  const [selectedTemplateKey, setSelectedTemplateKey] = useState('')
  const [selectedCitySlug, setSelectedCitySlug] = useState('all')
  const [vendorDefaultCitySlug, setVendorDefaultCitySlug] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [editingProduct, setEditingProduct] = useState<ProductEditor | null>(null)
  const [savingDefaultCity, setSavingDefaultCity] = useState(false)
  const [loadingDefaultCity, setLoadingDefaultCity] = useState(false)

  const loadVendorsAndCities = useCallback(async () => {
    setLoadingVendors(true)
    try {
      const citiesResPromise = fetch(`${import.meta.env.VITE_PUBLIC_API_URL}/v1/cities?includeInactive=true`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      })

      const vendorsResPromise = isAdmin
        ? fetch(`${import.meta.env.VITE_PUBLIC_API_URL}/v1/vendors/getall`)
        : Promise.resolve(null)

      const [vendorsRes, citiesRes] = await Promise.all([vendorsResPromise, citiesResPromise])

      let nextVendors: VendorRow[] = []
      if (isAdmin) {
        const vendorsBody = await vendorsRes?.json()
        nextVendors = Array.isArray(vendorsBody?.vendors) ? vendorsBody.vendors : []
      } else if (isVendor) {
        const ownId = String(authUser?.id || authUser?._id || '')
        if (ownId) {
          nextVendors = [
            {
              _id: ownId,
              name: authUser?.name,
              business_name: authUser?.business_name,
              registrar_name: authUser?.registrar_name,
              email: authUser?.email,
              default_city_slug: normalizeCitySlug(authUser?.default_city_slug || 'all'),
              default_city_id: authUser?.default_city_id,
            },
          ]
        }
      }

      const citiesBody = await citiesRes.json()

      setVendors(nextVendors)
      setSelectedVendorId((current) => {
        if (current && nextVendors.some((vendor) => vendor._id === current)) return current
        return nextVendors[0]?._id || ''
      })
      setTemplates([])
      setSelectedTemplateKey('')
      setTemplateData({})
      setProducts([])
      setEditingProduct(null)
      setSearchTerm('')
      setVendorDefaultCitySlug('all')
      setSelectedCitySlug('all')

      setCities(Array.isArray(citiesBody?.data) ? citiesBody.data : [])
    } catch (error: any) {
      toast.error(error?.message || 'Failed to load workspace data')
      setVendors([])
      setCities([])
      setSelectedVendorId('')
      setTemplates([])
      setSelectedTemplateKey('')
      setTemplateData({})
      setProducts([])
      setEditingProduct(null)
      setSearchTerm('')
      setVendorDefaultCitySlug('all')
      setSelectedCitySlug('all')
    } finally {
      setLoadingVendors(false)
    }
  }, [authUser, isAdmin, isVendor, token])

  useEffect(() => {
    if (!canAccess) return
    loadVendorsAndCities()
  }, [canAccess, loadVendorsAndCities])

  const loadTemplates = useCallback(async (vendorId: string) => {
    if (!vendorId) {
      setTemplates([])
      setSelectedTemplateKey('')
      return
    }
    try {
      const res = await fetch(
        `${import.meta.env.VITE_PUBLIC_API_URL}/v1/templates/by-vendor?vendor_id=${vendorId}`
      )
      const body = await res.json()
      const list = Array.isArray(body?.data) ? body.data : []
      setTemplates(list)
      setSelectedTemplateKey((current) => {
        if (current && list.some((item: TemplateRow) => item.template_key === current)) {
          return current
        }
        return list[0]?.template_key || ''
      })
    } catch {
      setTemplates([])
      setSelectedTemplateKey('')
    }
  }, [])

  useEffect(() => {
    if (!selectedVendorId) return
    loadTemplates(selectedVendorId)
  }, [selectedVendorId, loadTemplates])

  const loadVendorDefaultCity = useCallback(async () => {
    if (!isVendor || !token) return
    setLoadingDefaultCity(true)
    try {
      const res = await fetch(`${import.meta.env.VITE_PUBLIC_API_URL}/v1/vendor/profile`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      const body = await res.json()
      const nextSlug = normalizeCitySlug(body?.vendor?.default_city_slug || 'all')
      setVendorDefaultCitySlug(nextSlug)
      setSelectedCitySlug((current) =>
        normalizeCitySlug(current) === 'all' ? nextSlug : normalizeCitySlug(current)
      )
    } catch {
      setVendorDefaultCitySlug('all')
    } finally {
      setLoadingDefaultCity(false)
    }
  }, [isVendor, token])

  useEffect(() => {
    if (!selectedVendorId) {
      setVendorDefaultCitySlug('all')
      return
    }

    if (isVendor) {
      loadVendorDefaultCity()
      return
    }

    const vendor = vendors.find((item) => item._id === selectedVendorId)
    const nextDefaultSlug = normalizeCitySlug(vendor?.default_city_slug || 'all')
    setVendorDefaultCitySlug(nextDefaultSlug)
    setSelectedCitySlug((current) =>
      normalizeCitySlug(current) === 'all' ? nextDefaultSlug : normalizeCitySlug(current)
    )
  }, [selectedVendorId, vendors, isVendor, loadVendorDefaultCity])

  const effectiveCitySlug = useMemo(() => {
    const selected = normalizeCitySlug(selectedCitySlug)
    if (selected !== 'all') return selected
    return normalizeCitySlug(vendorDefaultCitySlug)
  }, [selectedCitySlug, vendorDefaultCitySlug])

  const loadWorkspace = useCallback(async () => {
    if (!selectedVendorId) {
      setTemplateData({})
      setProducts([])
      return
    }

    setLoadingWorkspace(true)
    try {
      const [templateRes, productsRes] = await Promise.all([
        fetch(
          `${import.meta.env.VITE_PUBLIC_API_URL}/v1/templates/${selectedVendorId}/preview?city=${encodeURIComponent(effectiveCitySlug)}`
        ),
        fetch(
          `${import.meta.env.VITE_PUBLIC_API_URL}/v1/products/all?ownerId=${selectedVendorId}&city=${encodeURIComponent(effectiveCitySlug)}`
        ),
      ])

      const templateBody = await templateRes.json()
      const productsBody = await productsRes.json()

      setTemplateData(templateBody?.data || {})
      setProducts(Array.isArray(productsBody?.products) ? productsBody.products : [])
    } catch (error: any) {
      toast.error(error?.message || 'Failed to load template workspace')
      setTemplateData({})
      setProducts([])
    } finally {
      setLoadingWorkspace(false)
    }
  }, [selectedVendorId, effectiveCitySlug])

  useEffect(() => {
    if (!selectedVendorId) return
    loadWorkspace()
  }, [selectedVendorId, effectiveCitySlug, loadWorkspace])

  const templatePages = useMemo(() => {
    const basePages = [
      { id: 'home', label: 'Home Page', route: '' },
      { id: 'about', label: 'About Page', route: '/about' },
      { id: 'contact', label: 'Contact Page', route: '/contact' },
      { id: 'social', label: 'Social + FAQs', route: '/social-faqs' },
      { id: 'catalog', label: 'All Products', route: '/all-products' },
    ]
    const customPages = Array.isArray(templateData?.template?.components?.custom_pages)
      ? templateData.template.components.custom_pages
      : []
    const customRows = customPages.map((page: any) => ({
      id: page?.id || page?.slug,
      label: page?.title || page?.slug || 'Custom Page',
      route: `/page/${page?.slug || page?.id}`,
    }))
    return [...basePages, ...customRows]
  }, [templateData])

  const filteredProducts = useMemo(() => {
    const search = searchTerm.trim().toLowerCase()
    if (!search) return products
    return products.filter((product) =>
      `${product.productName} ${product.slug} ${product.metaTitle} ${product.metaDescription}`
        .toLowerCase()
        .includes(search)
    )
  }, [products, searchTerm])

  const cityOptions = useMemo(
    () =>
      [{ _id: 'all', name: 'All Cities', slug: 'all', isActive: true }, ...cities].filter(
        (city, index, arr) => arr.findIndex((item) => item.slug === city.slug) === index
      ),
    [cities]
  )

  const cityLabelBySlug = useMemo(
    () =>
      cityOptions.reduce<Record<string, string>>((acc, city) => {
        acc[normalizeCitySlug(city.slug)] = city.name
        return acc
      }, {}),
    [cityOptions]
  )

  const previewUrl = useMemo(() => {
    if (!selectedVendorId || !selectedTemplateKey) return ''
    return (
      getVendorTemplatePreviewUrl(selectedVendorId, selectedTemplateKey, effectiveCitySlug) || ''
    )
  }, [selectedVendorId, selectedTemplateKey, effectiveCitySlug])

  const saveDefaultCity = async () => {
    if (!isVendor || !token) return
    const nextSlug = normalizeCitySlug(vendorDefaultCitySlug)
    setSavingDefaultCity(true)
    try {
      const res = await fetch(
        `${import.meta.env.VITE_PUBLIC_API_URL}/v1/vendor/profile/default-city`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            citySlug: nextSlug,
          }),
        }
      )
      const body = await res.json()
      if (!res.ok || body?.success === false) {
        throw new Error(body?.message || `Failed to update default city (HTTP ${res.status})`)
      }

      const updatedSlug = normalizeCitySlug(
        body?.city?.slug || body?.vendor?.default_city_slug || nextSlug
      )
      setVendorDefaultCitySlug(updatedSlug)
      setSelectedCitySlug((current) =>
        normalizeCitySlug(current) === 'all' ? updatedSlug : normalizeCitySlug(current)
      )
      setStoredTemplatePreviewCity(updatedSlug)
      toast.success('Default city updated')
      loadWorkspace()
    } catch (error: any) {
      toast.error(error?.message || 'Failed to update default city')
    } finally {
      setSavingDefaultCity(false)
    }
  }

  const openEditor = (product: WorkspaceProduct) => setEditingProduct(defaultEditor(product))

  const closeEditor = () => setEditingProduct(null)

  const saveProduct = async () => {
    if (!editingProduct) return
    setSavingProduct(true)
    try {
      const res = await fetch(
        `${import.meta.env.VITE_PUBLIC_API_URL}/v1/admin/products/${editingProduct._id}/content`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            productName: editingProduct.productName,
            slug: editingProduct.slug,
            brand: editingProduct.brand,
            shortDescription: editingProduct.shortDescription,
            description: editingProduct.description,
            metaTitle: editingProduct.metaTitle,
            metaDescription: editingProduct.metaDescription,
            metaKeywords: editingProduct.metaKeywords
              .split(',')
              .map((item) => item.trim())
              .filter(Boolean),
            status: editingProduct.status,
            isAvailable: editingProduct.isAvailable,
            availableCities: editingProduct.availableCities,
          }),
        }
      )
      const data = await res.json()
      if (!res.ok || data?.success === false) {
        throw new Error(data?.message || `Failed to update product page (HTTP ${res.status})`)
      }
      toast.success('Product page updated')
      closeEditor()
      loadWorkspace()
    } catch (error: any) {
      toast.error(error?.message || 'Failed to update product page')
    } finally {
      setSavingProduct(false)
    }
  }

  if (!canAccess) {
    return (
      <Main className='flex flex-1 flex-col gap-4 sm:gap-6'>
        <div className='rounded-xl border border-rose-200 bg-rose-50 px-4 py-5 text-sm text-rose-700'>
          Only admins and vendors can access template workspace.
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
        <div className='flex flex-wrap items-end justify-between gap-3'>
          <div>
            <h2 className='text-2xl font-bold tracking-tight'>Template Workspace</h2>
            <p className='text-muted-foreground'>
              Choose vendor template, view all pages, and edit full product page SEO + city mapping.
            </p>
          </div>
          <Button variant='outline' onClick={loadWorkspace} disabled={loadingWorkspace}>
            {loadingWorkspace ? (
              <Loader2 className='h-4 w-4 animate-spin' />
            ) : (
              <LayoutTemplate className='h-4 w-4' />
            )}
            Refresh Workspace
          </Button>
        </div>

        <div className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
          <div className='grid gap-3 md:grid-cols-2 xl:grid-cols-5'>
            <div>
              <label className='mb-1 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500'>
                Vendor
              </label>
              <select
                value={selectedVendorId}
                onChange={(e) => setSelectedVendorId(e.target.value)}
                className='h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm'
                disabled={loadingVendors || isVendor}
              >
                <option value=''>{loadingVendors ? 'Loading vendors...' : 'Select vendor'}</option>
                {vendors.map((vendor) => (
                  <option key={vendor._id} value={vendor._id}>
                    {getVendorLabel(vendor)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className='mb-1 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500'>
                Template
              </label>
              <select
                value={selectedTemplateKey}
                onChange={(e) => setSelectedTemplateKey(e.target.value)}
                className='h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm'
                disabled={!selectedVendorId}
              >
                <option value=''>Select template</option>
                {templates.map((template) => (
                  <option key={template._id} value={template.template_key}>
                    {template.template_name || template.template_key}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className='mb-1 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500'>
                City URL
              </label>
              <select
                value={selectedCitySlug}
                onChange={(e) => {
                  const nextCity = normalizeCitySlug(e.target.value)
                  setSelectedCitySlug(nextCity)
                  setStoredTemplatePreviewCity(nextCity)
                }}
                className='h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm'
              >
                {cityOptions
                  .filter((city) => city.isActive || city.slug === 'all')
                  .map((city) => (
                    <option key={city._id} value={city.slug}>
                      {city.name}
                    </option>
                  ))}
              </select>
              <p className='mt-1 text-xs text-slate-500'>
                Preview/product data resolves city as:{' '}
                <span className='font-semibold text-slate-700'>
                  {cityLabelBySlug[normalizeCitySlug(effectiveCitySlug)] || 'All Cities'}
                </span>
              </p>
            </div>

            <div>
              <label className='mb-1 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500'>
                Vendor Default City
              </label>
              <div className='flex gap-2'>
                <select
                  value={vendorDefaultCitySlug}
                  onChange={(e) => setVendorDefaultCitySlug(normalizeCitySlug(e.target.value))}
                  className='h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm'
                  disabled={!isVendor || loadingDefaultCity || savingDefaultCity}
                >
                  {cityOptions
                    .filter((city) => city.isActive || city.slug === 'all')
                    .map((city) => (
                      <option key={`default-${city._id}`} value={city.slug}>
                        {city.name}
                      </option>
                    ))}
                </select>
                {isVendor ? (
                  <Button
                    type='button'
                    variant='outline'
                    className='h-11 min-w-[98px]'
                    onClick={saveDefaultCity}
                    disabled={savingDefaultCity || loadingDefaultCity}
                  >
                    {savingDefaultCity ? (
                      <Loader2 className='h-4 w-4 animate-spin' />
                    ) : (
                      <MapPin className='h-4 w-4' />
                    )}
                    Save
                  </Button>
                ) : null}
              </div>
              <p className='mt-1 text-xs text-slate-500'>
                {isVendor
                  ? 'Used automatically when City URL is set to All Cities.'
                  : `Vendor default: ${
                      cityLabelBySlug[normalizeCitySlug(vendorDefaultCitySlug)] || 'All Cities'
                    }`}
              </p>
            </div>

            <div className='flex items-end md:col-span-2 xl:col-span-1'>
              {previewUrl ? (
                <a href={previewUrl} target='_blank' rel='noreferrer' className='w-full'>
                  <Button className='w-full'>
                    <ExternalLink className='h-4 w-4' />
                    Open City Preview
                  </Button>
                </a>
              ) : (
                <Button className='w-full' disabled>
                  Open City Preview
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className='grid gap-4 xl:grid-cols-[380px_1fr]'>
          <div className='min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
            <h3 className='text-lg font-semibold text-slate-900'>Template Pages</h3>
            <p className='mt-1 text-sm text-slate-500'>
              All pages under selected template dashboard.
            </p>

            <div className='mt-4 space-y-2'>
              {templatePages.map((page) => (
                <div
                  key={page.id}
                  className='rounded-lg border border-slate-200 bg-slate-50 px-3 py-2'
                >
                  <p className='text-sm font-medium text-slate-800'>{page.label}</p>
                  <p className='text-xs text-slate-500'>
                    {page.route || '/'}
                  </p>
                </div>
              ))}
              {!templatePages.length ? (
                <div className='rounded-lg border border-dashed border-slate-300 px-3 py-5 text-center text-sm text-slate-500'>
                  Select a vendor to load template pages.
                </div>
              ) : null}
            </div>
          </div>

          <div className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
            <div className='mb-4 flex flex-wrap items-center justify-between gap-2'>
              <div>
                <h3 className='text-lg font-semibold text-slate-900'>Product Pages</h3>
                <p className='text-sm text-slate-500'>
                  Edit complete product page + SEO and assign multiple cities.
                </p>
              </div>
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder='Search product pages...'
                className='max-w-xs'
              />
            </div>

            <div className='w-full overflow-x-auto pb-2'>
              <table className='w-full min-w-[760px] table-fixed'>
                <thead>
                  <tr className='border-b border-slate-200 text-left text-xs uppercase tracking-[0.2em] text-slate-500'>
                    <th className='w-[22%] pb-2 pe-3'>Product</th>
                    <th className='w-[16%] pb-2 pe-3'>Slug</th>
                    <th className='w-[30%] pb-2 pe-3'>SEO Title</th>
                    <th className='w-[16%] pb-2 pe-3'>Cities</th>
                    <th className='w-[8%] pb-2 pe-3'>Status</th>
                    <th className='w-[8%] pb-2 text-right'>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((product) => (
                    <tr key={product._id} className='border-b border-slate-100'>
                      <td className='py-3 pe-3 align-top'>
                        <p className='truncate font-medium text-slate-900'>{product.productName}</p>
                        <p className='truncate text-xs text-slate-500'>{product.brand || 'N/A'}</p>
                      </td>
                      <td className='py-3 pe-3 align-top text-sm text-slate-600'>
                        <p className='truncate'>{product.slug}</p>
                      </td>
                      <td className='py-3 pe-3 align-top text-sm text-slate-700'>
                        <p className='truncate'>{product.metaTitle || '-'}</p>
                      </td>
                      <td className='py-3 pe-3 align-top'>
                        <div className='flex flex-wrap gap-1'>
                          {(product.availableCities || []).map((city) => (
                            <span
                              key={city._id}
                              className='rounded-full bg-cyan-100 px-2 py-0.5 text-xs font-medium text-cyan-700'
                            >
                              {city.name}
                            </span>
                          ))}
                          {!product.availableCities?.length ? (
                            <span className='text-xs text-slate-400'>All / not mapped</span>
                          ) : null}
                        </div>
                      </td>
                      <td className='py-3 pe-3 align-top text-sm text-slate-600'>
                        <p className='truncate'>{product.status}</p>
                      </td>
                      <td className='py-3 text-right align-top'>
                        <Button size='sm' variant='outline' onClick={() => openEditor(product)}>
                          <FilePenLine className='h-4 w-4' />
                          Edit
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {!loadingWorkspace && filteredProducts.length === 0 ? (
              <div className='mt-4 rounded-lg border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500'>
                No product pages found for selected vendor/city.
              </div>
            ) : null}
          </div>
        </div>
      </Main>

      {editingProduct ? (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4'>
          <div className='max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl'>
            <div className='mb-4 flex items-center justify-between'>
              <h3 className='text-xl font-semibold text-slate-900'>Edit Product Page</h3>
              <Button variant='outline' onClick={closeEditor}>
                Close
              </Button>
            </div>

            <div className='grid gap-3 md:grid-cols-2'>
              <label className='text-sm'>
                <span className='mb-1 block font-medium text-slate-700'>Product Name</span>
                <Input
                  value={editingProduct.productName}
                  onChange={(e) =>
                    setEditingProduct((prev) =>
                      prev ? { ...prev, productName: e.target.value } : prev
                    )
                  }
                />
              </label>
              <label className='text-sm'>
                <span className='mb-1 block font-medium text-slate-700'>Slug</span>
                <Input
                  value={editingProduct.slug}
                  onChange={(e) =>
                    setEditingProduct((prev) =>
                      prev ? { ...prev, slug: e.target.value } : prev
                    )
                  }
                />
              </label>
              <label className='text-sm'>
                <span className='mb-1 block font-medium text-slate-700'>Brand</span>
                <Input
                  value={editingProduct.brand}
                  onChange={(e) =>
                    setEditingProduct((prev) =>
                      prev ? { ...prev, brand: e.target.value } : prev
                    )
                  }
                />
              </label>
              <label className='text-sm'>
                <span className='mb-1 block font-medium text-slate-700'>Status</span>
                <select
                  value={editingProduct.status}
                  onChange={(e) =>
                    setEditingProduct((prev) =>
                      prev ? { ...prev, status: e.target.value } : prev
                    )
                  }
                  className='h-10 w-full rounded-md border border-slate-300 bg-white px-3'
                >
                  <option value='draft'>Draft</option>
                  <option value='pending'>Pending</option>
                  <option value='approved'>Approved</option>
                  <option value='rejected'>Rejected</option>
                </select>
              </label>
            </div>

            <label className='mt-3 block text-sm'>
              <span className='mb-1 block font-medium text-slate-700'>Short Description</span>
              <textarea
                value={editingProduct.shortDescription}
                onChange={(e) =>
                  setEditingProduct((prev) =>
                    prev ? { ...prev, shortDescription: e.target.value } : prev
                  )
                }
                className='min-h-[88px] w-full rounded-md border border-slate-300 px-3 py-2'
              />
            </label>

            <label className='mt-3 block text-sm'>
              <span className='mb-1 block font-medium text-slate-700'>Description</span>
              <textarea
                value={editingProduct.description}
                onChange={(e) =>
                  setEditingProduct((prev) =>
                    prev ? { ...prev, description: e.target.value } : prev
                  )
                }
                className='min-h-[110px] w-full rounded-md border border-slate-300 px-3 py-2'
              />
            </label>

            <div className='mt-3 grid gap-3 md:grid-cols-2'>
              <label className='text-sm'>
                <span className='mb-1 block font-medium text-slate-700'>Meta Title</span>
                <Input
                  value={editingProduct.metaTitle}
                  onChange={(e) =>
                    setEditingProduct((prev) =>
                      prev ? { ...prev, metaTitle: e.target.value } : prev
                    )
                  }
                />
              </label>
              <label className='text-sm'>
                <span className='mb-1 block font-medium text-slate-700'>Meta Keywords</span>
                <Input
                  value={editingProduct.metaKeywords}
                  onChange={(e) =>
                    setEditingProduct((prev) =>
                      prev ? { ...prev, metaKeywords: e.target.value } : prev
                    )
                  }
                  placeholder='Comma separated'
                />
              </label>
            </div>

            <label className='mt-3 block text-sm'>
              <span className='mb-1 block font-medium text-slate-700'>Meta Description</span>
              <textarea
                value={editingProduct.metaDescription}
                onChange={(e) =>
                  setEditingProduct((prev) =>
                    prev ? { ...prev, metaDescription: e.target.value } : prev
                  )
                }
                className='min-h-[86px] w-full rounded-md border border-slate-300 px-3 py-2'
              />
            </label>

            <div className='mt-3'>
              <p className='mb-1 text-sm font-medium text-slate-700'>Available Cities</p>
              <div className='grid gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 sm:grid-cols-2 md:grid-cols-3'>
                {cities
                  .filter((city) => city.isActive)
                  .map((city) => {
                    const checked = editingProduct.availableCities.includes(city._id)
                    return (
                      <label key={city._id} className='flex items-center gap-2 text-sm text-slate-700'>
                        <input
                          type='checkbox'
                          checked={checked}
                          onChange={(e) =>
                            setEditingProduct((prev) => {
                              if (!prev) return prev
                              if (e.target.checked) {
                                return {
                                  ...prev,
                                  availableCities: [...prev.availableCities, city._id],
                                }
                              }
                              return {
                                ...prev,
                                availableCities: prev.availableCities.filter((id) => id !== city._id),
                              }
                            })
                          }
                        />
                        <span>{city.name}</span>
                      </label>
                    )
                  })}
              </div>
            </div>

            <label className='mt-3 flex items-center gap-2 text-sm text-slate-700'>
              <input
                type='checkbox'
                checked={editingProduct.isAvailable}
                onChange={(e) =>
                  setEditingProduct((prev) =>
                    prev ? { ...prev, isAvailable: e.target.checked } : prev
                  )
                }
              />
              Product is available
            </label>

            <div className='mt-4 flex justify-end gap-2'>
              <Button variant='outline' onClick={closeEditor}>
                Cancel
              </Button>
              <Button onClick={saveProduct} disabled={savingProduct}>
                {savingProduct ? (
                  <Loader2 className='h-4 w-4 animate-spin' />
                ) : (
                  <Save className='h-4 w-4' />
                )}
                Save Product Page
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
