export interface ImageUpload {
  url: string
  publicId: string
  uploading?: boolean
  tempId?: string
}

export interface Variant {
  _id?: string
  variantDisplayName?: string
  variantAttributes: Record<string, string>
  actualPrice: number
  finalPrice: number
  stockQuantity: number
  variantsImageUrls: ImageUpload[]
  isActive: boolean
  variantMetaTitle?: string
  variantMetaDescription?: string
  variantMetaKeywords?: string[]
  variantCanonicalUrl?: string
}

export interface FAQ {
  question: string
  answer: string
}

export interface ProductSpecification {
  [key: string]: string
}

export interface ProductFormData {
  mainCategory: string
  mainCategories: string[]
  productName: string
  productCategory: string
  productCategories: string[]
  productSubCategories: string[]
  availableCities: string[]
  websiteIds: string[]
  brand: string
  shortDescription: string
  description: string
  actualPrice: number
  salePrice: number
  stockQuantity: number
  replacementPolicyType: string
  replacementPolicyDays: string
  defaultImages: ImageUpload[]
  isAvailable: boolean
  metaTitle: string
  metaDescription: string
  metaKeywords: string[]
  specifications: ProductSpecification[]
  variants: Variant[]
  faqs: FAQ[]
}
