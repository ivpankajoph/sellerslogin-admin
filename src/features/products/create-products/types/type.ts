export interface ImageUpload {
  url: string
  publicId: string
  uploading?: boolean
  tempId?: string
}

export interface Variant {
  variantAttributes: Record<string, string>
  actualPrice: number
  finalPrice: number
  stockQuantity: number
  variantsImageUrls: ImageUpload[]
  isActive: boolean
}

export interface FAQ {
  question: string
  answer: string
}

export interface ProductFormData {
  mainCategory: string
  productName: string
  productCategory: string
  productCategories: string[]
  productSubCategories: string[]
  availableCities: string[]
  websiteIds: string[]
  brand: string
  shortDescription: string
  description: string
  defaultImages: ImageUpload[]
  isAvailable: boolean
  metaTitle: string
  metaDescription: string
  metaKeywords: string[]
  variants: Variant[]
  faqs: FAQ[]
}
