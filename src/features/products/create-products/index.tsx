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
import { useDispatch, useSelector } from 'react-redux'
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
import { fetchVendorProfile } from '@/store/slices/vendor/profileSlice'
import { generateWithAI } from './aiHelpers'
import { deleteFromCloudinary, uploadToCloudinary } from './cloudinary'
import Step1BasicInfo from './components/Step1BasicInfo'
import ProductPreviewDialog from './components/ProductPreviewDialog'
import Step4SEO from './components/Step4SEO'
import Step5Variants from './components/Step5Variants'
import Step6FAQs from './components/Step6FAQs'
import { fieldConfig } from './helpers/SpecificationsData'
import {
  type ImageUpload,
  type ProductFormData,
  type Variant,
} from './types/type'

// Interfaces

// Specification templates by category

const PRODUCT_CREATE_DRAFT_STORAGE_PREFIX = 'product_create_draft'
const PRODUCT_CREATE_DRAFT_VERSION = 3
const PRODUCT_CREATE_DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000
const PRODUCT_CREATE_STEP_COUNT = 3

type VariantContextRule = {
  patterns: RegExp[]
  configKeys?: string[]
  fallbackKeys?: string[]
  variantKeys?: string[]
  detailKeys?: string[]
  allowedDetailKeyPatterns?: RegExp[]
}

const GENERIC_VARIANT_KEY_PATTERNS = [
  /color/i,
  /colour/i,
  /shade/i,
  /size/i,
  /storage/i,
  /ram/i,
  /memory/i,
  /capacity/i,
  /pack/i,
  /weight/i,
  /volume/i,
  /material/i,
  /fabric/i,
  /fit/i,
  /style/i,
  /pattern/i,
  /type/i,
  /flavo[u]?r/i,
  /scent/i,
  /fragrance/i,
  /connectivity/i,
  /compatib/i,
  /power/i,
  /length/i,
  /width/i,
  /height/i,
  /diameter/i,
  /lens/i,
  /frame/i,
  /curve/i,
  /coating/i,
  /shape/i,
  /display/i,
  /screen/i,
  /resolution/i,
  /processor/i,
  /band material/i,
  /dial color/i,
  /case size/i,
]

const VARIANT_KEY_CONTEXT_RULES: VariantContextRule[] = [
  {
    patterns: [/contact lens/i, /contact lenses/i],
    fallbackKeys: ['Lens Power', 'Base Curve', 'Diameter'],
    variantKeys: ['Lens Power', 'Base Curve', 'Diameter'],
    detailKeys: ['Lens Power', 'Base Curve', 'Diameter', 'Pack Size', 'Wear Duration'],
    allowedDetailKeyPatterns: [
      /lens/i,
      /power/i,
      /curve/i,
      /diameter/i,
      /pack/i,
      /wear/i,
      /material/i,
      /water/i,
      /uv/i,
      /color/i,
      /colour/i,
      /type/i,
    ],
  },
  {
    patterns: [/power lens/i, /optical lens/i, /reading lens/i, /prescription lens/i],
    fallbackKeys: ['Lens Power', 'Lens Type', 'Diameter'],
    variantKeys: ['Lens Power', 'Lens Type', 'Diameter'],
    detailKeys: ['Lens Power', 'Lens Type', 'Diameter', 'Lens Material', 'Coating'],
    allowedDetailKeyPatterns: [
      /lens/i,
      /power/i,
      /diameter/i,
      /coating/i,
      /material/i,
      /index/i,
      /shape/i,
      /tint/i,
      /uv/i,
      /type/i,
    ],
  },
  {
    patterns: [
      /eyewear/i,
      /sunglass/i,
      /spectacle/i,
      /glasses/i,
      /frame/i,
      /\bglass\b/i,
      /optical/i,
      /goggles/i,
    ],
    fallbackKeys: ['Frame Color', 'Frame Size', 'Lens Color'],
    variantKeys: ['Frame Color', 'Frame Size', 'Lens Color'],
    detailKeys: [
      'Frame Color',
      'Frame Size',
      'Lens Color',
      'Frame Material',
      'Lens Type',
      'Shape',
    ],
    allowedDetailKeyPatterns: [
      /frame/i,
      /lens/i,
      /color/i,
      /colour/i,
      /size/i,
      /shape/i,
      /material/i,
      /type/i,
      /coating/i,
      /width/i,
    ],
  },
  {
    patterns: [/t-?shirt/i, /\bshirt\b/i, /cloth/i, /apparel/i, /fashion/i],
    configKeys: ['T-Shirts'],
    fallbackKeys: ['Size', 'Color', 'Fabric', 'Fit'],
    variantKeys: ['Size', 'Color', 'Fabric'],
    detailKeys: ['Size', 'Color', 'Fabric', 'Fit', 'Pattern', 'Sleeve Length'],
    allowedDetailKeyPatterns: [
      /size/i,
      /color/i,
      /colour/i,
      /fabric/i,
      /fit/i,
      /pattern/i,
      /style/i,
      /sleeve/i,
      /neck/i,
      /waist/i,
      /length/i,
      /material/i,
    ],
  },
  {
    patterns: [/dress/i, /kurta/i, /\btop\b/i, /ethnic/i],
    configKeys: ["Women's Dresses"],
    fallbackKeys: ['Size', 'Color', 'Fabric'],
    variantKeys: ['Size', 'Color', 'Fabric'],
    detailKeys: ['Size', 'Color', 'Fabric', 'Pattern', 'Sleeve Length'],
    allowedDetailKeyPatterns: [
      /size/i,
      /color/i,
      /colour/i,
      /fabric/i,
      /pattern/i,
      /fit/i,
      /style/i,
      /sleeve/i,
      /neck/i,
      /length/i,
      /material/i,
    ],
  },
  {
    patterns: [/shoe/i, /footwear/i, /sneaker/i, /sandal/i],
    configKeys: ["Men's Shoes"],
    fallbackKeys: ['Size', 'Color', 'Material'],
    variantKeys: ['Size', 'Color', 'Material'],
    detailKeys: ['Size', 'Color', 'Material', 'Sole Material', 'Pattern'],
    allowedDetailKeyPatterns: [
      /size/i,
      /color/i,
      /colour/i,
      /material/i,
      /pattern/i,
      /sole/i,
      /width/i,
      /fit/i,
      /style/i,
    ],
  },
  {
    patterns: [/watch/i],
    configKeys: ['Watches'],
    fallbackKeys: ['Dial Color', 'Band Material', 'Case Size'],
    variantKeys: ['Dial Color', 'Band Material', 'Case Size'],
    detailKeys: ['Dial Color', 'Band Material', 'Case Size', 'Case Material', 'Strap Color'],
    allowedDetailKeyPatterns: [
      /dial/i,
      /band/i,
      /strap/i,
      /case/i,
      /color/i,
      /colour/i,
      /size/i,
      /material/i,
      /type/i,
    ],
  },
  {
    patterns: [/mobile/i, /smartphone/i, /phone/i],
    configKeys: ['Smartphones'],
    fallbackKeys: ['RAM', 'Storage', 'Color'],
    variantKeys: ['RAM', 'Storage', 'Color'],
    detailKeys: ['RAM', 'Storage', 'Color', 'Display Size', 'Battery Capacity'],
    allowedDetailKeyPatterns: [
      /ram/i,
      /storage/i,
      /memory/i,
      /color/i,
      /colour/i,
      /display/i,
      /screen/i,
      /battery/i,
      /processor/i,
      /camera/i,
      /network/i,
      /connectivity/i,
    ],
  },
  {
    patterns: [/laptop/i, /notebook/i, /desktop/i, /computer/i],
    configKeys: ['Laptops'],
    fallbackKeys: ['RAM', 'Storage', 'Processor'],
    variantKeys: ['RAM', 'Storage', 'Processor'],
    detailKeys: ['RAM', 'Storage', 'Processor', 'Display Size', 'Graphics'],
    allowedDetailKeyPatterns: [
      /ram/i,
      /storage/i,
      /memory/i,
      /processor/i,
      /display/i,
      /screen/i,
      /graphics/i,
      /refresh/i,
      /resolution/i,
      /battery/i,
      /ports?/i,
      /connectivity/i,
      /color/i,
      /colour/i,
    ],
  },
  {
    patterns: [/tablet/i],
    fallbackKeys: ['Storage', 'Color', 'Connectivity'],
    variantKeys: ['Storage', 'Color', 'Connectivity'],
    detailKeys: ['Storage', 'Color', 'Connectivity', 'Display Size', 'RAM'],
    allowedDetailKeyPatterns: [
      /storage/i,
      /ram/i,
      /memory/i,
      /display/i,
      /screen/i,
      /connectivity/i,
      /network/i,
      /color/i,
      /colour/i,
      /battery/i,
    ],
  },
  {
    patterns: [/television/i, /\btv\b/i, /monitor/i, /display/i],
    fallbackKeys: ['Display Size', 'Screen Resolution', 'Screen Type'],
    variantKeys: ['Display Size', 'Screen Resolution', 'Screen Type'],
    detailKeys: ['Display Size', 'Screen Resolution', 'Screen Type', 'Refresh Rate', 'Connectivity'],
    allowedDetailKeyPatterns: [
      /display/i,
      /screen/i,
      /resolution/i,
      /refresh/i,
      /hd/i,
      /panel/i,
      /color/i,
      /colour/i,
      /connectivity/i,
      /ports?/i,
    ],
  },
  {
    patterns: [/headphone/i, /earbud/i, /speaker/i, /audio/i],
    configKeys: ['Headphones', 'Electronics'],
    fallbackKeys: ['Color', 'Connectivity', 'Type'],
    variantKeys: ['Color', 'Connectivity', 'Type'],
    detailKeys: ['Color', 'Connectivity', 'Type', 'Battery Life', 'Water Resistance'],
    allowedDetailKeyPatterns: [
      /color/i,
      /colour/i,
      /connectivity/i,
      /type/i,
      /battery/i,
      /noise/i,
      /water/i,
      /size/i,
      /material/i,
    ],
  },
  {
    patterns: [/accessor/i, /cover/i, /case/i, /charger/i, /cable/i, /power bank/i],
    fallbackKeys: ['Compatibility', 'Color', 'Type'],
    variantKeys: ['Compatibility', 'Color', 'Type'],
    detailKeys: ['Compatibility', 'Color', 'Type', 'Length', 'Capacity'],
    allowedDetailKeyPatterns: [
      /compatib/i,
      /color/i,
      /colour/i,
      /type/i,
      /length/i,
      /capacity/i,
      /power/i,
      /connector/i,
      /material/i,
    ],
  },
  {
    patterns: [/beauty/i, /skin/i, /cosmetic/i, /makeup/i],
    configKeys: ['Beauty & Skincare'],
    fallbackKeys: ['Shade', 'Size', 'Finish'],
    variantKeys: ['Shade', 'Size', 'Finish'],
    detailKeys: ['Shade', 'Size', 'Finish', 'Skin Type', 'Volume'],
    allowedDetailKeyPatterns: [
      /shade/i,
      /finish/i,
      /size/i,
      /volume/i,
      /weight/i,
      /skin/i,
      /tone/i,
      /color/i,
      /colour/i,
      /type/i,
    ],
  },
  {
    patterns: [/electronics?/i, /gadget/i, /device/i],
    configKeys: ['Electronics'],
    fallbackKeys: ['Color', 'Connectivity', 'Capacity'],
    variantKeys: ['Color', 'Connectivity', 'Capacity'],
    detailKeys: ['Color', 'Connectivity', 'Capacity', 'Type', 'Power Source'],
    allowedDetailKeyPatterns: [
      /color/i,
      /colour/i,
      /connectivity/i,
      /capacity/i,
      /type/i,
      /power/i,
      /size/i,
      /model/i,
    ],
  },
]

