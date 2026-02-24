// src/components/ProductCreate/index.tsx
import React, { useState, useEffect } from 'react'
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
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { generateSpecifications, generateWithAI } from './aiHelpers'
import { deleteFromCloudinary, uploadToCloudinary } from './cloudinary'
import Step1BasicInfo from './components/Step1BasicInfo'
import Step3Specifications from './components/Step3Specifications'
import Step4SEO from './components/Step4SEO'
import Step5Variants from './components/Step5Variants'
import Step6FAQs from './components/Step6FAQs'
import { type ProductFormData, SPECIFICATION_TEMPLATES, type Variant } from './types/type'

// Interfaces

// Specification templates by category

const ProductCreateForm: React.FC = () => {
  // Redux state (auth)
  const AUTH_TOKEN = useSelector((state: any) => state.auth?.token || '')

  // Form state
  const [formData, setFormData] = useState<ProductFormData>({
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

  useEffect(() => {
    const fetchCities = async () => {
      setIsCityLoading(true)
      try {
        const res = await fetch(
          `${import.meta.env.VITE_PUBLIC_API_URL}/v1/cities?includeInactive=false`
        )
        if (!res.ok) throw new Error('Failed to fetch cities')
        const json = await res.json()
        setCities(Array.isArray(json?.data) ? json.data : [])
      } catch {
        setCities([])
      } finally {
        setIsCityLoading(false)
      }
    }

    fetchCities()
  }, [])

  useEffect(() => {
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
  }, [selectedMainCategoryId])

  useEffect(() => {
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
  }, [selectedCategoryIds, categories])

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

    if (!selectedMainCategoryId) {
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

        applySpecificationKeys(nextKeys)
      } catch (err) {
        applySpecificationKeys(SPECIFICATION_TEMPLATES.default)
      }
    }

    fetchSpecificationKeys()
  }, [selectedMainCategoryId])

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
      alert('AI generation failed')
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
      alert('AI generation failed')
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
      alert('AI generation failed')
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
        alert(
          'Invalid specifications format detected. Please click "Generate with AI" in the Specifications step to fix this.'
        )
        setLoading(false)
        return
      }

      if (!Array.isArray(formData.availableCities) || formData.availableCities.length === 0) {
        alert('Please select at least one city in Basic Information.')
        setLoading(false)
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

      alert(responseBody?.message || 'Product created successfully!')
    } catch (err: any) {
      alert(err?.message || 'Failed to create product')
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
                  alert('AI generation failed')
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
                    alert('AI generation failed')
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
            </div>
          </div>
        </section>

        <div className='rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm backdrop-blur-sm sm:p-8'>
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
                <div
                  key={step.title}
                  className={`rounded-2xl border p-4 transition ${
                    isActive
                      ? 'border-cyan-300 bg-cyan-50/70 shadow-sm'
                      : isCompleted
                        ? 'border-emerald-300 bg-emerald-50/70'
                        : 'border-slate-200 bg-slate-50/70'
                  }`}
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
                </div>
              )
            })}
          </div>

          <form onSubmit={(e) => e.preventDefault()} className='space-y-6'>
            {renderCurrentStep()}

            <div className='flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4'>
              <button
                type='button'
                onClick={() => setCurrentStep((prev) => Math.max(1, prev - 1))}
                disabled={currentStep === 1}
                className='inline-flex h-11 items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50'
              >
                <ArrowLeft className='h-4 w-4' />
                Previous
              </button>

              {currentStep < steps.length ? (
                <button
                  type='button'
                  onClick={() =>
                    setCurrentStep((prev) => Math.min(steps.length, prev + 1))
                  }
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
    </div>
  )
}

export default ProductCreateForm
