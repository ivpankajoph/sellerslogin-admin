// src/components/ProductCreate/index.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { fetchVendorProfile } from '@/store/slices/vendor/profileSlice'
import {
  ArrowLeft,
  ArrowRight,
  CircleHelp,
  Eye,
  CheckCircle2,
  ImagePlus,
  Layers3,
  Loader2,
  PackagePlus,
  Search,
} from 'lucide-react'
import { useDispatch, useSelector } from 'react-redux'
import { toast } from 'sonner'
import {
  getVendorTemplateProductUrl,
  resolvePreviewCityFromVendorProfile,
} from '@/lib/storefront-url'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { SidebarInset, SidebarTrigger } from '@/components/ui/sidebar'
import { generateWithAI } from './aiHelpers'
import { deleteFromCloudinary, uploadToCloudinary } from './cloudinary'
import ProductEditorSidebar from './components/ProductEditorSidebar'
// import ProductMediaSection from './components/ProductMediaSection'
import Step1BasicInfo from './components/Step1BasicInfo'
import Step2Images from './components/Step2Images'
import Step4SEO from './components/Step4SEO'
import Step5Variants from './components/Step5Variants'
import Step6FAQs from './components/Step6FAQs'
import { fieldConfig } from './helpers/SpecificationsData'
import {
  type ImageUpload,
  type ProductFormData,
  type ProductSpecification,
  type Variant,
} from './types/type'

// Interfaces

// Specification templates by category

const PRODUCT_CREATE_DRAFT_STORAGE_PREFIX = 'product_create_draft'
const PRODUCT_CREATE_DRAFT_VERSION = 4
const PRODUCT_CREATE_DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000
const PRODUCT_CREATE_STEP_COUNT = 5
const VARIANT_SUGGESTION_DISPLAY_LIMIT = 15
const PRODUCT_PREVIEW_STORAGE_TTL_MS = 30 * 60 * 1000
const MAX_PRODUCT_IMAGES = 8
const MAX_VARIANT_IMAGES = 3
const MIN_SPECIFICATION_KEY_COUNT = 6
const MAX_DESCRIPTION_WORDS = 2000
const PRODUCT_PREVIEW_MESSAGE_TYPE = 'template-product-preview-draft'

type VariantContextRule = {
  patterns: RegExp[]
  configKeys?: string[]
  fallbackKeys?: string[]
  variantKeys?: string[]
  detailKeys?: string[]
  allowedDetailKeyPatterns?: RegExp[]
}

const createProductPreviewPayload = (
  sessionId: string,
  vendorId: string | undefined,
  formData: ProductFormData
) => ({
  type: PRODUCT_PREVIEW_MESSAGE_TYPE,
  sessionId,
  vendorId,
  payload: {
    savedAt: Date.now(),
    expiresAt: Date.now() + PRODUCT_PREVIEW_STORAGE_TTL_MS,
    formData,
  },
})

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
    detailKeys: [
      'Lens Power',
      'Base Curve',
      'Diameter',
      'Pack Size',
      'Wear Duration',
    ],
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
    patterns: [
      /power lens/i,
      /optical lens/i,
      /reading lens/i,
      /prescription lens/i,
    ],
    fallbackKeys: ['Lens Power', 'Lens Type', 'Diameter'],
    variantKeys: ['Lens Power', 'Lens Type', 'Diameter'],
    detailKeys: [
      'Lens Power',
      'Lens Type',
      'Diameter',
      'Lens Material',
      'Coating',
    ],
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
    detailKeys: [
      'Dial Color',
      'Band Material',
      'Case Size',
      'Case Material',
      'Strap Color',
    ],
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
    patterns: [/mobile/i, /smartphone/i, /\bphones?\b/i],
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
    detailKeys: [
      'Display Size',
      'Screen Resolution',
      'Screen Type',
      'Refresh Rate',
      'Connectivity',
    ],
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
    detailKeys: [
      'Color',
      'Connectivity',
      'Type',
      'Battery Life',
      'Water Resistance',
    ],
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
    patterns: [
      /accessor/i,
      /cover/i,
      /case/i,
      /charger/i,
      /cable/i,
      /power bank/i,
    ],
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
  actualPrice: 0,
  salePrice: 0,
  stockQuantity: 0,
  replacementPolicyType: 'replacement_return',
  replacementPolicyDays: '',
  defaultImages: [],
  isAvailable: true,
  metaTitle: '',
  metaDescription: '',
  metaKeywords: [],
  specifications: [],
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
  website_slug?: string
  template_key?: string
  template_name?: string
  name?: string
  business_name?: string
  previewImage?: string
  createdAt?: string
  is_default?: boolean
}

const buildProductCreateDraftStorageKey = (vendorId: string) =>
  `${PRODUCT_CREATE_DRAFT_STORAGE_PREFIX}_${vendorId}`

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const toText = (value: unknown) =>
  typeof value === 'string' ? value : value == null ? '' : String(value)

const toTrimmedText = (value: unknown) => toText(value).trim()

const countWords = (value: unknown) =>
  toText(value)
    .replace(/<[^>]*>/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length

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

const slugifyPreviewProductPath = (value: string) =>
  toTrimmedText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'preview-product'

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

  if (!normalizedDescription || !normalizedCityLabel)
    return normalizedDescription
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
  const shortCopy = ensureMetaDescriptionIncludesCity(
    shortDescription,
    cityLabel
  )
  if (shortCopy) return shortCopy

  const descriptionCopy = ensureMetaDescriptionIncludesCity(
    description,
    cityLabel
  )
  if (descriptionCopy) return descriptionCopy

  const productLabel =
    buildMetaProductLabel(productName, brand) || 'this product'
  const normalizedCategoryLabel = toTrimmedText(categoryLabel)
  const normalizedCityLabel = toTrimmedText(cityLabel)
  const categorySuffix =
    normalizedCategoryLabel &&
    !includesTextIgnoreCase(productLabel, normalizedCategoryLabel)
      ? ` in ${normalizedCategoryLabel}`
      : ''
  const citySuffix =
    normalizedCityLabel &&
    !includesTextIgnoreCase(productLabel, normalizedCityLabel)
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

const normalizeComparableKey = (value: unknown) =>
  toTrimmedText(value).toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ')

const areSameStringLists = (left: string[], right: string[]) => {
  const normalizedLeft = [...sanitizeStringList(left)].sort()
  const normalizedRight = [...sanitizeStringList(right)].sort()

  return (
    normalizedLeft.length === normalizedRight.length &&
    normalizedLeft.every((value, index) => value === normalizedRight[index])
  )
}

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

  return Object.entries(value).reduce<Record<string, string>>(
    (acc, [key, entryValue]) => {
      const normalizedKey = toTrimmedText(key)
      if (!normalizedKey) return acc
      acc[normalizedKey] = toText(entryValue)
      return acc
    },
    {}
  )
}

const sanitizeSpecifications = (value: unknown): ProductSpecification[] => {
  if (!Array.isArray(value)) return []

  return value
    .map((item) => sanitizeStringRecord(item))
    .filter((item) => Object.keys(item).length > 0)
}

const collectFieldConfigKeys = (configKey: string) =>
  Array.isArray(fieldConfig?.[configKey])
    ? fieldConfig[configKey]
        .map((field) => toTrimmedText(field?.label || field?.name))
        .filter(Boolean)
        .slice(0, 8)
    : []

const collectSpecificationFieldConfigKeys = (configKey: string) =>
  Array.isArray(fieldConfig?.[configKey])
    ? fieldConfig[configKey]
        .map((field) => toTrimmedText(field?.label || field?.name))
        .filter(Boolean)
    : []

const filterExcludedKeys = (keys: string[], excludedKeys: string[] = []) => {
  const excludedSet = new Set(
    sanitizeStringList(excludedKeys).map((key) => normalizeComparableKey(key))
  )

  return sanitizeStringList(keys).filter(
    (key) => !excludedSet.has(normalizeComparableKey(key))
  )
}

