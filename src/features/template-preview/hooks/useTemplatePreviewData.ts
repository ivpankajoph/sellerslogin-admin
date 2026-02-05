import { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { useSelector } from 'react-redux'
import { BASE_URL } from '@/store/slices/vendor/productSlice'
import { initialData, type TemplateData } from '@/features/vendor-template/data'

type PreviewPage = 'home' | 'about' | 'contact' | 'full'

interface Product {
  _id?: string
  productName?: string
  shortDescription?: string
  defaultImages?: Array<{ url: string }>
  variants?: Array<{
    finalPrice?: number
  }>
}

interface PreviewResult {
  template: TemplateData
  products: Product[]
  sectionOrder: string[]
  categoryMap: Record<string, string>
  subcategories: Array<{
    _id?: string
    name?: string
    category_id?: { _id?: string; name?: string } | string
  }>
  vendorName: string | null
  loading: boolean
  error: string | null
}

const pickArray = (value: unknown): string[] =>
  Array.isArray(value) ? (value as string[]) : []

const firstNonEmpty = (...values: string[][]) =>
  values.find((value) => value.length > 0) || []

const mergeTemplate = (payload: Record<string, unknown>): TemplateData => {
  const base = structuredClone(initialData)

  if (payload.components && typeof payload.components === 'object') {
    return {
      ...base,
      components: {
        ...base.components,
        ...(payload.components as TemplateData['components']),
      },
    }
  }

  return {
    ...base,
    components: {
      ...base.components,
      ...(payload.home_page
        ? { home_page: payload.home_page as TemplateData['components']['home_page'] }
        : {}),
      ...(payload.about_page
        ? { about_page: payload.about_page as TemplateData['components']['about_page'] }
        : {}),
      ...(payload.contact_page
        ? {
            contact_page:
              payload.contact_page as TemplateData['components']['contact_page'],
          }
        : {}),
      ...(payload.social_page
        ? { social_page: payload.social_page as TemplateData['components']['social_page'] }
        : {}),
    },
  }
}

const getEndpoints = (vendorId: string, page: PreviewPage) => {
  const base = `${BASE_URL}/v1/templates`
  if (page === 'home') {
    return [
      `${base}/home?vendor_id=${vendorId}`,
      `${base}/home/${vendorId}`,
      `${base}/${vendorId}`,
    ]
  }
  if (page === 'about') {
    return [
      `${base}/about?vendor_id=${vendorId}`,
      `${base}/about/${vendorId}`,
      `${base}/${vendorId}/about`,
      `${base}/${vendorId}`,
    ]
  }
  if (page === 'contact') {
    return [
      `${base}/contact?vendor_id=${vendorId}`,
      `${base}/contact/${vendorId}`,
      `${base}/${vendorId}/contact`,
      `${base}/${vendorId}`,
    ]
  }
  return [`${base}/${vendorId}`, `${base}/home?vendor_id=${vendorId}`]
}

export function useTemplatePreviewData(
  vendorId: string | undefined,
  page: PreviewPage
): PreviewResult {
  const [template, setTemplate] = useState<TemplateData>(initialData)
  const [products, setProducts] = useState<Product[]>([])
  const [sectionOrder, setSectionOrder] = useState<string[]>([])
  const [categoryMap, setCategoryMap] = useState<Record<string, string>>({})
  const [subcategories, setSubcategories] = useState<
    Array<{
      _id?: string
      name?: string
      category_id?: { _id?: string; name?: string } | string
    }>
  >([])
  const [vendorName, setVendorName] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const token = useSelector(
    (state: { auth?: { token?: string } }) => state?.auth?.token
  )

  const headers = useMemo(() => {
    return token ? { Authorization: `Bearer ${token}` } : undefined
  }, [token])

  useEffect(() => {
    if (!vendorId) return

    let mounted = true

    const loadTemplate = async () => {
      const endpoints = getEndpoints(vendorId, page)
      for (const url of endpoints) {
        try {
          const res = await axios.get(url, { headers })
          const root = res.data as unknown
          const record =
            root && typeof root === 'object' ? (root as Record<string, unknown>) : null
          const payload =
            (record?.data as Record<string, unknown>) ||
            (record?.template as Record<string, unknown>) ||
            record
          if (payload && typeof payload === 'object') {
            const order = firstNonEmpty(
              pickArray((payload as Record<string, unknown>).section_order),
              pickArray((payload as Record<string, unknown>).sectionOrder),
              pickArray(
                (
                  (payload as Record<string, unknown>).components as Record<
                    string,
                    unknown
                  >
                )?.section_order
              )
            )
            return {
              template: mergeTemplate(payload as Record<string, unknown>),
              sectionOrder: order,
            }
          }
        } catch {
          continue
        }
      }
      return null
    }

    const loadProducts = async () => {
      try {
        const res = await axios.get(
          `${BASE_URL}/v1/products/vendor-public/${vendorId}`
        )
        return Array.isArray(res.data?.products) ? res.data.products : []
      } catch {
        try {
          const res = await axios.get(
            `${BASE_URL}/v1/products/vendor/${vendorId}`,
            { headers }
          )
          return Array.isArray(res.data?.products) ? res.data.products : []
        } catch {
          return []
        }
      }
    }

    const loadCategories = async () => {
      try {
        const res = await axios.get(`${BASE_URL}/v1/categories/getall`, {
          headers,
        })
        const list =
          res.data?.data ||
          res.data?.categories ||
          res.data?.category ||
          []
        if (!Array.isArray(list)) return {}
        return list.reduce<Record<string, string>>((acc, item) => {
          const key = item?._id || item?.id
          const value =
            item?.name || item?.title || item?.categoryName || item?.label
          if (key && value) acc[key] = value
          return acc
        }, {})
      } catch {
        return {}
      }
    }

    const loadSubcategories = async () => {
      try {
        const res = await axios.get(`${BASE_URL}/v1/subcategories/getall`, {
          headers,
        })
        return Array.isArray(res.data?.data) ? res.data.data : []
      } catch {
        return []
      }
    }

    const loadVendorProfile = async () => {
      try {
        const res = await axios.get(
          `${BASE_URL}/v1/vendors/vendorprofile?id=${vendorId}`
        )
        const vendor = res.data?.vendor
        return (
          vendor?.name ||
          vendor?.businessName ||
          vendor?.storeName ||
          null
        )
      } catch {
        return null
      }
    }

    Promise.resolve().then(() => {
      if (!mounted) return
      setLoading(true)
      setError(null)
    })

    Promise.all([
      loadTemplate(),
      loadProducts(),
      loadCategories(),
      loadSubcategories(),
      loadVendorProfile(),
    ])
      .then(
        ([
          templateResult,
          productsResult,
          categoryResult,
          subcategoryResult,
          vendorNameResult,
        ]) => {
          if (!mounted) return
          if (templateResult) {
            setTemplate(templateResult.template)
            setSectionOrder(templateResult.sectionOrder)
          }
          setProducts(productsResult || [])
          setCategoryMap(categoryResult || {})
          setSubcategories(subcategoryResult || [])
          setVendorName(vendorNameResult || null)
        })
      .catch(() => {
        if (!mounted) return
        setError('Failed to load preview data.')
      })
      .finally(() => {
        if (!mounted) return
        setLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [vendorId, page, headers])

  return {
    template,
    products,
    sectionOrder,
    categoryMap,
    subcategories,
    vendorName,
    loading,
    error,
  }
}
