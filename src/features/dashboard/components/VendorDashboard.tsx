import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Overview } from './overview'
import { RecentSales } from './recent-sales'
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

const VendorDashboard = () => {
  const token = useSelector((state: any) => state.auth?.token)
  const user = useSelector((state: any) => state.auth?.user)
  const vendorId = user?.id || user?._id
  const role = (user?.role || '').toLowerCase()
  const isAdminRole = role === 'admin' || role === 'superadmin'
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
          ? `${baseUrl}/v1/products/all`
          : `${baseUrl}/v1/products/vendor/${vendorId}`
        const firstRes = await fetch(
          `${baseEndpoint}?page=1&limit=50`,
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
              fetch(`${baseEndpoint}?page=${p}&limit=50`, {
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

  const recentItems = useMemo(() => {
    const sorted = [...products].sort((a, b) => {
      const aDate = a.createdAt ? new Date(a.createdAt).getTime() : 0
      const bDate = b.createdAt ? new Date(b.createdAt).getTime() : 0
      return bDate - aDate
    })

    return sorted.slice(0, 6).map((product) => {
      const variants = Array.isArray(product.variants) ? product.variants : []
      const prices = variants.map((v) => v.finalPrice || 0).filter((p) => p > 0)
      const minPrice = prices.length ? Math.min(...prices) : 0
      const maxPrice = prices.length ? Math.max(...prices) : 0
      const categoryName =
        product.productCategory && categoryMap[product.productCategory]
          ? categoryMap[product.productCategory].name
          : 'Category'
      const imageUrl =
        product.defaultImages?.[0]?.url ||
        variants?.[0]?.variantsImageUrls?.[0]?.url ||
        undefined
      const priceLabel =
        minPrice && maxPrice && minPrice !== maxPrice
          ? `₹${minPrice.toLocaleString()} - ₹${maxPrice.toLocaleString()}`
          : minPrice
          ? `₹${minPrice.toLocaleString()}`
          : '₹0'

      return {
        id: product._id,
        name: product.productName || 'Untitled Product',
        subtitle: `${product.brand || 'Brand'} • ${categoryName}`,
        amount: priceLabel,
        imageUrl,
      }
    })
  }, [products, categoryMap])

  const adminCards = [
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

  const vendorCards = [
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
              </CardContent>
            </Card>
          )
        })}
      </div>
      <div className='grid grid-cols-1 gap-4 lg:grid-cols-7'>
        <Card className='col-span-1 lg:col-span-4'>
          <CardHeader>
            <CardTitle>Overview</CardTitle>
          </CardHeader>
          <CardContent className='ps-2'>
            <Overview data={overviewData} />
          </CardContent>
        </Card>
        <Card className='col-span-1 lg:col-span-3'>
          <CardHeader>
            <CardTitle>Recent Products</CardTitle>
            <CardDescription>
              Latest products added to {isAdminRole ? 'the platform' : 'your catalog'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className='text-sm text-muted-foreground'>Loading activity...</p>
            ) : error ? (
              <p className='text-sm text-red-500'>{error}</p>
            ) : (
              <RecentSales items={recentItems} />
            )}
          </CardContent>
        </Card>
      </div>
    </>
  )
}

export default VendorDashboard
