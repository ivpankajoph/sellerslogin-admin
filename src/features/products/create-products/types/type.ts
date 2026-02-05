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
  variantMetaTitle: string
  variantMetaDescription: string
  variantMetaKeywords: string[]
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
  productSubCategories: string[]
  brand: string
  shortDescription: string
  description: string
  defaultImages: ImageUpload[]
  specifications: Record<string, string>[]
  isAvailable: boolean
  metaTitle: string
  metaDescription: string
  metaKeywords: string[]
  variants: Variant[]
  faqs: FAQ[]
}

export const SPECIFICATION_TEMPLATES: Record<string, string[]> = {
  electronics: [
    'brand',
    'model',
    'color',
    'weight',
    'dimensions',
    'warranty',
    'power',
    'connectivity',
  ],
  clothing: [
    'brand',
    'size',
    'color',
    'material',
    'gender',
    'season',
    'careInstructions',
    'sleeveLength',
  ],
  furniture: [
    'brand',
    'material',
    'color',
    'dimensions',
    'weight',
    'assemblyRequired',
  ],
  default: ['warranty', 'returnPeriod'],
}
