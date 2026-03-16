// src/components/ProductCreate/index.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from '@tanstack/react-router'
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Layers3,
  Loader2,
  PackagePlus,
  Search,
} from 'lucide-react'
import { useSelector } from 'react-redux'
import { toast } from 'sonner'
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
const PRODUCT_CREATE_DRAFT_VERSION = 2
const PRODUCT_CREATE_DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000
const PRODUCT_CREATE_STEP_COUNT = 3

const createSpecificationRecord = (keys: string[]) =>
  keys.reduce<Record<string, string>>((acc, key) => {
    const normalizedKey = toTrimmedText(key)
    if (normalizedKey) {
      acc[normalizedKey] = ''
    }
    return acc
  }, {})

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
  specifications: [createSpecificationRecord(SPECIFICATION_TEMPLATES.default)],
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
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([])
  const [selectedMainCategoryId, setSelectedMainCategoryId] = useState('')
  const [filteredSubcategories, setFilteredSubcategories] = useState<any[]>([])
  const [specificationKeys, setSpecificationKeys] = useState<string[]>([])
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
  const [variantOptionKeyInput, setVariantOptionKeyInput] = useState('')
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
    setSpecificationKeys([])
    setCurrentStep(1)
    setMetaKeywordInput('')
    setVariantOptionKeyInput('')
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
          : []
      )
      setMetaKeywordInput(parsedDraft.metaKeywordInput)
      setVariantOptionKeyInput('')
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
    variantOptionKeyInput,
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
    }
  }, [AUTH_TOKEN])

  useEffect(() => {
    loadCities()
  }, [loadCities])

  useEffect(() => {
    if (!isDraftHydrated) return

    const allVisibleCityIds = cities
      .map((city: any) => String(city?._id || '').trim())
      .filter(Boolean)

    setFormData((prev: ProductFormData) => {
      const currentCityIds = sanitizeStringList(prev.availableCities)
      if (
        currentCityIds.length === allVisibleCityIds.length &&
        currentCityIds.every((cityId, index) => cityId === allVisibleCityIds[index])
      ) {
        return prev
      }

      return {
        ...prev,
        availableCities: allVisibleCityIds,
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

  const syncVariantsWithOptionKeys = useCallback((keys: string[]) => {
    const normalizedKeys = sanitizeStringList(keys)

    setFormData((prev: ProductFormData) => ({
      ...prev,
      variants: prev.variants.map((variant) => ({
        ...variant,
        variantAttributes: normalizedKeys.reduce<Record<string, string>>((acc, key) => {
          acc[key] = String(variant.variantAttributes?.[key] || '')
          return acc
        }, {}),
      })),
      specifications:
        prev.specifications?.length && Object.keys(prev.specifications[0] || {}).length
          ? prev.specifications
          : [createSpecificationRecord(SPECIFICATION_TEMPLATES.default)],
    }))
  }, [])

  useEffect(() => {
    const applySpecificationKeys = (keys: string[]) => {
      const normalizedKeys = sanitizeStringList(keys)
      setSpecificationKeys(normalizedKeys)
      syncVariantsWithOptionKeys(normalizedKeys)
    }

    if (!isDraftHydrated) return

    if (!selectedMainCategoryId) {
      restoredSpecificationKeysRef.current = null
      applySpecificationKeys([])
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
        const nextKeys = apiKeys.length ? apiKeys : []
        const restoredSpecificationKeys = restoredSpecificationKeysRef.current
        const mergedKeys = restoredSpecificationKeys?.length
          ? Array.from(new Set([...nextKeys, ...restoredSpecificationKeys]))
          : nextKeys

        applySpecificationKeys(mergedKeys)
      } catch (err) {
        const restoredSpecificationKeys = restoredSpecificationKeysRef.current
        const fallbackKeys = restoredSpecificationKeys?.length
          ? Array.from(new Set(restoredSpecificationKeys))
          : []

        applySpecificationKeys(fallbackKeys)
      } finally {
        restoredSpecificationKeysRef.current = null
      }
    }

    fetchSpecificationKeys()
  }, [isDraftHydrated, selectedMainCategoryId, syncVariantsWithOptionKeys])

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
          variantAttributes: specificationKeys.reduce<Record<string, string>>(
            (acc, key) => {
              acc[key] = ''
              return acc
            },
            {}
          ),
          actualPrice: 0,
          finalPrice: 0,
          stockQuantity: 0,
          variantsImageUrls: [],
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

  const handleVariantAttributeChange = (
    index: number,
    key: string,
    value: string
  ) => {
    const normalizedKey = toTrimmedText(key)
    if (!normalizedKey) return

    setFormData((prev: ProductFormData) => {
      const variants = [...prev.variants]
      const targetVariant = variants[index]
      if (!targetVariant) return prev

      variants[index] = {
        ...targetVariant,
        variantAttributes: {
          ...targetVariant.variantAttributes,
          [normalizedKey]: value,
        },
      }

      return { ...prev, variants }
    })
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

  const handleAddVariantOptionKey = () => {
    const normalizedKey = toTrimmedText(variantOptionKeyInput)
    if (!normalizedKey || specificationKeys.includes(normalizedKey)) return

    const nextKeys = [...specificationKeys, normalizedKey]
    setSpecificationKeys(nextKeys)
    syncVariantsWithOptionKeys(nextKeys)
    setVariantOptionKeyInput('')
  }

  const handleRemoveVariantOptionKey = (keyToRemove: string) => {
    const nextKeys = specificationKeys.filter((key) => key !== keyToRemove)
    setSpecificationKeys(nextKeys)
    syncVariantsWithOptionKeys(nextKeys)
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

      const autoAvailableCityIds = cities
        .map((city: any) => String(city?._id || '').trim())
        .filter(Boolean)

      const payload = {
        ...formData,
        mainCategory: selectedMainCategoryId || formData.mainCategory,
        productCategory: selectedCategoryIds[0] || '',
        productCategories: selectedCategoryIds,
        availableCities: autoAvailableCityIds,
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
            filteredSubcategories={filteredSubcategories}
            isMainCategoryLoading={isMainCategoryLoading}
            isCategoryLoading={isCategoryLoading}
            aiLoading={aiLoading}
            generateWithAI={generateShortDesc}
            generateDescription={generateDescription}
            onCreateMainCategory={handleCreateMainCategory}
            onCreateCategory={handleCreateCategory}
            onCreateSubcategory={handleCreateSubcategory}
          />
        )
      case 2:
        return (
          <>
            <Step3Specifications
              variantAttributeKeys={specificationKeys}
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
                  Object.keys(formData.specifications?.[0] || {}),
                  setAiLoading,
                  setFormData
                )
              }
              onAddKey={(newKey) => {
                const normalizedKey = toTrimmedText(newKey)
                if (!normalizedKey) return

                setFormData((prev: ProductFormData) => {
                  const specs = [...prev.specifications]
                  const existingSpecs = specs[0] || {}
                  if (normalizedKey in existingSpecs) return prev

                  specs[0] = { ...existingSpecs, [normalizedKey]: '' }
                  return { ...prev, specifications: specs }
                })
              }}
            />
            <div className="mt-8">
              <Step5Variants
                variants={formData.variants}
                attributeKeys={specificationKeys}
                newAttributeKey={variantOptionKeyInput}
                onNewAttributeKeyChange={setVariantOptionKeyInput}
                onAddAttributeKey={handleAddVariantOptionKey}
                onRemoveAttributeKey={handleRemoveVariantOptionKey}
                onAddVariant={handleAddVariant}
                onRemoveVariant={handleRemoveVariant}
                onVariantFieldChange={handleVariantFieldChange}
                onVariantAttributeChange={handleVariantAttributeChange}
                onVariantImageUpload={handleVariantImageUpload}
                onVariantImageDrop={handleVariantImageDrop}
                onVariantImageDelete={handleVariantImageDelete}
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
      icon: PackagePlus,
    },
    {
      title: 'Specs & Variants',
      icon: Layers3,
    },
    {
      title: 'SEO & FAQs',
      icon: Search,
    },
  ]

  return (
    <div className='min-h-screen px-4 py-6 sm:py-8'>
      <div className='mx-auto max-w-7xl space-y-6'>
        <section className='rounded-3xl border border-border bg-card p-6 shadow-sm'>
          <div className='flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between'>
            <div>
              <div className='text-sm font-medium text-muted-foreground'>
                Products / Create product
              </div>
              <h1 className='mt-2 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl'>
                Create product
              </h1>
              <p className='mt-2 max-w-3xl text-sm leading-6 text-muted-foreground sm:text-base'>
                Add product details, configure variants, and finish search content in
                a cleaner step-by-step editor.
              </p>
            </div>
            <div className='flex flex-wrap items-center gap-2'>
              <div className='rounded-full border border-border bg-background px-3 py-2 text-xs font-medium text-muted-foreground'>
                Step {currentStep} of {steps.length}
              </div>
              <div className='rounded-full border border-border bg-background px-3 py-2 text-xs font-medium text-muted-foreground'>
                Autosaved locally
              </div>
              {lastSavedLabel ? (
                <div className='rounded-full border border-border bg-background px-3 py-2 text-xs font-medium text-muted-foreground'>
                  Saved {lastSavedLabel}
                </div>
              ) : null}
              <Link to='/upload-products'>
                <Button variant='outline' className='h-10 rounded-full px-4'>
                  <PackagePlus className='mr-2 h-4 w-4' />
                  Upload Excel
                </Button>
              </Link>
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
                className='h-10 rounded-full px-4'
              >
                Reset Draft
              </Button>
            </div>
          </div>
        </section>

        <div ref={formTopRef} className='rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-6'>
          <div className='mb-6 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between'>
            <div>
              <div className='rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-muted-foreground inline-flex'>
                Step {currentStep}
              </div>
              <h2 className='mt-3 text-xl font-semibold text-foreground'>
                {steps[currentStep - 1]?.title}
              </h2>
            </div>

            <div className='grid gap-2 md:grid-cols-3 xl:min-w-[520px]'>
              {steps.map((step, i) => {
                const stepIndex = i + 1
                const isActive = currentStep === stepIndex
                const isCompleted = currentStep > stepIndex
                const StepIcon = step.icon

                return (
                  <button
                    key={step.title}
                    type='button'
                    onClick={() => goToStep(stepIndex)}
                    aria-current={isActive ? 'step' : undefined}
                    className={`rounded-2xl border px-4 py-3 text-left transition ${
                      isActive
                        ? 'border-cyan-500/30 bg-cyan-500/10'
                        : isCompleted
                          ? 'border-emerald-500/30 bg-emerald-500/10'
                          : 'border-border bg-background/60'
                    } hover:border-cyan-500/30 hover:bg-cyan-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400`}
                  >
                    <div className='flex items-start gap-3'>
                      <div className='inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-background'>
                        <StepIcon
                          className={`h-4 w-4 ${
                            isActive
                              ? 'text-cyan-600'
                              : isCompleted
                                ? 'text-emerald-600'
                                : 'text-muted-foreground'
                          }`}
                        />
                      </div>
                      <div className='min-w-0'>
                        <div className='mb-1 inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground'>
                          {isCompleted ? <CheckCircle2 className='h-3.5 w-3.5 text-emerald-600' /> : null}
                          Step {stepIndex}
                        </div>
                        <p className='text-sm font-semibold text-foreground'>{step.title}</p>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          <form onSubmit={(e) => e.preventDefault()} className='space-y-6'>
            {renderCurrentStep()}

            <div className='flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4'>
              <button
                type='button'
                onClick={() => goToStep(currentStep - 1)}
                disabled={currentStep === 1}
                className='inline-flex h-11 items-center gap-2 rounded-xl border border-border bg-background px-5 text-sm font-semibold text-foreground transition hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50'
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
        <DialogContent className='max-w-md rounded-[28px] border-border p-0 shadow-2xl'>
          <div className='rounded-t-[28px] border-b border-border bg-card px-6 py-5'>
            <div className='mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-600 text-white'>
              <CheckCircle2 className='h-6 w-6' />
            </div>
            <DialogHeader className='text-left'>
              <DialogTitle className='text-2xl font-semibold text-foreground'>
                Product Created
              </DialogTitle>
              <DialogDescription className='text-sm leading-6 text-muted-foreground'>
                {successDialogMessage}
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className='space-y-4 px-6 py-5'>
            <div className='rounded-2xl border border-border bg-background p-4 text-sm leading-6 text-muted-foreground'>
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
