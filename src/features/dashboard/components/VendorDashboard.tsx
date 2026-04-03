import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Link } from '@tanstack/react-router'
import { Overview } from './overview'
import { DataBarChart } from './DashboardCharts'
import { DashboardDonutChart } from './DashboardDonutChart'
import { useEffect, useMemo, useState } from 'react'
import { useSelector } from 'react-redux'
import {
  ShoppingBag,
  Boxes,
  PackageCheck,
  Sparkles,
  AlertTriangle,
  Wallet,
  TrendingUp,
  Layers,
} from 'lucide-react'
import { normalizeVendorPageAccess } from '@/features/team-access/access-config'

type Product = {
  _id: string
  productName: string
  brand?: string
  productCategory?: string
  createdAt?: string
  defaultImages?: Array<{ url: string }>
  variants?: Array<{
    finalPrice?: number
    stockQuantity?: number
    isActive?: boolean
    variantsImageUrls?: Array<{ url: string }>
  }>
}

type Category = {
  _id: string
  name: string
  slug: string
}

type DashboardCard = {
  title: string
  value: string | number
  subtitle: string
  icon: typeof ShoppingBag
  className: string
  ctaLabel?: string
  ctaTo?: '/products/create-products'
}

const VendorDashboard = () => {
  const token = useSelector((state: any) => state.auth?.token)
  const user = useSelector((state: any) => state.auth?.user)
  const vendorId = user?.id || user?._id
  const role = (user?.role || '').toLowerCase()
  const isAdminRole = role === 'admin' || role === 'superadmin'
  const isVendorTeamUser =
    role === 'vendor' && String(user?.account_type || '').toLowerCase() === 'vendor_user'
  const pageAccess = normalizeVendorPageAccess(user?.page_access)
  const canManageProducts = !isVendorTeamUser || pageAccess.has('products')
  const [products, setProducts] = useState<Product[]>([])
  const [categoryMap, setCategoryMap] = useState<Record<string, Category>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [globalCounts, setGlobalCounts] = useState({
    vendorsTotal: 0,
    verifiedVendors: 0,
    unverifiedVendors: 0,
    categoriesTotal: 0,
    subcategoriesTotal: 0,
  })

  useEffect(() => {
    let poller: number | undefined

    const fetchAllProducts = async () => {
      if (!token) return
      if (!isAdminRole && !vendorId) return
      setLoading(true)
      setError(null)
      try {
        const baseUrl = import.meta.env.VITE_PUBLIC_API_URL
        const baseEndpoint = isAdminRole
          ? `${baseUrl}/v1/products/all?includeUnavailable=true`
          : `${baseUrl}/v1/products/vendor/${vendorId}`
        const firstRes = await fetch(
          `${baseEndpoint}${isAdminRole ? '&' : '?'}page=1&limit=50`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        )
        if (!firstRes.ok) {
          throw new Error('Failed to fetch products')
        }
        const firstData = await firstRes.json()
        const firstList = Array.isArray(firstData?.products)
          ? firstData.products
          : []
        const totalPages = firstData?.pagination?.totalPages || 1

        if (totalPages > 1) {
          const pagePromises = []
          for (let p = 2; p <= totalPages; p += 1) {
            pagePromises.push(
              fetch(`${baseEndpoint}${isAdminRole ? '&' : '?'}page=${p}&limit=50`, {
                headers: { Authorization: `Bearer ${token}` },
              }).then((res) => res.json())
            )
          }
          const pages = await Promise.all(pagePromises)
          const rest = pages.flatMap((page) =>
            Array.isArray(page?.products) ? page.products : []
          )
          setProducts([...firstList, ...rest])
        } else {
          setProducts(firstList)
        }
      } catch (err: any) {
        setError(err?.message || 'Failed to load dashboard data')
        setProducts([])
      } finally {
        setLoading(false)
      }
    }

    const fetchCategories = async () => {
      try {
        const baseUrl = import.meta.env.VITE_PUBLIC_API_URL
        const res = await fetch(`${baseUrl}/v1/categories/getall`)
        const data = await res.json()
        const list = Array.isArray(data?.data) ? data.data : []
        const mapping: Record<string, Category> = {}
        list.forEach((cat: Category) => {
          if (cat?._id) mapping[cat._id] = cat
        })
        setCategoryMap(mapping)
      } catch {
        setCategoryMap({})
      }
    }

    const fetchGlobalCounts = async () => {
      if (!isAdminRole) return
      try {
        const baseUrl = import.meta.env.VITE_PUBLIC_API_URL
        const headers = token
          ? { Authorization: `Bearer ${token}` }
          : undefined
        const [vendorsRes, verifiedRes, unverifiedRes, categoriesRes, subRes] =
          await Promise.all([
            fetch(`${baseUrl}/v1/vendors/getall`, { headers }),
            fetch(`${baseUrl}/v1/vendors/verified`, { headers }),
            fetch(`${baseUrl}/v1/vendors/unverified`, { headers }),
            fetch(`${baseUrl}/v1/categories/getall`, { headers }),
            fetch(`${baseUrl}/v1/subcategories/getall`, { headers }),
          ])

        const [
          vendorsData,
          verifiedData,
          unverifiedData,
          categoriesData,
          subcategoriesData,
        ] = await Promise.all([
          vendorsRes.json(),
          verifiedRes.json(),
          unverifiedRes.json(),
          categoriesRes.json(),
          subRes.json(),
        ])

        setGlobalCounts({
          vendorsTotal: vendorsData?.total || vendorsData?.vendors?.length || 0,
          verifiedVendors:
            verifiedData?.total || verifiedData?.vendors?.length || 0,
          unverifiedVendors:
            unverifiedData?.total || unverifiedData?.vendors?.length || 0,
          categoriesTotal:
            categoriesData?.pagination?.total ||
            categoriesData?.data?.length ||
            0,
          subcategoriesTotal:
            subcategoriesData?.pagination?.total ||
            subcategoriesData?.data?.length ||
            0,
        })
      } catch {
        setGlobalCounts({
          vendorsTotal: 0,
          verifiedVendors: 0,
          unverifiedVendors: 0,
          categoriesTotal: 0,
          subcategoriesTotal: 0,
        })
      }
    }

    fetchAllProducts()
    fetchCategories()
    fetchGlobalCounts()

    poller = window.setInterval(() => {
      fetchAllProducts()
      fetchGlobalCounts()
    }, 30000)

    return () => {
      if (poller) window.clearInterval(poller)
    }
  }, [vendorId, token, isAdminRole])

  const metrics = useMemo(() => {
    const totalProducts = products.length
    const totalVariants = products.reduce(
      (sum, p) => sum + (Array.isArray(p.variants) ? p.variants.length : 0),
      0
    )
    const totalStock = products.reduce((sum, p) => {
      const variants = Array.isArray(p.variants) ? p.variants : []
      return (
        sum +
        variants.reduce((variantSum, v) => variantSum + (v.stockQuantity || 0), 0)
      )
    }, 0)
    const activeVariants = products.reduce((sum, p) => {
      const variants = Array.isArray(p.variants) ? p.variants : []
      return sum + variants.filter((v) => v.isActive !== false).length
    }, 0)
    const lowStockVariants = products.reduce((sum, p) => {
      const variants = Array.isArray(p.variants) ? p.variants : []
      return sum + variants.filter((v) => (v.stockQuantity || 0) > 0 && (v.stockQuantity || 0) < 5).length
    }, 0)
    const inventoryValue = products.reduce((sum, p) => {
      const variants = Array.isArray(p.variants) ? p.variants : []
      return (
        sum +
        variants.reduce(
          (variantSum, v) =>
            variantSum + (v.finalPrice || 0) * (v.stockQuantity || 0),
          0
        )
      )
    }, 0)
    const categoryCount = new Set(
      products.map((p) => p.productCategory).filter(Boolean)
    ).size

    return {
      totalProducts,
      totalVariants,
      totalStock,
      activeVariants,
      lowStockVariants,
      inventoryValue,
      categoryCount,
    }
  }, [products])

  const overviewData = useMemo(() => {
    const months = Array.from({ length: 6 }).map((_, idx) => {
      const date = new Date()
      date.setMonth(date.getMonth() - (5 - idx))
      const label = date.toLocaleString('en-US', { month: 'short' })
      return { label, key: `${date.getFullYear()}-${date.getMonth()}` }
    })

    const counts: Record<string, number> = {}
    products.forEach((product) => {
      if (!product.createdAt) return
      const created = new Date(product.createdAt)
      const key = `${created.getFullYear()}-${created.getMonth()}`
      counts[key] = (counts[key] || 0) + 1
    })

    return months.map((m) => ({
      name: m.label,
      total: counts[m.key] || 0,
    }))
  }, [products])

  const adminChartData = useMemo(() => {
    return [
      { name: 'Verified', total: globalCounts.verifiedVendors, fill: '#10b981' },
      { name: 'Unverified', total: globalCounts.unverifiedVendors, fill: '#f59e0b' },
      { name: 'Total', total: globalCounts.vendorsTotal, fill: '#6366f1' },
    ]
  }, [globalCounts])

  const vendorChartData = useMemo(() => {
    const counts: Record<string, number> = {}
    products.forEach((p) => {
      const catName =
        p.productCategory && categoryMap[p.productCategory]
          ? categoryMap[p.productCategory].name
          : 'Other'
      counts[catName] = (counts[catName] || 0) + 1
    })
    return Object.entries(counts)
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5) // Top 5 categories
  }, [products, categoryMap])

  const stockHealthData = useMemo(() => {
    let healthy = 0
    let low = 0
    let empty = 0

    products.forEach((p) => {
      const variants = Array.isArray(p.variants) ? p.variants : []
      variants.forEach((v) => {
        const qty = v.stockQuantity || 0
        if (qty >= 5) healthy++
        else if (qty > 0) low++
        else empty++
      })
    })

    return [
      { name: 'Healthy (>5)', value: healthy, color: '#10b981' },
      { name: 'Low Stock (1-5)', value: low, color: '#f59e0b' },
      { name: 'Out of Stock', value: empty, color: '#ef4444' },
    ]
  }, [products])

  const adminCards: DashboardCard[] = [
    {
      title: 'Inventory Value',
      value: `₹${metrics.inventoryValue.toLocaleString()}`,
      subtitle: 'Total stock value',
      icon: Wallet,
      className: 'from-indigo-50 via-white to-indigo-100 text-indigo-900',
    },
    {
      title: 'Products',
      value: metrics.totalProducts,
      subtitle: 'Platform catalog',
      icon: ShoppingBag,
      className: 'from-emerald-50 via-white to-emerald-100 text-emerald-900',
    },
    {
      title: 'Variants',
      value: metrics.totalVariants,
      subtitle: `${metrics.activeVariants} active variants`,
      icon: Layers,
      className: 'from-sky-50 via-white to-sky-100 text-sky-900',
    },
    {
      title: 'Total Stock',
      value: metrics.totalStock,
      subtitle: 'Units in inventory',
      icon: Boxes,
      className: 'from-purple-50 via-white to-purple-100 text-purple-900',
    },
    {
      title: 'Categories',
      value: globalCounts.categoriesTotal,
      subtitle: 'All categories',
      icon: Sparkles,
      className: 'from-rose-50 via-white to-rose-100 text-rose-900',
    },
    {
      title: 'Subcategories',
      value: globalCounts.subcategoriesTotal,
      subtitle: 'All subcategories',
      icon: PackageCheck,
      className: 'from-cyan-50 via-white to-cyan-100 text-cyan-900',
    },
    {
      title: 'Vendors',
      value: globalCounts.vendorsTotal,
      subtitle: 'Total vendors',
      icon: ShoppingBag,
      className: 'from-amber-50 via-white to-amber-100 text-amber-900',
    },
    {
      title: 'Verified Vendors',
      value: globalCounts.verifiedVendors,
      subtitle: 'Approved vendors',
      icon: TrendingUp,
      className: 'from-green-50 via-white to-green-100 text-green-900',
    },
    {
      title: 'Unverified',
      value: globalCounts.unverifiedVendors,
      subtitle: 'Pending verification',
      icon: AlertTriangle,
      className: 'from-orange-50 via-white to-orange-100 text-orange-900',
    },
    {
      title: 'Low Stock',
      value: metrics.lowStockVariants,
      subtitle: 'Variants under 5 units',
      icon: AlertTriangle,
      className: 'from-yellow-50 via-white to-yellow-100 text-yellow-900',
    },
  ]

  const vendorCards: DashboardCard[] = [
    {
      title: 'Inventory Value',
      value: `₹${metrics.inventoryValue.toLocaleString()}`,
      subtitle: 'Total stock value',
      icon: Wallet,
      className: 'from-indigo-50 via-white to-indigo-100 text-indigo-900',
    },
    {
      title: 'Products',
      value: metrics.totalProducts,
      subtitle: 'Active catalog items',
      icon: ShoppingBag,
      className: 'from-emerald-50 via-white to-emerald-100 text-emerald-900',
      ...(canManageProducts
        ? {
            ctaLabel: 'Add Product',
            ctaTo: '/products/create-products' as const,
          }
        : {}),
    },
    {
      title: 'Variants',
      value: metrics.totalVariants,
      subtitle: `${metrics.activeVariants} active variants`,
      icon: Layers,
      className: 'from-sky-50 via-white to-sky-100 text-sky-900',
    },
    {
      title: 'Low Stock',
      value: metrics.lowStockVariants,
      subtitle: 'Variants under 5 units',
      icon: AlertTriangle,
      className: 'from-amber-50 via-white to-amber-100 text-amber-900',
    },
    {
      title: 'Total Stock',
      value: metrics.totalStock,
      subtitle: 'Units in inventory',
      icon: Boxes,
      className: 'from-purple-50 via-white to-purple-100 text-purple-900',
    },
    {
      title: 'Categories',
      value: metrics.categoryCount,
      subtitle: 'Linked categories',
      icon: Sparkles,
      className: 'from-rose-50 via-white to-rose-100 text-rose-900',
    },
    {
      title: 'Active Variants',
      value: metrics.activeVariants,
      subtitle: 'Available to sell',
      icon: PackageCheck,
      className: 'from-cyan-50 via-white to-cyan-100 text-cyan-900',
    },
    {
      title: 'Growth Signal',
      value: overviewData.reduce((sum, p) => sum + p.total, 0),
      subtitle: 'Products added in 6 months',
      icon: TrendingUp,
      className: 'from-green-50 via-white to-green-100 text-green-900',
    },
  ]

  const cardsToRender = isAdminRole ? adminCards : vendorCards

  return (
    <>
      <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
        {cardsToRender.map((card) => {
          const Icon = card.icon
          return (
            <Card key={card.title} className={`border-0 bg-gradient-to-br ${card.className}`}>
              <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                <CardTitle className='text-sm font-medium'>{card.title}</CardTitle>
                <Icon className='h-4 w-4 opacity-80' />
              </CardHeader>
              <CardContent>
                <div className='text-2xl font-bold'>{card.value}</div>
                <p className='text-xs opacity-70'>{card.subtitle}</p>
                {'ctaLabel' in card && card.ctaLabel && card.ctaTo ? (
                  <Button
                    asChild
                    size='sm'
                    variant='secondary'
                    className='mt-3 h-8 bg-white/85 text-emerald-900'
                  >
                    <Link to={card.ctaTo}>{card.ctaLabel}</Link>
                  </Button>
                ) : null}
              </CardContent>
            </Card>
          )
        })}
      </div>
      <div className='grid grid-cols-1 gap-4 lg:grid-cols-2'>
        <Card>
          <CardHeader>
            <CardTitle>Products Overview</CardTitle>
            <CardDescription>Monthly product additions across the platform</CardDescription>
          </CardHeader>
          <CardContent className='ps-2'>
            {loading ? (
              <div className="h-[300px] flex items-center justify-center">Loading...</div>
            ) : error ? (
              <div className="h-[300px] flex items-center justify-center text-red-500 font-medium">{error}</div>
            ) : (
              <Overview data={overviewData} />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{isAdminRole ? 'Vendor Status' : 'Stock Status'}</CardTitle>
            <CardDescription>Visual breakdown of {isAdminRole ? 'verification' : 'inventory'} status</CardDescription>
          </CardHeader>
          <CardContent>
            <DashboardDonutChart
              title={isAdminRole ? 'Verified vs Unverified' : 'Healthy vs Low stock'}
              data={isAdminRole ? adminChartData.map(d => ({ name: d.name, value: d.total, color: d.fill })) : stockHealthData}
            />
          </CardContent>
        </Card>
      </div>

      <div className='grid grid-cols-1 gap-4 lg:grid-cols-2 mt-4'>
        <Card>
          <CardHeader>
            <CardTitle>Category Distribution</CardTitle>
            <CardDescription>Top product categories by volume</CardDescription>
          </CardHeader>
          <CardContent className='ps-2'>
            <DataBarChart
              title=''
              description=''
              data={vendorChartData}
              layout="horizontal"
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Catalog Insights</CardTitle>
            <CardDescription>Percentage share of top categories</CardDescription>
          </CardHeader>
          <CardContent>
            <DashboardDonutChart
              title='Share by Category'
              data={vendorChartData.map(d => ({ name: d.name, value: d.total }))}
            />
          </CardContent>
        </Card>
      </div>
    </>
  )
}

export default VendorDashboard
