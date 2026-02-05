import { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { ExternalLink, RefreshCcw, Search } from 'lucide-react'
import { useSelector } from 'react-redux'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  VITE_PUBLIC_API_URL,
  VITE_PUBLIC_API_URL_TEMPLATE_FRONTEND,
  VITE_PUBLIC_STOREFRONT_URL,
} from '@/config'
import type { RootState } from '@/store'

type Product = {
  _id: string
  productName?: string
  productCategory?: string | { _id?: string; id?: string; name?: string; slug?: string }
  productCategoryName?: string
  ownerId?: string | { _id?: string; id?: string }
  isDeleted?: boolean
}

type Category = {
  _id: string
  name?: string
  slug?: string
}

type SubCategory = {
  _id: string
  name?: string
  slug?: string
}

type MainCategory = {
  _id: string
  name?: string
  slug?: string
}

type Vendor = {
  _id?: string
  id?: string
  business_name?: string
  storeName?: string
  name?: string
  email?: string
}

type TemplatePage = {
  slug?: string
  id?: string
  title?: string
  name?: string
}

type SitemapEntry = {
  label: string
  url: string
}

const objectIdRegex = /^[a-f\d]{24}$/i

const normalizeBase = (base: string) => base.replace(/\/+$/, '')

const joinUrl = (base: string, path: string) => {
  if (!base) return path
  const cleanBase = normalizeBase(base)
  const cleanPath = path.startsWith('/') ? path : `/${path}`
  return `${cleanBase}${cleanPath}`
}

const toSlug = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

const getId = (
  value?: string | { _id?: string; id?: string } | null
): string => {
  if (!value) return ''
  if (typeof value === 'string') return value
  return value._id || value.id || ''
}

const getVendorLabel = (vendor: Vendor) =>
  vendor.business_name ||
  vendor.storeName ||
  vendor.name ||
  vendor.email ||
  'Vendor'

const filterEntries = (entries: SitemapEntry[], query: string) => {
  if (!query) return entries
  return entries.filter(
    (entry) =>
      entry.label.toLowerCase().includes(query) ||
      entry.url.toLowerCase().includes(query)
  )
}

