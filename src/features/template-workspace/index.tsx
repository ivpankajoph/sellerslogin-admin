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

type ImageAsset = {
  url: string
  publicId: string
}

type FaqItem = {
  question: string
  answer: string
}

type AttributeItem = {
  key: string
  value: string
}

type ProductVariantRow = {
  _id?: string
  variantSku?: string
  variantAttributes?: Record<string, string>
  actualPrice?: number
  finalPrice?: number
  stockQuantity?: number
  isActive?: boolean
  variantsImageUrls?: ImageAsset[]
  variantMetaTitle?: string
  variantMetaDescription?: string
  variantMetaKeywords?: string[]
  variantCanonicalUrl?: string
}

type MainCategoryOption = {
  _id: string
  name: string
  slug?: string
}

type CategoryOption = {
  _id: string
  name: string
  slug?: string
  mainCategoryId: string
}

type SubCategoryOption = {
  _id: string
  name: string
  slug?: string
  categoryId: string
  mainCategoryId?: string
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
  baseSku?: string
  mainCategory?: string | { _id?: string; name?: string; slug?: string }
  productCategory?: string | { _id?: string; name?: string; slug?: string }
  productCategories?: Array<string | { _id?: string; name?: string; slug?: string }>
  productSubCategories?: Array<string | { _id?: string; name?: string; slug?: string }>
  defaultImages?: ImageAsset[]
  specifications?: Array<Record<string, string>>
  variants?: ProductVariantRow[]
  faqs?: FaqItem[]
  availableCities?: Array<{ _id: string; name: string; slug: string }>
}

type WorkspaceTemplateData = {
  template?: any
  products?: WorkspaceProduct[]
}

type ProductPageCityContext = {
  scope: 'global' | 'city'
  cityId: string
  citySlug: string
  cityName: string
}

type WorkspaceProductPageRow = {
  rowKey: string
  product: WorkspaceProduct
  pageCity: ProductPageCityContext
}

type ProductEditor = {
  _id: string
  editScope: 'global' | 'city'
  editCityId: string
  editCitySlug: string
  editCityName: string
  productName: string
  slug: string
  baseSku: string
  mainCategoryId: string
  productCategoryId: string
  productCategoryIds: string[]
  productSubCategoryIds: string[]
  brand: string
  shortDescription: string
  description: string
  metaTitle: string
  metaDescription: string
  metaKeywords: string
  defaultImages: ImageAsset[]
  specificationRows: Array<{ key: string; value: string }>
  variants: Array<{
    tempId: string
    _id?: string
    variantSku: string
    variantAttributes: AttributeItem[]
    actualPrice: string
    finalPrice: string
    stockQuantity: string
    isActive: boolean
    variantsImageUrls: ImageAsset[]
    variantMetaTitle: string
    variantMetaDescription: string
    variantMetaKeywords: string
    variantCanonicalUrl: string
  }>
  faqs: FaqItem[]
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

const toObjectIdString = (value: unknown) => {
  if (!value) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'object' && value !== null && '_id' in value) {
    return String((value as any)._id || '')
  }
  return ''
}

const toObjectIdList = (value: unknown) =>
  (Array.isArray(value) ? value : [])
    .map((item) => toObjectIdString(item))
    .filter(Boolean)

const derivePublicIdFromUrl = (url: string, fallback = 'asset') => {
  const raw = String(url || '').trim()
  if (!raw) return fallback
  try {
    const pathname = new URL(raw).pathname
    const fileName = pathname.split('/').filter(Boolean).pop() || fallback
    return fileName.replace(/\.[a-z0-9]+$/i, '') || fallback
  } catch {
    const fileName = raw.split('/').filter(Boolean).pop() || fallback
    return fileName.replace(/\.[a-z0-9]+$/i, '') || fallback
  }
}

const normalizeImageAsset = (value: any, fallback = 'asset'): ImageAsset | null => {
  if (!value) return null
  if (typeof value === 'string') {
    const url = value.trim()
    if (!url) return null
    return {
      url,
      publicId: derivePublicIdFromUrl(url, fallback),
    }
  }

  if (typeof value === 'object') {
    const url = String(value.url || value.secure_url || '').trim()
    if (!url) return null
    const publicId = String(value.publicId || value.public_id || '').trim()
    return {
      url,
      publicId: publicId || derivePublicIdFromUrl(url, fallback),
    }
  }

  return null
}

const objectToAttributeItems = (value: unknown): AttributeItem[] => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return []
  return Object.entries(value as Record<string, unknown>)
    .map(([key, rawValue]) => ({
      key: String(key || '').trim(),
      value: String(rawValue || '').trim(),
    }))
    .filter((item) => item.key && item.value)
}