const createInitialFormData = (): ProductFormData => ({
  mainCategory: '',
  mainCategories: [],
  productName: '',
  productCategory: '',
  productCategories: [],
  productSubCategories: [],
  availableCities: [],
  websiteIds: [],
  brand: '',
  shortDescription: '',
  description: '',
  defaultImages: [],
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
  selectedMainCategoryIds: string[]
  selectedCategoryIds: string[]
  currentStep: number
  variantAttributeKeys: string[]
  metaKeywordInput: string
}

type WebsiteCard = {
  _id: string
  template_key?: string
  template_name?: string
  name?: string
  business_name?: string
  previewImage?: string
  createdAt?: string
}

const buildProductCreateDraftStorageKey = (vendorId: string) =>
  `${PRODUCT_CREATE_DRAFT_STORAGE_PREFIX}_${vendorId}`

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const toText = (value: unknown) =>
  typeof value === 'string' ? value : value == null ? '' : String(value)

const toTrimmedText = (value: unknown) => toText(value).trim()

const normalizeCitySlug = (value: unknown) =>
  toTrimmedText(value)
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'all'

const formatCityLabel = (value: string) =>
  value
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')

const includesTextIgnoreCase = (source: string, target: string) =>
  Boolean(target) && source.toLowerCase().includes(target.toLowerCase())

const ensureSentenceEnding = (value: string) => {
  const text = toTrimmedText(value)
  if (!text) return ''
  return /[.!?]$/.test(text) ? text : `${text}.`
}

const buildMetaProductLabel = (productName: string, brand: string) => {
  const trimmedProductName = toTrimmedText(productName)
  const trimmedBrand = toTrimmedText(brand)

  if (trimmedProductName && trimmedBrand) {
    return includesTextIgnoreCase(trimmedProductName, trimmedBrand)
      ? trimmedProductName
      : `${trimmedBrand} ${trimmedProductName}`
  }

  return trimmedProductName || trimmedBrand
}

const buildDefaultMetaTitle = ({
  brand,
  productName,
  categoryLabel,
  cityLabel,
}: {
  brand: string
  productName: string
  categoryLabel: string
  cityLabel: string
}) => {
  const productLabel = buildMetaProductLabel(productName, brand)
  const normalizedCategoryLabel = toTrimmedText(categoryLabel)
  const normalizedCityLabel = toTrimmedText(cityLabel)
  const titleParts = sanitizeStringList([
    productLabel,
    normalizedCategoryLabel &&
    !includesTextIgnoreCase(productLabel, normalizedCategoryLabel)
      ? normalizedCategoryLabel
      : '',
    normalizedCityLabel &&
    !includesTextIgnoreCase(productLabel, normalizedCityLabel)
      ? normalizedCityLabel
      : '',
  ])

  return titleParts.join(' | ') || 'Product Overview'
}

const ensureMetaTitleIncludesCity = (title: string, cityLabel: string) => {
  const normalizedTitle = toTrimmedText(title)
  const normalizedCityLabel = toTrimmedText(cityLabel)

  if (!normalizedTitle || !normalizedCityLabel) return normalizedTitle
  if (includesTextIgnoreCase(normalizedTitle, normalizedCityLabel)) {
    return normalizedTitle
  }

  return `${normalizedTitle} | ${normalizedCityLabel}`
}

const ensureMetaDescriptionIncludesCity = (
  description: string,
  cityLabel: string
) => {
  const normalizedDescription = toTrimmedText(description)
  const normalizedCityLabel = toTrimmedText(cityLabel)

  if (!normalizedDescription || !normalizedCityLabel) return normalizedDescription
  if (includesTextIgnoreCase(normalizedDescription, normalizedCityLabel)) {
    return ensureSentenceEnding(normalizedDescription)
  }

  return `${ensureSentenceEnding(normalizedDescription)} Available in ${normalizedCityLabel}.`
}

const buildDefaultMetaDescription = ({
  brand,
  productName,
  shortDescription,
  description,
  categoryLabel,
  cityLabel,
}: {
  brand: string
  productName: string
  shortDescription: string
  description: string
  categoryLabel: string
  cityLabel: string
}) => {
  const shortCopy = ensureMetaDescriptionIncludesCity(shortDescription, cityLabel)
  if (shortCopy) return shortCopy

  const descriptionCopy = ensureMetaDescriptionIncludesCity(description, cityLabel)
  if (descriptionCopy) return descriptionCopy

  const productLabel = buildMetaProductLabel(productName, brand) || 'this product'
  const normalizedCategoryLabel = toTrimmedText(categoryLabel)
  const normalizedCityLabel = toTrimmedText(cityLabel)
  const categorySuffix =
    normalizedCategoryLabel && !includesTextIgnoreCase(productLabel, normalizedCategoryLabel)
      ? ` in ${normalizedCategoryLabel}`
      : ''
  const citySuffix =
    normalizedCityLabel && !includesTextIgnoreCase(productLabel, normalizedCityLabel)
      ? ` in ${normalizedCityLabel}`
      : ''

  return `Explore ${productLabel}${categorySuffix}${citySuffix}. Check pricing, variants, stock availability, and key product details.`
}

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

const collectFieldConfigKeys = (configKey: string) =>
  Array.isArray(fieldConfig?.[configKey])
    ? fieldConfig[configKey]
        .map((field) => toTrimmedText(field?.label || field?.name))
        .filter(Boolean)
        .slice(0, 8)
    : []

const filterKeysByPatterns = (keys: string[], patterns: RegExp[]) => {
  if (!patterns.length) return sanitizeStringList(keys)

  return sanitizeStringList(
    keys.filter((key) => patterns.some((pattern) => pattern.test(String(key || ''))))
  )
}

const getVariantContextRule = (contextNames: string[]) => {
  const normalizedContext = sanitizeStringList(contextNames).join(' ')
  if (!normalizedContext) return null

  return (
    VARIANT_KEY_CONTEXT_RULES.find((rule) =>
      rule.patterns.some((pattern) => pattern.test(normalizedContext))
    ) || null
  )
}

const getFallbackVariantKeysFromContext = (contextNames: string[]) => {
  const matchedRule = getVariantContextRule(contextNames)
  if (!matchedRule) return []

  const scopedConfigKeys = filterKeysByPatterns(
    (matchedRule.configKeys || []).flatMap(collectFieldConfigKeys),
    matchedRule.allowedDetailKeyPatterns || GENERIC_VARIANT_KEY_PATTERNS
  )

  return sanitizeStringList([
    ...(matchedRule.fallbackKeys || []),
    ...scopedConfigKeys,
  ])
}

const isGenericVariantLikeKey = (key: string) =>
  GENERIC_VARIANT_KEY_PATTERNS.some((pattern) => pattern.test(String(key || '')))

const buildRecommendedVariantKeysForContext = (
  apiKeys: string[],
  contextNames: string[]
) => {
  const matchedRule = getVariantContextRule(contextNames)
  const fallbackKeys = getFallbackVariantKeysFromContext(contextNames)

  if (matchedRule) {
    const scopedApiKeys = filterKeysByPatterns(
      apiKeys,
      matchedRule.allowedDetailKeyPatterns || GENERIC_VARIANT_KEY_PATTERNS
    )

    return sanitizeStringList([
      ...(matchedRule.detailKeys || []),
      ...fallbackKeys,
      ...scopedApiKeys,
    ])
  }

  return sanitizeStringList([
    ...fallbackKeys,
    ...apiKeys.filter(isGenericVariantLikeKey),
  ])
}

const getSuggestedVariantKeysForContext = (
  recommendedKeys: string[],
  contextNames: string[]
) => {
  const matchedRule = getVariantContextRule(contextNames)

  if (matchedRule?.variantKeys?.length) {
    return sanitizeStringList([...matchedRule.variantKeys, ...recommendedKeys])
  }

  return sanitizeStringList([
    ...getFallbackVariantKeysFromContext(contextNames),
    ...recommendedKeys.filter(isGenericVariantLikeKey),
  ])
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
    _id: toTrimmedText(raw._id),
    variantAttributes: sanitizeStringRecord(raw.variantAttributes),
    actualPrice: toNumberValue(raw.actualPrice),
    finalPrice: toNumberValue(raw.finalPrice),
    stockQuantity: toNumberValue(raw.stockQuantity),
    variantsImageUrls: sanitizeImageUploads(raw.variantsImageUrls),
    isActive: raw.isActive !== false,
    variantMetaTitle: toText(raw.variantMetaTitle),
    variantMetaDescription: toText(raw.variantMetaDescription),
    variantMetaKeywords: sanitizeStringList(raw.variantMetaKeywords),
    variantCanonicalUrl: toText(raw.variantCanonicalUrl),
  }
}

