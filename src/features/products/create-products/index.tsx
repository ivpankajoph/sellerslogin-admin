// src/components/ProductCreate/index.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from '@tanstack/react-router'
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Loader2,
  PackagePlus,
  Sparkles,
} from 'lucide-react'
import { useSelector } from 'react-redux'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { generateSpecifications, generateWithAI } from './aiHelpers'
import { deleteFromCloudinary, uploadToCloudinary } from './cloudinary'
import Step1BasicInfo from './components/Step1BasicInfo'
import Step3Specifications from './components/Step3Specifications'
import Step4SEO from './components/Step4SEO'
import Step5Variants from './components/Step5Variants'
import Step6FAQs from './components/Step6FAQs'
import {
  type ImageUpload,
  type ProductFormData,
  SPECIFICATION_TEMPLATES,
  type Variant,
} from './types/type'

// Interfaces

// Specification templates by category

const PRODUCT_CREATE_DRAFT_STORAGE_PREFIX = 'product_create_draft'
const PRODUCT_CREATE_DRAFT_VERSION = 1
const PRODUCT_CREATE_DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000
const PRODUCT_CREATE_STEP_COUNT = 3

const createInitialFormData = (): ProductFormData => ({
  mainCategory: '',
  productName: '',
  productCategory: '',
  productCategories: [],
  productSubCategories: [],
  availableCities: [],
  brand: '',
  shortDescription: '',
  description: '',
  defaultImages: [],
  specifications: [{}],
  isAvailable: true,
  metaTitle: '',
  metaDescription: '',
  metaKeywords: [],
  variants: [],
  faqs: [],
})

type ProductCreateDraft = {
  version: number
  savedAt: number
  formData: ProductFormData
  selectedMainCategoryId: string
  selectedCategoryIds: string[]
  currentStep: number
  specificationKeys: string[]
  metaKeywordInput: string
  tempAttributeKey: string
  tempAttributeValue: string
  variantMetaKeywordInput: string
}

const buildProductCreateDraftStorageKey = (vendorId: string) =>
  `${PRODUCT_CREATE_DRAFT_STORAGE_PREFIX}_${vendorId}`

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const toText = (value: unknown) =>
  typeof value === 'string' ? value : value == null ? '' : String(value)

const toTrimmedText = (value: unknown) => toText(value).trim()

const sanitizeStringList = (value: unknown) =>
  Array.isArray(value)
    ? Array.from(
        new Set(value.map((item) => toTrimmedText(item)).filter(Boolean))
      )
    : []

const sanitizeImageUploads = (value: unknown): ImageUpload[] => {
  if (!Array.isArray(value)) return []

  return value
    .map((item) => {
      if (!isRecord(item)) return null

      const url = toTrimmedText(item.url)
      if (!url || url.startsWith('blob:') || item.uploading === true) {
        return null
      }

      return {
        url,
        publicId: toTrimmedText(item.publicId),
      }
    })
    .filter((item): item is ImageUpload => Boolean(item))
}

const sanitizeStringRecord = (value: unknown): Record<string, string> => {
  if (!isRecord(value)) return {}

  return Object.entries(value).reduce<Record<string, string>>((acc, [key, entryValue]) => {
    const normalizedKey = toTrimmedText(key)
    if (!normalizedKey) return acc
    acc[normalizedKey] = toText(entryValue)
    return acc
  }, {})
}

const sanitizeFaqs = (value: unknown) => {
  if (!Array.isArray(value)) return []

  return value.map((item) => {
    const raw = isRecord(item) ? item : {}
    return {
      question: toText(raw.question),
      answer: toText(raw.answer),
    }
  })
}

const toNumberValue = (value: unknown) => {
  const numericValue = Number(value)
  return Number.isFinite(numericValue) ? numericValue : 0
}

const sanitizeVariant = (value: unknown): Variant => {
  const raw = isRecord(value) ? value : {}

  return {
    variantAttributes: sanitizeStringRecord(raw.variantAttributes),
    actualPrice: toNumberValue(raw.actualPrice),
    finalPrice: toNumberValue(raw.finalPrice),
    stockQuantity: toNumberValue(raw.stockQuantity),
    variantsImageUrls: sanitizeImageUploads(raw.variantsImageUrls),
    variantMetaTitle: toText(raw.variantMetaTitle),
    variantMetaDescription: toText(raw.variantMetaDescription),
    variantMetaKeywords: sanitizeStringList(raw.variantMetaKeywords),
    isActive: raw.isActive !== false,
  }
}

const sanitizeProductFormData = (value: unknown): ProductFormData => {
  const raw = isRecord(value) ? value : {}
  const specifications = Array.isArray(raw.specifications)
    ? raw.specifications.map((item) => sanitizeStringRecord(item))
    : []

  return {
    ...createInitialFormData(),
    mainCategory: toTrimmedText(raw.mainCategory),
    productName: toText(raw.productName),
    productCategory: toTrimmedText(raw.productCategory),
    productCategories: sanitizeStringList(raw.productCategories),
    productSubCategories: sanitizeStringList(raw.productSubCategories),
    availableCities: sanitizeStringList(raw.availableCities),
    brand: toText(raw.brand),
    shortDescription: toText(raw.shortDescription),
    description: toText(raw.description),
    defaultImages: sanitizeImageUploads(raw.defaultImages),
    specifications: specifications.length ? specifications : [{}],
    isAvailable: raw.isAvailable !== false,
    metaTitle: toText(raw.metaTitle),
    metaDescription: toText(raw.metaDescription),
    metaKeywords: sanitizeStringList(raw.metaKeywords),
    variants: Array.isArray(raw.variants) ? raw.variants.map(sanitizeVariant) : [],
    faqs: sanitizeFaqs(raw.faqs),
  }
}

const clampProductCreateStep = (value: unknown) => {
  const numericValue = Number(value)
  if (!Number.isFinite(numericValue)) return 1
  return Math.min(PRODUCT_CREATE_STEP_COUNT, Math.max(1, Math.trunc(numericValue)))
}

const sortEntitiesByName = <T extends { name?: string }>(items: T[]) =>
  [...items].sort((a, b) =>
    String(a?.name || '').localeCompare(String(b?.name || ''), undefined, {
      sensitivity: 'base',
    })
  )

const mergeEntityById = <T extends { _id?: string }>(items: T[], nextItem: T) => {
  const entityMap = new Map<string, T>()
  items.forEach((item) => {
    const id = String(item?._id || '')
    if (id) entityMap.set(id, item)
  })

  const nextId = String(nextItem?._id || '')
  if (nextId) {
    entityMap.set(nextId, nextItem)
  }

  return Array.from(entityMap.values())
}

const sanitizeProductCreateDraft = (value: unknown): ProductCreateDraft | null => {
  if (!isRecord(value)) return null

  return {
    version: Number(value.version) || 0,
    savedAt: Number(value.savedAt) || 0,
    formData: sanitizeProductFormData(value.formData),
    selectedMainCategoryId: toTrimmedText(value.selectedMainCategoryId),
    selectedCategoryIds: sanitizeStringList(value.selectedCategoryIds),
    currentStep: clampProductCreateStep(value.currentStep),
    specificationKeys: sanitizeStringList(value.specificationKeys),
    metaKeywordInput: toText(value.metaKeywordInput),
    tempAttributeKey: toText(value.tempAttributeKey),
    tempAttributeValue: toText(value.tempAttributeValue),
    variantMetaKeywordInput: toText(value.variantMetaKeywordInput),
  }
}