const createEmptyVariantEditor = () => ({
  tempId: `variant-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  _id: undefined,
  variantSku: '',
  variantAttributes: [{ key: 'Color', value: '' }],
  actualPrice: '',
  finalPrice: '',
  stockQuantity: '',
  isActive: true,
  variantsImageUrls: [{ url: '', publicId: '' }],
  variantMetaTitle: '',
  variantMetaDescription: '',
  variantMetaKeywords: '',
  variantCanonicalUrl: '',
})

const getVendorLabel = (vendor: VendorRow) =>
  vendor.business_name || vendor.registrar_name || vendor.name || vendor.email || vendor._id

const defaultEditor = (
  product: WorkspaceProduct,
  pageCity: ProductPageCityContext = {
    scope: 'global',
    cityId: '',
    citySlug: 'all',
    cityName: 'All Cities',
  }
): ProductEditor => ({
  _id: product._id,
  editScope: pageCity.scope,
  editCityId: pageCity.cityId,
  editCitySlug: pageCity.citySlug,
  editCityName: pageCity.cityName,
  productName: product.productName || '',
  slug: product.slug || '',
  baseSku: product.baseSku || '',
  mainCategoryId: toObjectIdString(product.mainCategory),
  productCategoryId: toObjectIdString(product.productCategory),
  productCategoryIds: toObjectIdList(product.productCategories),
  productSubCategoryIds: toObjectIdList(product.productSubCategories),
  brand: product.brand || '',
  shortDescription: product.shortDescription || '',
  description: product.description || '',
  metaTitle: product.metaTitle || '',
  metaDescription: product.metaDescription || '',
  metaKeywords: Array.isArray(product.metaKeywords)
    ? product.metaKeywords.join(', ')
    : '',
  defaultImages: (Array.isArray(product.defaultImages) ? product.defaultImages : [])
    .map((image, index) => normalizeImageAsset(image, `default-${index + 1}`))
    .filter((image): image is ImageAsset => Boolean(image)),
  specificationRows: (
    Array.isArray(product.specifications) ? product.specifications : []
  ).flatMap((row) =>
    row && typeof row === 'object'
      ? Object.entries(row).map(([key, value]) => ({
          key: String(key || ''),
          value: String(value || ''),
        }))
      : []
  ),
  variants: (() => {
    const mappedVariants = (Array.isArray(product.variants) ? product.variants : []).map(
      (variant, index) => ({
        tempId: `variant-${variant?._id || index}`,
        _id: variant?._id,
        variantSku: String(variant?.variantSku || ''),
        variantAttributes: objectToAttributeItems(variant?.variantAttributes),
        actualPrice:
          variant?.actualPrice !== undefined ? String(variant.actualPrice) : '',
        finalPrice: variant?.finalPrice !== undefined ? String(variant.finalPrice) : '',
        stockQuantity:
          variant?.stockQuantity !== undefined ? String(variant.stockQuantity) : '',
        isActive: variant?.isActive !== false,
        variantsImageUrls: (Array.isArray(variant?.variantsImageUrls)
          ? variant.variantsImageUrls
          : []
        )
          .map((image, imageIndex) =>
            normalizeImageAsset(image, `variant-${index + 1}-${imageIndex + 1}`)
          )
          .filter((image): image is ImageAsset => Boolean(image)),
        variantMetaTitle: String(variant?.variantMetaTitle || ''),
        variantMetaDescription: String(variant?.variantMetaDescription || ''),
        variantMetaKeywords: Array.isArray(variant?.variantMetaKeywords)
          ? variant.variantMetaKeywords.join(', ')
          : '',
        variantCanonicalUrl: String(variant?.variantCanonicalUrl || ''),
      })
    )
    return mappedVariants.length ? mappedVariants : [createEmptyVariantEditor()]
  })(),
  faqs: (Array.isArray(product.faqs) ? product.faqs : []).map((faq) => ({
    question: String(faq?.question || ''),
    answer: String(faq?.answer || ''),
  })),
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
  const [mainCategories, setMainCategories] = useState<MainCategoryOption[]>([])
  const [categories, setCategories] = useState<CategoryOption[]>([])
  const [subCategories, setSubCategories] = useState<SubCategoryOption[]>([])
  const [templates, setTemplates] = useState<TemplateRow[]>([])
  const [templateData, setTemplateData] = useState<WorkspaceTemplateData>({})
  const [products, setProducts] = useState<WorkspaceProduct[]>([])
  const [loadingVendors, setLoadingVendors] = useState(false)
  const [loadingCategoryMeta, setLoadingCategoryMeta] = useState(false)
  const [loadingWorkspace, setLoadingWorkspace] = useState(false)
  const [savingProduct, setSavingProduct] = useState(false)
  const [openingEditorRowKey, setOpeningEditorRowKey] = useState('')
  const [uploadingVariantImageKey, setUploadingVariantImageKey] = useState('')
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

  const loadCategoryMetadata = useCallback(async () => {
    setLoadingCategoryMeta(true)
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : undefined
      const [mainRes, categoryRes, subRes] = await Promise.all([
        fetch(`${import.meta.env.VITE_PUBLIC_API_URL}/v1/maincategories/getall`, {
          headers,
        }),
        fetch(`${import.meta.env.VITE_PUBLIC_API_URL}/v1/categories/getall`, { headers }),
        fetch(`${import.meta.env.VITE_PUBLIC_API_URL}/v1/subcategories/getall`, { headers }),
      ])

      const [mainBody, categoryBody, subBody] = await Promise.all([
        mainRes.json(),
        categoryRes.json(),
        subRes.json(),
      ])

      const normalizedMainCategories: MainCategoryOption[] = Array.isArray(mainBody?.data)
        ? mainBody.data
            .map((item: any) => ({
              _id: String(item?._id || ''),
              name: String(item?.name || ''),
              slug: String(item?.slug || ''),
            }))
            .filter((item: MainCategoryOption) => item._id && item.name)
        : []

      const normalizedCategories: CategoryOption[] = Array.isArray(categoryBody?.data)
        ? categoryBody.data
            .map((item: any) => ({
              _id: String(item?._id || ''),
              name: String(item?.name || ''),
              slug: String(item?.slug || ''),
              mainCategoryId:
                toObjectIdString(item?.main_category_id) ||
                toObjectIdString(item?.mainCategory) ||
                toObjectIdString(item?.mainCategory?._id),
            }))
            .filter((item: CategoryOption) => item._id && item.name && item.mainCategoryId)
        : []

      const normalizedSubCategories: SubCategoryOption[] = Array.isArray(subBody?.data)
        ? subBody.data
            .map((item: any) => ({
              _id: String(item?._id || ''),
              name: String(item?.name || ''),
              slug: String(item?.slug || ''),
              categoryId:
                toObjectIdString(item?.category_id) ||
                toObjectIdString(item?.category_id?._id),
              mainCategoryId:
                toObjectIdString(item?.main_category_id) ||
                toObjectIdString(item?.main_category_id?._id),
            }))
            .filter((item: SubCategoryOption) => item._id && item.name && item.categoryId)
        : []

      setMainCategories(normalizedMainCategories)
      setCategories(normalizedCategories)
      setSubCategories(normalizedSubCategories)
    } catch {
      setMainCategories([])
      setCategories([])
      setSubCategories([])
      toast.error('Failed to load category metadata')
    } finally {
      setLoadingCategoryMeta(false)
    }
  }, [token])

  useEffect(() => {
    if (!canAccess) return
    loadCategoryMetadata()
  }, [canAccess, loadCategoryMetadata])

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
      const productListCityScope = normalizeCitySlug(selectedCitySlug)
      const [templateRes, productsRes] = await Promise.all([
        fetch(
          `${import.meta.env.VITE_PUBLIC_API_URL}/v1/templates/${selectedVendorId}/preview?city=${encodeURIComponent(effectiveCitySlug)}`
        ),
        fetch(
          `${import.meta.env.VITE_PUBLIC_API_URL}/v1/products/all?ownerId=${selectedVendorId}&city=${encodeURIComponent(productListCityScope)}`
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
  }, [selectedVendorId, effectiveCitySlug, selectedCitySlug])

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

  const searchedProducts = useMemo(() => {
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

  const productPageRows = useMemo<WorkspaceProductPageRow[]>(() => {
    const selectedSlug = normalizeCitySlug(selectedCitySlug)

    if (selectedSlug !== 'all') {
      const selectedCity = cityOptions.find(
        (city) => normalizeCitySlug(city.slug) === selectedSlug
      )
      const selectedPageCity: ProductPageCityContext = {
        scope: 'city',
        cityId: selectedCity?._id || '',
        citySlug: selectedSlug,
        cityName:
          selectedCity?.name ||
          cityLabelBySlug[selectedSlug] ||
          selectedSlug,
      }

      return searchedProducts.map((product) => ({
        rowKey: `${product._id}::${selectedPageCity.cityId || selectedPageCity.citySlug}`,
        product,
        pageCity: selectedPageCity,
      }))
    }

    return searchedProducts.flatMap((product) => {
      const globalRow: WorkspaceProductPageRow = {
        rowKey: `${product._id}::all`,
        product,
        pageCity: {
          scope: 'global',
          cityId: '',
          citySlug: 'all',
          cityName: 'All Cities',
        },
      }

      const mappedCities = Array.isArray(product.availableCities)
        ? product.availableCities.filter((city) => city?._id || city?.slug)
        : []

      if (!mappedCities.length) {
        return [globalRow]
      }

      const cityRows = mappedCities.map((city) => ({
        rowKey: `${product._id}::${city._id || city.slug}`,
        product,
        pageCity: {
          scope: 'city' as const,
          cityId: String(city._id || '').trim(),
          citySlug: normalizeCitySlug(city.slug),
          cityName: city.name || city.slug || 'City Page',
        },
      }))

      return [globalRow, ...cityRows]
    })
  }, [searchedProducts, selectedCitySlug, cityOptions, cityLabelBySlug])

  const previewUrl = useMemo(() => {
    if (!selectedVendorId || !selectedTemplateKey) return ''
    return (
      getVendorTemplatePreviewUrl(selectedVendorId, selectedTemplateKey, effectiveCitySlug) || ''
    )
  }, [selectedVendorId, selectedTemplateKey, effectiveCitySlug])

  const mainCategoryNameById = useMemo(
    () =>
      mainCategories.reduce<Record<string, string>>((acc, item) => {
        acc[item._id] = item.name
        return acc
      }, {}),
    [mainCategories]
  )

  const categoryNameById = useMemo(
    () =>
      categories.reduce<Record<string, string>>((acc, item) => {
        acc[item._id] = item.name
        return acc
      }, {}),
    [categories]
  )

  const subCategoryNameById = useMemo(
    () =>
      subCategories.reduce<Record<string, string>>((acc, item) => {
        acc[item._id] = item.name
        return acc
      }, {}),
    [subCategories]
  )

  const editorCategoryOptions = useMemo(() => {
    if (!editingProduct?.mainCategoryId) return []
    return categories
      .filter((item) => item.mainCategoryId === editingProduct.mainCategoryId)
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))
  }, [categories, editingProduct?.mainCategoryId])

  const editorSelectedCategoryIds = useMemo(() => {
    if (!editingProduct) return [] as string[]
    const raw = [editingProduct.productCategoryId, ...editingProduct.productCategoryIds]
      .map((item) => String(item || '').trim())
      .filter(Boolean)
    return Array.from(new Set(raw))
  }, [editingProduct])

  const editorSubCategoryOptions = useMemo(() => {
    if (!editorSelectedCategoryIds.length) return [] as SubCategoryOption[]
    return subCategories
      .filter((item) => editorSelectedCategoryIds.includes(item.categoryId))
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))
  }, [editorSelectedCategoryIds, subCategories])

  useEffect(() => {
    if (!editingProduct) return

    setEditingProduct((prev) => {
      if (!prev) return prev

      let nextMainCategoryId = prev.mainCategoryId
      if (!nextMainCategoryId && prev.productCategoryId) {
        const category = categories.find((item) => item._id === prev.productCategoryId)
        if (category?.mainCategoryId) {
          nextMainCategoryId = category.mainCategoryId
        }
      }

      const validCategoryIdsForMain = categories
        .filter((item) =>
          nextMainCategoryId ? item.mainCategoryId === nextMainCategoryId : true
        )
        .map((item) => item._id)

      const normalizedCategoryIds = Array.from(
        new Set(
          [prev.productCategoryId, ...prev.productCategoryIds]
            .map((item) => String(item || '').trim())
            .filter((item) =>
              validCategoryIdsForMain.length
                ? validCategoryIdsForMain.includes(item)
                : true
            )
        )
      )

      const nextPrimaryCategoryId = normalizedCategoryIds[0] || ''
      const normalizedSubCategoryIds = prev.productSubCategoryIds.filter((id) =>
        subCategories.some(
          (sub) =>
            sub._id === id &&
            normalizedCategoryIds.includes(sub.categoryId)
        )
      )

      const noChanges =
        nextMainCategoryId === prev.mainCategoryId &&
        nextPrimaryCategoryId === prev.productCategoryId &&
        JSON.stringify(normalizedCategoryIds) ===
          JSON.stringify(prev.productCategoryIds) &&
        JSON.stringify(normalizedSubCategoryIds) ===
          JSON.stringify(prev.productSubCategoryIds)

      if (noChanges) return prev

      return {
        ...prev,
        mainCategoryId: nextMainCategoryId,
        productCategoryId: nextPrimaryCategoryId,
        productCategoryIds: normalizedCategoryIds,
        productSubCategoryIds: normalizedSubCategoryIds,
      }
    })
  }, [categories, subCategories, editingProduct?._id])

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

  const fetchProductForEditor = useCallback(
    async (productId: string, pageCity?: ProductPageCityContext) => {
      const cityQuery =
        pageCity?.scope === 'city'
          ? pageCity.cityId
            ? `cityId=${encodeURIComponent(pageCity.cityId)}`
            : `city=${encodeURIComponent(pageCity.citySlug)}`
          : ''

      const endpoint = `${import.meta.env.VITE_PUBLIC_API_URL}/v1/products/${productId}${
        cityQuery ? `?${cityQuery}` : ''
      }`
      const response = await fetch(endpoint, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      })
      const body = await response.json()

      if (!response.ok) {
        throw new Error(body?.message || `Failed to load product content (HTTP ${response.status})`)
      }

      return (body?.product || null) as WorkspaceProduct | null
    },
    [token]
  )

  const openEditor = async (row: WorkspaceProductPageRow) => {
    const rowKey = row.rowKey
    setOpeningEditorRowKey(rowKey)
    try {
      const resolvedProduct = (await fetchProductForEditor(row.product._id, row.pageCity)) || row.product
      setEditingProduct(defaultEditor(resolvedProduct, row.pageCity))
    } catch (error: any) {
      toast.error(error?.message || 'Failed to load product editor')
      setEditingProduct(defaultEditor(row.product, row.pageCity))
    } finally {
      setOpeningEditorRowKey((current) => (current === rowKey ? '' : current))
    }
  }

  const closeEditor = () => {
    setEditingProduct(null)
    setUploadingVariantImageKey('')
  }

  const openGlobalEditorForProduct = async (productId: string) => {
    const rowKey = `${productId}::all`
    setOpeningEditorRowKey(rowKey)
    try {
      const globalContext: ProductPageCityContext = {
        scope: 'global',
        cityId: '',
        citySlug: 'all',
        cityName: 'All Cities',
      }
      const fallbackProduct =
        products.find((product) => product._id === productId) ||
        productPageRows.find((row) => row.product._id === productId)?.product

      const resolvedProduct =
        (await fetchProductForEditor(productId, globalContext)) || fallbackProduct

      if (!resolvedProduct) {
        throw new Error('Product not found for global editor')
      }

      setEditingProduct(defaultEditor(resolvedProduct, globalContext))
    } catch (error: any) {
      toast.error(error?.message || 'Unable to open global mode')
    } finally {
      setOpeningEditorRowKey((current) => (current === rowKey ? '' : current))
    }
  }

  const uploadImageAsset = useCallback(
    async (file: File, folder: string): Promise<ImageAsset | null> => {
      try {
        const signatureRes = await fetch(
          `${import.meta.env.VITE_PUBLIC_API_URL}/v1/cloudinary/signature?folder=${encodeURIComponent(folder)}`,
          {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          }
        )
        const signatureBody = await signatureRes.json()

        if (!signatureRes.ok) {
          throw new Error(
            signatureBody?.message || `Failed to fetch Cloudinary signature (HTTP ${signatureRes.status})`
          )
        }

        const cloudName = String(signatureBody?.cloudName || '').trim()
        const apiKey = String(signatureBody?.apiKey || '').trim()
        const timestamp = String(signatureBody?.timestamp || '').trim()
        const signature = String(signatureBody?.signature || '').trim()
        const resolvedFolder = String(signatureBody?.folder || folder || '').trim()

        if (!cloudName || !apiKey || !timestamp || !signature) {
          throw new Error('Cloudinary signature response is incomplete')
        }

        const formData = new FormData()
        formData.append('file', file)
        formData.append('api_key', apiKey)
        formData.append('timestamp', timestamp)
        formData.append('signature', signature)
        if (resolvedFolder) {
          formData.append('folder', resolvedFolder)
        }

        const uploadRes = await fetch(
          `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
          {
            method: 'POST',
            body: formData,
          }
        )

        const uploadBody = await uploadRes.json()
        if (!uploadRes.ok || !uploadBody?.secure_url) {
          throw new Error(uploadBody?.error?.message || 'Failed to upload image to Cloudinary')
        }

        const secureUrl = String(uploadBody?.secure_url || '').trim()
        if (!secureUrl) {
          throw new Error('Cloudinary returned empty image URL')
        }

        const publicId = String(uploadBody?.public_id || '').trim()
        return {
          url: secureUrl,
          publicId: publicId || derivePublicIdFromUrl(secureUrl, 'variant-image'),
        }
      } catch (error: any) {
        toast.error(error?.message || 'Image upload failed')
        return null
      }
    },
    [token]
  )

  const handleVariantImageUpload = async (
    variantTempId: string,
    imageIndex: number,
    file?: File | null
  ) => {
    if (!file) return

    const uploadKey = `${variantTempId}-${imageIndex}`
    setUploadingVariantImageKey(uploadKey)

    try {
      const uploaded = await uploadImageAsset(file, 'product_variants')
      if (!uploaded) return

      setEditingProduct((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          variants: prev.variants.map((item) => {
            if (item.tempId !== variantTempId) return item
            const nextImages = [...item.variantsImageUrls]
            while (nextImages.length <= imageIndex) {
              nextImages.push({ url: '', publicId: '' })
            }
            nextImages[imageIndex] = uploaded
            return { ...item, variantsImageUrls: nextImages }
          }),
        }
      })

      toast.success('Variant image uploaded')
    } finally {
      setUploadingVariantImageKey((current) => (current === uploadKey ? '' : current))
    }
  }

  const saveProduct = async () => {
    if (!editingProduct) return
    setSavingProduct(true)
    try {
      const normalizedDefaultImages = editingProduct.defaultImages
        .map((image, index) =>
          normalizeImageAsset(image, `default-${index + 1}`)
        )
        .filter((image): image is ImageAsset => Boolean(image))
        .filter((image) => image.url)

      const normalizedSpecifications = editingProduct.specificationRows
        .map((row) => ({
          key: String(row?.key || '').trim(),
          value: String(row?.value || '').trim(),
        }))
        .filter((row) => row.key && row.value)
        .map((row) => ({ [row.key]: row.value }))

      const normalizedFaqs = editingProduct.faqs
        .map((faq) => ({
          question: String(faq?.question || '').trim(),
          answer: String(faq?.answer || '').trim(),
        }))
        .filter((faq) => faq.question && faq.answer)

      const normalizedVariants = editingProduct.variants.map((variant, index) => {
        const parsedAttributes = variant.variantAttributes.reduce<Record<string, string>>(
          (acc, row) => {
            const safeKey = String(row?.key || '').trim()
            const safeValue = String(row?.value || '').trim()
            if (!safeKey || !safeValue) return acc
            acc[safeKey] = safeValue
            return acc
          },
          {}
        )

        const parsedImages = variant.variantsImageUrls
          .map((image, imageIndex) =>
            normalizeImageAsset(image, `variant-${index + 1}-${imageIndex + 1}`)
          )
          .filter((image): image is ImageAsset => Boolean(image))
          .filter((image) => image.url)

        const actualPrice = Number(variant.actualPrice || 0)
        const finalPrice = Number(variant.finalPrice || 0)
        const stockQuantity = Number(variant.stockQuantity || 0)

        if (!Object.keys(parsedAttributes).length) {
          throw new Error(`Variant ${index + 1}: at least one attribute is required`)
        }
        if (!parsedImages.length) {
          throw new Error(`Variant ${index + 1}: at least one image is required`)
        }
        if (!Number.isFinite(actualPrice) || actualPrice <= 0) {
          throw new Error(`Variant ${index + 1}: actual price must be greater than 0`)
        }
        if (!Number.isFinite(finalPrice) || finalPrice <= 0) {
          throw new Error(`Variant ${index + 1}: final price must be greater than 0`)
        }
        if (finalPrice > actualPrice) {
          throw new Error(`Variant ${index + 1}: final price cannot exceed actual price`)
        }
        if (!Number.isFinite(stockQuantity) || stockQuantity < 0) {
          throw new Error(`Variant ${index + 1}: stock quantity must be 0 or greater`)
        }

        const normalizedVariant: Record<string, unknown> = {
          variantSku: String(variant.variantSku || '').trim(),
          variantAttributes: parsedAttributes,
          actualPrice,
          finalPrice,
          stockQuantity,
          isActive: variant.isActive !== false,
          variantsImageUrls: parsedImages,
          variantMetaTitle: String(variant.variantMetaTitle || '').trim(),
          variantMetaDescription: String(variant.variantMetaDescription || '').trim(),
          variantMetaKeywords: String(variant.variantMetaKeywords || '')
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean),
          variantCanonicalUrl: String(variant.variantCanonicalUrl || '').trim(),
        }

        if (variant._id) {
          normalizedVariant._id = variant._id
        }

        return normalizedVariant
      })

      if (!normalizedVariants.length) {
        throw new Error('At least one variant is required')
      }

      const normalizedCategoryIds = Array.from(
        new Set(
          [editingProduct.productCategoryId, ...editingProduct.productCategoryIds]
            .map((item) => String(item || '').trim())
            .filter(Boolean)
        )
      )

      const normalizedSubCategoryIds = Array.from(
        new Set(
          editingProduct.productSubCategoryIds
            .map((item) => String(item || '').trim())
            .filter(Boolean)
        )
      )

      if (!editingProduct.mainCategoryId) {
        throw new Error('Main category is required')
      }
      if (!normalizedCategoryIds.length) {
        throw new Error('At least one category is required')
      }

      const cityScopedEditing =
        editingProduct.editScope === 'city' &&
        Boolean(editingProduct.editCityId || editingProduct.editCitySlug)

      const cityQuery = editingProduct.editCityId
        ? `cityId=${encodeURIComponent(editingProduct.editCityId)}`
        : `city=${encodeURIComponent(editingProduct.editCitySlug || 'all')}`

      const endpoint = cityScopedEditing
        ? `${import.meta.env.VITE_PUBLIC_API_URL}/v1/admin/products/${editingProduct._id}/content/city?${cityQuery}`
        : `${import.meta.env.VITE_PUBLIC_API_URL}/v1/admin/products/${editingProduct._id}/content`

      const requestPayload: Record<string, unknown> = {
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
        mainCategory: editingProduct.mainCategoryId,
        productCategory: editingProduct.productCategoryId || normalizedCategoryIds[0],
        productCategories: normalizedCategoryIds,
        productSubCategories: normalizedSubCategoryIds,
        defaultImages: normalizedDefaultImages,
        specifications: normalizedSpecifications,
        variants: normalizedVariants,
        faqs: normalizedFaqs,
        status: editingProduct.status,
        isAvailable: editingProduct.isAvailable,
      }

      if (!cityScopedEditing) {
        requestPayload.availableCities = editingProduct.availableCities
      } else {
        requestPayload.cityId = editingProduct.editCityId
        requestPayload.citySlug = editingProduct.editCitySlug
      }

      const res = await fetch(endpoint, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(requestPayload),
      })
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

  const isCityScopedEditor = editingProduct?.editScope === 'city'

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

        <div className='grid gap-4 xl:grid-cols-[380px_minmax(0,1fr)]'>
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

          <div className='min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
            <div className='mb-4 flex flex-wrap items-center justify-between gap-2'>
              <div>
                <h3 className='text-lg font-semibold text-slate-900'>Product Pages</h3>
                <p className='text-sm text-slate-500'>
                  Edit complete product page + SEO. Use city rows to maintain city-specific product pages.
                </p>
                <p className='mt-1 text-xs font-medium text-amber-700'>
                  Har product ki 1 row "All Cities" hoti hai (city list + common content), aur
                  alag city rows hoti hain (sirf us city ke changes).
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
              <table className='w-full min-w-[980px] table-fixed'>
                <thead>
                  <tr className='border-b border-slate-200 text-left text-xs uppercase tracking-[0.2em] text-slate-500'>
                    <th className='w-[20%] pb-2 pe-3'>Product</th>
                    <th className='w-[14%] pb-2 pe-3'>Slug</th>
                    <th className='w-[20%] pb-2 pe-3'>SEO Title</th>
                    <th className='w-[14%] pb-2 pe-3'>Page City</th>
                    <th className='w-[16%] pb-2 pe-3'>Mapped Cities</th>
                    <th className='w-[8%] pb-2 pe-3'>Status</th>
                    <th className='w-[8%] pb-2 text-right'>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {productPageRows.map((row) => {
                    const product = row.product
                    const isCityScopedRow = row.pageCity.scope === 'city'
                    const isOpeningEditor = openingEditorRowKey === row.rowKey

                    return (
                    <tr key={row.rowKey} className='border-b border-slate-100'>
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
                        {isCityScopedRow ? (
                          <>
                            <span className='inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700'>
                              {row.pageCity.cityName || row.pageCity.citySlug}
                            </span>
                            <p className='mt-1 text-[11px] text-slate-500'>Only this city</p>
                          </>
                        ) : (
                          <>
                            <span className='inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600'>
                              All Cities
                            </span>
                            <p className='mt-1 text-[11px] font-medium text-amber-700'>
                              Edit city list here
                            </p>
                          </>
                        )}
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
                        <div className='flex flex-col items-end gap-1'>
                          <Button
                            size='sm'
                            variant='outline'
                            onClick={() => openEditor(row)}
                            disabled={isOpeningEditor}
                          >
                            {isOpeningEditor ? (
                              <Loader2 className='h-4 w-4 animate-spin' />
                            ) : (
                              <FilePenLine className='h-4 w-4' />
                            )}
                            {isCityScopedRow
                              ? `Edit ${row.pageCity.cityName || row.pageCity.citySlug} only`
                              : 'Edit All Cities'}
                          </Button>
                          {isCityScopedRow ? (
                            <Button
                              size='sm'
                              variant='ghost'
                              className='h-7 px-2 text-xs'
                              title='Edit city list where this product is visible'
                              onClick={() => void openGlobalEditorForProduct(product._id)}
                            >
                              Edit City List
                            </Button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  )})}
                </tbody>
              </table>
            </div>

            {!loadingWorkspace && productPageRows.length === 0 ? (
              <div className='mt-4 rounded-lg border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500'>
                No product pages found for selected vendor/city.
              </div>
            ) : null}
          </div>
        </div>
      </Main>

      {editingProduct ? (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4'>
          <div className='max-h-[94vh] w-full max-w-6xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl'>
            <div className='mb-4 flex items-center justify-between'>
              <div>
                <h3 className='text-xl font-semibold text-slate-900'>
                  {isCityScopedEditor
                    ? `Edit Product for ${editingProduct.editCityName || editingProduct.editCitySlug}`
                    : 'Edit Product for All Cities'}
                </h3>
                <p className='text-sm text-slate-500'>
                  Edit full product details including specs, variants, images, FAQs, SEO and cities.
                </p>
                <div className='mt-2 flex flex-wrap items-center gap-2 text-xs'>
                  {isCityScopedEditor ? (
                    <span className='inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-1 font-semibold text-emerald-700'>
                      Save target: {editingProduct.editCityName || editingProduct.editCitySlug} only
                    </span>
                  ) : (
                    <span className='inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 font-semibold text-slate-600'>
                      Save target: All Cities
                    </span>
                  )}
                </div>
                <div
                  className={`mt-2 rounded-md border px-2.5 py-2 text-xs ${
                    isCityScopedEditor
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                      : 'border-slate-200 bg-slate-50 text-slate-700'
                  }`}
                >
                  {isCityScopedEditor
                    ? `Aap yahan jo save karenge wo sirf ${
                        editingProduct.editCityName || editingProduct.editCitySlug || 'this city'
                      } page par lagega. Dusre cities par koi effect nahi hoga.`
                    : 'Yahan save karne se product ka common content sab cities me update hoga.'}
                </div>
                {isCityScopedEditor ? (
                  <div className='mt-2 flex flex-wrap items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-2 text-xs text-amber-800'>
                    <span>
                      Available Cities list yahan edit nahi hoti.
                    </span>
                    <Button
                      type='button'
                      size='sm'
                      variant='outline'
                      className='h-7'
                      onClick={() => void openGlobalEditorForProduct(editingProduct._id)}
                    >
                      Edit City List
                    </Button>
                  </div>
                ) : null}
              </div>
              <Button variant='outline' onClick={closeEditor}>
                Close
              </Button>
            </div>

            <div className='grid gap-3 md:grid-cols-2 lg:grid-cols-3'>
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
              <label className='text-sm'>
                <span className='mb-1 block font-medium text-slate-700'>Base SKU (readonly)</span>
                <Input value={editingProduct.baseSku} readOnly />
              </label>
              <label className='text-sm'>
                <span className='mb-1 block font-medium text-slate-700'>Main Category</span>
                <select
                  value={editingProduct.mainCategoryId}
                  onChange={(e) =>
                    setEditingProduct((prev) => {
                      if (!prev) return prev
                      return {
                        ...prev,
                        mainCategoryId: e.target.value,
                        productCategoryId: '',
                        productCategoryIds: [],
                        productSubCategoryIds: [],
                      }
                    })
                  }
                  className='h-10 w-full rounded-md border border-slate-300 bg-white px-3'
                  disabled={loadingCategoryMeta || isCityScopedEditor}
                >
                  <option value=''>
                    {loadingCategoryMeta ? 'Loading categories...' : 'Select main category'}
                  </option>
                  {mainCategories.map((item) => (
                    <option key={item._id} value={item._id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className='text-sm'>
                <span className='mb-1 block font-medium text-slate-700'>
                  Primary Category (required)
                </span>
                <select
                  value={editingProduct.productCategoryId}
                  onChange={(e) =>
                    setEditingProduct((prev) => {
                      if (!prev) return prev
                      const nextPrimary = e.target.value
                      const nextCategories = Array.from(
                        new Set(
                          [nextPrimary, ...prev.productCategoryIds]
                            .map((item) => String(item || '').trim())
                            .filter(Boolean)
                        )
                      )
                      const nextSubCategoryIds = prev.productSubCategoryIds.filter((subId) =>
                        subCategories.some(
                          (sub) => sub._id === subId && nextCategories.includes(sub.categoryId)
                        )
                      )
                      return {
                        ...prev,
                        productCategoryId: nextPrimary,
                        productCategoryIds: nextCategories,
                        productSubCategoryIds: nextSubCategoryIds,
                      }
                    })
                  }
                  className='h-10 w-full rounded-md border border-slate-300 bg-white px-3'
                  disabled={!editingProduct.mainCategoryId || loadingCategoryMeta || isCityScopedEditor}
                >
                  <option value=''>Select primary category</option>
                  {editorCategoryOptions.length ? (
                    editorCategoryOptions.map((item) => (
                      <option key={item._id} value={item._id}>
                        {item.name}
                      </option>
                    ))
                  ) : (
                    <option value='' disabled>
                      No categories found for selected main category
                    </option>
                  )}
                </select>
                <span className='mt-1 block text-xs text-slate-500'>
                  <code className='rounded bg-slate-100 px-1 py-0.5 text-[11px]'>
                    productCategory
                  </code>{' '}
                  is the single primary category in schema.{' '}
                  <code className='rounded bg-slate-100 px-1 py-0.5 text-[11px]'>
                    productCategories
                  </code>{' '}
                  is the multi-category list.
                </span>
              </label>
              <label className='text-sm'>
                <span className='mb-1 block font-medium text-slate-700'>Categories</span>
                <select
                  multiple
                  value={editingProduct.productCategoryIds}
                  onChange={(e) =>
                    setEditingProduct((prev) => {
                      if (!prev) return prev
                      const selected = Array.from(e.target.selectedOptions).map(
                        (option) => option.value
                      )
                      const nextPrimary =
                        selected.includes(prev.productCategoryId) && prev.productCategoryId
                          ? prev.productCategoryId
                          : selected[0] || ''
                      const nextSubCategoryIds = prev.productSubCategoryIds.filter((subId) =>
                        subCategories.some(
                          (sub) => sub._id === subId && selected.includes(sub.categoryId)
                        )
                      )
                      return {
                        ...prev,
                        productCategoryIds: selected,
                        productCategoryId: nextPrimary,
                        productSubCategoryIds: nextSubCategoryIds,
                      }
                    })
                  }
                  className='min-h-[112px] w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm'
                  disabled={!editingProduct.mainCategoryId || loadingCategoryMeta || isCityScopedEditor}
                >
                  {editorCategoryOptions.length ? (
                    editorCategoryOptions.map((item) => (
                      <option key={`category-${item._id}`} value={item._id}>
                        {item.name}
                      </option>
                    ))
                  ) : (
                    <option value='' disabled>
                      No categories found for selected main category
                    </option>
                  )}
                </select>
                <span className='mt-1 block text-xs text-slate-500'>
                  Hold Ctrl/Cmd to select multiple categories.
                </span>
              </label>
              <label className='text-sm lg:col-span-2'>
                <span className='mb-1 block font-medium text-slate-700'>Subcategories</span>
                <select
                  multiple
                  value={editingProduct.productSubCategoryIds}
                  onChange={(e) =>
                    setEditingProduct((prev) => {
                      if (!prev) return prev
                      const selected = Array.from(e.target.selectedOptions).map(
                        (option) => option.value
                      )
                      return { ...prev, productSubCategoryIds: selected }
                    })
                  }
                  className='min-h-[112px] w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm'
                  disabled={!editorSelectedCategoryIds.length || loadingCategoryMeta || isCityScopedEditor}
                >
                  {editorSubCategoryOptions.length ? (
                    editorSubCategoryOptions.map((item) => (
                      <option key={`subcategory-${item._id}`} value={item._id}>
                        {item.name}
                      </option>
                    ))
                  ) : (
                    <option value='' disabled>
                      No subcategories found for selected categories
                    </option>
                  )}
                </select>
                <span className='mt-1 block text-xs text-slate-500'>
                  {editorSelectedCategoryIds.length
                    ? 'Subcategories filtered by selected categories.'
                    : 'Select categories first to see subcategories.'}
                </span>
              </label>
              {editingProduct.mainCategoryId ? (
                <div className='rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600'>
                  Main: {mainCategoryNameById[editingProduct.mainCategoryId] || 'N/A'} | Primary:{' '}
                  {categoryNameById[editingProduct.productCategoryId] || 'N/A'}
                  {editingProduct.productSubCategoryIds.length ? (
                    <div className='mt-1'>
                      Subcategories:{' '}
                      {editingProduct.productSubCategoryIds
                        .map((id) => subCategoryNameById[id] || id)
                        .join(', ')}
                    </div>
                  ) : null}
                </div>
              ) : null}
              {isCityScopedEditor ? (
                <div className='rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700'>
                  Category mapping is global. For city-specific page editing, category fields are read-only.
                </div>
              ) : null}
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

            <div className='mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3'>
              <div className='mb-2 flex items-center justify-between'>
                <p className='text-sm font-semibold text-slate-800'>Default Images</p>
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  disabled={isCityScopedEditor}
                  onClick={() =>
                    setEditingProduct((prev) =>
                      prev
                        ? {
                            ...prev,
                            defaultImages: [...prev.defaultImages, { url: '', publicId: '' }],
                          }
                        : prev
                    )
                  }
                >
                  Add Image
                </Button>
              </div>
              <div className='space-y-2'>
                {(editingProduct.defaultImages.length
                  ? editingProduct.defaultImages
                  : [{ url: '', publicId: '' }]
                ).map((image, index) => (
                  <div
                    key={`default-image-${index}`}
                    className='grid gap-2 md:grid-cols-[72px_1fr_1fr_auto]'
                  >
                    <div className='flex items-center justify-center'>
                      {image.url ? (
                        <a
                          href={image.url}
                          target='_blank'
                          rel='noreferrer'
                          className='block h-14 w-14 overflow-hidden rounded-md border border-slate-200 bg-white'
                          title='Open image in new tab'
                        >
                          <img
                            src={image.url}
                            alt={`Default image ${index + 1}`}
                            className='h-full w-full object-cover'
                          />
                        </a>
                      ) : (
                        <div className='flex h-14 w-14 items-center justify-center rounded-md border border-dashed border-slate-300 text-[10px] font-medium text-slate-400'>
                          No image
                        </div>
                      )}
                    </div>
                    <Input
                      value={image.url}
                      placeholder='Image URL'
                      onChange={(e) =>
                        setEditingProduct((prev) => {
                          if (!prev) return prev
                          const next = [...prev.defaultImages]
                          while (next.length <= index) next.push({ url: '', publicId: '' })
                          next[index] = { ...next[index], url: e.target.value }
                          return { ...prev, defaultImages: next }
                        })
                      }
                    />
                    <Input
                      value={image.publicId}
                      placeholder='Public ID'
                      onChange={(e) =>
                        setEditingProduct((prev) => {
                          if (!prev) return prev
                          const next = [...prev.defaultImages]
                          while (next.length <= index) next.push({ url: '', publicId: '' })
                          next[index] = { ...next[index], publicId: e.target.value }
                          return { ...prev, defaultImages: next }
                        })
                      }
                    />
                    <Button
                      type='button'
                      variant='outline'
                      size='sm'
                      onClick={() =>
                        setEditingProduct((prev) =>
                          prev
                            ? {
                                ...prev,
                                defaultImages: prev.defaultImages.filter((_, i) => i !== index),
                              }
                            : prev
                        )
                      }
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div className='mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3'>
              <div className='mb-2 flex items-center justify-between'>
                <p className='text-sm font-semibold text-slate-800'>Specifications</p>
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  onClick={() =>
                    setEditingProduct((prev) =>
                      prev
                        ? {
                            ...prev,
                            specificationRows: [...prev.specificationRows, { key: '', value: '' }],
                          }
                        : prev
                    )
                  }
                >
                  Add Specification
                </Button>
              </div>
              <div className='space-y-2'>
                {(editingProduct.specificationRows.length
                  ? editingProduct.specificationRows
                  : [{ key: '', value: '' }]
                ).map((row, index) => (
                  <div key={`spec-row-${index}`} className='grid gap-2 md:grid-cols-[1fr_1fr_auto]'>
                    <Input
                      value={row.key}
                      placeholder='Specification key'
                      onChange={(e) =>
                        setEditingProduct((prev) => {
                          if (!prev) return prev
                          const next = [...prev.specificationRows]
                          while (next.length <= index) next.push({ key: '', value: '' })
                          next[index] = { ...next[index], key: e.target.value }
                          return { ...prev, specificationRows: next }
                        })
                      }
                    />
                    <Input
                      value={row.value}
                      placeholder='Specification value'
                      onChange={(e) =>
                        setEditingProduct((prev) => {
                          if (!prev) return prev
                          const next = [...prev.specificationRows]
                          while (next.length <= index) next.push({ key: '', value: '' })
                          next[index] = { ...next[index], value: e.target.value }
                          return { ...prev, specificationRows: next }
                        })
                      }
                    />
                    <Button
                      type='button'
                      variant='outline'
                      size='sm'
                      onClick={() =>
                        setEditingProduct((prev) =>
                          prev
                            ? {
                                ...prev,
                                specificationRows: prev.specificationRows.filter(
                                  (_, i) => i !== index
                                ),
                              }
                            : prev
                        )
                      }
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div className='mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3'>
              <div className='mb-2 flex items-center justify-between'>
                <p className='text-sm font-semibold text-slate-800'>Variants</p>
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  onClick={() =>
                    setEditingProduct((prev) =>
                      prev
                        ? {
                            ...prev,
                            variants: [...prev.variants, createEmptyVariantEditor()],
                          }
                        : prev
                    )
                  }
                >
                  Add Variant
                </Button>
              </div>
              {isCityScopedEditor ? (
                <p className='mb-2 text-xs text-amber-700'>
                  City-specific page supports variant field edits, but adding/removing variants is locked.
                </p>
              ) : null}
              <div className='space-y-3'>
                {editingProduct.variants.map((variant, index) => (
                    <div
                      key={variant.tempId || `variant-${index}`}
                      className='rounded-lg border border-slate-200 bg-white p-3'
                    >
                      <div className='mb-2 flex items-center justify-between'>
                        <p className='text-sm font-semibold text-slate-700'>Variant {index + 1}</p>
                        <Button
                          type='button'
                          variant='outline'
                          size='sm'
                          disabled={isCityScopedEditor}
                          onClick={() =>
                            setEditingProduct((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    variants: (() => {
                                      const nextVariants = prev.variants.filter(
                                        (item) => item.tempId !== variant.tempId
                                      )
                                      return nextVariants.length
                                        ? nextVariants
                                        : [createEmptyVariantEditor()]
                                    })(),
                                  }
                                : prev
                            )
                          }
                        >
                          Remove
                        </Button>
                      </div>
                      <div className='grid gap-2 md:grid-cols-3'>
                        <label className='text-xs text-slate-600'>
                          <span className='mb-1 block font-semibold'>Variant SKU</span>
                          <Input
                            value={variant.variantSku}
                            onChange={(e) =>
                              setEditingProduct((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      variants: prev.variants.map((item) =>
                                        item.tempId === variant.tempId
                                          ? { ...item, variantSku: e.target.value }
                                          : item
                                      ),
                                    }
                                  : prev
                              )
                            }
                          />
                        </label>
                        <label className='text-xs text-slate-600'>
                          <span className='mb-1 block font-semibold'>Actual Price</span>
                          <Input
                            type='number'
                            value={variant.actualPrice}
                            onChange={(e) =>
                              setEditingProduct((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      variants: prev.variants.map((item) =>
                                        item.tempId === variant.tempId
                                          ? { ...item, actualPrice: e.target.value }
                                          : item
                                      ),
                                    }
                                  : prev
                              )
                            }
                          />
                        </label>
                        <label className='text-xs text-slate-600'>
                          <span className='mb-1 block font-semibold'>Final Price</span>
                          <Input
                            type='number'
                            value={variant.finalPrice}
                            onChange={(e) =>
                              setEditingProduct((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      variants: prev.variants.map((item) =>
                                        item.tempId === variant.tempId
                                          ? { ...item, finalPrice: e.target.value }
                                          : item
                                      ),
                                    }
                                  : prev
                              )
                            }
                          />
                        </label>
                        <label className='text-xs text-slate-600'>
                          <span className='mb-1 block font-semibold'>Stock Quantity</span>
                          <Input
                            type='number'
                            value={variant.stockQuantity}
                            onChange={(e) =>
                              setEditingProduct((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      variants: prev.variants.map((item) =>
                                        item.tempId === variant.tempId
                                          ? { ...item, stockQuantity: e.target.value }
                                          : item
                                      ),
                                    }
                                  : prev
                              )
                            }
                          />
                        </label>
                        <label className='text-xs text-slate-600 md:col-span-2'>
                          <span className='mb-1 block font-semibold'>Variant Canonical URL</span>
                          <Input
                            value={variant.variantCanonicalUrl}
                            onChange={(e) =>
                              setEditingProduct((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      variants: prev.variants.map((item) =>
                                        item.tempId === variant.tempId
                                          ? { ...item, variantCanonicalUrl: e.target.value }
                                          : item
                                      ),
                                    }
                                  : prev
                              )
                            }
                          />
                        </label>
                      </div>
                      <label className='mt-2 flex items-center gap-2 text-sm text-slate-700'>
                        <input
                          type='checkbox'
                          checked={variant.isActive}
                          onChange={(e) =>
                            setEditingProduct((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    variants: prev.variants.map((item) =>
                                      item.tempId === variant.tempId
                                        ? { ...item, isActive: e.target.checked }
                                        : item
                                    ),
                                  }
                                : prev
                            )
                          }
                        />
                        Variant is active
                      </label>
                      <div className='mt-2 grid gap-2 md:grid-cols-2'>
                        <label className='text-xs text-slate-600'>
                          <span className='mb-1 block font-semibold'>Variant Meta Title</span>
                          <Input
                            value={variant.variantMetaTitle}
                            onChange={(e) =>
                              setEditingProduct((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      variants: prev.variants.map((item) =>
                                        item.tempId === variant.tempId
                                          ? { ...item, variantMetaTitle: e.target.value }
                                          : item
                                      ),
                                    }
                                  : prev
                              )
                            }
                          />
                        </label>
                        <label className='text-xs text-slate-600'>
                          <span className='mb-1 block font-semibold'>Variant Meta Keywords</span>
                          <Input
                            value={variant.variantMetaKeywords}
                            placeholder='Comma separated'
                            onChange={(e) =>
                              setEditingProduct((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      variants: prev.variants.map((item) =>
                                        item.tempId === variant.tempId
                                          ? { ...item, variantMetaKeywords: e.target.value }
                                          : item
                                      ),
                                    }
                                  : prev
                              )
                            }
                          />
                        </label>
                      </div>
                      <label className='mt-2 block text-xs text-slate-600'>
                        <span className='mb-1 block font-semibold'>Variant Meta Description</span>
                        <textarea
                          value={variant.variantMetaDescription}
                          onChange={(e) =>
                            setEditingProduct((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    variants: prev.variants.map((item) =>
                                      item.tempId === variant.tempId
                                        ? { ...item, variantMetaDescription: e.target.value }
                                        : item
                                    ),
                                  }
                                : prev
                            )
                          }
                          className='min-h-[88px] w-full rounded-md border border-slate-300 px-3 py-2'
                        />
                      </label>
                      <div className='mt-2 rounded-md border border-slate-200 bg-slate-50 p-2'>
                        <div className='mb-2 flex items-center justify-between'>
                          <p className='text-xs font-semibold text-slate-700'>Variant Attributes</p>
                          <Button
                            type='button'
                            variant='outline'
                            size='sm'
                            onClick={() =>
                              setEditingProduct((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      variants: prev.variants.map((item) =>
                                        item.tempId === variant.tempId
                                          ? {
                                              ...item,
                                              variantAttributes: [
                                                ...item.variantAttributes,
                                                { key: '', value: '' },
                                              ],
                                            }
                                          : item
                                      ),
                                    }
                                  : prev
                              )
                            }
                          >
                            Add Attribute
                          </Button>
                        </div>
                        <div className='space-y-2'>
                          {(variant.variantAttributes.length
                            ? variant.variantAttributes
                            : [{ key: '', value: '' }]
                          ).map((attribute, attributeIndex) => (
                            <div
                              key={`${variant.tempId}-attr-${attributeIndex}`}
                              className='grid gap-2 md:grid-cols-[1fr_1fr_auto]'
                            >
                              <Input
                                value={attribute.key}
                                placeholder='Attribute name (e.g. Color)'
                                onChange={(e) =>
                                  setEditingProduct((prev) =>
                                    prev
                                      ? {
                                          ...prev,
                                          variants: prev.variants.map((item) => {
                                            if (item.tempId !== variant.tempId) return item
                                            const nextAttributes = [...item.variantAttributes]
                                            while (nextAttributes.length <= attributeIndex) {
                                              nextAttributes.push({ key: '', value: '' })
                                            }
                                            nextAttributes[attributeIndex] = {
                                              ...nextAttributes[attributeIndex],
                                              key: e.target.value,
                                            }
                                            return { ...item, variantAttributes: nextAttributes }
                                          }),
                                        }
                                      : prev
                                  )
                                }
                              />
                              <Input
                                value={attribute.value}
                                placeholder='Attribute value (e.g. Gray)'
                                onChange={(e) =>
                                  setEditingProduct((prev) =>
                                    prev
                                      ? {
                                          ...prev,
                                          variants: prev.variants.map((item) => {
                                            if (item.tempId !== variant.tempId) return item
                                            const nextAttributes = [...item.variantAttributes]
                                            while (nextAttributes.length <= attributeIndex) {
                                              nextAttributes.push({ key: '', value: '' })
                                            }
                                            nextAttributes[attributeIndex] = {
                                              ...nextAttributes[attributeIndex],
                                              value: e.target.value,
                                            }
                                            return { ...item, variantAttributes: nextAttributes }
                                          }),
                                        }
                                      : prev
                                  )
                                }
                              />
                              <Button
                                type='button'
                                variant='outline'
                                size='sm'
                                onClick={() =>
                                  setEditingProduct((prev) =>
                                    prev
                                      ? {
                                          ...prev,
                                          variants: prev.variants.map((item) =>
                                            item.tempId === variant.tempId
                                              ? {
                                                  ...item,
                                                  variantAttributes: item.variantAttributes.filter(
                                                    (_, i) => i !== attributeIndex
                                                  ),
                                                }
                                              : item
                                          ),
                                        }
                                      : prev
                                  )
                                }
                              >
                                Remove
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className='mt-2 rounded-md border border-slate-200 bg-slate-50 p-2'>
                        <div className='mb-2 flex items-center justify-between'>
                          <p className='text-xs font-semibold text-slate-700'>Variant Images</p>
                          <Button
                            type='button'
                            variant='outline'
                            size='sm'
                            onClick={() =>
                              setEditingProduct((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      variants: prev.variants.map((item) =>
                                        item.tempId === variant.tempId
                                          ? {
                                              ...item,
                                              variantsImageUrls: [
                                                ...item.variantsImageUrls,
                                                { url: '', publicId: '' },
                                              ],
                                            }
                                          : item
                                      ),
                                    }
                                  : prev
                              )
                            }
                          >
                            Add Image
                          </Button>
                        </div>
                        <div className='space-y-2'>
                          {(variant.variantsImageUrls.length
                            ? variant.variantsImageUrls
                            : [{ url: '', publicId: '' }]
                          ).map((image, imageIndex) => {
                            const uploadKey = `${variant.tempId}-${imageIndex}`
                            const uploadInputId = `variant-upload-${variant.tempId}-${imageIndex}`
                            const isUploading = uploadingVariantImageKey === uploadKey
                            return (
                              <div
                                key={`${variant.tempId}-image-${imageIndex}`}
                                className='grid gap-2 md:grid-cols-[72px_1fr_1fr_auto_auto]'
                              >
                              <div className='flex items-center justify-center'>
                                {image.url ? (
                                  <a
                                    href={image.url}
                                    target='_blank'
                                    rel='noreferrer'
                                    className='block h-14 w-14 overflow-hidden rounded-md border border-slate-200 bg-white'
                                    title='Open image in new tab'
                                  >
                                    <img
                                      src={image.url}
                                      alt={`Variant ${index + 1} image ${imageIndex + 1}`}
                                      className='h-full w-full object-cover'
                                    />
                                  </a>
                                ) : (
                                  <div className='flex h-14 w-14 items-center justify-center rounded-md border border-dashed border-slate-300 text-[10px] font-medium text-slate-400'>
                                    No image
                                  </div>
                                )}
                              </div>
                              <Input
                                value={image.url}
                                placeholder='Image URL'
                                onChange={(e) =>
                                  setEditingProduct((prev) =>
                                    prev
                                      ? {
                                          ...prev,
                                          variants: prev.variants.map((item) => {
                                            if (item.tempId !== variant.tempId) return item
                                            const nextImages = [...item.variantsImageUrls]
                                            while (nextImages.length <= imageIndex) {
                                              nextImages.push({ url: '', publicId: '' })
                                            }
                                            nextImages[imageIndex] = {
                                              ...nextImages[imageIndex],
                                              url: e.target.value,
                                            }
                                            return { ...item, variantsImageUrls: nextImages }
                                          }),
                                        }
                                      : prev
                                  )
                                }
                              />
                              <Input
                                value={image.publicId}
                                placeholder='Public ID'
                                onChange={(e) =>
                                  setEditingProduct((prev) =>
                                    prev
                                      ? {
                                          ...prev,
                                          variants: prev.variants.map((item) => {
                                            if (item.tempId !== variant.tempId) return item
                                            const nextImages = [...item.variantsImageUrls]
                                            while (nextImages.length <= imageIndex) {
                                              nextImages.push({ url: '', publicId: '' })
                                            }
                                            nextImages[imageIndex] = {
                                              ...nextImages[imageIndex],
                                              publicId: e.target.value,
                                            }
                                            return { ...item, variantsImageUrls: nextImages }
                                          }),
                                        }
                                      : prev
                                  )
                                }
                              />
                              <div className='flex items-center'>
                                <input
                                  id={uploadInputId}
                                  type='file'
                                  accept='image/*'
                                  className='hidden'
                                  onChange={(e) => {
                                    const file = e.target.files?.[0]
                                    void handleVariantImageUpload(
                                      variant.tempId,
                                      imageIndex,
                                      file
                                    )
                                    e.currentTarget.value = ''
                                  }}
                                  disabled={isUploading}
                                />
                                <label
                                  htmlFor={uploadInputId}
                                  className={`inline-flex h-10 min-w-[122px] items-center justify-center gap-2 rounded-md border border-slate-300 px-3 text-xs font-medium text-slate-700 ${
                                    isUploading
                                      ? 'cursor-not-allowed bg-slate-100 text-slate-500'
                                      : 'cursor-pointer bg-white hover:bg-slate-50'
                                  }`}
                                >
                                  {isUploading ? (
                                    <Loader2 className='h-3.5 w-3.5 animate-spin' />
                                  ) : null}
                                  {isUploading ? 'Uploading...' : 'Upload Image'}
                                </label>
                              </div>
                              <Button
                                type='button'
                                variant='outline'
                                size='sm'
                                onClick={() =>
                                  setEditingProduct((prev) =>
                                    prev
                                      ? {
                                          ...prev,
                                          variants: prev.variants.map((item) =>
                                            item.tempId === variant.tempId
                                              ? {
                                                  ...item,
                                                  variantsImageUrls: item.variantsImageUrls.filter(
                                                    (_, i) => i !== imageIndex
                                                  ),
                                                }
                                              : item
                                          ),
                                        }
                                      : prev
                                  )
                                }
                              >
                                Remove
                              </Button>
                            </div>
                          )})}
                        </div>
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>

            <div className='mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3'>
              <div className='mb-2 flex items-center justify-between'>
                <p className='text-sm font-semibold text-slate-800'>FAQs</p>
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  onClick={() =>
                    setEditingProduct((prev) =>
                      prev
                        ? { ...prev, faqs: [...prev.faqs, { question: '', answer: '' }] }
                        : prev
                    )
                  }
                >
                  Add FAQ
                </Button>
              </div>
              <div className='space-y-3'>
                {(editingProduct.faqs.length
                  ? editingProduct.faqs
                  : [{ question: '', answer: '' }]
                ).map((faq, index) => (
                  <div key={`faq-${index}`} className='rounded-lg border border-slate-200 bg-white p-3'>
                    <div className='grid gap-2 md:grid-cols-[1fr_auto]'>
                      <Input
                        value={faq.question}
                        placeholder='Question'
                        onChange={(e) =>
                          setEditingProduct((prev) => {
                            if (!prev) return prev
                            const next = [...prev.faqs]
                            while (next.length <= index) next.push({ question: '', answer: '' })
                            next[index] = { ...next[index], question: e.target.value }
                            return { ...prev, faqs: next }
                          })
                        }
                      />
                      <Button
                        type='button'
                        variant='outline'
                        size='sm'
                        onClick={() =>
                          setEditingProduct((prev) =>
                            prev ? { ...prev, faqs: prev.faqs.filter((_, i) => i !== index) } : prev
                          )
                        }
                      >
                        Remove
                      </Button>
                    </div>
                    <textarea
                      value={faq.answer}
                      placeholder='Answer'
                      onChange={(e) =>
                        setEditingProduct((prev) => {
                          if (!prev) return prev
                          const next = [...prev.faqs]
                          while (next.length <= index) next.push({ question: '', answer: '' })
                          next[index] = { ...next[index], answer: e.target.value }
                          return { ...prev, faqs: next }
                        })
                      }
                      className='mt-2 min-h-[88px] w-full rounded-md border border-slate-300 px-3 py-2'
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className='mt-3'>
              <p className='mb-1 text-sm font-medium text-slate-700'>Available Cities</p>
              <div
                className={`grid gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 sm:grid-cols-2 md:grid-cols-3 ${
                  isCityScopedEditor ? 'opacity-60' : ''
                }`}
              >
                {cities
                  .filter((city) => city.isActive)
                  .map((city) => {
                    const checked = editingProduct.availableCities.includes(city._id)
                    return (
                      <label key={city._id} className='flex items-center gap-2 text-sm text-slate-700'>
                        <input
                          type='checkbox'
                          checked={checked}
                          disabled={isCityScopedEditor}
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
              {isCityScopedEditor ? (
                <div className='mt-2 flex flex-wrap items-center gap-2'>
                  <p className='text-xs text-amber-700'>
                    Available Cities list yahan locked hai.
                  </p>
                  <Button
                    type='button'
                    size='sm'
                    variant='outline'
                    className='h-7'
                    onClick={() => void openGlobalEditorForProduct(editingProduct._id)}
                  >
                    Edit City List
                  </Button>
                </div>
              ) : null}
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
                {isCityScopedEditor
                  ? `Save for ${
                      editingProduct.editCityName || editingProduct.editCitySlug || 'This City'
                    } only`
                  : 'Save for all cities'}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
