// src/components/ProductCreate/index.tsx
import React, { useState, useEffect } from 'react'
import { Link } from '@tanstack/react-router'
import { Loader2 } from 'lucide-react'
import { useSelector } from 'react-redux'
import { Button } from '@/components/ui/button'
import { generateSpecifications, generateWithAI, generateSpecificationKeysHelper } from './aiHelpers'
import { deleteFromCloudinary, uploadToCloudinary } from './cloudinary'
import Step1BasicInfo from './components/Step1BasicInfo'
import Step2Images from './components/Step2Images'
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
    productSubCategories: [],
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
  const [isMainCategoryLoading, setIsMainCategoryLoading] = useState(false)
  const [isCategoryLoading, setIsCategoryLoading] = useState(false)
  const [selectedCategoryId, setSelectedCategoryId] = useState('')
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
    if (!selectedMainCategoryId) {
      setCategories([])
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
    if (!selectedCategoryId) {
      setFilteredSubcategories([])
      return
    }

    const fetchSubcategories = async () => {
      try {
        const res = await fetch(
          `${import.meta.env.VITE_PUBLIC_API_URL}/v1/subcategories/category/${selectedCategoryId}`
        )

        if (!res.ok) {
          setFilteredSubcategories([])
          return
        }

        const json = await res.json()

        if (json.success && Array.isArray(json.data)) {
          setFilteredSubcategories(json.data)
        } else {
          setFilteredSubcategories([])
        }
      } catch (err) {
        setFilteredSubcategories([])
      }
    }

    fetchSubcategories() // ✅ Call the function
  }, [selectedCategoryId])

  // Update specification keys based on category
  useEffect(() => {
    if (selectedCategoryId) {
      const category = categories.find(
        (cat: any) => cat._id === selectedCategoryId
      )
      if (category) {
        generateSpecificationKeysHelper(
          category.name,
          formData.productName,
          setAiLoading,
          setSpecificationKeys,
          setFormData
        )
      }
    }
  }, [selectedCategoryId, categories])

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

  const handleDefaultImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    setFormData((prev: ProductFormData) => ({
      ...prev,
      defaultImages: [
        ...prev.defaultImages,
        ...files.map((file) => ({
          url: URL.createObjectURL(file),
          publicId: '',
          uploading: true,
        })),
      ],
    }))

    const uploadedImages = await Promise.all(
      files.map(async (file) => {
        const result = await uploadToCloudinary(file)
        if (!result) {
          setFormData((prev: ProductFormData) => ({
            ...prev,
            defaultImages: prev.defaultImages.filter(
              (img) => img.url !== URL.createObjectURL(file)
            ),
          }))
        }
        return result
      })
    )

    setFormData((prev: ProductFormData) => {
      const newImages = [...prev.defaultImages]
      const startIndex = newImages.length - files.length
      uploadedImages.forEach((img, i) => {
        if (img) {
          newImages[startIndex + i] = img
        }
      })
      return { ...prev, defaultImages: newImages }
    })
  }

  const handleDeleteDefaultImage = async (index: number) => {
    const publicId = formData.defaultImages[index]?.publicId
    if (publicId) {
      await deleteFromCloudinary(publicId)
    }
    const newImages = [...formData.defaultImages]
    newImages.splice(index, 1)
    setFormData({ ...formData, defaultImages: newImages })
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

  const handleVariantImageUpload = async (
    variantIndex: number,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = Array.from(e.target.files || [])
    if (!files.length) return

    e.target.value = '' // prevent reselect bug

    const tempImages = files.map((file, idx) => ({
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

    for (let i = 0; i < files.length; i++) {
      const result = await uploadToCloudinary(files[i])
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

      const payload = {
        ...formData,
        mainCategory: selectedMainCategoryId || formData.mainCategory,
        productCategory: selectedCategoryId,
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

      if (!res.ok) throw new Error('Failed to create product')
      alert('Product created successfully!')
    } catch (err) {
      alert('Failed to create product')
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
            selectedCategoryId={selectedCategoryId}
            setSelectedCategoryId={setSelectedCategoryId}
            filteredSubcategories={filteredSubcategories}
            isMainCategoryLoading={isMainCategoryLoading}
            isCategoryLoading={isCategoryLoading}
            aiLoading={aiLoading}
            generateWithAI={generateShortDesc}
            generateDescription={generateDescription}
          />
        )
      case 2:
        return (
          <Step2Images
            defaultImages={formData.defaultImages}
            onUpload={handleDefaultImageUpload}
            onDelete={handleDeleteDefaultImage}
          />
        )
      case 3:
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
                  selectedCategoryId,
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
      case 4:
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
                        context: `Product: ${formData.productName}, Description: ${formData.shortDescription}, Category: ${categories.find(c => c._id === selectedCategoryId)?.name || ''}`
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

  return (
    <div className='min-h-screen bg-gray-50 px-4 py-8'>
      <div className='mx-auto max-w-3xl'>
        <div className='rounded-xl bg-white p-8 shadow-lg'>
          <h1 className='mb-8 text-3xl font-bold text-gray-900'>
            Create New Product
          </h1>

          <Link to='/upload-products'>
            <Button variant='outline' className='mb-12 bg-white'>
              Upload Excel or Download Template
            </Button>
          </Link>

          {/* Progress Bar */}
          <div className='mb-8'>
            <div className='flex items-center justify-between'>
              {['Basic', 'Images', 'Specs & Variants', 'SEO & FAQs'].map(
                (step, i) => (
                  <div key={i} className='flex flex-col items-center'>
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-full font-semibold ${currentStep === i + 1
                        ? 'bg-blue-600 text-white'
                        : currentStep > i + 1
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-200 text-gray-600'
                        }`}
                    >
                      {i + 1}
                    </div>
                    <span className='mt-1 text-xs text-gray-600'>{step}</span>
                  </div>
                )
              )}
            </div>
          </div>

          <form onSubmit={(e) => e.preventDefault()}>
            {renderCurrentStep()}

            <div className='mt-8 flex justify-between'>
              <button
                type='button'
                onClick={() => setCurrentStep((prev) => Math.max(1, prev - 1))}
                disabled={currentStep === 1}
                className='rounded-lg border border-gray-300 px-6 py-3 text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50'
              >
                Previous
              </button>

              {currentStep < 4 ? (
                <button
                  type='button'
                  onClick={() => setCurrentStep((prev) => Math.min(4, prev + 1))}
                  className='rounded-lg bg-blue-600 px-6 py-3 text-white hover:bg-blue-700'
                >
                  Next
                </button>
              ) : (
                <button
                  type='button'
                  onClick={handleSubmit}
                  disabled={loading}
                  className='flex items-center space-x-2 rounded-lg bg-green-600 px-6 py-3 text-white hover:bg-green-700 disabled:opacity-70'
                >
                  {loading && <Loader2 className='h-4 w-4 animate-spin' />}
                  <span>Create Product</span>
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
