import { useState, useEffect, useRef } from 'react'
import { getAllCategories } from '@/store/slices/admin/categorySlice'
import { getSubcategoriesByCategory } from '@/store/slices/admin/subcategorySlice'
import { createProduct } from '@/store/slices/vendor/productSlice'
import Swal from 'sweetalert2'

export function useProductForm(dispatch: any, reset: any) {
  const [selectedCategory, setSelectedCategory] = useState('')
  const [selectedSubcategories, setSelectedSubcategories] = useState<string[]>([])
  const [customCategory, setCustomCategory] = useState('')
  const [customSubcategory, setCustomSubcategory] = useState('')
  const [isAddingCustomCategory, setIsAddingCustomCategory] = useState(false)
  const [isAddingCustomSubcategory, setIsAddingCustomSubcategory] = useState(false)

  const [variants, setVariants] = useState<any[]>([])
  const [specifications, setSpecifications] = useState<any[]>([])

  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [variantImageFiles, setVariantImageFiles] = useState<Record<number, File[]>>({})
  const [variantImagePreviews, setVariantImagePreviews] = useState<Record<number, string[]>>({})
  const [selectedCategoryId, setSelectedCategoryId] = useState('')

  const imageInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    dispatch(getAllCategories({}))
  }, [dispatch])

  useEffect(() => {
    if (selectedCategoryId && !isAddingCustomCategory) {
      dispatch(getSubcategoriesByCategory(selectedCategoryId))
    } else {
      setSelectedSubcategories([])
      setSpecifications([])
      setVariants([])
    }
  }, [dispatch, selectedCategoryId, isAddingCustomCategory])

  const onSubmit = async (data: any) => {
    const formData = new FormData()

    formData.append('productName', data.name)
    formData.append('productCategory', selectedCategory)
    formData.append('productSubCategory', JSON.stringify(selectedSubcategories))
    formData.append('brand', data.brand || '')
    formData.append('short_description', data.short_description)
    formData.append('description', data.description)
    formData.append('isAvailable', 'true')

    // ✅ Prepare variant payload properly
    const variantPayload = variants.map(v => ({
      sku: v.sku || '',
      attributes: Object.fromEntries(
        (v.attributes || []).map((a: any) => [a.key, a.value])
      ),
      price: parseFloat(v.price) || 0,
      discount_percent: parseFloat(v.discount_percent) || 0,
      stockQuantity: parseInt(v.stock, 10) || 0,
    }))

    // ✅ Prepare specification payload separately
    const specificationPayload = specifications.map(s => ({
      key: s.key,
      value: s.value,
    }))

    formData.append('variants', JSON.stringify(variantPayload))
    formData.append('specifications', JSON.stringify(specificationPayload))

    // ✅ Append global product images
    imageFiles.forEach(f => formData.append('globalImages', f))

    // ✅ Append variant-specific images if present
    Object.keys(variantImageFiles).forEach((variantIndex) => {
      variantImageFiles[Number(variantIndex)].forEach(file => {
        formData.append(`variantImages_${variantIndex}`, file)
      })
    })

    // ✅ Dispatch and handle result
    const resultAction: any = await dispatch(createProduct(formData))

    if (createProduct.fulfilled.match(resultAction)) {
      Swal.fire({
        icon: 'success',
        title: 'Success!',
        text: resultAction.payload.message || 'Product created successfully!',
        timer: 2000,
        showConfirmButton: false,
      })

      reset()

      // ✅ Reset all state
      setSelectedCategory('')
      setSelectedSubcategories([])
      setVariants([])
      setSpecifications([])
      setImageFiles([])
      setImagePreviews([])
      setVariantImageFiles({})
      setVariantImagePreviews({})
      setIsAddingCustomCategory(false)
      setIsAddingCustomSubcategory(false)
    } else {
      Swal.fire({
        icon: 'error',
        title: 'Oops!',
        text: resultAction.payload?.message || 'Something went wrong',
      })
    }
  }

  return {
    state: {
      selectedCategory,
      selectedSubcategories,
      customCategory,
      customSubcategory,
      isAddingCustomCategory,
      isAddingCustomSubcategory,
      variants,
      specifications,
      imagePreviews,
      imageFiles,
      variantImageFiles,
      variantImagePreviews,
      selectedCategoryId,
      imageInputRef,
    },
    actions: {
      setSelectedCategory,
      setSelectedSubcategories,
      setCustomCategory,
      setCustomSubcategory,
      setIsAddingCustomCategory,
      setIsAddingCustomSubcategory,
      setVariants,
      setSpecifications,
      setImageFiles,
      setImagePreviews,
      setVariantImageFiles,
      setVariantImagePreviews,
      setSelectedCategoryId,
    },
    onSubmit,
  }
}