export default function SitemapsPage() {
  const authUser = useSelector((state: RootState) => state.auth?.user)
  const role = authUser?.role
  const vendorId = authUser?._id || authUser?.id || ''

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [subcategories, setSubcategories] = useState<SubCategory[]>([])
  const [mainCategories, setMainCategories] = useState<MainCategory[]>([])
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [templatePages, setTemplatePages] = useState<Record<string, TemplatePage[]>>(
    {}
  )

  const apiBase = useMemo(() => {
    if (!VITE_PUBLIC_API_URL) return ''
    return VITE_PUBLIC_API_URL.endsWith('/v1')
      ? VITE_PUBLIC_API_URL
      : `${VITE_PUBLIC_API_URL}/v1`
  }, [])

  const storefrontBase = VITE_PUBLIC_STOREFRONT_URL || ''
  const templateBase = VITE_PUBLIC_API_URL_TEMPLATE_FRONTEND || ''
  const query = search.trim().toLowerCase()

  const loadData = async () => {
    if (!apiBase) {
      setError('Missing API base URL.')
      return
    }

    setLoading(true)
    setError(null)

    const requests = await Promise.allSettled([
      axios.get(`${apiBase}/products/all`),
      axios.get(`${apiBase}/categories/getall`),
      axios.get(`${apiBase}/subcategories/getall`),
      axios.get(`${apiBase}/maincategories/getall`),
      axios.get(`${apiBase}/vendors/getall`),
    ])

    const [productsRes, categoriesRes, subcategoriesRes, mainRes, vendorsRes] =
      requests

    const nextProducts =
      productsRes.status === 'fulfilled'
        ? (productsRes.value.data?.products || [])
        : []
    const nextCategories =
      categoriesRes.status === 'fulfilled' ? categoriesRes.value.data?.data || [] : []
    const nextSubcategories =
      subcategoriesRes.status === 'fulfilled'
        ? subcategoriesRes.value.data?.data || []
        : []
    const nextMainCategories =
      mainRes.status === 'fulfilled' ? mainRes.value.data?.data || [] : []
    const nextVendors =
      vendorsRes.status === 'fulfilled' ? vendorsRes.value.data?.vendors || vendorsRes.value.data?.data || [] : []

    const filteredProducts =
      role === 'vendor' && vendorId
        ? nextProducts.filter((product: Product) => getId(product.ownerId) === vendorId)
        : nextProducts

    const filteredVendors =
      role === 'vendor' && vendorId
        ? [
            {
              _id: vendorId,
              business_name: authUser?.business_name,
              storeName: authUser?.storeName,
              name: authUser?.name,
              email: authUser?.email,
            },
          ]
        : nextVendors

    setProducts(filteredProducts)
    setCategories(nextCategories)
    setSubcategories(nextSubcategories)
    setMainCategories(nextMainCategories)
    setVendors(filteredVendors)
    setLoading(false)
  }

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiBase, role, vendorId])

  useEffect(() => {
    if (!apiBase || vendors.length === 0) {
      setTemplatePages({})
      return
    }

    let active = true
    const loadPages = async () => {
      const entries = await Promise.all(
        vendors.map(async (vendor) => {
          const id = getId(vendor._id || vendor.id || '')
          if (!id) return [id, []] as const
          try {
            const res = await axios.get(`${apiBase}/templates/pages`, {
              params: { vendor_id: id },
            })
            const pages =
              res.data?.data?.components?.custom_pages ||
              res.data?.data?.custom_pages ||
              []
            return [id, pages] as const
          } catch {
            return [id, []] as const
          }
        })
      )

      if (!active) return
      const next = entries.reduce((acc, [id, pages]) => {
        if (id) acc[id] = pages
        return acc
      }, {} as Record<string, TemplatePage[]>)
      setTemplatePages(next)
    }

    loadPages()
    return () => {
      active = false
    }
  }, [apiBase, vendors])

  const categoryMap = useMemo(() => {
    return categories.reduce((acc, item) => {
      if (item?._id) {
        acc[item._id] = item
      }
      return acc
    }, {} as Record<string, Category>)
  }, [categories])

  const storefrontStaticEntries = useMemo<SitemapEntry[]>(() => {
    const paths = [
      { label: 'Home', path: '/' },
      { label: 'Categories', path: '/categories' },
      { label: 'Listing', path: '/listing' },
      { label: 'Cart', path: '/cart' },
      { label: 'Checkout', path: '/checkout' },
      { label: 'Orders', path: '/orders' },
      { label: 'Profile', path: '/profile' },
      { label: 'Login', path: '/login' },
      { label: 'Privacy', path: '/privacy' },
      { label: 'Terms', path: '/terms' },
      { label: 'Data deletion', path: '/data-deletion' },
    ]

    return paths.map((item) => ({
      label: item.label,
      url: joinUrl(storefrontBase, item.path),
    }))
  }, [storefrontBase])

  const storefrontMainCategoryEntries = useMemo<SitemapEntry[]>(() => {
    return mainCategories
      .filter((item) => item?.slug || item?._id)
      .map((item) => ({
        label: item.name ? `Main category: ${item.name}` : `Main category ${item._id}`,
        url: joinUrl(storefrontBase, `/main-categories/${item.slug || item._id}`),
      }))
  }, [mainCategories, storefrontBase])

  const storefrontCategoryEntries = useMemo<SitemapEntry[]>(() => {
    return categories
      .filter((item) => item?.slug || item?._id)
      .flatMap((item) => {
        const slug = item.slug || item._id
        const label = item.name || slug
        return [
          {
            label: `Category (categories): ${label}`,
            url: joinUrl(storefrontBase, `/categories/${slug}`),
          },
          {
            label: `Category (category): ${label}`,
            url: joinUrl(storefrontBase, `/category/${slug}`),
          },
        ]
      })
  }, [categories, storefrontBase])

  const storefrontSubcategoryEntries = useMemo<SitemapEntry[]>(() => {
    return subcategories
      .filter((item) => item?.slug || item?._id)
      .flatMap((item) => {
        const slug = item.slug || item._id
        const label = item.name || slug
        return [
          {
            label: `Subcategory (sub-categories): ${label}`,
            url: joinUrl(storefrontBase, `/sub-categories/${slug}`),
          },
          {
            label: `Subcategory (subcategory): ${label}`,
            url: joinUrl(storefrontBase, `/subcategory/${slug}`),
          },
        ]
      })
  }, [subcategories, storefrontBase])

  const storefrontVendorEntries = useMemo<SitemapEntry[]>(() => {
    return vendors
      .filter((vendor) => getId(vendor._id || vendor.id || ''))
      .map((vendor) => {
        const id = getId(vendor._id || vendor.id || '')
        return {
          label: `Vendor catalog: ${getVendorLabel(vendor)}`,
          url: joinUrl(storefrontBase, `/vendor/catalog/${id}`),
        }
      })
  }, [vendors, storefrontBase])

  const storefrontProductEntries = useMemo<SitemapEntry[]>(() => {
    return products
      .filter((product) => product?._id && product.isDeleted !== true)
      .map((product) => {
        const categoryId = getId(product.productCategory) || product.productCategoryName || ''
        const pathCategory = categoryId || 'category'
        return {
          label: `Product: ${product.productName || product._id}`,
          url: joinUrl(storefrontBase, `/product/${pathCategory}/${product._id}`),
        }
      })
  }, [products, storefrontBase])

  const templateStaticEntries = useMemo<SitemapEntry[]>(() => {
    return vendors
      .filter((vendor) => getId(vendor._id || vendor.id || ''))
      .flatMap((vendor) => {
        const id = getId(vendor._id || vendor.id || '')
        const vendorLabel = getVendorLabel(vendor)
        const base = `/template/${id}`
        const pages = [
          { label: `${vendorLabel} Home`, path: base },
          { label: `${vendorLabel} About`, path: `${base}/about` },
          { label: `${vendorLabel} Contact`, path: `${base}/contact` },
          { label: `${vendorLabel} Shop`, path: `${base}/category` },
          { label: `${vendorLabel} All products`, path: `${base}/all-products` },
          { label: `${vendorLabel} Cart`, path: `${base}/cart` },
          { label: `${vendorLabel} Checkout`, path: `${base}/checkout` },
          { label: `${vendorLabel} Login`, path: `${base}/login` },
          { label: `${vendorLabel} Register`, path: `${base}/register` },
          { label: `${vendorLabel} Orders`, path: `${base}/orders` },
          { label: `${vendorLabel} Profile`, path: `${base}/profile` },
        ]
        return pages.map((page) => ({
          label: page.label,
          url: joinUrl(templateBase, page.path),
        }))
      })
  }, [vendors, templateBase])

  const templateCategoryEntries = useMemo<SitemapEntry[]>(() => {
    return vendors.flatMap((vendor) => {
      const id = getId(vendor._id || vendor.id || '')
      if (!id) return []
      const vendorProducts = products.filter(
        (product) => getId(product.ownerId) === id && product.isDeleted !== true
      )

      const map = new Map<string, { label: string; path: string }>()

      vendorProducts.forEach((product) => {
        const rawCategoryId = getId(product.productCategory)
        const categoryRecord = rawCategoryId ? categoryMap[rawCategoryId] : undefined
        const categoryName =
          product.productCategoryName || categoryRecord?.name || rawCategoryId
        const categoryId = rawCategoryId || categoryName

        if (!categoryId) return

        const pathSegment = objectIdRegex.test(categoryId)
          ? categoryId
          : toSlug(categoryName || categoryId)

        const label = `Category: ${categoryName || categoryId}`
        map.set(pathSegment, {
          label,
          path: `/template/${id}/category/${pathSegment}`,
        })
      })

      return Array.from(map.values()).map((entry) => ({
        label: `${getVendorLabel(vendor)} ${entry.label}`,
        url: joinUrl(templateBase, entry.path),
      }))
    })
  }, [vendors, products, categoryMap, templateBase])

  const templateCustomPageEntries = useMemo<SitemapEntry[]>(() => {
    return vendors.flatMap((vendor) => {
      const id = getId(vendor._id || vendor.id || '')
      const pages = templatePages[id] || []
      return pages
        .filter((page) => page?.slug || page?.id)
        .map((page) => {
          const slug = page.slug || page.id || ''
          const label = page.title || page.name || slug
          return {
            label: `${getVendorLabel(vendor)} Page: ${label}`,
            url: joinUrl(templateBase, `/template/${id}/page/${slug}`),
          }
        })
    })
  }, [vendors, templatePages, templateBase])

  const templateProductEntries = useMemo<SitemapEntry[]>(() => {
    return products
      .filter((product) => product?._id && product.isDeleted !== true)
      .map((product) => {
        const owner = getId(product.ownerId)
        const label = `Template product: ${product.productName || product._id}`
        const path = owner ? `/template/${owner}/product/${product._id}` : ''
        return {
          label,
          url: path ? joinUrl(templateBase, path) : '',
        }
      })
      .filter((entry) => entry.url)
  }, [products, templateBase])

  const storefrontGroups = [
    { title: 'Static pages', entries: storefrontStaticEntries },
    { title: 'Main categories', entries: storefrontMainCategoryEntries },
    { title: 'Categories', entries: storefrontCategoryEntries },
    { title: 'Subcategories', entries: storefrontSubcategoryEntries },
    { title: 'Vendor catalogs', entries: storefrontVendorEntries },
    { title: 'Product detail pages', entries: storefrontProductEntries },
  ]

  const templateGroups = [
    { title: 'Static pages', entries: templateStaticEntries },
    { title: 'Template categories', entries: templateCategoryEntries },
    { title: 'Custom pages', entries: templateCustomPageEntries },
    { title: 'Template product pages', entries: templateProductEntries },
  ]

  const renderEntries = (entries: SitemapEntry[]) => {
    const visible = filterEntries(entries, query)
    if (visible.length === 0) {
      return <p className='text-sm text-muted-foreground'>No pages found.</p>
    }

    return (
      <div className='space-y-2'>
        {visible.map((entry, index) => {
          const accent =
            index % 3 === 0
              ? 'border-indigo-400'
              : index % 3 === 1
                ? 'border-emerald-400'
                : 'border-fuchsia-400'
          return (
            <div
              key={entry.url}
              className={`flex flex-col gap-2 rounded-lg border border-slate-200 border-l-4 ${accent} bg-white p-3 text-sm shadow-sm sm:flex-row sm:items-center sm:justify-between`}
            >
              <div className='min-w-0'>
                <p className='font-medium text-slate-900'>{entry.label}</p>
                <p className='break-all text-xs text-slate-500'>{entry.url}</p>
              </div>
              <div className='flex items-center gap-2'>
                <Button
                  asChild
                  size='sm'
                  variant='outline'
                  className='border-indigo-200 text-indigo-700 hover:bg-indigo-50'
                >
                  <a href={entry.url} target='_blank' rel='noreferrer'>
                    <ExternalLink className='h-4 w-4' />
                    Open
                  </a>
                </Button>
                <Button
                  size='sm'
                  variant='ghost'
                  className='text-slate-600 hover:text-slate-900'
                  onClick={() => navigator.clipboard?.writeText(entry.url)}
                >
                  Copy
                </Button>
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className='space-y-6 pb-6'>
      <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
        <div>
          <h1 className='text-2xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-500'>
            Sitemap Pages
          </h1>
          <p className='text-sm text-slate-600'>
            Browse Ophmate storefront and vendor template URLs.
          </p>
        </div>
        <div className='flex items-center gap-2'>
          <div className='relative'>
            <Search className='pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-indigo-400' />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder='Search pages...'
              className='pl-9 border-indigo-200 focus-visible:ring-indigo-300/60'
            />
          </div>
          <Button
            onClick={loadData}
            disabled={loading}
            className='bg-indigo-600 text-white hover:bg-indigo-500'
          >
            <RefreshCcw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {error && (
        <Card className='border-red-200 bg-red-50'>
          <CardContent className='py-4 text-sm text-red-700'>{error}</CardContent>
        </Card>
      )}

      <Card className='border-indigo-100 bg-gradient-to-br from-indigo-50 via-white to-fuchsia-50'>
        <CardHeader className='space-y-2'>
          <CardTitle className='text-indigo-700'>Storefront base URLs</CardTitle>
          <div className='flex flex-wrap gap-2'>
            {storefrontBase && (
              <Button
                asChild
                size='sm'
                variant='outline'
                className='border-indigo-200 text-indigo-700 hover:bg-indigo-50'
              >
                <a href={storefrontBase} target='_blank' rel='noreferrer'>
                  Open storefront
                </a>
              </Button>
            )}
            {storefrontBase && (
              <Button
                asChild
                size='sm'
                variant='outline'
                className='border-fuchsia-200 text-fuchsia-700 hover:bg-fuchsia-50'
              >
                <a
                  href={joinUrl(storefrontBase, '/sitemap.xml')}
                  target='_blank'
                  rel='noreferrer'
                >
                  Open sitemap.xml
                </a>
              </Button>
            )}
          </div>
        </CardHeader>
      </Card>

      <Card className='border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-cyan-50'>
        <CardHeader className='space-y-2'>
          <CardTitle className='text-emerald-700'>Template storefront base URLs</CardTitle>
          <div className='flex flex-wrap gap-2'>
            {templateBase && (
              <Button
                asChild
                size='sm'
                variant='outline'
                className='border-emerald-200 text-emerald-700 hover:bg-emerald-50'
              >
                <a href={templateBase} target='_blank' rel='noreferrer'>
                  Open template base
                </a>
              </Button>
            )}
            {templateBase && (
              <Button
                asChild
                size='sm'
                variant='outline'
                className='border-cyan-200 text-cyan-700 hover:bg-cyan-50'
              >
                <a
                  href={joinUrl(templateBase, '/sitemap.xml')}
                  target='_blank'
                  rel='noreferrer'
                >
                  Open sitemap.xml
                </a>
              </Button>
            )}
          </div>
        </CardHeader>
      </Card>

      <Card className='border-slate-200 bg-white shadow-sm'>
        <CardHeader className='border-b border-slate-100'>
          <CardTitle className='text-slate-900'>Ophmate storefront</CardTitle>
        </CardHeader>
        <CardContent className='space-y-4'>
          {storefrontGroups.map((group, index) => (
            <details key={group.title} open={group.title === 'Static pages'}>
              <summary className='cursor-pointer text-sm font-semibold text-slate-900 flex items-center gap-2'>
                <span
                  className={`inline-flex h-2.5 w-2.5 rounded-full ${
                    index % 3 === 0
                      ? 'bg-indigo-500'
                      : index % 3 === 1
                        ? 'bg-emerald-500'
                        : 'bg-fuchsia-500'
                  }`}
                />
                {group.title}
                <span className='rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600'>
                  {filterEntries(group.entries, query).length}
                </span>
              </summary>
              <div className='mt-3'>{renderEntries(group.entries)}</div>
            </details>
          ))}
        </CardContent>
      </Card>

      <Card className='border-slate-200 bg-white shadow-sm'>
        <CardHeader className='border-b border-slate-100'>
          <CardTitle className='text-slate-900'>Vendor template storefronts</CardTitle>
        </CardHeader>
        <CardContent className='space-y-4'>
          {templateGroups.map((group, index) => (
            <details key={group.title} open={group.title === 'Static pages'}>
              <summary className='cursor-pointer text-sm font-semibold text-slate-900 flex items-center gap-2'>
                <span
                  className={`inline-flex h-2.5 w-2.5 rounded-full ${
                    index % 3 === 0
                      ? 'bg-cyan-500'
                      : index % 3 === 1
                        ? 'bg-amber-500'
                        : 'bg-rose-500'
                  }`}
                />
                {group.title}
                <span className='rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600'>
                  {filterEntries(group.entries, query).length}
                </span>
              </summary>
              <div className='mt-3'>{renderEntries(group.entries)}</div>
            </details>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
