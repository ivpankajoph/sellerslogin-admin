import { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { ExternalLink, RefreshCcw, Search } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { useSelector } from 'react-redux'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { ThemeSwitch } from '@/components/theme-switch'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

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

type SitemapGroup = {
  title: string
  entries: SitemapEntry[]
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
  const [storefrontGroupFilter, setStorefrontGroupFilter] = useState('all')
  const [templateGroupFilter, setTemplateGroupFilter] = useState('all')
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [subcategories, setSubcategories] = useState<SubCategory[]>([])
  const [mainCategories, setMainCategories] = useState<MainCategory[]>([])
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [templatePages, setTemplatePages] = useState<Record<string, TemplatePage[]>>(
    {}
  )

  const apiBase = useMemo(() => {
    if (!import.meta.env.VITE_PUBLIC_API_URL) return ''
    return import.meta.env.VITE_PUBLIC_API_URL.endsWith('/v1')
      ? import.meta.env.VITE_PUBLIC_API_URL
      : `${import.meta.env.VITE_PUBLIC_API_URL}/v1`
  }, [])

  const storefrontBase = import.meta.env.VITE_PUBLIC_STOREFRONT_URL || ''
  const templateBase =
    import.meta.env.VITE_PUBLIC_STOREFRONT_URL ||
    import.meta.env.VITE_PUBLIC_API_URL_TEMPLATE_FRONTEND ||
    ''
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

  const storefrontGroups = useMemo<SitemapGroup[]>(
    () => [
      { title: 'Static pages', entries: storefrontStaticEntries },
      { title: 'Main categories', entries: storefrontMainCategoryEntries },
      { title: 'Categories', entries: storefrontCategoryEntries },
      { title: 'Subcategories', entries: storefrontSubcategoryEntries },
      { title: 'Vendor catalogs', entries: storefrontVendorEntries },
      { title: 'Product detail pages', entries: storefrontProductEntries },
    ],
    [
      storefrontStaticEntries,
      storefrontMainCategoryEntries,
      storefrontCategoryEntries,
      storefrontSubcategoryEntries,
      storefrontVendorEntries,
      storefrontProductEntries,
    ],
  )

  const templateGroups = useMemo<SitemapGroup[]>(
    () => [
      { title: 'Static pages', entries: templateStaticEntries },
      { title: 'Template categories', entries: templateCategoryEntries },
      { title: 'Custom pages', entries: templateCustomPageEntries },
      { title: 'Template product pages', entries: templateProductEntries },
    ],
    [
      templateStaticEntries,
      templateCategoryEntries,
      templateCustomPageEntries,
      templateProductEntries,
    ],
  )

  const visibleStorefrontGroups = useMemo(
    () =>
      storefrontGroups
        .map((group) => ({
          ...group,
          entries: filterEntries(group.entries, query),
        }))
        .filter((group) =>
          storefrontGroupFilter === 'all' ? true : group.title === storefrontGroupFilter,
        )
        .filter((group) => group.entries.length > 0),
    [storefrontGroups, query, storefrontGroupFilter],
  )

  const visibleTemplateGroups = useMemo(
    () =>
      templateGroups
        .map((group) => ({
          ...group,
          entries: filterEntries(group.entries, query),
        }))
        .filter((group) =>
          templateGroupFilter === 'all' ? true : group.title === templateGroupFilter,
        )
        .filter((group) => group.entries.length > 0),
    [templateGroups, query, templateGroupFilter],
  )

  const totalVisibleStorefrontEntries = visibleStorefrontGroups.reduce(
    (total, group) => total + group.entries.length,
    0,
  )

  const totalVisibleTemplateEntries = visibleTemplateGroups.reduce(
    (total, group) => total + group.entries.length,
    0,
  )

  return (
    <>
      <Header fixed>
        <div className='flex w-full flex-col gap-3 lg:flex-row lg:items-center lg:justify-between'>
          <div>
            <div className='text-lg font-semibold tracking-tight'>Sitemap</div>
            <p className='text-muted-foreground text-sm'>
              Storefront aur template URLs ko table view me browse karo.
            </p>
          </div>

          <div className='flex w-full flex-col gap-2 sm:flex-row lg:w-auto'>
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder='Search pages...'
              className='h-9 w-full sm:w-72'
            />
            <Button variant='outline' size='sm' onClick={loadData} disabled={loading}>
              <RefreshCcw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
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
                <p className='text-muted-foreground text-sm'>Storefront URLs</p>
                <p className='text-2xl font-semibold'>{totalVisibleStorefrontEntries}</p>
              </div>
              <Search className='text-muted-foreground h-5 w-5' />
            </CardContent>
          </Card>
          <Card>
            <CardContent className='flex items-center justify-between p-5'>
              <div>
                <p className='text-muted-foreground text-sm'>Template URLs</p>
                <p className='text-2xl font-semibold'>{totalVisibleTemplateEntries}</p>
              </div>
              <ExternalLink className='text-muted-foreground h-5 w-5' />
            </CardContent>
          </Card>
          <Card>
            <CardContent className='flex items-center justify-between p-5'>
              <div>
                <p className='text-muted-foreground text-sm'>Groups</p>
                <p className='text-2xl font-semibold'>
                  {visibleStorefrontGroups.length + visibleTemplateGroups.length}
                </p>
              </div>
              <RefreshCcw className='text-muted-foreground h-5 w-5' />
            </CardContent>
          </Card>
        </div>

        <div className='flex flex-wrap gap-2'>
          <Button asChild variant='outline'>
            <Link to='/seo'>SEO Rules</Link>
          </Button>
          <Button asChild variant='outline'>
            <Link to='/seo/entities'>Entity SEO</Link>
          </Button>
          <Button asChild>
            <Link to='/seo/sitemaps'>Sitemap</Link>
          </Button>
        </div>

        {error && (
          <Card className='border-red-200 bg-red-50'>
            <CardContent className='py-4 text-sm text-red-700'>{error}</CardContent>
          </Card>
        )}

        <div className='grid gap-4 md:grid-cols-2'>
          <Card>
            <CardHeader>
              <CardTitle>Storefront Base</CardTitle>
            </CardHeader>
            <CardContent className='flex flex-wrap gap-2'>
              {storefrontBase ? (
                <>
                  <Button asChild variant='outline' size='sm'>
                    <a href={storefrontBase} target='_blank' rel='noreferrer'>
                      Open storefront
                    </a>
                  </Button>
                  <Button asChild variant='outline' size='sm'>
                    <a href={joinUrl(storefrontBase, '/sitemap.xml')} target='_blank' rel='noreferrer'>
                      Open sitemap.xml
                    </a>
                  </Button>
                </>
              ) : (
                <p className='text-muted-foreground text-sm'>Storefront base URL not configured.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Template Base</CardTitle>
            </CardHeader>
            <CardContent className='flex flex-wrap gap-2'>
              {templateBase ? (
                <>
                  <Button asChild variant='outline' size='sm'>
                    <a href={templateBase} target='_blank' rel='noreferrer'>
                      Open template base
                    </a>
                  </Button>
                  <Button asChild variant='outline' size='sm'>
                    <a href={joinUrl(templateBase, '/sitemap.xml')} target='_blank' rel='noreferrer'>
                      Open sitemap.xml
                    </a>
                  </Button>
                </>
              ) : (
                <p className='text-muted-foreground text-sm'>Template base URL not configured.</p>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
            <CardTitle>SellersLogin Storefront</CardTitle>
            <Select value={storefrontGroupFilter} onValueChange={setStorefrontGroupFilter}>
              <SelectTrigger className='h-9 w-full sm:w-56'>
                <SelectValue placeholder='Select group' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>All groups</SelectItem>
                {storefrontGroups.map((group) => (
                  <SelectItem key={group.title} value={group.title}>
                    {group.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent className='space-y-4'>
            {visibleStorefrontGroups.length === 0 ? (
              <p className='text-muted-foreground text-sm'>No storefront pages found.</p>
            ) : (
              visibleStorefrontGroups.map((group) => (
                <div key={group.title} className='space-y-3'>
                  <div className='flex items-center justify-between'>
                    <div className='text-sm font-semibold'>{group.title}</div>
                    <Badge variant='secondary'>{group.entries.length}</Badge>
                  </div>
                  <div className='overflow-hidden rounded-md border'>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Page</TableHead>
                          <TableHead>URL</TableHead>
                          <TableHead className='text-right'>Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {group.entries.map((entry) => (
                          <TableRow key={entry.url}>
                            <TableCell className='font-medium'>{entry.label}</TableCell>
                            <TableCell className='font-mono text-xs'>{entry.url}</TableCell>
                            <TableCell className='text-right'>
                              <div className='flex justify-end gap-2'>
                                <Button asChild variant='outline' size='sm'>
                                  <a href={entry.url} target='_blank' rel='noreferrer'>
                                    <ExternalLink className='mr-2 h-4 w-4' />
                                    Open
                                  </a>
                                </Button>
                                <Button
                                  variant='ghost'
                                  size='sm'
                                  onClick={() => navigator.clipboard?.writeText(entry.url)}
                                >
                                  Copy
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
            <CardTitle>Vendor Template Storefronts</CardTitle>
            <Select value={templateGroupFilter} onValueChange={setTemplateGroupFilter}>
              <SelectTrigger className='h-9 w-full sm:w-56'>
                <SelectValue placeholder='Select group' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>All groups</SelectItem>
                {templateGroups.map((group) => (
                  <SelectItem key={group.title} value={group.title}>
                    {group.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent className='space-y-4'>
            {visibleTemplateGroups.length === 0 ? (
              <p className='text-muted-foreground text-sm'>No template pages found.</p>
            ) : (
              visibleTemplateGroups.map((group) => (
                <div key={group.title} className='space-y-3'>
                  <div className='flex items-center justify-between'>
                    <div className='text-sm font-semibold'>{group.title}</div>
                    <Badge variant='secondary'>{group.entries.length}</Badge>
                  </div>
                  <div className='overflow-hidden rounded-md border'>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Page</TableHead>
                          <TableHead>URL</TableHead>
                          <TableHead className='text-right'>Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {group.entries.map((entry) => (
                          <TableRow key={entry.url}>
                            <TableCell className='font-medium'>{entry.label}</TableCell>
                            <TableCell className='font-mono text-xs'>{entry.url}</TableCell>
                            <TableCell className='text-right'>
                              <div className='flex justify-end gap-2'>
                                <Button asChild variant='outline' size='sm'>
                                  <a href={entry.url} target='_blank' rel='noreferrer'>
                                    <ExternalLink className='mr-2 h-4 w-4' />
                                    Open
                                  </a>
                                </Button>
                                <Button
                                  variant='ghost'
                                  size='sm'
                                  onClick={() => navigator.clipboard?.writeText(entry.url)}
                                >
                                  Copy
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </Main>
    </>
  )
}