const ProductCreateForm: React.FC = () => {
  // Redux state (auth)
  const AUTH_TOKEN = useSelector((state: any) => state.auth?.token || '')
  const authUser = useSelector((state: any) => state.auth?.user || null)
  const vendorId = String(authUser?.id || authUser?._id || '')
  const draftStorageKey = vendorId
    ? buildProductCreateDraftStorageKey(vendorId)
    : ''
  const restoredSpecificationKeysRef = useRef<string[] | null>(null)
  const formTopRef = useRef<HTMLDivElement | null>(null)

  // Form state
  const [formData, setFormData] = useState<ProductFormData>(() => createInitialFormData())

  const [mainCategories, setMainCategories] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [cities, setCities] = useState<any[]>([])
  const [isMainCategoryLoading, setIsMainCategoryLoading] = useState(false)
  const [isCategoryLoading, setIsCategoryLoading] = useState(false)
  const [isCityLoading, setIsCityLoading] = useState(false)
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([])
  const [selectedMainCategoryId, setSelectedMainCategoryId] = useState('')
  const [filteredSubcategories, setFilteredSubcategories] = useState<any[]>([])
  const [specificationKeys, setSpecificationKeys] = useState<string[]>(
    SPECIFICATION_TEMPLATES.default
  )
  const [loading, setLoading] = useState(false)
  const [aiLoading, setAiLoading] = useState<any>({
    metaTitle: false,
    metaDescription: false,
    metaKeywords: false,
    specifications: false,
    faqs: false,
  })
  const [currentStep, setCurrentStep] = useState(1)
  const [metaKeywordInput, setMetaKeywordInput] = useState('')
  const [tempAttributeKey, setTempAttributeKey] = useState('')
  const [tempAttributeValue, setTempAttributeValue] = useState('')
  const [variantMetaKeywordInput, setVariantMetaKeywordInput] = useState('')
  const [isDraftHydrated, setIsDraftHydrated] = useState(false)
  const [draftSavedAt, setDraftSavedAt] = useState<number | null>(null)
  const [successDialogOpen, setSuccessDialogOpen] = useState(false)
  const [successDialogMessage, setSuccessDialogMessage] = useState('')

  const resetDraftState = () => {
    restoredSpecificationKeysRef.current = null
    setFormData(createInitialFormData())
    setSelectedMainCategoryId('')
    setSelectedCategoryIds([])
    setCategories([])
    setFilteredSubcategories([])
    setSpecificationKeys(SPECIFICATION_TEMPLATES.default)
    setCurrentStep(1)
    setMetaKeywordInput('')
    setTempAttributeKey('')
    setTempAttributeValue('')
    setVariantMetaKeywordInput('')
  }

  const clearDraftStorage = () => {
    if (!draftStorageKey || typeof window === 'undefined') return
    try {
      window.localStorage.removeItem(draftStorageKey)
    } catch {
      return
    } finally {
      setDraftSavedAt(null)
    }
  }

  useEffect(() => {
    if (!vendorId || !draftStorageKey || typeof window === 'undefined') return

    setIsDraftHydrated(false)

    try {
      const storedDraft = window.localStorage.getItem(draftStorageKey)
      if (!storedDraft) {
        resetDraftState()
        setDraftSavedAt(null)
        return
      }

      const parsedDraft = sanitizeProductCreateDraft(JSON.parse(storedDraft))
      const isInvalidDraft =
        !parsedDraft ||
        parsedDraft.version !== PRODUCT_CREATE_DRAFT_VERSION ||
        !parsedDraft.savedAt ||
        Date.now() - parsedDraft.savedAt > PRODUCT_CREATE_DRAFT_TTL_MS

      if (isInvalidDraft) {
        window.localStorage.removeItem(draftStorageKey)
        resetDraftState()
        setDraftSavedAt(null)
        return
      }

      restoredSpecificationKeysRef.current = parsedDraft.specificationKeys.length
        ? parsedDraft.specificationKeys
        : null

      setFormData(parsedDraft.formData)
      setSelectedMainCategoryId(
        parsedDraft.selectedMainCategoryId || parsedDraft.formData.mainCategory
      )
      setSelectedCategoryIds(
        parsedDraft.selectedCategoryIds.length
          ? parsedDraft.selectedCategoryIds
          : parsedDraft.formData.productCategories
      )
      setCurrentStep(parsedDraft.currentStep)
      setSpecificationKeys(
        parsedDraft.specificationKeys.length
          ? parsedDraft.specificationKeys
          : Object.keys(parsedDraft.formData.specifications?.[0] || {}).length
            ? Object.keys(parsedDraft.formData.specifications[0])
            : SPECIFICATION_TEMPLATES.default
      )
      setMetaKeywordInput(parsedDraft.metaKeywordInput)
      setTempAttributeKey(parsedDraft.tempAttributeKey)
      setTempAttributeValue(parsedDraft.tempAttributeValue)
      setVariantMetaKeywordInput(parsedDraft.variantMetaKeywordInput)
      setDraftSavedAt(parsedDraft.savedAt)
    } catch {
      clearDraftStorage()
      resetDraftState()
    } finally {
      setIsDraftHydrated(true)
    }
  }, [draftStorageKey, vendorId])

  useEffect(() => {
    if (!isDraftHydrated || !vendorId || !draftStorageKey || typeof window === 'undefined') {
      return
    }

    const timeoutId = window.setTimeout(() => {
      const specificationKeysToPersist = Array.from(
        new Set([
          ...sanitizeStringList(specificationKeys),
          ...Object.keys(formData.specifications?.[0] || {})
            .map((key) => toTrimmedText(key))
            .filter(Boolean),
        ])
      )

      const draftToPersist: ProductCreateDraft = {
        version: PRODUCT_CREATE_DRAFT_VERSION,
        savedAt: Date.now(),
        formData: sanitizeProductFormData(formData),
        selectedMainCategoryId: selectedMainCategoryId || formData.mainCategory,
        selectedCategoryIds: selectedCategoryIds.length
          ? selectedCategoryIds
          : sanitizeStringList(formData.productCategories),
        currentStep: clampProductCreateStep(currentStep),
        specificationKeys: specificationKeysToPersist,
        metaKeywordInput,
        tempAttributeKey,
        tempAttributeValue,
        variantMetaKeywordInput,
      }

      try {
        window.localStorage.setItem(draftStorageKey, JSON.stringify(draftToPersist))
        setDraftSavedAt(draftToPersist.savedAt)
      } catch {
        return
      }
    }, 300)

    return () => window.clearTimeout(timeoutId)
  }, [
    currentStep,
    draftStorageKey,
    formData,
    isDraftHydrated,
    metaKeywordInput,
    selectedCategoryIds,
    selectedMainCategoryId,
    specificationKeys,
    tempAttributeKey,
    tempAttributeValue,
    variantMetaKeywordInput,
    vendorId,
  ])

  const lastSavedLabel = useMemo(() => {
    if (!draftSavedAt) return ''

    try {
      return new Intl.DateTimeFormat('en-IN', {
        day: '2-digit',
        month: 'short',
        hour: 'numeric',
        minute: '2-digit',
      }).format(new Date(draftSavedAt))
    } catch {
      return new Date(draftSavedAt).toLocaleString()
    }
  }, [draftSavedAt])

  const goToStep = (stepIndex: number) => {
    setCurrentStep(clampProductCreateStep(stepIndex))

    if (typeof window === 'undefined') return
    window.requestAnimationFrame(() => {
      formTopRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
    })
  }

  useEffect(() => {
    const fetchMainCategories = async () => {
      setIsMainCategoryLoading(true)
      try {
        const res = await fetch(
          `${import.meta.env.VITE_PUBLIC_API_URL}/v1/maincategories/getall`
        )
        if (!res.ok) throw new Error('Failed to fetch main categories')
        const json = await res.json()
        setMainCategories(Array.isArray(json?.data) ? json.data : [])
      } catch (err) {
        setMainCategories([])
      } finally {
        setIsMainCategoryLoading(false)
      }
    }

    fetchMainCategories()
  }, [])

  const loadCities = useCallback(async () => {
    setIsCityLoading(true)
    try {
      const res = await fetch(
        `${import.meta.env.VITE_PUBLIC_API_URL}/v1/cities?includeInactive=false`,
        {
          headers: AUTH_TOKEN
            ? {
                Authorization: `Bearer ${AUTH_TOKEN}`,
              }
            : undefined,
        }
      )
      if (!res.ok) throw new Error('Failed to fetch cities')
      const json = await res.json()
      const nextCities = Array.isArray(json?.data) ? json.data : []
      setCities(nextCities)
      return nextCities
    } catch {
      setCities([])
      return []
    } finally {
      setIsCityLoading(false)
    }
  }, [AUTH_TOKEN])

  useEffect(() => {
    loadCities()
  }, [loadCities])

  useEffect(() => {
    if (!isDraftHydrated) return

    const validCityIds = new Set(
      cities
        .map((city: any) => String(city?._id || '').trim())
        .filter(Boolean)
    )

    setFormData((prev: ProductFormData) => {
      const filteredCities = (prev.availableCities || []).filter((cityId) =>
        validCityIds.has(String(cityId || '').trim())
      )

      if (filteredCities.length === (prev.availableCities || []).length) {
        return prev
      }

      return {
        ...prev,
        availableCities: filteredCities,
      }
    })
  }, [cities, isDraftHydrated])

  useEffect(() => {
    if (!isDraftHydrated) return
    if (!selectedMainCategoryId) {
      setCategories([])
      setSelectedCategoryIds([])
      setFilteredSubcategories([])
      return
    }

    const fetchCategories = async () => {
      setIsCategoryLoading(true)
      try {
        const params = new URLSearchParams({
          main_category_id: selectedMainCategoryId,
          level: 'category',
          limit: '500',
        })

        const res = await fetch(
          `${import.meta.env.VITE_PUBLIC_API_URL}/v1/categories/getall?${params.toString()}`
        )

        if (!res.ok) throw new Error('Failed to fetch categories')
        const json = await res.json()
        setCategories(Array.isArray(json?.data) ? json.data : [])
      } catch (err) {
        setCategories([])
      } finally {
        setIsCategoryLoading(false)
      }
    }

    fetchCategories()
  }, [isDraftHydrated, selectedMainCategoryId])

  useEffect(() => {
    if (!isDraftHydrated) return
    if (!selectedCategoryIds.length) {
      setFilteredSubcategories([])
      return
    }

    const fetchSubcategories = async () => {
      try {
        const responses = await Promise.all(
          selectedCategoryIds.map((categoryId) =>
            fetch(
              `${import.meta.env.VITE_PUBLIC_API_URL}/v1/subcategories/category/${categoryId}`
            )
          )
        )

        const categoryNameById = categories.reduce(
          (acc: Record<string, string>, category: any) => {
            acc[category._id] = category.name
            return acc
          },
          {}
        )

        const merged: any[] = []
        for (let index = 0; index < responses.length; index += 1) {
          const response = responses[index]
          if (!response.ok) continue

          const json = await response.json()
          if (!json?.success || !Array.isArray(json.data)) continue

          const categoryId = selectedCategoryIds[index]
          const categoryName = categoryNameById[categoryId] || 'Unknown Category'

          merged.push(
            ...json.data.map((subcategory: any) => ({
              ...subcategory,
              categoryName,
            }))
          )
        }

        const unique = Array.from(
          new Map(merged.map((subcategory) => [subcategory._id, subcategory])).values()
        )
        setFilteredSubcategories(unique)
      } catch (err) {
        setFilteredSubcategories([])
      }
    }

    fetchSubcategories()
  }, [categories, isDraftHydrated, selectedCategoryIds])

  const handleCreateMainCategory = async (name: string) => {
    const trimmedName = name.trim()
    if (!trimmedName) {
      throw new Error('Main category name is required.')
    }
    if (!AUTH_TOKEN) {
      throw new Error('Your session has expired. Please login again.')
    }

    const response = await fetch(
      `${import.meta.env.VITE_PUBLIC_API_URL}/v1/maincategories/create`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${AUTH_TOKEN}`,
        },
        body: JSON.stringify({ name: trimmedName }),
      }
    )

    const payload = await response.json().catch(() => null)
    if (!response.ok || payload?.success === false || !payload?.data?._id) {
      throw new Error(payload?.message || 'Failed to create main category.')
    }

    const created = payload.data
    setMainCategories((prev) => sortEntitiesByName(mergeEntityById(prev, created)))
    setSelectedMainCategoryId(created._id)
    setSelectedCategoryIds([])
    setCategories([])
    setFilteredSubcategories([])
    setFormData((prev: ProductFormData) => ({
      ...prev,
      mainCategory: created._id,
      productCategory: '',
      productCategories: [],
      productSubCategories: [],
    }))
  }

  const handleCreateCategory = async (name: string) => {
    const trimmedName = name.trim()
    if (!trimmedName) {
      throw new Error('Category name is required.')
    }
    if (!selectedMainCategoryId) {
      throw new Error('Select a main category first.')
    }
    if (!AUTH_TOKEN) {
      throw new Error('Your session has expired. Please login again.')
    }

    const selectedMainCategory = mainCategories.find(
      (category: any) => String(category?._id) === String(selectedMainCategoryId)
    )

    const response = await fetch(
      `${import.meta.env.VITE_PUBLIC_API_URL}/v1/categories/create`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${AUTH_TOKEN}`,
        },
        body: JSON.stringify({
          name: trimmedName,
          main_category_id: selectedMainCategoryId,
          main_category_name: selectedMainCategory?.name || '',
        }),
      }
    )

    const payload = await response.json().catch(() => null)
    if (!response.ok || payload?.success === false || !payload?.data?._id) {
      throw new Error(payload?.message || 'Failed to create category.')
    }

    const created = payload.data
    setCategories((prev) => sortEntitiesByName(mergeEntityById(prev, created)))
    setSelectedCategoryIds((prev) =>
      prev.includes(created._id) ? prev : [...prev, created._id]
    )
    setFormData((prev: ProductFormData) => {
      const nextCategoryIds = prev.productCategories.includes(created._id)
        ? prev.productCategories
        : [...prev.productCategories, created._id]

      return {
        ...prev,
        productCategory: nextCategoryIds[0] || '',
        productCategories: nextCategoryIds,
      }
    })
  }

  const handleCreateSubcategory = async ({
    name,
    categoryId,
  }: {
    name: string
    categoryId: string
  }) => {
    const trimmedName = name.trim()
    if (!trimmedName) {
      throw new Error('Subcategory name is required.')
    }
    if (!categoryId) {
      throw new Error('Choose a category first.')
    }
    if (!AUTH_TOKEN) {
      throw new Error('Your session has expired. Please login again.')
    }

    const parentCategory = categories.find(
      (category: any) => String(category?._id) === String(categoryId)
    )
    if (!parentCategory?._id) {
      throw new Error('Selected category was not found.')
    }

    const selectedMainCategory = mainCategories.find(
      (category: any) => String(category?._id) === String(selectedMainCategoryId)
    )

    const response = await fetch(
      `${import.meta.env.VITE_PUBLIC_API_URL}/v1/subcategories/create`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${AUTH_TOKEN}`,
        },
        body: JSON.stringify({
          name: trimmedName,
          category_id: parentCategory._id,
          category_name: parentCategory.name,
          main_category_id: selectedMainCategoryId,
          main_category_name: selectedMainCategory?.name || '',
        }),
      }
    )

    const payload = await response.json().catch(() => null)
    if (!response.ok || payload?.success === false || !payload?.data?._id) {
      throw new Error(payload?.message || 'Failed to create subcategory.')
    }

    const created = {
      ...payload.data,
      categoryName: parentCategory.name,
    }

    setFilteredSubcategories((prev) =>
      sortEntitiesByName(mergeEntityById(prev, created))
    )
    setFormData((prev: ProductFormData) => ({
      ...prev,
      productSubCategories: prev.productSubCategories.includes(created._id)
        ? prev.productSubCategories
        : [...prev.productSubCategories, created._id],
    }))
  }

  const discoverStateCities = useCallback(
    async (state: string, country: string) => {
      const safeState = String(state || '').trim()
      const safeCountry = String(country || '').trim() || 'India'

      if (!safeState) return []
      if (!AUTH_TOKEN) {
        throw new Error('Your session has expired. Please login again.')
      }

      const response = await fetch(
        `${import.meta.env.VITE_PUBLIC_API_URL}/v1/cities/discover?state=${encodeURIComponent(
          safeState
        )}&country=${encodeURIComponent(safeCountry)}`,
        {
          headers: {
            Authorization: `Bearer ${AUTH_TOKEN}`,
          },
        }
      )

      const payload = await response.json().catch(() => null)
      if (!response.ok || payload?.success === false) {
        throw new Error(payload?.message || 'Failed to fetch cities for selected state.')
      }

      return Array.isArray(payload?.cities)
        ? payload.cities
            .map((city: unknown) => String(city || '').trim())
            .filter(Boolean)
        : []
    },
    [AUTH_TOKEN]
  )

  const handleCreateCities = useCallback(
    async ({
      name,
      state,
      country,
      cities: cityNames,
    }: {
      name: string
      state: string
      country: string
      cities: string[]
    }) => {
      const trimmedName = String(name || '').trim()
      const safeState = String(state || '').trim()
      const safeCountry = String(country || '').trim() || 'India'
      const normalizedCityNames = Array.from(
        new Set(
          (Array.isArray(cityNames) ? cityNames : [])
            .map((cityName) => String(cityName || '').trim())
            .filter(Boolean)
        )
      )

      if (!AUTH_TOKEN) {
        throw new Error('Your session has expired. Please login again.')
      }
      if (!trimmedName && !normalizedCityNames.length) {
        throw new Error('City name is required.')
      }

      const endpoint = normalizedCityNames.length
        ? `${import.meta.env.VITE_PUBLIC_API_URL}/v1/cities/bulk`
        : `${import.meta.env.VITE_PUBLIC_API_URL}/v1/cities`
      const requestBody = normalizedCityNames.length
        ? {
            state: safeState,
            country: safeCountry,
            isActive: true,
            cities: normalizedCityNames,
          }
        : {
            name: trimmedName,
            state: safeState,
            country: safeCountry,
            isActive: true,
          }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${AUTH_TOKEN}`,
        },
        body: JSON.stringify(requestBody),
      })

      const payload = await response.json().catch(() => null)
      if (!response.ok || payload?.success === false) {
        throw new Error(payload?.message || 'Failed to create city.')
      }

      const latestCities = await loadCities()
      const explicitCityIds = new Set<string>()

      const collectEntityId = (entity: any) => {
        const id = String(entity?._id || '').trim()
        if (id) explicitCityIds.add(id)
      }

      collectEntityId(payload?.data)
      ;(Array.isArray(payload?.created) ? payload.created : []).forEach(collectEntityId)
      ;(Array.isArray(payload?.added) ? payload.added : []).forEach(collectEntityId)

      const targetNames = new Set(
        (normalizedCityNames.length ? normalizedCityNames : [trimmedName])
          .map((cityName) => String(cityName || '').trim().toLowerCase())
          .filter(Boolean)
      )
      const normalizedState = safeState.toLowerCase()
      const normalizedCountry = safeCountry.toLowerCase()

      latestCities.forEach((city: any) => {
        const cityId = String(city?._id || '').trim()
        const cityName = String(city?.name || '').trim().toLowerCase()
        const cityState = String(city?.state || '').trim().toLowerCase()
        const cityCountry = String(city?.country || '').trim().toLowerCase()

        if (!cityId || !targetNames.has(cityName)) return
        if (normalizedState && cityState && cityState !== normalizedState) return
        if (normalizedCountry && cityCountry && cityCountry !== normalizedCountry) return

        explicitCityIds.add(cityId)
      })

      return {
        message: String(payload?.message || '').trim(),
        cityIds: Array.from(explicitCityIds),
      }
    },
    [AUTH_TOKEN, loadCities]
  )

  useEffect(() => {
    const applySpecificationKeys = (keys: string[]) => {
      setSpecificationKeys(keys)
      setFormData((prev: ProductFormData) => {
        const existing = prev.specifications?.[0] || {}
        const nextSpecs: Record<string, string> = {}
        keys.forEach((key: string) => {
          nextSpecs[key] = existing[key] || ''
        })
        return { ...prev, specifications: [nextSpecs] }
      })
    }

    if (!isDraftHydrated) return

    if (!selectedMainCategoryId) {
      restoredSpecificationKeysRef.current = null
      applySpecificationKeys(SPECIFICATION_TEMPLATES.default)
      return
    }

    const fetchSpecificationKeys = async () => {
      try {
        const res = await fetch(
          `${import.meta.env.VITE_PUBLIC_API_URL}/v1/specification-keys/main-category/${selectedMainCategoryId}`
        )

        if (!res.ok) throw new Error('Failed to fetch specification keys')
        const json = await res.json()
        const apiKeys = Array.isArray(json?.data?.keys) ? json.data.keys : []
        const nextKeys = apiKeys.length ? apiKeys : SPECIFICATION_TEMPLATES.default
        const restoredSpecificationKeys = restoredSpecificationKeysRef.current
        const mergedKeys = restoredSpecificationKeys?.length
          ? Array.from(new Set([...nextKeys, ...restoredSpecificationKeys]))
          : nextKeys

        applySpecificationKeys(mergedKeys)
      } catch (err) {
        const restoredSpecificationKeys = restoredSpecificationKeysRef.current
        const fallbackKeys = restoredSpecificationKeys?.length
          ? Array.from(
              new Set([
                ...SPECIFICATION_TEMPLATES.default,
                ...restoredSpecificationKeys,
              ])
            )
          : SPECIFICATION_TEMPLATES.default

        applySpecificationKeys(fallbackKeys)
      } finally {
        restoredSpecificationKeysRef.current = null
      }
    }

    fetchSpecificationKeys()
  }, [isDraftHydrated, selectedMainCategoryId])

  // --- AI Handlers for Variants ---
  const handleGenerateVariantMetaTitle = async (vIndex: number) => {
    const variant = formData.variants[vIndex]
    const attrText = Object.entries(variant.variantAttributes)
      .map(([k, v]) => `${k}: ${v}`)
      .join(', ')
    const context = `Product: ${formData.productName}, Brand: ${formData.brand}, Attributes: ${attrText}`

    setAiLoading((prev: any) => ({ ...prev, [`variantMetaTitle_${vIndex}`]: true }))

    try {
      const res = await fetch(
        `${import.meta.env.VITE_PUBLIC_API_URL}/v1/products/generate-field`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ field: 'metaTitle', context }),
        }
      )
      const data = await res.json()
      if (data.success) {
        setFormData((prev: ProductFormData) => {
          const newVariants = [...prev.variants]
          newVariants[vIndex].variantMetaTitle = data.data
          return { ...prev, variants: newVariants }
        })
      }
    } catch (err) {
      toast.error('AI generation failed')
    } finally {
      setAiLoading((prev: any) => ({
        ...prev,
        [`variantMetaTitle_${vIndex}`]: false,
      }))
    }
  }

  const handleGenerateVariantMetaDescription = async (vIndex: number) => {
    const variant = formData.variants[vIndex]
    const attrText = Object.entries(variant.variantAttributes)
      .map(([k, v]) => `${k}: ${v}`)
      .join(', ')
    const context = `Product: ${formData.productName}, Brand: ${formData.brand}, Attributes: ${attrText}, Short: ${formData.shortDescription}`

    setAiLoading((prev: any) => ({
      ...prev,
      [`variantMetaDescription_${vIndex}`]: true,
    }))

    try {
      const res = await fetch(
        `${import.meta.env.VITE_PUBLIC_API_URL}/v1/products/generate-field`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ field: 'metaDescription', context }),
        }
      )
      const data = await res.json()
      if (data.success) {
        setFormData((prev: ProductFormData) => {
          const newVariants = [...prev.variants]
          newVariants[vIndex].variantMetaDescription = data.data
          return { ...prev, variants: newVariants }
        })
      }
    } catch (err) {
      toast.error('AI generation failed')
    } finally {
      setAiLoading((prev: any) => ({
        ...prev,
        [`variantMetaDescription_${vIndex}`]: false,
      }))
    }
  }

  const handleGenerateVariantMetaKeywords = async (vIndex: number) => {
    const variant = formData.variants[vIndex]
    const attrText = Object.entries(variant.variantAttributes)
      .map(([k, v]) => `${k}: ${v}`)
      .join(', ')
    const context = `Product: ${formData.productName}, Brand: ${formData.brand}, Attributes: ${attrText}, Short: ${formData.shortDescription}`

    setAiLoading((prev: any) => ({
      ...prev,
      [`variantMetaKeywords_${vIndex}`]: true,
    }))

    try {
      const res = await fetch(
        `${import.meta.env.VITE_PUBLIC_API_URL}/v1/products/generate-field`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ field: 'metaKeywords', context }),
        }
      )
      const data = await res.json()
      if (data.success && typeof data.data === 'string') {
        const keywords = data.data.split(',').map((k: string) => k.trim()).filter(Boolean)
        setFormData((prev: ProductFormData) => {
          const newVariants = [...prev.variants]
          newVariants[vIndex].variantMetaKeywords = [
            ...newVariants[vIndex].variantMetaKeywords,
            ...keywords
          ]
          return { ...prev, variants: newVariants }
        })
      }
    } catch (err) {
      toast.error('AI generation failed')
    } finally {
      setAiLoading((prev: any) => ({
        ...prev,
        [`variantMetaKeywords_${vIndex}`]: false,
      }))
    }
  }

  // --- AI Handlers ---
  const generateShortDesc = () =>
    generateWithAI(
      'shortDescription',
      `Product: ${formData.productName}, Brand: ${formData.brand}`,
      setAiLoading,
      setFormData
    )

  const generateDescription = () =>
    generateWithAI(
      'description',
      `Product: ${formData.productName}, Brand: ${formData.brand}, Short: ${formData.shortDescription}`,
      setAiLoading,
      setFormData
    )



  // --- Variant Handlers ---
  // --- Variant Handlers ---

  // Auto-scroll to new variant
  // Auto-scroll to new variant

  useEffect(() => {
    if (formData.variants.length > 0) {
      // Find the last variant element using a predictable ID or class is tricky inside the mapped component without refs on each.
      // Easiest is to scroll window to bottom if variants are at the bottom, or attempt to scroll to the newly added item.
      // Since Step5Variants renders the list, let's just scroll to bottom of window for now as the "Add Variant" button is usually there or near.
      // A better way: Step5Variants should forward a ref or we simulate scroll.

      // Let's assume we want to scroll to the bottom of the page when a new variant is added
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })
    }
  }, [formData.variants.length])

  const handleAddVariant = () => {
    setFormData((prev: ProductFormData) => ({
      ...prev,
      variants: [
        ...prev.variants,
        {
          variantAttributes: {},
          actualPrice: 0,
          finalPrice: 0,
          stockQuantity: 0,
          variantsImageUrls: [],
          variantMetaTitle: '',
          variantMetaDescription: '',
          variantMetaKeywords: [],
          isActive: true,
        },
      ],
    }))
  }

  const handleRemoveVariant = (index: number) => {
    const newVariants = [...formData.variants]
    newVariants.splice(index, 1)
    setFormData((prev: ProductFormData) => ({ ...prev, variants: newVariants }))
  }

  const handleVariantFieldChange = (
    index: number,
    field: keyof Variant,
    value: any
  ) => {
    const newVariants = [...formData.variants]
    newVariants[index] = { ...newVariants[index], [field]: value }
    setFormData((prev: ProductFormData) => ({ ...prev, variants: newVariants }))
  }

  const uploadVariantFiles = async (variantIndex: number, files: File[]) => {
    const imageFiles = files.filter((file) => file.type.startsWith('image/'))
    if (!imageFiles.length) return

    const tempImages = imageFiles.map((file, idx) => ({
      url: URL.createObjectURL(file),
      publicId: '',
      uploading: true,
      tempId: `upload-${variantIndex}-${Date.now()}-${idx}`,
    }))

    setFormData((prev: ProductFormData) => {
      const variants = [...prev.variants]
      variants[variantIndex] = {
        ...variants[variantIndex],
        variantsImageUrls: [
          ...variants[variantIndex].variantsImageUrls,
          ...tempImages,
        ],
      }
      return { ...prev, variants }
    })

    for (let i = 0; i < imageFiles.length; i++) {
      const result = await uploadToCloudinary(imageFiles[i])
      if (!result) continue

      setFormData((prev: ProductFormData) => {
        const variants = [...prev.variants]
        const images = [...variants[variantIndex].variantsImageUrls]

        const idx = images.findIndex(
          (img) => img.tempId === tempImages[i].tempId
        )

        if (idx !== -1) {
          images[idx] = {
            url: result.url,
            publicId: result.publicId,
            uploading: false,
          }
        }

        variants[variantIndex] = {
          ...variants[variantIndex],
          variantsImageUrls: images,
        }

        return { ...prev, variants }
      })
    }
  }

  const handleVariantImageUpload = async (
    variantIndex: number,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = Array.from(e.target.files || [])
    if (!files.length) return

    e.target.value = '' // prevent reselect bug
    await uploadVariantFiles(variantIndex, files)
  }

  const handleVariantImageDrop = async (variantIndex: number, files: File[]) => {
    await uploadVariantFiles(variantIndex, files)
  }

  const handleVariantImageDelete = async (
    variantIndex: number,
    imageIndex: number
  ) => {
    const publicId =
      formData.variants[variantIndex].variantsImageUrls[imageIndex]?.publicId
    if (publicId) {
      await deleteFromCloudinary(publicId)
    }
    const newVariants = [...formData.variants]
    newVariants[variantIndex].variantsImageUrls.splice(imageIndex, 1)
    setFormData((prev: ProductFormData) => ({ ...prev, variants: newVariants }))
  }

  const addAttributeToVariant = (vIndex: number) => {
    if (!tempAttributeKey.trim() || !tempAttributeValue.trim()) return
    setFormData((prev: ProductFormData) => {
      const variants = [...prev.variants]
      variants[vIndex].variantAttributes[tempAttributeKey.trim()] =
        tempAttributeValue.trim()
      return { ...prev, variants }
    })
    setTempAttributeKey('')
    setTempAttributeValue('')
  }

  const removeAttributeFromVariant = (vIndex: number, key: string) => {
    setFormData((prev: ProductFormData) => {
      const variants = [...prev.variants]
      delete variants[vIndex].variantAttributes[key]
      return { ...prev, variants }
    })
  }

  const addMetaKeywordToVariant = (vIndex: number) => {
    if (!variantMetaKeywordInput.trim()) return
    setFormData((prev: ProductFormData) => {
      const variants = [...prev.variants]
      variants[vIndex].variantMetaKeywords.push(variantMetaKeywordInput.trim())
      return { ...prev, variants }
    })
    setVariantMetaKeywordInput('')
  }

  const removeMetaKeywordFromVariant = (vIndex: number, kwIndex: number) => {
    setFormData((prev: ProductFormData) => {
      const variants = [...prev.variants]
      variants[vIndex].variantMetaKeywords.splice(kwIndex, 1)
      return { ...prev, variants }
    })
  }

  // --- FAQ Handlers ---
  const handleAddFAQ = () => {
    setFormData((prev: ProductFormData) => ({
      ...prev,
      faqs: [...prev.faqs, { question: '', answer: '' }],
    }))
  }

  const handleRemoveFAQ = (index: number) => {
    const newFaqs = [...formData.faqs]
    newFaqs.splice(index, 1)
    setFormData((prev: ProductFormData) => ({ ...prev, faqs: newFaqs }))
  }

  const handleFAQChange = (
    index: number,
    field: 'question' | 'answer',
    value: string
  ) => {
    const newFaqs = [...formData.faqs]
    newFaqs[index] = { ...newFaqs[index], [field]: value }
    setFormData((prev: ProductFormData) => ({ ...prev, faqs: newFaqs }))
  }

  // --- Submit Handler ---
  const handleSubmit = async (e?: React.FormEvent | React.MouseEvent) => {
    if (e) e.preventDefault()

    setLoading(true)
    try {
      // Validate specifications format
      if (
        !formData.specifications[0] ||
        typeof formData.specifications[0] !== 'object' ||
        Array.isArray(formData.specifications[0])
      ) {
        toast.error(
          'Invalid specifications format detected. Open the Specifications step and generate or fix the fields first.'
        )
        goToStep(2)
        return
      }

      if (!Array.isArray(formData.availableCities) || formData.availableCities.length === 0) {
        toast.error('Please select at least one city in Basic Information.')
        goToStep(1)
        return
      }

      const payload = {
        ...formData,
        mainCategory: selectedMainCategoryId || formData.mainCategory,
        productCategory: selectedCategoryIds[0] || '',
        productCategories: selectedCategoryIds,
        availableCities: formData.availableCities,
        specifications: formData.specifications[0],
        variants: formData.variants.map((v) => ({
          ...v,
          actualPrice: !v.actualPrice ? 0 : Number(v.actualPrice),
          finalPrice: !v.finalPrice ? 0 : Number(v.finalPrice),
          stockQuantity: !v.stockQuantity ? 0 : Number(v.stockQuantity),
        })),
      }

      const res = await fetch(
        `${import.meta.env.VITE_PUBLIC_API_URL}/v1/products/create`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${AUTH_TOKEN}`,
          },
          body: JSON.stringify(payload),
        }
      )

      let responseBody: any = null
      try {
        responseBody = await res.json()
      } catch {
        responseBody = null
      }

      if (!res.ok || responseBody?.success === false) {
        const backendMessage =
          responseBody?.message ||
          responseBody?.error ||
          (Array.isArray(responseBody?.errors) && responseBody.errors[0]?.message) ||
          `Failed to create product (HTTP ${res.status})`
        throw new Error(String(backendMessage))
      }

      const nextSuccessMessage =
        responseBody?.message || 'Product created successfully!'
      clearDraftStorage()
      resetDraftState()
      goToStep(1)
      setSuccessDialogMessage(nextSuccessMessage)
      setSuccessDialogOpen(true)
    } catch (err: any) {
      toast.error(err?.message || 'Failed to create product')
    } finally {
      setLoading(false)
    }
  }

  // --- Render Current Step ---
  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <Step1BasicInfo
            formData={formData}
            setFormData={setFormData}
            mainCategories={mainCategories}
            selectedMainCategoryId={selectedMainCategoryId}
            setSelectedMainCategoryId={setSelectedMainCategoryId}
            categories={categories}
            selectedCategoryIds={selectedCategoryIds}
            setSelectedCategoryIds={setSelectedCategoryIds}
            cities={cities}
            filteredSubcategories={filteredSubcategories}
            isMainCategoryLoading={isMainCategoryLoading}
            isCategoryLoading={isCategoryLoading}
            isCityLoading={isCityLoading}
            aiLoading={aiLoading}
            generateWithAI={generateShortDesc}
            generateDescription={generateDescription}
            onCreateMainCategory={handleCreateMainCategory}
            onCreateCategory={handleCreateCategory}
            onCreateSubcategory={handleCreateSubcategory}
            onDiscoverStateCities={discoverStateCities}
            onCreateCities={handleCreateCities}
          />
        )
      case 2:
        return (
          <>
            <Step3Specifications
              specificationKeys={specificationKeys}
              specifications={formData.specifications}
              isAvailable={formData.isAvailable}
              aiLoading={aiLoading.specifications}
              onToggleAvailable={() =>
                setFormData((prev: ProductFormData) => ({
                  ...prev,
                  isAvailable: !prev.isAvailable,
                }))
              }
              onSpecChange={(key, val) => {
                const specs = [...formData.specifications]
                specs[0] = { ...specs[0], [key]: val }
                setFormData((prev: ProductFormData) => ({ ...prev, specifications: specs }))
              }}
              onGenerate={() =>
                generateSpecifications(
                  formData,
                  selectedCategoryIds,
                  categories,
                  specificationKeys,
                  setAiLoading,
                  setFormData
                )
              }
              onAddKey={(newKey) => {
                if (!specificationKeys.includes(newKey)) {
                  setSpecificationKeys((prev: string[]) => [...prev, newKey]);
                  // Also ensure the new key is in formData with empty value to avoid undefined issues
                  setFormData((prev: ProductFormData) => {
                    const specs = [...prev.specifications]
                    if (!specs[0]) specs[0] = {}
                    specs[0] = { ...specs[0], [newKey]: '' }
                    return { ...prev, specifications: specs }
                  })
                }
              }}
            />
            <div className="mt-8">
              <Step5Variants
                variants={formData.variants}
                tempAttributeKey={tempAttributeKey}
                tempAttributeValue={tempAttributeValue}
                metaKeywordInput={variantMetaKeywordInput}
                onTempAttributeKeyChange={setTempAttributeKey}
                onTempAttributeValueChange={setTempAttributeValue}
                onMetaKeywordInputChange={setVariantMetaKeywordInput}
                onAddVariant={handleAddVariant}
                onRemoveVariant={handleRemoveVariant}
                onAddAttributeToVariant={addAttributeToVariant}
                onRemoveAttributeFromVariant={removeAttributeFromVariant}
                onVariantFieldChange={handleVariantFieldChange}
                onVariantImageUpload={handleVariantImageUpload}
                onVariantImageDrop={handleVariantImageDrop}
                onVariantImageDelete={handleVariantImageDelete}
                onAddMetaKeywordToVariant={addMetaKeywordToVariant}
                onRemoveMetaKeywordFromVariant={removeMetaKeywordFromVariant}
                aiLoading={aiLoading}
                onGenerateVariantMetaTitle={handleGenerateVariantMetaTitle}
                onGenerateVariantMetaDescription={
                  handleGenerateVariantMetaDescription
                }
                onGenerateVariantMetaKeywords={handleGenerateVariantMetaKeywords}
              />
            </div>
          </>
        )
      case 3:
        return (
          <>
            <Step4SEO
              metaTitle={formData.metaTitle}
              metaDescription={formData.metaDescription}
              metaKeywords={formData.metaKeywords}
              metaKeywordInput={metaKeywordInput}
              aiLoading={aiLoading}
              onMetaTitleChange={(val) =>
                setFormData((prev: ProductFormData) => ({ ...prev, metaTitle: val }))
              }
              onMetaDescChange={(val) =>
                setFormData((prev: ProductFormData) => ({ ...prev, metaDescription: val }))
              }
              onKeywordInputChange={setMetaKeywordInput}
              onAddKeyword={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  if (metaKeywordInput.trim()) {
                    setFormData((prev: ProductFormData) => ({
                      ...prev,
                      metaKeywords: [
                        ...prev.metaKeywords,
                        metaKeywordInput.trim(),
                      ],
                    }))
                    setMetaKeywordInput('')
                  }
                }
              }}
              onRemoveKeyword={(index) => {
                setFormData((prev: ProductFormData) => ({
                  ...prev,
                  metaKeywords: prev.metaKeywords.filter((_, i) => i !== index),
                }))
              }}
              onGenerateTitle={() =>
                generateWithAI(
                  'metaTitle',
                  `Product: ${formData.productName}`,
                  setAiLoading,
                  setFormData
                )
              }
              onGenerateDesc={() =>
                generateWithAI(
                  'metaDescription',
                  `Product: ${formData.productName}, ${formData.shortDescription}`,
                  setAiLoading,
                  setFormData
                )
              }
              onGenerateKeywords={async () => {
                setAiLoading((prev: any) => ({ ...prev, metaKeywords: true }))
                try {
                  const res = await fetch(
                    `${import.meta.env.VITE_PUBLIC_API_URL}/v1/products/generate-field`,
                    {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        field: 'metaKeywords',
                        context: `Product: ${formData.productName}, Description: ${formData.shortDescription}, Categories: ${categories
                          .filter((category: any) =>
                            selectedCategoryIds.includes(category._id)
                          )
                          .map((category: any) => category.name)
                          .join(', ')}`
                      }),
                    }
                  )
                  const data = await res.json()
                  if (data.success && typeof data.data === 'string') {
                    const keywords = data.data.split(',').map((k: string) => k.trim()).filter(Boolean)
                    setFormData((prev: ProductFormData) => ({
                      ...prev,
                      metaKeywords: [...prev.metaKeywords, ...keywords],
                    }))
                  }
                } catch (err) {
                  toast.error('AI generation failed')
                } finally {
                  setAiLoading((prev: any) => ({ ...prev, metaKeywords: false }))
                }
              }}
            />
            <div className="mt-8">
              <Step6FAQs
                faqs={formData.faqs}
                onFAQChange={handleFAQChange}
                onAddFAQ={handleAddFAQ}
                onRemoveFAQ={handleRemoveFAQ}
                aiLoading={aiLoading.faqs}
                onGenerate={async () => {
                  setAiLoading((prev: any) => ({ ...prev, faqs: true }))
                  try {
                    const context = `Product: ${formData.productName}, Description: ${formData.shortDescription}, Specifications: ${Object.entries(formData.specifications[0]).map(([k, v]) => `${k}: ${v}`).join(', ')}`
                    const res = await fetch(
                      `${import.meta.env.VITE_PUBLIC_API_URL}/v1/products/generate-field`,
                      {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ field: 'faqs', context }),
                      }
                    )
                    const data = await res.json()
                    if (data.success && typeof data.data === 'string') {
                      // Try to parse the JSON array
                      try {
                        const generatedFaqs = JSON.parse(data.data.replace(/```json/g, '').replace(/```/g, '').trim())
                        if (Array.isArray(generatedFaqs)) {
                          setFormData((prev: ProductFormData) => ({
                            ...prev,
                            faqs: [...prev.faqs, ...generatedFaqs.map((f: any) => ({ question: f.question, answer: f.answer }))]
                          }))
                        }
                      } catch (e) {
                        console.error('Failed to parse FAQ JSON', e)
                      }
                    }
                  } catch (err) {
                    toast.error('AI generation failed')
                  } finally {
                    setAiLoading((prev: any) => ({ ...prev, faqs: false }))
                  }
                }}
              />
            </div>
          </>
        )
      default:
        return null
    }
  }

  const steps = [
    {
      title: 'Basics',
      description: 'Identity and category mapping',
    },
    {
      title: 'Specs & Variants',
      description: 'Technical details and sellable options',
    },
    {
      title: 'SEO & FAQs',
      description: 'Search visibility and buyer guidance',
    },
  ]

  return (
    <div className='relative min-h-screen overflow-x-clip px-4 py-6 sm:py-8'>
      <div className='pointer-events-none absolute inset-0 -z-10 overflow-hidden'>
        <div className='absolute -left-24 -top-24 h-72 w-72 rounded-full bg-cyan-300/20 blur-3xl' />
        <div className='absolute -right-24 top-10 h-96 w-96 rounded-full bg-amber-300/20 blur-3xl' />
        <div className='absolute bottom-[-8rem] left-1/3 h-80 w-80 rounded-full bg-indigo-300/15 blur-3xl' />
      </div>

      <div className='mx-auto max-w-5xl space-y-5'>
        <section className='rounded-3xl border border-cyan-200/70 bg-gradient-to-br from-cyan-50/80 via-white to-indigo-50/70 p-6 shadow-[0_18px_45px_-30px_rgba(15,23,42,0.6)]'>
          <div className='flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between'>
            <div>
              <div className='mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-white/85 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-700'>
                <Sparkles className='h-3.5 w-3.5' />
                Product Studio
              </div>
              <h1 className='text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl'>
                Create New Product
              </h1>
              <p className='mt-1 text-sm text-slate-600 sm:text-base'>
                Build category-ready products with structured specs, variants, and
                SEO details.
              </p>
            </div>
            <div className='flex flex-wrap items-center gap-2'>
              <Badge className='border border-cyan-200 bg-cyan-100/70 text-cyan-800'>
                Step {currentStep} / {steps.length}
              </Badge>
              <Badge className='border border-slate-200 bg-white text-slate-700'>
                Draft Mode
              </Badge>
              <Badge className='border border-emerald-200 bg-emerald-100/70 text-emerald-800'>
                Autosaved Locally
              </Badge>
              {lastSavedLabel ? (
                <span className='text-xs font-medium text-slate-500'>
                  Saved {lastSavedLabel}
                </span>
              ) : null}
              <Button
                type='button'
                variant='outline'
                onClick={() => {
                  if (
                    typeof window !== 'undefined' &&
                    !window.confirm('Clear the saved product draft for this vendor?')
                  ) {
                    return
                  }
                  clearDraftStorage()
                  resetDraftState()
                }}
                className='h-9 rounded-full border-slate-300 bg-white px-4 text-slate-700 hover:bg-slate-50'
              >
                Reset Draft
              </Button>
            </div>
          </div>
        </section>

        <div
          ref={formTopRef}
          className='rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm backdrop-blur-sm sm:p-8'
        >
          <Link to='/upload-products'>
            <Button
              variant='outline'
              className='mb-8 h-11 rounded-xl border-slate-300 bg-white px-4 font-semibold text-slate-700 hover:bg-slate-50'
            >
              <PackagePlus className='mr-2 h-4 w-4' />
              Upload Excel or Download Template
            </Button>
          </Link>

          <div className='mb-8 grid gap-3 md:grid-cols-3'>
            {steps.map((step, i) => {
              const stepIndex = i + 1
              const isActive = currentStep === stepIndex
              const isCompleted = currentStep > stepIndex

              return (
                <button
                  key={step.title}
                  type='button'
                  onClick={() => goToStep(stepIndex)}
                  aria-current={isActive ? 'step' : undefined}
                  className={`rounded-2xl border p-4 transition ${
                    isActive
                      ? 'border-cyan-300 bg-cyan-50/70 shadow-sm'
                      : isCompleted
                        ? 'border-emerald-300 bg-emerald-50/70'
                        : 'border-slate-200 bg-slate-50/70'
                  } cursor-pointer text-left hover:border-cyan-300 hover:bg-cyan-50/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400`}
                >
                  <div className='flex items-start gap-3'>
                    <div
                      className={`mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                        isActive
                          ? 'bg-cyan-600 text-white'
                          : isCompleted
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-300 text-slate-700'
                      }`}
                    >
                      {isCompleted ? (
                        <CheckCircle2 className='h-4 w-4' />
                      ) : (
                        stepIndex
                      )}
                    </div>
                    <div>
                      <p className='text-sm font-bold text-slate-900'>{step.title}</p>
                      <p className='text-xs text-slate-600'>{step.description}</p>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>

          <form onSubmit={(e) => e.preventDefault()} className='space-y-6'>
            {renderCurrentStep()}

            <div className='flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4'>
              <button
                type='button'
                onClick={() => goToStep(currentStep - 1)}
                disabled={currentStep === 1}
                className='inline-flex h-11 items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50'
              >
                <ArrowLeft className='h-4 w-4' />
                Previous
              </button>

              {currentStep < steps.length ? (
                <button
                  type='button'
                  onClick={() => goToStep(currentStep + 1)}
                  className='inline-flex h-11 items-center gap-2 rounded-xl bg-cyan-600 px-5 text-sm font-semibold text-white transition hover:bg-cyan-700'
                >
                  Next
                  <ArrowRight className='h-4 w-4' />
                </button>
              ) : (
                <button
                  type='button'
                  onClick={handleSubmit}
                  disabled={loading}
                  className='inline-flex h-11 items-center gap-2 rounded-xl bg-emerald-600 px-5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70'
                >
                  {loading && <Loader2 className='h-4 w-4 animate-spin' />}
                  Create Product
                </button>
              )}
            </div>
          </form>
        </div>
      </div>

      <Dialog open={successDialogOpen} onOpenChange={setSuccessDialogOpen}>
        <DialogContent className='max-w-md rounded-[28px] border-slate-200 p-0 shadow-2xl'>
          <div className='rounded-t-[28px] border-b border-emerald-100 bg-emerald-50 px-6 py-5'>
            <div className='mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-600 text-white'>
              <CheckCircle2 className='h-6 w-6' />
            </div>
            <DialogHeader className='text-left'>
              <DialogTitle className='text-2xl font-semibold text-slate-950'>
                Product Created
              </DialogTitle>
              <DialogDescription className='text-sm leading-6 text-slate-600'>
                {successDialogMessage}
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className='space-y-4 px-6 py-5'>
            <div className='rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-600'>
              The form has been cleared, draft data has been removed, and you have been returned to the Basic Information step so you can create the next product immediately.
            </div>
            <DialogFooter className='sm:justify-start'>
              <Button
                type='button'
                onClick={() => setSuccessDialogOpen(false)}
                className='h-10 rounded-xl bg-emerald-600 px-5 text-white hover:bg-emerald-700'
              >
                Create Another Product
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default ProductCreateForm