const getIdValue = (value: unknown) => {
  if (typeof value === 'string') return value.trim()
  if (isRecord(value)) {
    return toTrimmedText(value._id ?? value.id)
  }
  return ''
}

const mapIdList = (value: unknown) =>
  Array.isArray(value)
    ? sanitizeStringList(value.map((item) => getIdValue(item)))
    : []

const buildEditModeHydratedFormData = (product: Record<string, unknown>): ProductFormData =>
  sanitizeProductFormData({
    mainCategory:
      getIdValue(product.mainCategory) ||
      getIdValue(product.mainCategoryData),
    mainCategories:
      mapIdList(product.mainCategories).length
        ? mapIdList(product.mainCategories)
        : [
            getIdValue(product.mainCategory) || getIdValue(product.mainCategoryData),
          ].filter(Boolean),
    productName: product.productName,
    productCategory:
      getIdValue(product.productCategory) ||
      getIdValue(product.productCategoryData),
    productCategories:
      mapIdList(product.productCategories).length
        ? mapIdList(product.productCategories)
        : [
            getIdValue(product.productCategory) ||
              getIdValue(product.productCategoryData),
          ].filter(Boolean),
    productSubCategories: mapIdList(product.productSubCategories),
    availableCities: mapIdList(product.availableCities),
    websiteIds: mapIdList(product.websiteIds),
    brand: product.brand,
    shortDescription: product.shortDescription,
    description: product.description,
    defaultImages: product.defaultImages,
    isAvailable: product.isAvailable,
    metaTitle: product.metaTitle,
    metaDescription: product.metaDescription,
    metaKeywords: product.metaKeywords,
    variants: Array.isArray(product.variants)
      ? product.variants.map((variant) =>
          sanitizeVariant({
            ...(isRecord(variant) ? variant : {}),
            _id: isRecord(variant) ? variant._id : '',
          })
        )
      : [],
    faqs: product.faqs,
  })

const sanitizeProductFormData = (value: unknown): ProductFormData => {
  const raw = isRecord(value) ? value : {}
  const sanitizedMainCategories = sanitizeStringList(
    raw.mainCategories ?? raw.mainCategory
  )

  return {
    ...createInitialFormData(),
    mainCategory: sanitizedMainCategories[0] || toTrimmedText(raw.mainCategory),
    mainCategories: sanitizedMainCategories,
    productName: toText(raw.productName),
    productCategory: toTrimmedText(raw.productCategory),
    productCategories: sanitizeStringList(raw.productCategories),
    productSubCategories: sanitizeStringList(raw.productSubCategories),
    availableCities: sanitizeStringList(raw.availableCities),
    websiteIds: sanitizeStringList(raw.websiteIds),
    brand: toText(raw.brand),
    shortDescription: toText(raw.shortDescription),
    description: toText(raw.description),
    defaultImages: sanitizeImageUploads(raw.defaultImages),
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
    selectedMainCategoryIds: sanitizeStringList(
      value.selectedMainCategoryIds ?? value.selectedMainCategoryId
    ),
    selectedCategoryIds: sanitizeStringList(value.selectedCategoryIds),
    currentStep: clampProductCreateStep(value.currentStep),
    variantAttributeKeys: sanitizeStringList(
      value.variantAttributeKeys ?? value.specificationKeys
    ),
    metaKeywordInput: toText(value.metaKeywordInput),
  }
}