const COMMON_SPECIFICATION_KEYS = [
  'Brand',
  'Product Features',
  'Packaging Type',
  'Net Quantity',
  'Units per Pack',
  'Sales Package / In The Box',
  'Minimum Order Quantity (MOQ)',
  'Country of Origin',
  'Supply Ability',
  'Dispatch Time',
  'Delivery Time',
  'Shipping Charges',
  'Replacement Policy',
  'Customer Support',
  'Connectivity',
  'Compatibility',
  'Battery Life',
  'Model Number',
  'Product Type',
  'Dimensions',
  'Weight',
  'Material',
]

const PRODUCT_DETAIL_BLOCKED_KEY_PATTERNS = [
  /\bprice\b/i,
  /\bmrp\b/i,
  /\bcost\b/i,
  /\bdiscount\b/i,
  /\boffer\b/i,
  /\bsale\b/i,
  /\bselling\b/i,
  /\bamount\b/i,
  /\bcurrency\b/i,
  /\bretail\b/i,
]

const isBlockedProductDetailKey = (key: string) =>
  PRODUCT_DETAIL_BLOCKED_KEY_PATTERNS.some((pattern) =>
    pattern.test(String(key || ''))
  )

const filterProductDetailKeys = (keys: string[], excludedKeys: string[] = []) =>
  filterExcludedKeys(keys, excludedKeys).filter(
    (key) => !isBlockedProductDetailKey(key)
  )