const ProductCreateForm: React.FC = () => {
  // Redux state (auth)
  const dispatch = useDispatch<any>()
  const AUTH_TOKEN = useSelector((state: any) => state.auth?.token || '')
  const authUser = useSelector((state: any) => state.auth?.user || null)
  const vendorProfile = useSelector(
    (state: any) =>
      state.vendorprofile?.profile?.vendor ||
      state.vendorprofile?.profile?.data ||
      state.vendorprofile?.profile ||
      null
  )
  const vendorId = String(authUser?.id || authUser?._id || '')
  const initialEditorSearch = useMemo(() => {
    if (typeof window === 'undefined') {
      return { mode: 'create', productId: '' }
    }

    const params = new URLSearchParams(window.location.search)
    return {
      mode: params.get('mode') === 'edit' ? 'edit' : 'create',
      productId: String(params.get('productId') || '').trim(),
    }
  }, [])
  const isEditMode =
    initialEditorSearch.mode === 'edit' && Boolean(initialEditorSearch.productId)
  const draftStorageKey = vendorId
    ? `${buildProductCreateDraftStorageKey(vendorId)}_${isEditMode ? `edit_${initialEditorSearch.productId}` : 'create'}`
    : ''
  const restoredVariantAttributeKeysRef = useRef<string[] | null>(null)
  const lastAutoAppliedVariantKeyContextRef = useRef('')
  const lastAutoAppliedMetaTitleRef = useRef('')
  const lastAutoAppliedMetaDescriptionRef = useRef('')
  const lastGeneratedVariantSuggestionContextRef = useRef('')
  const formTopRef = useRef<HTMLDivElement | null>(null)

  // Form state
  const [formData, setFormData] = useState<ProductFormData>(() => createInitialFormData())

  const [mainCategories, setMainCategories] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [cities, setCities] = useState<any[]>([])
  const [websites, setWebsites] = useState<WebsiteCard[]>([])
  const [isMainCategoryLoading, setIsMainCategoryLoading] = useState(false)
  const [isCategoryLoading, setIsCategoryLoading] = useState(false)
  const [isWebsiteLoading, setIsWebsiteLoading] = useState(false)
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([])
  const [selectedMainCategoryIds, setSelectedMainCategoryIds] = useState<string[]>([])
  const [filteredSubcategories, setFilteredSubcategories] = useState<any[]>([])
  const [variantAttributeKeys, setVariantAttributeKeys] = useState<string[]>([])
  const [recommendedVariantKeys, setRecommendedVariantKeys] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [aiLoading, setAiLoading] = useState<any>({
    metaTitle: false,
    metaDescription: false,
    metaKeywords: false,
    variantKeys: false,
    faqs: false,
  })
  const [currentStep, setCurrentStep] = useState(1)
  const [metaKeywordInput, setMetaKeywordInput] = useState('')
  const [isDraftHydrated, setIsDraftHydrated] = useState(false)
  const [draftSavedAt, setDraftSavedAt] = useState<number | null>(null)
  const [successDialogOpen, setSuccessDialogOpen] = useState(false)
  const [successDialogMessage, setSuccessDialogMessage] = useState('')
  const [previewOpen, setPreviewOpen] = useState(false)
  const [isEditProductLoading, setIsEditProductLoading] = useState(false)
  const primarySelectedMainCategoryId = selectedMainCategoryIds[0] || ''

  const resetDraftState = () => {
    restoredVariantAttributeKeysRef.current = null
    setFormData(createInitialFormData())
    setSelectedMainCategoryIds([])
    setSelectedCategoryIds([])
    setCategories([])
    setFilteredSubcategories([])
    setVariantAttributeKeys([])
    setRecommendedVariantKeys([])
    setCurrentStep(1)
    setMetaKeywordInput('')
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
    if (isEditMode) {
      setIsDraftHydrated(true)
      return
    }

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

      restoredVariantAttributeKeysRef.current = parsedDraft.variantAttributeKeys.length
        ? parsedDraft.variantAttributeKeys
        : null

      setFormData(parsedDraft.formData)
      setSelectedMainCategoryIds(
        parsedDraft.selectedMainCategoryIds.length
          ? parsedDraft.selectedMainCategoryIds
          : sanitizeStringList(
              parsedDraft.formData.mainCategories ?? parsedDraft.formData.mainCategory
            )
      )
      setSelectedCategoryIds(
        parsedDraft.selectedCategoryIds.length
          ? parsedDraft.selectedCategoryIds
          : parsedDraft.formData.productCategories
      )
      setCurrentStep(parsedDraft.currentStep)
      setVariantAttributeKeys(
        parsedDraft.variantAttributeKeys.length
          ? parsedDraft.variantAttributeKeys
          : []
      )
      setMetaKeywordInput(parsedDraft.metaKeywordInput)
      setDraftSavedAt(parsedDraft.savedAt)
    } catch {
      clearDraftStorage()
      resetDraftState()
    } finally {
      setIsDraftHydrated(true)
    }
  }, [draftStorageKey, isEditMode, vendorId])

  useEffect(() => {
    if (!isDraftHydrated || !vendorId || !draftStorageKey || typeof window === 'undefined') {
      return
    }

    const timeoutId = window.setTimeout(() => {
      const draftToPersist: ProductCreateDraft = {
        version: PRODUCT_CREATE_DRAFT_VERSION,
        savedAt: Date.now(),
        formData: sanitizeProductFormData(formData),
        selectedMainCategoryIds: selectedMainCategoryIds.length
          ? selectedMainCategoryIds
          : sanitizeStringList(formData.mainCategories ?? formData.mainCategory),
        selectedCategoryIds: selectedCategoryIds.length
          ? selectedCategoryIds
          : sanitizeStringList(formData.productCategories),
        currentStep: clampProductCreateStep(currentStep),
        variantAttributeKeys: sanitizeStringList(variantAttributeKeys),
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
    selectedMainCategoryIds,
    variantAttributeKeys,
    vendorId,
  ])

  useEffect(() => {
    if (!isEditMode || !initialEditorSearch.productId) return
    if (!AUTH_TOKEN) return

    let isCancelled = false

    const loadProductForEditing = async () => {
      setIsEditProductLoading(true)
      try {
        const response = await fetch(
          `${import.meta.env.VITE_PUBLIC_API_URL}/v1/products/${initialEditorSearch.productId}`,
          {
            headers: {
              Authorization: `Bearer ${AUTH_TOKEN}`,
            },
          }
        )

        const result = await response.json().catch(() => null)
        if (!response.ok || !result?.product) {
          throw new Error(result?.message || 'Failed to load product for editing')
        }

        const product = result.product as Record<string, unknown>
        const nextFormData = buildEditModeHydratedFormData(product)
        const nextMainCategoryIds = sanitizeStringList(
          nextFormData.mainCategories.length
            ? nextFormData.mainCategories
            : [nextFormData.mainCategory]
        )
        const nextCategoryIds = sanitizeStringList(
          nextFormData.productCategories.length
            ? nextFormData.productCategories
            : [nextFormData.productCategory]
        )
        const nextVariantKeys = sanitizeStringList(
          nextFormData.variants.flatMap((variant) =>
            Object.keys(variant.variantAttributes || {})
          )
        )

        if (isCancelled) return

        restoredVariantAttributeKeysRef.current = nextVariantKeys
        setFormData(nextFormData)
        setSelectedMainCategoryIds(nextMainCategoryIds)
        setSelectedCategoryIds(nextCategoryIds)
        setVariantAttributeKeys(nextVariantKeys)
        setMetaKeywordInput('')
        setCurrentStep(1)
        setDraftSavedAt(null)
        setIsDraftHydrated(true)
      } catch (error: any) {
        if (!isCancelled) {
          toast.error(error?.message || 'Failed to load product for editing')
          setIsDraftHydrated(true)
        }
      } finally {
        if (!isCancelled) {
          setIsEditProductLoading(false)
        }
      }
    }

    void loadProductForEditing()

    return () => {
      isCancelled = true
    }
  }, [AUTH_TOKEN, initialEditorSearch.productId, isEditMode])

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

  useEffect(() => {
    if (!AUTH_TOKEN || vendorProfile) return
    void dispatch(fetchVendorProfile())
  }, [AUTH_TOKEN, dispatch, vendorProfile])

  const selectedMainCategoryName = useMemo(() => {
    const current = mainCategories.find(
      (category: any) => String(category?._id) === String(primarySelectedMainCategoryId)
    )
    return String(current?.name || '').trim()
  }, [mainCategories, primarySelectedMainCategoryId])

  const selectedMainCategoryNames = useMemo(
    () =>
      mainCategories
        .filter((category: any) =>
          selectedMainCategoryIds.includes(String(category?._id || ''))
        )
        .map((category: any) => String(category?.name || '').trim())
        .filter(Boolean),
    [mainCategories, selectedMainCategoryIds]
  )

  const selectedCategoryNames = useMemo(
    () =>
      categories
        .filter((category: any) => selectedCategoryIds.includes(String(category?._id || '')))
        .map((category: any) => String(category?.name || '').trim())
        .filter(Boolean),
    [categories, selectedCategoryIds]
  )

  const selectedSubcategoryNames = useMemo(
    () =>
      filteredSubcategories
        .filter((subcategory: any) =>
          formData.productSubCategories.includes(String(subcategory?._id || ''))
        )
        .map((subcategory: any) => String(subcategory?.name || '').trim())
        .filter(Boolean),
    [filteredSubcategories, formData.productSubCategories]
  )

  const selectedWebsiteNames = useMemo(() => {
    if (!formData.websiteIds.length) return []

    const websiteMap = new Map(
      websites.map((website) => [
        String(website?._id || ''),
        String(
          website?.name ||
            website?.business_name ||
            website?.template_name ||
            website?.template_key ||
            ''
        ).trim(),
      ])
    )

    return sanitizeStringList(
      formData.websiteIds.map((websiteId) => websiteMap.get(String(websiteId || '')) || '')
    )
  }, [formData.websiteIds, websites])

  const selectedCityNames = useMemo(() => {
    if (!formData.availableCities.length) return []

    const cityMap = new Map(
      cities.map((city: any) => [
        String(city?._id || ''),
        String(city?.name || city?.label || '').trim(),
      ])
    )

    return sanitizeStringList(
      formData.availableCities.map((cityId) => cityMap.get(String(cityId || '')) || '')
    )
  }, [cities, formData.availableCities])

  const variantContextNames = useMemo(
    () =>
      sanitizeStringList([
        selectedMainCategoryName,
        ...selectedCategoryNames,
        ...selectedSubcategoryNames,
        toTrimmedText(formData.productName),
      ]),
    [
      formData.productName,
      selectedCategoryNames,
      selectedMainCategoryName,
      selectedSubcategoryNames,
    ]
  )

  const addVariantKeySuggestions = useMemo(
    () => getSuggestedVariantKeysForContext(recommendedVariantKeys, variantContextNames).slice(0, 2),
    [recommendedVariantKeys, variantContextNames]
  )

  const variantKeyContextLabel = useMemo(
    () =>
      variantContextNames[1] ||
      variantContextNames[0] ||
      toTrimmedText(formData.productName) ||
      'this product',
    [formData.productName, variantContextNames]
  )

  const allVariantAttributeKeys = useMemo(
    () =>
      sanitizeStringList(
        formData.variants.flatMap((variant) =>
          Object.keys(variant.variantAttributes || {})
        )
      ),
    [formData.variants]
  )

  const primarySeoCategoryLabel = useMemo(
    () =>
      selectedSubcategoryNames[0] ||
      selectedCategoryNames[0] ||
      selectedMainCategoryName ||
      toTrimmedText(formData.productCategory),
    [
      formData.productCategory,
      selectedCategoryNames,
      selectedMainCategoryName,
      selectedSubcategoryNames,
    ]
  )

  const seoDefaultCityLabel = useMemo(() => {
    const defaultCitySlug = normalizeCitySlug(
      vendorProfile?.default_city_slug ||
        vendorProfile?.defaultCitySlug ||
        authUser?.default_city_slug ||
        authUser?.defaultCitySlug
    )
    const defaultCityName = toTrimmedText(
      vendorProfile?.default_city_name ||
        vendorProfile?.defaultCityName ||
        authUser?.default_city_name ||
        authUser?.defaultCityName
    )
    const registrationCity = toTrimmedText(vendorProfile?.city || authUser?.city)
    const candidateCityName =
      defaultCitySlug !== 'all'
        ? defaultCityName || formatCityLabel(defaultCitySlug)
        : !defaultCityName && registrationCity
          ? registrationCity
          : ''

    const matchedCity =
      cities.find((city: any) => {
        const cityName = toTrimmedText(city?.name)
        const citySlug = normalizeCitySlug(city?.slug || city?.name)

        return Boolean(
          city?.isActive !== false &&
            ((defaultCitySlug !== 'all' && citySlug === defaultCitySlug) ||
              (candidateCityName &&
                cityName.localeCompare(candidateCityName, undefined, {
                  sensitivity: 'base',
                }) === 0))
        )
      }) || null

    return toTrimmedText(matchedCity?.name || candidateCityName)
  }, [
    authUser?.city,
    authUser?.defaultCityName,
    authUser?.defaultCitySlug,
    authUser?.default_city_name,
    authUser?.default_city_slug,
    cities,
    vendorProfile,
  ])

  const defaultMetaTitle = useMemo(
    () =>
      buildDefaultMetaTitle({
        brand: formData.brand,
        productName: formData.productName,
        categoryLabel: primarySeoCategoryLabel,
        cityLabel: seoDefaultCityLabel,
      }),
    [formData.brand, formData.productName, primarySeoCategoryLabel, seoDefaultCityLabel]
  )

  const defaultMetaDescription = useMemo(
    () =>
      buildDefaultMetaDescription({
        brand: formData.brand,
        productName: formData.productName,
        shortDescription: formData.shortDescription,
        description: formData.description,
        categoryLabel: primarySeoCategoryLabel,
        cityLabel: seoDefaultCityLabel,
      }),
    [
      formData.brand,
      formData.description,
      formData.productName,
      formData.shortDescription,
      primarySeoCategoryLabel,
      seoDefaultCityLabel,
    ]
  )

  const previewFormData = useMemo(() => sanitizeProductFormData(formData), [formData])

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

  const loadWebsites = useCallback(async () => {
    if (!vendorId || !AUTH_TOKEN) {
      setWebsites([])
      return []
    }

    setIsWebsiteLoading(true)
    try {
      const res = await fetch(
        `${import.meta.env.VITE_PUBLIC_API_URL}/v1/templates/by-vendor?vendor_id=${vendorId}`,
        {
          headers: {
            Authorization: `Bearer ${AUTH_TOKEN}`,
          },
        }
      )
      if (!res.ok) throw new Error('Failed to fetch websites')
      const json = await res.json()
      const nextWebsites = Array.isArray(json?.data) ? json.data : []
      setWebsites(nextWebsites)
      return nextWebsites
    } catch {
      setWebsites([])
      return []
    } finally {
      setIsWebsiteLoading(false)
    }
  }, [AUTH_TOKEN, vendorId])

  useEffect(() => {
    loadWebsites()
  }, [loadWebsites])

  useEffect(() => {
    if (!isDraftHydrated) return
    if (isEditMode) return

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
  }, [cities, isDraftHydrated, isEditMode])

  useEffect(() => {
    if (!isDraftHydrated) return

    const visibleWebsiteIds = new Set(
      websites
        .map((website) => String(website?._id || '').trim())
        .filter(Boolean)
    )

    setFormData((prev: ProductFormData) => {
      const nextWebsiteIds = sanitizeStringList(prev.websiteIds).filter((websiteId) =>
        visibleWebsiteIds.has(websiteId)
      )

      if (
        nextWebsiteIds.length === prev.websiteIds.length &&
        nextWebsiteIds.every((websiteId, index) => websiteId === prev.websiteIds[index])
      ) {
        return prev
      }

      return {
        ...prev,
        websiteIds: nextWebsiteIds,
      }
    })
  }, [isDraftHydrated, websites])

  useEffect(() => {
    if (!isDraftHydrated) return
    if (!selectedMainCategoryIds.length) {
      setCategories([])
      setSelectedCategoryIds([])
      setFilteredSubcategories([])
      return
    }

    const fetchCategories = async () => {
      setIsCategoryLoading(true)
      try {
        const responses = await Promise.all(
          selectedMainCategoryIds.map((mainCategoryId) => {
            const params = new URLSearchParams({
              main_category_id: mainCategoryId,
              level: 'category',
              limit: '500',
            })

            return fetch(
              `${import.meta.env.VITE_PUBLIC_API_URL}/v1/categories/getall?${params.toString()}`
            )
          })
        )

        const merged: any[] = []
        for (const response of responses) {
          if (!response.ok) continue
          const json = await response.json()
          if (Array.isArray(json?.data)) {
            merged.push(...json.data)
          }
        }

        const unique = Array.from(
          new Map(merged.map((category: any) => [String(category?._id || ''), category])).values()
        )
        setCategories(sortEntitiesByName(unique))
      } catch (err) {
        setCategories([])
      } finally {
        setIsCategoryLoading(false)
      }
    }

    fetchCategories()
  }, [isDraftHydrated, selectedMainCategoryIds])

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
    setSelectedMainCategoryIds((prev) =>
      prev.includes(created._id) ? prev : [...prev, created._id]
    )
    setSelectedCategoryIds([])
    setCategories([])
    setFilteredSubcategories([])
    setFormData((prev: ProductFormData) => ({
      ...prev,
      mainCategory: created._id,
      mainCategories: prev.mainCategories.includes(created._id)
        ? prev.mainCategories
        : [...prev.mainCategories, created._id],
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
    if (!primarySelectedMainCategoryId) {
      throw new Error('Select at least one main category first.')
    }
    if (!AUTH_TOKEN) {
      throw new Error('Your session has expired. Please login again.')
    }

    const selectedMainCategory = mainCategories.find(
      (category: any) => String(category?._id) === String(primarySelectedMainCategoryId)
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
          main_category_id: primarySelectedMainCategoryId,
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
      (category: any) => String(category?._id) === String(primarySelectedMainCategoryId)
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
          main_category_id: primarySelectedMainCategoryId,
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

  const syncVariantWithOptionKeys = useCallback(
    (variantIndex: number, keys: string[]) => {
      const normalizedKeys = sanitizeStringList(keys)

      setFormData((prev: ProductFormData) => {
        const variants = [...prev.variants]
        const targetVariant = variants[variantIndex]
        if (!targetVariant) return prev

        variants[variantIndex] = {
          ...targetVariant,
          variantAttributes: normalizedKeys.reduce<Record<string, string>>((acc, key) => {
            acc[key] = String(targetVariant.variantAttributes?.[key] || '')
            return acc
          }, {}),
        }

        return {
          ...prev,
          variants,
        }
      })
    },
    []
  )

  useEffect(() => {
    if (!isDraftHydrated) return

    const restoredKeys = sanitizeStringList(
      restoredVariantAttributeKeysRef.current || []
    )

    if (!primarySelectedMainCategoryId) {
      restoredVariantAttributeKeysRef.current = null
      lastAutoAppliedVariantKeyContextRef.current = ''
      setRecommendedVariantKeys([])
      setVariantAttributeKeys([])
      return
    }

    if (restoredKeys.length) {
      setVariantAttributeKeys(restoredKeys)
      lastAutoAppliedVariantKeyContextRef.current = [
        primarySelectedMainCategoryId,
        ...selectedCategoryIds,
      ]
        .filter(Boolean)
        .join('|')
      restoredVariantAttributeKeysRef.current = null
      return
    }

    setVariantAttributeKeys([])
  }, [isDraftHydrated, primarySelectedMainCategoryId, selectedCategoryIds])

  useEffect(() => {
    if (!isDraftHydrated) return

    const suggestionContextNames = [
      selectedMainCategoryName,
      ...selectedCategoryNames,
      ...selectedSubcategoryNames,
      toTrimmedText(formData.productName),
    ]
    const fallbackKeys = buildRecommendedVariantKeysForContext([], suggestionContextNames)
    const variantKeyContextSignature = [
      primarySelectedMainCategoryId,
      ...selectedCategoryIds,
      ...formData.productSubCategories,
      toTrimmedText(formData.productName),
    ]
      .filter(Boolean)
      .join('|')
    const shouldAutoApplyRecommendedKeys =
      Boolean(variantKeyContextSignature) &&
      !variantAttributeKeys.length &&
      lastAutoAppliedVariantKeyContextRef.current !== variantKeyContextSignature

    if (!primarySelectedMainCategoryId) {
      setRecommendedVariantKeys(fallbackKeys)
      return
    }

    const fetchRecommendedVariantKeys = async () => {
      try {
        const res = await fetch(
          `${import.meta.env.VITE_PUBLIC_API_URL}/v1/specification-keys/main-category/${primarySelectedMainCategoryId}`
        )

        if (!res.ok) throw new Error('Failed to fetch variant keys')
        const json = await res.json()
        const apiKeys = Array.isArray(json?.data?.keys) ? json.data.keys : []
        const nextRecommendedKeys = buildRecommendedVariantKeysForContext(
          apiKeys,
          suggestionContextNames
        )
        setRecommendedVariantKeys(nextRecommendedKeys)

        if (shouldAutoApplyRecommendedKeys) {
          setVariantAttributeKeys(nextRecommendedKeys)
          lastAutoAppliedVariantKeyContextRef.current = variantKeyContextSignature
        }
      } catch {
        setRecommendedVariantKeys(fallbackKeys)

        if (shouldAutoApplyRecommendedKeys) {
          setVariantAttributeKeys(fallbackKeys)
          lastAutoAppliedVariantKeyContextRef.current = variantKeyContextSignature
        }
      }
    }

    fetchRecommendedVariantKeys()
  }, [
    formData.productName,
    formData.productSubCategories,
    isDraftHydrated,
    selectedCategoryIds,
    selectedCategoryNames,
    primarySelectedMainCategoryId,
    selectedMainCategoryName,
    selectedSubcategoryNames,
    variantAttributeKeys.length,
  ])

  useEffect(() => {
    if (!isDraftHydrated || !defaultMetaTitle) return

    setFormData((prev: ProductFormData) => {
      const currentMetaTitle = toTrimmedText(prev.metaTitle)
      const lastAutoAppliedTitle = lastAutoAppliedMetaTitleRef.current

      if (currentMetaTitle && currentMetaTitle !== lastAutoAppliedTitle) {
        return prev
      }

      if (currentMetaTitle === defaultMetaTitle) {
        lastAutoAppliedMetaTitleRef.current = defaultMetaTitle
        return prev
      }

      lastAutoAppliedMetaTitleRef.current = defaultMetaTitle
      return {
        ...prev,
        metaTitle: defaultMetaTitle,
      }
    })
  }, [defaultMetaTitle, isDraftHydrated])

  useEffect(() => {
    if (!isDraftHydrated || !defaultMetaDescription) return

    setFormData((prev: ProductFormData) => {
      const currentMetaDescription = toTrimmedText(prev.metaDescription)
      const lastAutoAppliedDescription = lastAutoAppliedMetaDescriptionRef.current

      if (
        currentMetaDescription &&
        currentMetaDescription !== lastAutoAppliedDescription
      ) {
        return prev
      }

      if (currentMetaDescription === defaultMetaDescription) {
        lastAutoAppliedMetaDescriptionRef.current = defaultMetaDescription
        return prev
      }

      lastAutoAppliedMetaDescriptionRef.current = defaultMetaDescription
      return {
        ...prev,
        metaDescription: defaultMetaDescription,
      }
    })
  }, [defaultMetaDescription, isDraftHydrated])

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

  const handleGenerateMetaTitle = async () => {
    setAiLoading((prev: any) => ({ ...prev, metaTitle: true }))

    try {
      const res = await fetch(
        `${import.meta.env.VITE_PUBLIC_API_URL}/v1/products/generate-field`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            field: 'metaTitle',
            context: `Product: ${formData.productName}, Brand: ${formData.brand}, Categories: ${[
              primarySeoCategoryLabel,
              ...selectedCategoryNames,
              ...selectedSubcategoryNames,
              selectedMainCategoryName,
            ]
              .filter(Boolean)
              .join(', ')}, Default city: ${seoDefaultCityLabel || 'N/A'}`,
          }),
        }
      )

      const data = await res.json().catch(() => null)
      const nextMetaTitle = ensureMetaTitleIncludesCity(
        toTrimmedText(data?.data),
        seoDefaultCityLabel
      )

      if (!res.ok || !data?.success || !nextMetaTitle) {
        throw new Error('Failed to generate meta title')
      }

      setFormData((prev: ProductFormData) => ({
        ...prev,
        metaTitle: nextMetaTitle,
      }))
    } catch {
      const currentMetaTitle = toTrimmedText(formData.metaTitle)
      const shouldApplyFallback =
        !currentMetaTitle ||
        currentMetaTitle === lastAutoAppliedMetaTitleRef.current

      if (shouldApplyFallback) {
        lastAutoAppliedMetaTitleRef.current = defaultMetaTitle
        setFormData((prev: ProductFormData) => ({
          ...prev,
          metaTitle: defaultMetaTitle,
        }))
      }

      toast.error(
        shouldApplyFallback
          ? 'AI failed. Default meta title applied.'
          : 'AI failed. Existing meta title kept.'
      )
    } finally {
      setAiLoading((prev: any) => ({ ...prev, metaTitle: false }))
    }
  }

  const handleGenerateMetaDescription = async () => {
    setAiLoading((prev: any) => ({ ...prev, metaDescription: true }))

    try {
      const res = await fetch(
        `${import.meta.env.VITE_PUBLIC_API_URL}/v1/products/generate-field`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            field: 'metaDescription',
            context: `Product: ${formData.productName}, Brand: ${formData.brand}, Short description: ${formData.shortDescription}, Description: ${formData.description}, Categories: ${[
              primarySeoCategoryLabel,
              ...selectedCategoryNames,
              ...selectedSubcategoryNames,
              selectedMainCategoryName,
            ]
              .filter(Boolean)
              .join(', ')}, Default city: ${seoDefaultCityLabel || 'N/A'}`,
          }),
        }
      )

      const data = await res.json().catch(() => null)
      const nextMetaDescription = ensureMetaDescriptionIncludesCity(
        toTrimmedText(data?.data),
        seoDefaultCityLabel
      )

      if (!res.ok || !data?.success || !nextMetaDescription) {
        throw new Error('Failed to generate meta description')
      }

      setFormData((prev: ProductFormData) => ({
        ...prev,
        metaDescription: nextMetaDescription,
      }))
    } catch {
      const currentMetaDescription = toTrimmedText(formData.metaDescription)
      const shouldApplyFallback =
        !currentMetaDescription ||
        currentMetaDescription === lastAutoAppliedMetaDescriptionRef.current

      if (shouldApplyFallback) {
        lastAutoAppliedMetaDescriptionRef.current = defaultMetaDescription
        setFormData((prev: ProductFormData) => ({
          ...prev,
          metaDescription: defaultMetaDescription,
        }))
      }

      toast.error(
        shouldApplyFallback
          ? 'AI failed. Default meta description applied.'
          : 'AI failed. Existing meta description kept.'
      )
    } finally {
      setAiLoading((prev: any) => ({ ...prev, metaDescription: false }))
    }
  }

  const handleGenerateVariantKeySuggestions = async (_variantIndex: number) => {
    const categoryContext = [
      ...selectedCategoryNames,
      ...selectedSubcategoryNames,
      selectedMainCategoryName,
    ]
      .filter(Boolean)
      .join(', ')
    const suggestionContextSignature = [
      primarySelectedMainCategoryId,
      ...selectedCategoryIds,
      ...formData.productSubCategories,
      toTrimmedText(formData.productName),
    ]
      .filter(Boolean)
      .join('|')

    if (!categoryContext) {
      return
    }

    if (
      suggestionContextSignature &&
      lastGeneratedVariantSuggestionContextRef.current === suggestionContextSignature
    ) {
      return
    }

    setAiLoading((prev: any) => ({ ...prev, variantKeys: true }))
    try {
      const res = await fetch(
        `${import.meta.env.VITE_PUBLIC_API_URL}/v1/products/generate-specification-keys`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            category: categoryContext,
            productName: formData.productName,
          }),
        }
      )

      const json = await res.json().catch(() => null)
      if (!res.ok || !Array.isArray(json?.data)) {
        throw new Error(json?.message || 'Failed to generate variant keys')
      }

      const nextRecommendedKeys = buildRecommendedVariantKeysForContext(
        [...recommendedVariantKeys, ...json.data],
        variantContextNames
      )

      setRecommendedVariantKeys(nextRecommendedKeys)
      lastGeneratedVariantSuggestionContextRef.current = suggestionContextSignature
    } catch (error: any) {
      return
    } finally {
      setAiLoading((prev: any) => ({ ...prev, variantKeys: false }))
    }
  }



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

  const handleAddVariant = (selectedKeys: string[]) => {
    const initialKeys = sanitizeStringList(
      selectedKeys.length ? selectedKeys : variantAttributeKeys
    )

    if (!initialKeys.length) return

    setVariantAttributeKeys((prev) => sanitizeStringList([...prev, ...initialKeys]))
    setFormData((prev: ProductFormData) => ({
        ...prev,
        variants: [
          ...prev.variants,
          {
            variantAttributes: initialKeys.reduce<Record<string, string>>(
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

  const handleCopyVariantFromPrevious = (variantIndex: number) => {
    if (variantIndex <= 0) return

    const sourceVariant = formData.variants[variantIndex - 1]
    if (!sourceVariant) return

    const sourceKeys = sanitizeStringList(
      Object.keys(sourceVariant.variantAttributes || {})
    )

    setVariantAttributeKeys((prev) =>
      sanitizeStringList([...prev, ...sourceKeys])
    )

    setFormData((prev: ProductFormData) => {
      const variants = [...prev.variants]
      const targetVariant = variants[variantIndex]
      const previousVariant = variants[variantIndex - 1]

      if (!targetVariant || !previousVariant) return prev

      const targetAttributes = sanitizeStringRecord(targetVariant.variantAttributes)
      const previousAttributes = sanitizeStringRecord(previousVariant.variantAttributes)
      const targetKeys = sanitizeStringList(Object.keys(targetAttributes))
      const previousKeys = sanitizeStringList(Object.keys(previousAttributes))
      const protectedVariantKey = targetKeys[0] || ''
      const nextAttributeKeys = sanitizeStringList([...targetKeys, ...previousKeys])

      variants[variantIndex] = {
        ...targetVariant,
        variantAttributes: nextAttributeKeys.reduce<Record<string, string>>(
          (acc, key) => {
            if (key === protectedVariantKey) {
              acc[key] = toText(targetAttributes[key] || '')
              return acc
            }

            acc[key] = toText(previousAttributes[key] ?? targetAttributes[key] ?? '')
            return acc
          },
          {}
        ),
        actualPrice: previousVariant.actualPrice,
        finalPrice: previousVariant.finalPrice,
        stockQuantity: previousVariant.stockQuantity,
        isActive: previousVariant.isActive,
      }

      return { ...prev, variants }
    })

    toast.success('Copied details from the variant above')
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

  const mergeVariantOptionKeys = useCallback(
    (variantIndex: number, keysToAdd: string[]) => {
      const normalizedKeys = sanitizeStringList(keysToAdd)
      if (!normalizedKeys.length) return

      setFormData((prev: ProductFormData) => {
        const variants = [...prev.variants]
        const targetVariant = variants[variantIndex]
        if (!targetVariant) return prev

        const currentVariantKeys = sanitizeStringList(
          Object.keys(targetVariant.variantAttributes || {})
        )
        const nextKeys = sanitizeStringList([...currentVariantKeys, ...normalizedKeys])

        if (nextKeys.length === currentVariantKeys.length) {
          return prev
        }

        variants[variantIndex] = {
          ...targetVariant,
          variantAttributes: nextKeys.reduce<Record<string, string>>((acc, key) => {
            acc[key] = String(targetVariant.variantAttributes?.[key] || '')
            return acc
          }, {}),
        }

        return { ...prev, variants }
      })
    },
    []
  )

  const handleAddVariantOptionKey = (variantIndex: number, keyToAdd: string) => {
    mergeVariantOptionKeys(variantIndex, [keyToAdd])
  }

  const handleAddSuggestedVariantKeys = (
    variantIndex: number,
    keysToAdd: string[]
  ) => {
    mergeVariantOptionKeys(variantIndex, keysToAdd)
  }

  const handleRemoveVariantOptionKey = (
    variantIndex: number,
    keyToRemove: string
  ) => {
    const currentVariantKeys = sanitizeStringList(
      Object.keys(formData.variants[variantIndex]?.variantAttributes || {})
    )
    const nextKeys = currentVariantKeys.filter((key) => key !== keyToRemove)
    syncVariantWithOptionKeys(variantIndex, nextKeys)
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
      const autoAvailableCityIds = cities
        .map((city: any) => String(city?._id || '').trim())
        .filter(Boolean)
      const nextAvailableCityIds = sanitizeStringList(formData.availableCities).length
        ? sanitizeStringList(formData.availableCities)
        : autoAvailableCityIds

      const payload = {
        ...formData,
        mainCategory: primarySelectedMainCategoryId || formData.mainCategory,
        mainCategories: selectedMainCategoryIds.length
          ? selectedMainCategoryIds
          : sanitizeStringList(formData.mainCategories ?? formData.mainCategory),
        productCategory: selectedCategoryIds[0] || '',
        productCategories: selectedCategoryIds,
        availableCities: nextAvailableCityIds,
        websiteIds: sanitizeStringList(formData.websiteIds),
        variants: formData.variants.map((v) => ({
          ...v,
          _id: toTrimmedText(v._id),
          actualPrice: !v.actualPrice ? 0 : Number(v.actualPrice),
          finalPrice: !v.finalPrice ? 0 : Number(v.finalPrice),
          stockQuantity: !v.stockQuantity ? 0 : Number(v.stockQuantity),
          variantMetaKeywords: sanitizeStringList(v.variantMetaKeywords),
        })),
      }

      const res = await fetch(
        isEditMode
          ? `${import.meta.env.VITE_PUBLIC_API_URL}/v1/products/${initialEditorSearch.productId}/content`
          : `${import.meta.env.VITE_PUBLIC_API_URL}/v1/products/create`,
        {
          method: isEditMode ? 'PATCH' : 'POST',
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

      const nextSuccessMessage = responseBody?.message || (isEditMode
        ? 'Product updated successfully!'
        : 'Product created successfully!')

      if (isEditMode) {
        toast.success(nextSuccessMessage)
      } else {
        clearDraftStorage()
        resetDraftState()
        goToStep(1)
        setSuccessDialogMessage(nextSuccessMessage)
        setSuccessDialogOpen(true)
      }
    } catch (err: any) {
      toast.error(
        err?.message || (isEditMode ? 'Failed to update product' : 'Failed to create product')
      )
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
            selectedMainCategoryIds={selectedMainCategoryIds}
            setSelectedMainCategoryIds={setSelectedMainCategoryIds}
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
          <Step5Variants
            variants={formData.variants}
            recommendedAttributeKeys={recommendedVariantKeys}
            variantKeySuggestions={addVariantKeySuggestions}
            variantKeyContextLabel={variantKeyContextLabel}
            websiteOptions={websites}
            selectedWebsiteIds={formData.websiteIds}
            isWebsiteLoading={isWebsiteLoading}
            isAvailable={formData.isAvailable}
            aiLoading={aiLoading.variantKeys}
            onAddAttributeKey={handleAddVariantOptionKey}
            onAddSuggestedAttributeKeys={handleAddSuggestedVariantKeys}
            onRemoveAttributeKey={handleRemoveVariantOptionKey}
            onToggleAvailable={() =>
              setFormData((prev: ProductFormData) => ({
                ...prev,
                isAvailable: !prev.isAvailable,
              }))
            }
            onSelectedWebsiteIdsChange={(websiteIds) =>
              setFormData((prev: ProductFormData) => ({
                ...prev,
                websiteIds,
              }))
            }
            onGenerateSuggestedKeys={handleGenerateVariantKeySuggestions}
            onAddVariant={handleAddVariant}
            onCopyFromPreviousVariant={handleCopyVariantFromPrevious}
            onRemoveVariant={handleRemoveVariant}
            onVariantFieldChange={handleVariantFieldChange}
            onVariantAttributeChange={handleVariantAttributeChange}
            onVariantImageUpload={handleVariantImageUpload}
            onVariantImageDrop={handleVariantImageDrop}
            onVariantImageDelete={handleVariantImageDelete}
          />
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
                handleGenerateMetaTitle()
              }
              onGenerateDesc={() =>
                handleGenerateMetaDescription()
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
                        context: `Product: ${formData.productName}, Description: ${formData.shortDescription}, Categories: ${selectedCategoryNames.join(', ')}`
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
                    const variantContext = formData.variants
                      .map((variant) =>
                        Object.entries(variant.variantAttributes || {})
                          .filter(([, value]) => String(value || '').trim())
                          .map(([key, value]) => `${key}: ${value}`)
                          .join(', ')
                      )
                      .filter(Boolean)
                      .join(' | ')
                    const context = `Product: ${formData.productName}, Description: ${formData.shortDescription}, Categories: ${selectedCategoryNames.join(', ') || selectedMainCategoryName}, Variant keys: ${allVariantAttributeKeys.join(', ')}, Variant values: ${variantContext}`
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
      title: 'Variants & Visibility',
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
                Products / {isEditMode ? 'Update product' : 'Create product'}
              </div>
              <h1 className='mt-2 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl'>
                {isEditMode ? 'Update product' : 'Create product'}
              </h1>
              <p className='mt-2 max-w-3xl text-sm leading-6 text-muted-foreground sm:text-base'>
                {isEditMode
                  ? 'Edit product details, update variants, and review search content in the same step-by-step editor.'
                  : 'Add product details, configure variants, and finish search content in'}
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
                  if (isEditMode) {
                    if (typeof window !== 'undefined') {
                      window.location.assign(
                        `/products/create-products?mode=edit&productId=${encodeURIComponent(initialEditorSearch.productId)}`
                      )
                    }
                    return
                  }
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
                {isEditMode ? 'Reset Changes' : 'Reset Draft'}
              </Button>
            </div>
          </div>
        </section>

        <div ref={formTopRef} className='rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-6'>
          {isEditProductLoading ? (
            <div className='mb-6 flex items-center gap-2 rounded-2xl border border-border bg-background px-4 py-3 text-sm text-muted-foreground'>
              <Loader2 className='h-4 w-4 animate-spin' />
              Loading product details...
            </div>
          ) : null}
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
                <div className='flex flex-wrap items-center gap-3'>
                  <button
                    type='button'
                    onClick={() => setPreviewOpen(true)}
                    className='inline-flex h-11 items-center gap-2 rounded-xl border border-border bg-background px-5 text-sm font-semibold text-foreground transition hover:bg-secondary'
                  >
                    <Search className='h-4 w-4' />
                    Product Preview
                  </button>
                  <button
                    type='button'
                    onClick={handleSubmit}
                    disabled={loading || isEditProductLoading}
                    className='inline-flex h-11 items-center gap-2 rounded-xl bg-emerald-600 px-5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70'
                  >
                    {loading && <Loader2 className='h-4 w-4 animate-spin' />}
                    {isEditMode ? 'Update Product' : 'Create Product'}
                  </button>
                </div>
              )}
            </div>
          </form>
        </div>
      </div>

      <ProductPreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        formData={previewFormData}
        mainCategoryLabels={selectedMainCategoryNames}
        categoryLabels={selectedCategoryNames}
        subcategoryLabels={selectedSubcategoryNames}
        websiteLabels={selectedWebsiteNames}
        cityLabels={selectedCityNames}
        searchPreviewTitle={formData.metaTitle?.trim() || defaultMetaTitle || 'Search title preview'}
        searchPreviewDescription={
          formData.metaDescription?.trim() ||
          defaultMetaDescription ||
          'Meta description will show here once the vendor fills Step 3.'
        }
      />

      <Dialog open={successDialogOpen} onOpenChange={setSuccessDialogOpen}>
        <DialogContent className='max-w-md rounded-[28px] border-border p-0 shadow-2xl'>
          <div className='rounded-t-[28px] border-b border-border bg-card px-6 py-5'>
            <div className='mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-600 text-white'>
              <CheckCircle2 className='h-6 w-6' />
            </div>
            <DialogHeader className='text-left'>
              <DialogTitle className='text-2xl font-semibold text-foreground'>
                {isEditMode ? 'Product Updated' : 'Product Created'}
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