const filterKeysByPatterns = (keys: string[], patterns: RegExp[]) => {
  if (!patterns.length) return sanitizeStringList(keys)

  return sanitizeStringList(
    keys.filter((key) =>
      patterns.some((pattern) => pattern.test(String(key || '')))
    )
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
  GENERIC_VARIANT_KEY_PATTERNS.some((pattern) =>
    pattern.test(String(key || ''))
  )

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

const buildRecommendedSpecificationKeysForContext = (
  apiKeys: string[],
  contextNames: string[],
  excludedKeys: string[] = []
) => {
  const matchedRule = getVariantContextRule(contextNames)
  const configFieldKeys = sanitizeStringList(
    (matchedRule?.configKeys || []).flatMap(collectSpecificationFieldConfigKeys)
  )
  const contextualKeys = sanitizeStringList(matchedRule?.detailKeys || [])
  const filteredConfigKeys = filterProductDetailKeys(
    configFieldKeys,
    excludedKeys
  )
  const filteredApiKeys = filterProductDetailKeys(apiKeys, excludedKeys)
  const filteredContextualKeys = filterProductDetailKeys(
    contextualKeys,
    excludedKeys
  )

  const keys = sanitizeStringList([
    ...filteredConfigKeys,
    ...filteredApiKeys,
    ...filteredContextualKeys,
  ])

  if (keys.length >= MIN_SPECIFICATION_KEY_COUNT) {
    return keys
  }

  return sanitizeStringList([
    ...keys,
    ...filterProductDetailKeys(COMMON_SPECIFICATION_KEYS, [
      ...excludedKeys,
      ...keys,
    ]),
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
    variantDisplayName: toText(raw.variantDisplayName),
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

const buildEditModeHydratedFormData = (
  product: Record<string, unknown>
): ProductFormData =>
  sanitizeProductFormData({
    mainCategory:
      getIdValue(product.mainCategory) || getIdValue(product.mainCategoryData),
    mainCategories: mapIdList(product.mainCategories).length
      ? mapIdList(product.mainCategories)
      : [
          getIdValue(product.mainCategory) ||
            getIdValue(product.mainCategoryData),
        ].filter(Boolean),
    productName: product.productName,
    productCategory:
      getIdValue(product.productCategory) ||
      getIdValue(product.productCategoryData),
    productCategories: mapIdList(product.productCategories).length
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
    actualPrice:
      product.actualPrice ??
      (Array.isArray(product.variants) && isRecord(product.variants[0])
        ? product.variants[0].actualPrice
        : 0),
    salePrice:
      product.salePrice ??
      (Array.isArray(product.variants) && isRecord(product.variants[0])
        ? product.variants[0].finalPrice
        : 0),
    stockQuantity:
      product.stockQuantity ??
      (Array.isArray(product.variants) && isRecord(product.variants[0])
        ? product.variants[0].stockQuantity
        : 0),
    replacementPolicyType: product.replacementPolicyType,
    replacementPolicyDays: product.replacementPolicyDays,
    defaultImages: product.defaultImages,
    isAvailable: product.isAvailable,
    metaTitle: product.metaTitle,
    metaDescription: product.metaDescription,
    metaKeywords: product.metaKeywords,
    specifications: product.specifications,
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
    actualPrice: toNumberValue(raw.actualPrice),
    salePrice: toNumberValue(raw.salePrice),
    stockQuantity: toNumberValue(raw.stockQuantity),
    replacementPolicyType:
      toTrimmedText(raw.replacementPolicyType) || 'replacement_return',
    replacementPolicyDays: toText(raw.replacementPolicyDays),
    defaultImages: sanitizeImageUploads(raw.defaultImages),
    isAvailable: raw.isAvailable !== false,
    metaTitle: toText(raw.metaTitle),
    metaDescription: toText(raw.metaDescription),
    metaKeywords: sanitizeStringList(raw.metaKeywords),
    specifications: sanitizeSpecifications(raw.specifications),
    variants: Array.isArray(raw.variants)
      ? raw.variants.map(sanitizeVariant)
      : [],
    faqs: sanitizeFaqs(raw.faqs),
  }
}

const clampProductCreateStep = (value: unknown) => {
  const numericValue = Number(value)
  if (!Number.isFinite(numericValue)) return 1
  return Math.min(
    PRODUCT_CREATE_STEP_COUNT,
    Math.max(1, Math.trunc(numericValue))
  )
}

const sortEntitiesByName = <T extends { name?: string }>(items: T[]) =>
  [...items].sort((a, b) =>
    String(a?.name || '').localeCompare(String(b?.name || ''), undefined, {
      sensitivity: 'base',
    })
  )

const mergeEntityById = <T extends { _id?: string }>(
  items: T[],
  nextItem: T
) => {
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

const sanitizeProductCreateDraft = (
  value: unknown
): ProductCreateDraft | null => {
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
  const previewWindowRef = useRef<Window | null>(null)
  const [previewSessionId, setPreviewSessionId] = useState<string | null>(null)
  const [previewTargetOrigin, setPreviewTargetOrigin] = useState<string>('*')

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
    initialEditorSearch.mode === 'edit' &&
    Boolean(initialEditorSearch.productId)
  const draftStorageKey = vendorId
    ? `${buildProductCreateDraftStorageKey(vendorId)}_${isEditMode ? `edit_${initialEditorSearch.productId}` : 'create'}`
    : ''
  const restoredVariantAttributeKeysRef = useRef<string[] | null>(null)
  const lastAutoAppliedVariantKeyContextRef = useRef('')
  const lastAutoAppliedMetaTitleRef = useRef('')
  const lastAutoAppliedMetaDescriptionRef = useRef('')
  const lastGeneratedVariantSuggestionContextRef = useRef('')
  const lastAutoGeneratedSpecificationContextRef = useRef('')
  const lastAutoGeneratedSpecificationKeysRef = useRef<string[]>([])
  const formTopRef = useRef<HTMLDivElement | null>(null)

  // Form state
  const [formData, setFormData] = useState<ProductFormData>(() =>
    createInitialFormData()
  )

  const [mainCategories, setMainCategories] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [cities, setCities] = useState<any[]>([])
  const [websites, setWebsites] = useState<WebsiteCard[]>([])
  const [isMainCategoryLoading, setIsMainCategoryLoading] = useState(false)
  const [isCategoryLoading, setIsCategoryLoading] = useState(false)
  const [isWebsiteLoading, setIsWebsiteLoading] = useState(false)
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([])
  const [selectedMainCategoryIds, setSelectedMainCategoryIds] = useState<
    string[]
  >([])
  const [filteredSubcategories, setFilteredSubcategories] = useState<any[]>([])
  const [variantAttributeKeys, setVariantAttributeKeys] = useState<string[]>([])
  const [recommendedVariantKeys, setRecommendedVariantKeys] = useState<
    string[]
  >([])

  // Live Preview Update
  useEffect(() => {
    const previewWin = previewWindowRef.current
    if (!previewWin || previewWin.closed || !previewSessionId) return

    const timer = setTimeout(() => {
      const previewPayload = createProductPreviewPayload(
        previewSessionId,
        vendorId,
        formData
      )
      previewWin.postMessage(previewPayload, previewTargetOrigin)
    }, 250)

    return () => clearTimeout(timer)
  }, [formData, previewSessionId, vendorId, previewTargetOrigin])

  // Listen for the preview window signaling it's ready (e.g. after a refresh)
  useEffect(() => {
    if (!previewSessionId) return

    const handleMessage = (event: MessageEvent) => {
      if (
        event.data?.type === 'preview-window-ready' &&
        event.data?.sessionId === previewSessionId
      ) {
        const previewPayload = createProductPreviewPayload(
          previewSessionId,
          vendorId,
          formData
        )
        previewWindowRef.current?.postMessage(
          previewPayload,
          previewTargetOrigin
        )
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [formData, previewSessionId, vendorId, previewTargetOrigin])

  // Initial load
  const [loading, setLoading] = useState(false)
  const [aiLoading, setAiLoading] = useState<any>({
    metaTitle: false,
    metaDescription: false,
    metaKeywords: false,
    specificationKeys: false,
    variantKeys: false,
    faqs: false,
  })
  const [currentStep, setCurrentStep] = useState(1)
  const [metaKeywordInput, setMetaKeywordInput] = useState('')
  const [isDraftHydrated, setIsDraftHydrated] = useState(false)
  const [draftSavedAt, setDraftSavedAt] = useState<number | null>(null)
  const [successDialogOpen, setSuccessDialogOpen] = useState(false)
  const [successDialogMessage, setSuccessDialogMessage] = useState('')
  const [isPreviewLoading, setIsPreviewLoading] = useState(false)
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

      restoredVariantAttributeKeysRef.current = parsedDraft.variantAttributeKeys
        .length
        ? parsedDraft.variantAttributeKeys
        : null

      setFormData(parsedDraft.formData)
      setSelectedMainCategoryIds(
        parsedDraft.selectedMainCategoryIds.length
          ? parsedDraft.selectedMainCategoryIds
          : sanitizeStringList(
              parsedDraft.formData.mainCategories ??
                parsedDraft.formData.mainCategory
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
    if (
      !isDraftHydrated ||
      !vendorId ||
      !draftStorageKey ||
      typeof window === 'undefined'
    ) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      const draftToPersist: ProductCreateDraft = {
        version: PRODUCT_CREATE_DRAFT_VERSION,
        savedAt: Date.now(),
        formData: sanitizeProductFormData(formData),
        selectedMainCategoryIds: selectedMainCategoryIds.length
          ? selectedMainCategoryIds
          : sanitizeStringList(
              formData.mainCategories ?? formData.mainCategory
            ),
        selectedCategoryIds: selectedCategoryIds.length
          ? selectedCategoryIds
          : sanitizeStringList(formData.productCategories),
        currentStep: clampProductCreateStep(currentStep),
        variantAttributeKeys: sanitizeStringList(variantAttributeKeys),
        metaKeywordInput,
      }

      try {
        window.localStorage.setItem(
          draftStorageKey,
          JSON.stringify(draftToPersist)
        )
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
          throw new Error(
            result?.message || 'Failed to load product for editing'
          )
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
      (category: any) =>
        String(category?._id) === String(primarySelectedMainCategoryId)
    )
    return String(current?.name || '').trim()
  }, [mainCategories, primarySelectedMainCategoryId])

  const selectedCategoryNames = useMemo(
    () =>
      categories
        .filter((category: any) =>
          selectedCategoryIds.includes(String(category?._id || ''))
        )
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

  const specificationCategoryContext = useMemo(
    () =>
      sanitizeStringList([
        selectedMainCategoryName,
        ...selectedCategoryNames,
        ...selectedSubcategoryNames,
      ]).join(', '),
    [selectedCategoryNames, selectedMainCategoryName, selectedSubcategoryNames]
  )

  const specificationContextSignature = useMemo(
    () =>
      [
        primarySelectedMainCategoryId,
        ...selectedCategoryIds,
        ...formData.productSubCategories,
      ]
        .filter(Boolean)
        .join('|'),
    [
      formData.productSubCategories,
      primarySelectedMainCategoryId,
      selectedCategoryIds,
    ]
  )

  const addVariantKeySuggestions = useMemo(
    () =>
      getSuggestedVariantKeysForContext(
        recommendedVariantKeys,
        variantContextNames
      ).slice(0, VARIANT_SUGGESTION_DISPLAY_LIMIT),
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

  const specificationExcludedKeys = useMemo(
    () => sanitizeStringList(allVariantAttributeKeys),
    [allVariantAttributeKeys]
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
    const registrationCity = toTrimmedText(
      vendorProfile?.city || authUser?.city
    )
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
    [
      formData.brand,
      formData.productName,
      primarySeoCategoryLabel,
      seoDefaultCityLabel,
    ]
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
        currentCityIds.every(
          (cityId, index) => cityId === allVisibleCityIds[index]
        )
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
      const nextWebsiteIds = sanitizeStringList(prev.websiteIds).filter(
        (websiteId) => visibleWebsiteIds.has(websiteId)
      )

      if (
        nextWebsiteIds.length === prev.websiteIds.length &&
        nextWebsiteIds.every(
          (websiteId, index) => websiteId === prev.websiteIds[index]
        )
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
          new Map(
            merged.map((category: any) => [
              String(category?._id || ''),
              category,
            ])
          ).values()
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
          const categoryName =
            categoryNameById[categoryId] || 'Unknown Category'

          merged.push(
            ...json.data.map((subcategory: any) => ({
              ...subcategory,
              categoryName,
            }))
          )
        }

        const unique = Array.from(
          new Map(
            merged.map((subcategory) => [subcategory._id, subcategory])
          ).values()
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
    setMainCategories((prev) =>
      sortEntitiesByName(mergeEntityById(prev, created))
    )
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
      (category: any) =>
        String(category?._id) === String(primarySelectedMainCategoryId)
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
      (category: any) =>
        String(category?._id) === String(primarySelectedMainCategoryId)
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
          variantAttributes: normalizedKeys.reduce<Record<string, string>>(
            (acc, key) => {
              acc[key] = String(targetVariant.variantAttributes?.[key] || '')
              return acc
            },
            {}
          ),
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
    const fallbackKeys = buildRecommendedVariantKeysForContext(
      [],
      suggestionContextNames
    )
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
          lastAutoAppliedVariantKeyContextRef.current =
            variantKeyContextSignature
        }
      } catch {
        setRecommendedVariantKeys(fallbackKeys)

        if (shouldAutoApplyRecommendedKeys) {
          setVariantAttributeKeys(fallbackKeys)
          lastAutoAppliedVariantKeyContextRef.current =
            variantKeyContextSignature
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
      const lastAutoAppliedDescription =
        lastAutoAppliedMetaDescriptionRef.current

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
  const buildProductAiContext = (
    target: 'shortDescription' | 'description'
  ) => {
    const specificationSummary = Object.entries(
      formData.specifications[0] || {}
    )
      .map(([key, value]) => {
        const cleanValue = toTrimmedText(value)
        return cleanValue ? `${key}: ${cleanValue}` : ''
      })
      .filter(Boolean)
      .slice(0, 12)
      .join('; ')

    return [
      `Target field: ${target}`,
      `Product name: ${toTrimmedText(formData.productName) || 'N/A'}`,
      `Brand: ${toTrimmedText(formData.brand) || 'N/A'}`,
      `Product category: ${selectedMainCategoryName || 'N/A'}`,
      `Product sub categories: ${selectedCategoryNames.join(', ') || 'N/A'}`,
      `Product sub category 2: ${selectedSubcategoryNames.join(', ') || 'N/A'}`,
      `Actual price: ${formData.actualPrice || 'N/A'}`,
      `Sale price: ${formData.salePrice || 'N/A'}`,
      `Existing short description: ${toTrimmedText(formData.shortDescription) || 'N/A'}`,
      `Specifications/features: ${specificationSummary || 'N/A'}`,
    ].join('\n')
  }

  const generateShortDesc = () =>
    generateWithAI(
      'shortDescription',
      buildProductAiContext('shortDescription'),
      setAiLoading,
      setFormData
    )

  const generateDescription = () =>
    generateWithAI(
      'description',
      buildProductAiContext('description'),
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
      lastGeneratedVariantSuggestionContextRef.current ===
        suggestionContextSignature
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
      lastGeneratedVariantSuggestionContextRef.current =
        suggestionContextSignature
    } catch (error: any) {
      return
    } finally {
      setAiLoading((prev: any) => ({ ...prev, variantKeys: false }))
    }
  }

  // --- Variant Handlers ---
  // --- Variant Handlers ---

  const handleAddVariant = (selectedKeys: string[]) => {
    const initialKeys = sanitizeStringList(
      selectedKeys.length ? selectedKeys : variantAttributeKeys
    )

    if (!initialKeys.length) return

    setVariantAttributeKeys((prev) =>
      sanitizeStringList([...prev, ...initialKeys])
    )
    setFormData((prev: ProductFormData) => ({
      ...prev,
      variants: [
        ...prev.variants,
        {
          variantDisplayName: '',
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
    setFormData((prev: ProductFormData) => ({
      ...prev,
      variants: prev.variants.filter(
        (_, variantIndex) => variantIndex !== index
      ),
    }))
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

      const targetAttributes = sanitizeStringRecord(
        targetVariant.variantAttributes
      )
      const previousAttributes = sanitizeStringRecord(
        previousVariant.variantAttributes
      )
      const targetKeys = sanitizeStringList(Object.keys(targetAttributes))
      const previousKeys = sanitizeStringList(Object.keys(previousAttributes))
      const protectedVariantKey = targetKeys[0] || ''
      const nextAttributeKeys = sanitizeStringList([
        ...targetKeys,
        ...previousKeys,
      ])

      variants[variantIndex] = {
        ...targetVariant,
        variantAttributes: nextAttributeKeys.reduce<Record<string, string>>(
          (acc, key) => {
            if (key === protectedVariantKey) {
              acc[key] = toText(targetAttributes[key] || '')
              return acc
            }

            acc[key] = toText(
              previousAttributes[key] ?? targetAttributes[key] ?? ''
            )
            return acc
          },
          {}
        ),
        variantDisplayName: toText(targetVariant.variantDisplayName || ''),
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
    setFormData((prev: ProductFormData) => {
      const targetVariant = prev.variants[index]
      if (!targetVariant) return prev

      const normalizedValue =
        field === 'actualPrice' ||
        field === 'finalPrice' ||
        field === 'stockQuantity'
          ? value === '' || value === null || value === undefined
            ? 0
            : Number(value)
          : field === 'isActive'
            ? Boolean(value)
            : value

      const variants = [...prev.variants]
      variants[index] = {
        ...targetVariant,
        [field]: normalizedValue,
      }

      return { ...prev, variants }
    })
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

  const uploadDefaultImageFiles = async (
    files: File[],
    replaceIndex?: number
  ) => {
    const imageFiles = files.filter((file) => file.type.startsWith('image/'))
    if (!imageFiles.length) return

    const isReplacing = typeof replaceIndex === 'number' && replaceIndex >= 0
    const filesToUpload = isReplacing ? imageFiles.slice(0, 1) : imageFiles
    const existingImageCount = formData.defaultImages.length
    const availableSlots = isReplacing
      ? 1
      : Math.max(0, MAX_PRODUCT_IMAGES - existingImageCount)

    if (!availableSlots) {
      toast.error(`You can upload up to ${MAX_PRODUCT_IMAGES} product images.`)
      return
    }

    const nextFiles = filesToUpload.slice(0, availableSlots)
    if (!isReplacing && nextFiles.length < imageFiles.length) {
      toast.error(`Only ${MAX_PRODUCT_IMAGES} product images are allowed.`)
    }

    const tempImages = nextFiles.map((file, index) => ({
      url: URL.createObjectURL(file),
      publicId: '',
      uploading: true,
      tempId: `default-upload-${Date.now()}-${index}`,
    }))

    const previousPublicId = isReplacing
      ? formData.defaultImages[replaceIndex]?.publicId
      : ''

    setFormData((prev: ProductFormData) => {
      if (!isReplacing) {
        return {
          ...prev,
          defaultImages: [...prev.defaultImages, ...tempImages],
        }
      }

      const nextImages = [...prev.defaultImages]
      nextImages[replaceIndex] = tempImages[0]
      return {
        ...prev,
        defaultImages: nextImages,
      }
    })

    for (let i = 0; i < nextFiles.length; i++) {
      const result = await uploadToCloudinary(nextFiles[i])
      if (!result) continue

      setFormData((prev: ProductFormData) => ({
        ...prev,
        defaultImages: prev.defaultImages.map((image) =>
          image.tempId === tempImages[i].tempId
            ? {
                url: result.url,
                publicId: result.publicId,
                uploading: false,
              }
            : image
        ),
      }))

      if (isReplacing && previousPublicId) {
        await deleteFromCloudinary(previousPublicId)
      }
    }
  }

  const handleDefaultImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = Array.from(event.target.files || [])
    event.target.value = ''
    await uploadDefaultImageFiles(files)
  }

  const handleDefaultImageDrop = async (files: File[]) => {
    await uploadDefaultImageFiles(files)
  }

  const handleDefaultImageReplace = async (
    imageIndex: number,
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = Array.from(event.target.files || [])
    event.target.value = ''
    await uploadDefaultImageFiles(files, imageIndex)
  }

  const handleDefaultImageDelete = async (imageIndex: number) => {
    const publicId = formData.defaultImages[imageIndex]?.publicId
    if (publicId) {
      await deleteFromCloudinary(publicId)
    }

    setFormData((prev: ProductFormData) => ({
      ...prev,
      defaultImages: prev.defaultImages.filter(
        (_, index) => index !== imageIndex
      ),
    }))
  }

  const uploadVariantFiles = async (
    variantIndex: number,
    files: File[],
    replaceIndex?: number
  ) => {
    const imageFiles = files.filter((file) => file.type.startsWith('image/'))
    if (!imageFiles.length) return

    const isReplacing = typeof replaceIndex === 'number' && replaceIndex >= 0
    const filesToUpload = isReplacing ? imageFiles.slice(0, 1) : imageFiles
    const existingImageCount =
      formData.variants[variantIndex]?.variantsImageUrls?.length || 0
    const availableSlots = isReplacing
      ? 1
      : Math.max(0, MAX_VARIANT_IMAGES - existingImageCount)

    if (!availableSlots) {
      toast.error(
        `You can upload up to ${MAX_VARIANT_IMAGES} images per variant.`
      )
      return
    }

    const nextFiles = filesToUpload.slice(0, availableSlots)

    if (!isReplacing && nextFiles.length < imageFiles.length) {
      toast.error(`Only ${MAX_VARIANT_IMAGES} images are allowed per variant.`)
    }

    const tempImages = nextFiles.map((file, idx) => ({
      url: URL.createObjectURL(file),
      publicId: '',
      uploading: true,
      tempId: `upload-${variantIndex}-${Date.now()}-${idx}`,
    }))

    const previousPublicId = isReplacing
      ? formData.variants[variantIndex]?.variantsImageUrls?.[replaceIndex]
          ?.publicId
      : ''

    setFormData((prev: ProductFormData) => {
      const variants = [...prev.variants]
      if (!variants[variantIndex]) return prev

      if (isReplacing) {
        const nextImages = [...variants[variantIndex].variantsImageUrls]
        nextImages[replaceIndex] = tempImages[0]
        variants[variantIndex] = {
          ...variants[variantIndex],
          variantsImageUrls: nextImages,
        }
        return { ...prev, variants }
      }

      variants[variantIndex] = {
        ...variants[variantIndex],
        variantsImageUrls: [
          ...variants[variantIndex].variantsImageUrls,
          ...tempImages,
        ],
      }
      return { ...prev, variants }
    })

    for (let i = 0; i < nextFiles.length; i++) {
      const result = await uploadToCloudinary(nextFiles[i])
      if (!result) continue

      setFormData((prev: ProductFormData) => {
        const variants = [...prev.variants]
        if (!variants[variantIndex]) return prev
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

      if (isReplacing && previousPublicId) {
        await deleteFromCloudinary(previousPublicId)
      }
    }
  }

  const handleVariantImageUpload = async (
    variantIndex: number,
    imageIndex: number,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = Array.from(e.target.files || [])
    if (!files.length) return

    e.target.value = '' // prevent reselect bug
    await uploadVariantFiles(variantIndex, files, imageIndex)
  }

  const handleVariantImageDrop = async (
    variantIndex: number,
    files: File[]
  ) => {
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
        const nextKeys = sanitizeStringList([
          ...currentVariantKeys,
          ...normalizedKeys,
        ])

        if (nextKeys.length === currentVariantKeys.length) {
          return prev
        }

        variants[variantIndex] = {
          ...targetVariant,
          variantAttributes: nextKeys.reduce<Record<string, string>>(
            (acc, key) => {
              acc[key] = String(targetVariant.variantAttributes?.[key] || '')
              return acc
            },
            {}
          ),
        }

        return { ...prev, variants }
      })
    },
    []
  )

  const handleAddVariantOptionKey = (
    variantIndex: number,
    keyToAdd: string
  ) => {
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

  const applySpecificationKeys = useCallback(
    (keysToApply: string[], mode: 'merge' | 'replace' = 'merge') => {
      const normalizedKeys = filterProductDetailKeys(keysToApply)

      setFormData((prev: ProductFormData) => {
        const currentSpec = prev.specifications[0] || {}
        const nextSpec =
          mode === 'replace'
            ? normalizedKeys.reduce<ProductSpecification>((acc, key) => {
                acc[key] = String(currentSpec[key] || '')
                return acc
              }, {})
            : normalizedKeys.reduce<ProductSpecification>(
                (acc, key) => {
                  if (!(key in acc)) {
                    acc[key] = ''
                  }
                  return acc
                },
                { ...currentSpec }
              )

        const currentKeys = sanitizeStringList(Object.keys(currentSpec))
        const nextKeys = sanitizeStringList(Object.keys(nextSpec))
        const hasKeyChanges = !areSameStringLists(currentKeys, nextKeys)
        const hasValueChanges = nextKeys.some(
          (key) =>
            String(currentSpec[key] || '') !== String(nextSpec[key] || '')
        )

        if (!hasKeyChanges && !hasValueChanges) return prev

        return {
          ...prev,
          specifications: nextKeys.length ? [nextSpec] : [],
        }
      })
    },
    []
  )

  const handleSpecificationChange = (key: string, value: string) => {
    const normalizedKey = toTrimmedText(key)
    if (!normalizedKey) return

    setFormData((prev: ProductFormData) => {
      const currentSpec = prev.specifications[0] || {}
      return {
        ...prev,
        specifications: [
          {
            ...currentSpec,
            [normalizedKey]: value,
          },
        ],
      }
    })
  }

  const handleAddSpecificationKey = (key: string) => {
    if (isBlockedProductDetailKey(key)) {
      toast.error('Price fields belong in Pricing, not Product Details.')
      return
    }

    applySpecificationKeys([key], 'merge')
    lastAutoGeneratedSpecificationContextRef.current = ''
    lastAutoGeneratedSpecificationKeysRef.current = []
  }

  useEffect(() => {
    if (!specificationExcludedKeys.length && !formData.specifications.length)
      return

    setFormData((prev: ProductFormData) => {
      const currentSpec = prev.specifications[0] || {}
      const nextSpec = Object.entries(currentSpec).reduce<ProductSpecification>(
        (acc, [key, value]) => {
          if (
            isBlockedProductDetailKey(key) ||
            specificationExcludedKeys.some(
              (excludedKey) =>
                normalizeComparableKey(excludedKey) ===
                normalizeComparableKey(key)
            )
          ) {
            return acc
          }

          acc[key] = value
          return acc
        },
        {}
      )

      if (areSameStringLists(Object.keys(currentSpec), Object.keys(nextSpec))) {
        return prev
      }

      return {
        ...prev,
        specifications: Object.keys(nextSpec).length ? [nextSpec] : [],
      }
    })
  }, [specificationExcludedKeys])

  const handleGenerateSpecificationKeys = useCallback(
    async ({
      mode = 'merge',
      silent = false,
    }: {
      mode?: 'merge' | 'replace'
      silent?: boolean
    } = {}) => {
      const fallbackKeys = buildRecommendedSpecificationKeysForContext(
        [],
        variantContextNames,
        specificationExcludedKeys
      )

      if (!specificationCategoryContext) {
        if (!silent) {
          toast.error('Select categories in Basics first.')
        }
        return []
      }

      setAiLoading((prev: any) => ({ ...prev, specificationKeys: true }))
      try {
        const res = await fetch(
          `${import.meta.env.VITE_PUBLIC_API_URL}/v1/products/generate-specification-keys`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              category: specificationCategoryContext,
              productName: formData.productName,
            }),
          }
        )

        const json = await res.json().catch(() => null)
        if (!res.ok || !Array.isArray(json?.data)) {
          throw new Error(
            json?.message || 'Failed to generate specification keys'
          )
        }

        const nextKeys = buildRecommendedSpecificationKeysForContext(
          json.data,
          variantContextNames,
          specificationExcludedKeys
        )
        const resolvedKeys = nextKeys.length ? nextKeys : fallbackKeys

        if (resolvedKeys.length) {
          applySpecificationKeys(resolvedKeys, mode)
        } else if (!silent) {
          toast.error('No specification keys were generated.')
        }

        return resolvedKeys
      } catch (error: any) {
        if (fallbackKeys.length) {
          applySpecificationKeys(fallbackKeys, mode)
          return fallbackKeys
        }

        if (!silent) {
          toast.error(error?.message || 'Failed to generate specification keys')
        }
        return []
      } finally {
        setAiLoading((prev: any) => ({ ...prev, specificationKeys: false }))
      }
    },
    [
      applySpecificationKeys,
      formData.productName,
      specificationExcludedKeys,
      specificationCategoryContext,
      variantContextNames,
    ]
  )

  useEffect(() => {
    if (!isDraftHydrated) return

    if (!specificationContextSignature) {
      lastAutoGeneratedSpecificationContextRef.current = ''
      lastAutoGeneratedSpecificationKeysRef.current = []
      return
    }

    const currentSpec = formData.specifications[0] || {}
    const currentKeys = sanitizeStringList(Object.keys(currentSpec))
    const hasValues = Object.values(currentSpec).some((value) =>
      Boolean(toTrimmedText(value))
    )
    const hasMinimumSpecificationKeys =
      currentKeys.length >= MIN_SPECIFICATION_KEY_COUNT
    const isLastAutoGeneratedSet = areSameStringLists(
      currentKeys,
      lastAutoGeneratedSpecificationKeysRef.current
    )
    const shouldRefreshSpecifications =
      !hasMinimumSpecificationKeys ||
      !currentKeys.length ||
      isLastAutoGeneratedSet

    if (hasValues && hasMinimumSpecificationKeys) return
    if (!shouldRefreshSpecifications) return
    if (
      lastAutoGeneratedSpecificationContextRef.current ===
        specificationContextSignature &&
      hasMinimumSpecificationKeys &&
      isLastAutoGeneratedSet
    ) {
      return
    }

    lastAutoGeneratedSpecificationContextRef.current =
      specificationContextSignature

    let cancelled = false

    const syncSpecificationKeys = async () => {
      const nextKeys = await handleGenerateSpecificationKeys({
        mode: hasValues ? 'merge' : 'replace',
        silent: true,
      })
      if (cancelled) return

      lastAutoGeneratedSpecificationKeysRef.current =
        sanitizeStringList(nextKeys)
    }

    void syncSpecificationKeys()

    return () => {
      cancelled = true
    }
  }, [
    formData.specifications,
    handleGenerateSpecificationKeys,
    isDraftHydrated,
    specificationContextSignature,
  ])

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

  const buildSubmitVariants = (sourceFormData: ProductFormData) => {
    const fallbackImages = sanitizeImageUploads(sourceFormData.defaultImages)
    const baseActualPrice = Number(sourceFormData.actualPrice || 0)
    const baseSalePrice = Number(sourceFormData.salePrice || 0)
    const baseStockQuantity = Number(sourceFormData.stockQuantity || 0)
    const isDefaultVariant = (variant: Variant) => {
      const attributes = variant.variantAttributes || {}
      const entries = Object.entries(attributes)
        .map(([key, value]) => [
          toTrimmedText(key).toLowerCase(),
          toTrimmedText(value).toLowerCase(),
        ])
        .filter(([, value]) => Boolean(value))

      return (
        !entries.length ||
        (entries.length === 1 &&
          entries[0][0] === 'option' &&
          entries[0][1] === 'default')
      )
    }

    const sourceVariants: Variant[] = sourceFormData.variants.length
      ? sourceFormData.variants
      : [
          {
            _id: '',
            variantDisplayName: '',
            variantAttributes: { Option: 'Default' },
            actualPrice: baseActualPrice,
            finalPrice: baseSalePrice,
            stockQuantity: baseStockQuantity,
            variantsImageUrls: fallbackImages,
            isActive: true,
            variantMetaTitle: '',
            variantMetaDescription: '',
            variantMetaKeywords: [],
            variantCanonicalUrl: '',
          },
        ]

    return sourceVariants.map((variant) => {
      const actualPrice = Number(variant.actualPrice || baseActualPrice || 0)
      const finalPrice = Number(variant.finalPrice || baseSalePrice || 0)
      const stockQuantity = Number(
        variant.stockQuantity || baseStockQuantity || 0
      )

      return {
        ...variant,
        _id: toTrimmedText(variant._id),
        variantAttributes: Object.keys(variant.variantAttributes || {}).length
          ? variant.variantAttributes
          : { Option: 'Default' },
        actualPrice,
        finalPrice,
        stockQuantity,
        variantsImageUrls: isDefaultVariant(variant)
          ? fallbackImages
          : sanitizeImageUploads(variant.variantsImageUrls).length
            ? sanitizeImageUploads(variant.variantsImageUrls)
            : fallbackImages,
        variantMetaKeywords: sanitizeStringList(variant.variantMetaKeywords),
      }
    })
  }

  // --- Submit Handler ---
  const handleSubmit = async (e?: React.FormEvent | React.MouseEvent) => {
    if (e) e.preventDefault()

    setLoading(true)
    try {
      const descriptionWordCount = countWords(formData.description)
      const filledSpecificationCount = Object.values(
        formData.specifications[0] || {}
      ).filter((value) => Boolean(toTrimmedText(value))).length
      const submitVariants = buildSubmitVariants(formData)

      if (!toTrimmedText(formData.productName)) {
        throw new Error('Product name is required')
      }
      if (!selectedMainCategoryIds.length) {
        throw new Error('Product category is required')
      }
      if (!selectedCategoryIds.length) {
        throw new Error('Product sub category is required')
      }
      if (!formData.productSubCategories.length) {
        throw new Error('Product sub category 2 is required')
      }
      if (!sanitizeImageUploads(formData.defaultImages).length) {
        throw new Error('At least one product image is required')
      }
      if (
        !Number(formData.actualPrice || 0) ||
        !Number(formData.salePrice || 0)
      ) {
        throw new Error('Actual price and sale price are required')
      }
      if (Number(formData.salePrice || 0) > Number(formData.actualPrice || 0)) {
        throw new Error('Sale price cannot exceed actual price')
      }
      if (descriptionWordCount > MAX_DESCRIPTION_WORDS) {
        throw new Error('Product description must not exceed 2000 words')
      }
      if (filledSpecificationCount < MIN_SPECIFICATION_KEY_COUNT) {
        throw new Error(
          `Add at least ${MIN_SPECIFICATION_KEY_COUNT} product specification values`
        )
      }

      const autoAvailableCityIds = cities
        .map((city: any) => String(city?._id || '').trim())
        .filter(Boolean)
      const nextAvailableCityIds = sanitizeStringList(formData.availableCities)
        .length
        ? sanitizeStringList(formData.availableCities)
        : autoAvailableCityIds

      const payload = {
        ...formData,
        mainCategory: primarySelectedMainCategoryId || formData.mainCategory,
        mainCategories: selectedMainCategoryIds.length
          ? selectedMainCategoryIds
          : sanitizeStringList(
              formData.mainCategories ?? formData.mainCategory
            ),
        productCategory: selectedCategoryIds[0] || '',
        productCategories: selectedCategoryIds,
        availableCities: nextAvailableCityIds,
        websiteIds: sanitizeStringList(formData.websiteIds),
        defaultImages: sanitizeImageUploads(formData.defaultImages),
        specifications: sanitizeSpecifications(formData.specifications),
        variants: submitVariants,
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
          (Array.isArray(responseBody?.errors) &&
            responseBody.errors[0]?.message) ||
          `Failed to create product (HTTP ${res.status})`
        throw new Error(String(backendMessage))
      }

      const nextSuccessMessage =
        responseBody?.message ||
        (isEditMode
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
        err?.message ||
          (isEditMode ? 'Failed to update product' : 'Failed to create product')
      )
    } finally {
      setLoading(false)
    }
  }

  const handleProductPreview = async () => {
    if (typeof window === 'undefined') return

    setIsPreviewLoading(true)
    try {
      const sourceProfile = vendorProfile || authUser || {}
      const defaultWebsiteId = toTrimmedText(
        sourceProfile?.default_website_id || sourceProfile?.defaultWebsiteId
      )
      const fallbackActiveWebsiteId = websites[0]?._id || ''
      const previewWebsite =
        websites.find(
          (website) => String(website?._id || '').trim() === defaultWebsiteId
        ) ||
        websites.find((website) => Boolean(website?.is_default)) ||
        websites.find(
          (website) =>
            String(website?._id || '').trim() === fallbackActiveWebsiteId
        ) ||
        websites[0] ||
        null

      const templateKey = toTrimmedText(
        previewWebsite?.template_key ||
          sourceProfile?.default_website_template_key ||
          sourceProfile?.defaultWebsiteTemplateKey
      )
      const websiteIdentifier = toTrimmedText(
        previewWebsite?.website_slug ||
          previewWebsite?._id ||
          sourceProfile?.default_website_slug ||
          sourceProfile?.defaultWebsiteSlug ||
          defaultWebsiteId
      )
      const previewCity = resolvePreviewCityFromVendorProfile(sourceProfile)
      const productIdentifier = slugifyPreviewProductPath(
        formData.productName ||
          initialEditorSearch.productId ||
          'preview-product'
      )

      if (!vendorId || !templateKey || !websiteIdentifier) {
        toast.error(
          'Default website preview is not ready yet. Please create/select a default website template first.'
        )
        return
      }

      const previewUrl = getVendorTemplateProductUrl(
        vendorId,
        productIdentifier,
        previewCity.slug,
        websiteIdentifier,
        templateKey
      )

      if (!previewUrl) {
        toast.error('Unable to build the storefront preview URL right now.')
        return
      }

      const sessionId = `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
      const previewHref = `${previewUrl}?previewDraft=1&previewSessionId=${encodeURIComponent(
        sessionId
      )}`
      const previewPayload = createProductPreviewPayload(
        sessionId,
        vendorId,
        formData
      )
      const previewWindow = window.open('about:blank', '_blank')

      if (!previewWindow) {
        toast.error(
          'Preview window was blocked. Please allow popups and try again.'
        )
        return
      }

      try {
        previewWindow.name = JSON.stringify(previewPayload)
      } catch {
        // The postMessage retry below still handles browsers that block window.name.
      }

      previewWindow.location.href = previewHref

      const targetOrigin = (() => {
        try {
          return new URL(previewUrl, window.location.origin).origin
        } catch {
          return '*'
        }
      })()

      previewWindowRef.current = previewWindow
      setPreviewSessionId(sessionId)
      setPreviewTargetOrigin(targetOrigin)

      let attempts = 0
      const maxAttempts = 90
      const postPreviewPayload = () => {
        if (previewWindow.closed) {
          window.clearInterval(intervalId)
          return
        }

        previewWindow.postMessage(previewPayload, targetOrigin)
        attempts += 1

        if (attempts >= maxAttempts) {
          window.clearInterval(intervalId)
        }
      }

      const intervalId = window.setInterval(postPreviewPayload, 500)
      window.setTimeout(postPreviewPayload, 250)
    } finally {
      setIsPreviewLoading(false)
    }
  }

  const handleResetEditor = () => {
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
          <Step2Images
            defaultImages={formData.defaultImages}
            onUpload={handleDefaultImageUpload}
            onReplace={handleDefaultImageReplace}
            onDelete={handleDefaultImageDelete}
            onDrop={handleDefaultImageDrop}
          />
        )
      case 3:
        return (
          <Step5Variants
            productName={formData.productName}
            actualPrice={formData.actualPrice}
            salePrice={formData.salePrice}
            stockQuantity={formData.stockQuantity}
            replacementPolicyType={formData.replacementPolicyType}
            replacementPolicyDays={formData.replacementPolicyDays}
            variants={formData.variants}
            specifications={formData.specifications}
            recommendedAttributeKeys={recommendedVariantKeys}
            variantKeySuggestions={addVariantKeySuggestions}
            variantKeyContextLabel={variantKeyContextLabel}
            websiteOptions={websites}
            selectedWebsiteIds={formData.websiteIds}
            isWebsiteLoading={isWebsiteLoading}
            isAvailable={formData.isAvailable}
            aiLoading={aiLoading.variantKeys}
            specificationAiLoading={aiLoading.specificationKeys}
            onPrimaryVariantNameChange={(value) =>
              setFormData((prev: ProductFormData) => ({
                ...prev,
                productName: value,
              }))
            }
            onActualPriceChange={(value) =>
              setFormData((prev: ProductFormData) => ({
                ...prev,
                actualPrice: value === '' ? 0 : Number(value),
              }))
            }
            onSalePriceChange={(value) =>
              setFormData((prev: ProductFormData) => ({
                ...prev,
                salePrice: value === '' ? 0 : Number(value),
              }))
            }
            onStockQuantityChange={(value) =>
              setFormData((prev: ProductFormData) => ({
                ...prev,
                stockQuantity: value === '' ? 0 : Number(value),
              }))
            }
            onReplacementPolicyTypeChange={(value) =>
              setFormData((prev: ProductFormData) => ({
                ...prev,
                replacementPolicyType: value,
                replacementPolicyDays:
                  value === 'none' ? '' : prev.replacementPolicyDays,
              }))
            }
            onReplacementPolicyDaysChange={(value) =>
              setFormData((prev: ProductFormData) => ({
                ...prev,
                replacementPolicyDays: value,
              }))
            }
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
            onSpecificationChange={handleSpecificationChange}
            onAddSpecificationKey={handleAddSpecificationKey}
            onReplaceVariants={(variants) =>
              setFormData((prev: ProductFormData) => ({
                ...prev,
                variants,
              }))
            }
          />
        )
      case 4:
        return (
          <Step4SEO
            metaTitle={formData.metaTitle}
            metaDescription={formData.metaDescription}
            metaKeywords={formData.metaKeywords}
            metaKeywordInput={metaKeywordInput}
            aiLoading={aiLoading}
            onMetaTitleChange={(val) =>
              setFormData((prev: ProductFormData) => ({
                ...prev,
                metaTitle: val,
              }))
            }
            onMetaDescChange={(val) =>
              setFormData((prev: ProductFormData) => ({
                ...prev,
                metaDescription: val,
              }))
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
            onGenerateTitle={() => handleGenerateMetaTitle()}
            onGenerateDesc={() => handleGenerateMetaDescription()}
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
                      context: `Product: ${formData.productName}, Description: ${formData.shortDescription}, Categories: ${selectedCategoryNames.join(', ')}`,
                    }),
                  }
                )
                const data = await res.json()
                if (data.success && typeof data.data === 'string') {
                  const keywords = data.data
                    .split(',')
                    .map((keyword: string) => keyword.trim())
                    .filter(Boolean)
                  setFormData((prev: ProductFormData) => ({
                    ...prev,
                    metaKeywords: [...prev.metaKeywords, ...keywords],
                  }))
                }
              } catch {
                toast.error('AI generation failed')
              } finally {
                setAiLoading((prev: any) => ({ ...prev, metaKeywords: false }))
              }
            }}
          />
        )
      case 5:
        return (
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
                  try {
                    const generatedFaqs = JSON.parse(
                      data.data
                        .replace(/```json/g, '')
                        .replace(/```/g, '')
                        .trim()
                    )
                    if (Array.isArray(generatedFaqs)) {
                      setFormData((prev: ProductFormData) => ({
                        ...prev,
                        faqs: [
                          ...prev.faqs,
                          ...generatedFaqs.map((faq: any) => ({
                            question: faq.question,
                            answer: faq.answer,
                          })),
                        ],
                      }))
                    }
                  } catch {
                    toast.error('Generated FAQs could not be applied')
                  }
                }
              } catch {
                toast.error('AI generation failed')
              } finally {
                setAiLoading((prev: any) => ({ ...prev, faqs: false }))
              }
            }}
          />
        )
      default:
        return null
    }
  }

  const steps = useMemo(
    () => [
      {
        step: 1,
        title: 'Basics',
        description: 'Product title, category mapping, and buyer-facing copy.',
        icon: PackagePlus,
        meta: `${selectedMainCategoryIds.length} category, ${selectedCategoryIds.length} sub categories`,
        complete: Boolean(
          toTrimmedText(formData.productName) &&
            selectedMainCategoryIds.length &&
            selectedCategoryIds.length &&
            formData.productSubCategories.length &&
            (toTrimmedText(formData.shortDescription) ||
              toTrimmedText(formData.description))
        ),
      },
      {
        step: 2,
        title: 'Images',
        description:
          'Main product gallery used across previews, listings, and fallback variant images.',
        icon: ImagePlus,
        meta: `${formData.defaultImages.length} image${formData.defaultImages.length === 1 ? '' : 's'}`,
        complete: sanitizeImageUploads(formData.defaultImages).length > 0,
      },
      {
        step: 3,
        title: 'Prices and Variations',
        description:
          'Default price, return policy, optional variants, stock, and website publishing.',
        icon: Layers3,
        meta: `${formData.variants.length || 1} price row${(formData.variants.length || 1) === 1 ? '' : 's'}, ${formData.websiteIds.length} website${formData.websiteIds.length === 1 ? '' : 's'}`,
        complete: Boolean(formData.actualPrice && formData.salePrice),
      },
      {
        step: 4,
        title: 'SEO',
        description: 'Meta title, description, and search keyword controls.',
        icon: Search,
        meta: `${formData.metaKeywords.length} keyword${formData.metaKeywords.length === 1 ? '' : 's'}`,
        complete: Boolean(
          toTrimmedText(formData.metaTitle) &&
            toTrimmedText(formData.metaDescription)
        ),
      },
      {
        step: 5,
        title: 'FAQs',
        description: 'Answer buyer objections and common product questions.',
        icon: CircleHelp,
        meta: `${formData.faqs.length} FAQ${formData.faqs.length === 1 ? '' : 's'}`,
        complete: formData.faqs.some(
          (faq) => toTrimmedText(faq.question) && toTrimmedText(faq.answer)
        ),
      },
    ],
    [
      formData.defaultImages.length,
      formData.description,
      formData.faqs,
      formData.metaDescription,
      formData.metaKeywords.length,
      formData.metaTitle,
      formData.productName,
      formData.productSubCategories.length,
      formData.shortDescription,
      formData.actualPrice,
      formData.salePrice,
      formData.variants.length,
      formData.websiteIds.length,
      selectedCategoryIds.length,
      selectedMainCategoryIds.length,
    ]
  )

  const editorTitle = isEditMode
    ? formData.productName || 'Edit product'
    : formData.productName || 'Create product'
  const editorShellStyle = {
    '--sidebar-width': '18.5rem',
    '--sidebar-width-icon': '3rem',
  } as React.CSSProperties

  return (
    <div
      style={editorShellStyle}
      className='flex min-h-screen w-full bg-[#f6f6f7] dark:bg-[#101216]'
    >
      <ProductEditorSidebar
        currentStep={currentStep}
        sections={steps}
        productName={formData.productName}
        isEditMode={isEditMode}
        lastSavedLabel={lastSavedLabel}
        isAvailable={formData.isAvailable}
        selectedWebsiteCount={formData.websiteIds.length}
        onStepSelect={goToStep}
        onPrevious={() => goToStep(currentStep - 1)}
        onNext={() => goToStep(currentStep + 1)}
        canGoPrevious={currentStep > 1}
        canGoNext={currentStep < steps.length}
        onReset={handleResetEditor}
        resetLabel={isEditMode ? 'Reset changes' : 'Reset draft'}
      />

      <SidebarInset className='min-w-0 flex-1 bg-transparent shadow-none md:m-0 md:rounded-none'>
        <div className='min-h-screen px-4 py-4 sm:px-6 sm:py-5'>
          <div className='mx-auto max-w-[1360px] space-y-4'>
            <section className='border-border/80 dark:bg-card/95 sticky top-4 z-20 rounded-2xl border bg-white/95 p-4 shadow-[0_10px_30px_rgba(15,23,42,0.06)] backdrop-blur dark:shadow-[0_10px_30px_rgba(0,0,0,0.24)]'>
              <div className='flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between'>
                <div className='flex items-start gap-3'>
                  <SidebarTrigger className='border-border bg-background mt-0.5 h-10 w-10 rounded-lg border shadow-sm' />
                  <div className='min-w-0'>
                    <h1 className='text-foreground text-2xl font-semibold tracking-tight sm:text-3xl'>
                      {editorTitle}
                    </h1>
                  </div>
                </div>

                <div className='flex flex-wrap items-center gap-2'>
                  <Button
                    type='button'
                    variant='outline'
                    onClick={() => void handleProductPreview()}
                    disabled={
                      isPreviewLoading || loading || isEditProductLoading
                    }
                    className='h-11 rounded-lg px-4 hover:bg-white hover:text-black'
                  >
                    {isPreviewLoading ? (
                      <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                    ) : (
                      <Eye className='mr-2 h-4 w-4' />
                    )}
                    {isPreviewLoading ? 'Opening preview...' : 'Preview'}
                  </Button>
                  <Button
                    type='button'
                    onClick={handleSubmit}
                    disabled={loading || isEditProductLoading}
                    className='h-11 rounded-lg bg-slate-900 px-5 text-white hover:bg-white hover:text-black dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100'
                  >
                    {loading ? (
                      <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                    ) : null}
                    {isEditMode ? 'Save changes' : 'Save product'}
                  </Button>
                </div>
              </div>
            </section>

            <div ref={formTopRef} className='space-y-4'>
              {isEditProductLoading ? (
                <div className='border-border text-muted-foreground dark:bg-card flex items-center gap-2 rounded-2xl border bg-white px-4 py-3 text-sm shadow-sm'>
                  <Loader2 className='h-4 w-4 animate-spin' />
                  Loading product details...
                </div>
              ) : null}

              <section className='border-border/70 dark:bg-card rounded-2xl border bg-white p-5 shadow-[0_12px_32px_rgba(15,23,42,0.06)] sm:p-6 dark:shadow-[0_12px_32px_rgba(0,0,0,0.22)]'>
                <form
                  onSubmit={(event) => event.preventDefault()}
                  className='space-y-6'
                >
                  {renderCurrentStep()}

                  <div className='border-border grid gap-3 border-t pt-4 sm:grid-cols-2 xl:hidden'>
                    <Button
                      type='button'
                      variant='outline'
                      onClick={() => goToStep(currentStep - 1)}
                      disabled={currentStep === 1}
                      className='h-11 rounded-xl hover:bg-white hover:text-black'
                    >
                      <ArrowLeft className='mr-2 h-4 w-4' />
                      Previous
                    </Button>
                    <Button
                      type='button'
                      onClick={() => goToStep(currentStep + 1)}
                      disabled={currentStep === steps.length}
                      className='h-11 rounded-xl bg-slate-900 text-white hover:bg-white hover:text-black dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100'
                    >
                      Next
                      <ArrowRight className='ml-2 h-4 w-4' />
                    </Button>
                  </div>
                </form>
              </section>
            </div>
          </div>
        </div>
      </SidebarInset>

      <Dialog open={successDialogOpen} onOpenChange={setSuccessDialogOpen}>
        <DialogContent className='border-border max-w-md rounded-[28px] p-0 shadow-2xl'>
          <div className='border-border bg-card rounded-t-[28px] border-b px-6 py-5'>
            <div className='mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-600 text-white'>
              <CheckCircle2 className='h-6 w-6' />
            </div>
            <DialogHeader className='text-left'>
              <DialogTitle className='text-foreground text-2xl font-semibold'>
                {isEditMode ? 'Product Updated' : 'Product Created'}
              </DialogTitle>
              <DialogDescription className='text-muted-foreground text-sm leading-6'>
                {successDialogMessage}
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className='space-y-4 px-6 py-5'>
            <div className='border-border bg-background text-muted-foreground rounded-2xl border p-4 text-sm leading-6'>
              The form has been cleared, draft data has been removed, and you
              have been returned to the Basic Information step so you can create
              the next product immediately.
            </div>
            <DialogFooter className='sm:justify-start'>
              <Button
                type='button'
                onClick={() => setSuccessDialogOpen(false)}
                className='h-10 rounded-xl bg-emerald-600 px-5 text-white hover:bg-white hover:text-black'
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
