'use client'

import { useState, useEffect } from 'react'
import { type AppDispatch } from '@/store'

import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { uploadImage } from '@/features/vendor-template/helper/fileupload'
import { updateCategory } from '@/store/slices/admin/categorySlice'

interface EditCategoryModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  category: any
  dispatch: AppDispatch
}

export default function EditCategoryModal({
  open,
  onOpenChange,
  category,
  dispatch,
}: EditCategoryModalProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [image, setImage] = useState<File | null>(null)
  const [currentImageUrl, setCurrentImageUrl] = useState('')
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  // Pre-populate form when modal opens
  useEffect(() => {
    if (open && category) {
      setName(category.name || '')
      setDescription(category.description || '')
      setCurrentImageUrl(category.image_url || '')
      setImagePreview(category.image_url || null)
    }
  }, [open, category])

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setImage(file)
      setImagePreview(URL.createObjectURL(file))
    }
  }

  const handleUpdateCategory = async () => {
    if (!name.trim()) {
      toast.error('Please enter category name.')
      return
    }

    setIsUploading(true)

    try {
      let imageUrl = currentImageUrl

      // Upload new image if selected
      if (image) {
        const uploadedUrl = await uploadImage(image, 'category_images')
        imageUrl = uploadedUrl || currentImageUrl
      }

      const payload = {
        id: category._id, // or category._id depending on your API
        name,
        description,
        image_url: imageUrl,
      }
      await dispatch(updateCategory(payload)).unwrap()

      toast.success('Category updated successfully!')
      onOpenChange(false)
    } catch (err: any) {
      toast.error(err.message || 'Failed to update category.')
    } finally {
      setIsUploading(false)
    }
  }

  const handleResetForm = () => {
    setName(category.name || '')
    setDescription(category.description || '')
    setImage(null)
    setImagePreview(category.image_url || null)
  }

  return (
    <Dialog open={open} onOpenChange={(open) => {
      if (!open) {
        handleResetForm()
      }
      onOpenChange(open)
    }}>
      <DialogContent className='sm:max-w-[450px]'>
        <DialogHeader>
          <DialogTitle>Edit Category</DialogTitle>
          <DialogDescription>
            Update the details for{' '}
            <span className='text-primary font-medium'>{category.name}</span>.
          </DialogDescription>
        </DialogHeader>

        <div className='grid gap-4 py-4'>
          {/* Name */}
          <div className='grid grid-cols-4 items-center gap-4'>
            <Label htmlFor='name' className='text-right'>
              Name
            </Label>
            <Input
              id='name'
              placeholder='Enter category name'
              value={name}
              onChange={(e) => setName(e.target.value)}
              className='col-span-3'
            />
          </div>

          {/* Description */}
          <div className='grid grid-cols-4 items-start gap-4'>
            <Label htmlFor='description' className='pt-1 text-right'>
              Description
            </Label>
            <Textarea
              id='description'
              placeholder='Enter category description'
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className='col-span-3'
            />
          </div>

          {/* Image Upload */}
          <div className='grid grid-cols-4 items-center gap-4'>
            <Label htmlFor='image' className='text-right'>
              Image
            </Label>
            <div className='col-span-3 space-y-2'>
              <Input
                id='image'
                type='file'
                accept='image/*'
                onChange={handleImageChange}
              />
              {(imagePreview || currentImageUrl) && (
                <div className='mt-2'>
                  <img
                    src={imagePreview || currentImageUrl}
                    alt='Category preview'
                    className='w-20 h-20 object-cover rounded-md'
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer buttons */}
        <div className='flex justify-end gap-2'>
          <Button
            variant='outline'
            onClick={() => {
              handleResetForm()
              onOpenChange(false)
            }}
          >
            Cancel
          </Button>
          <Button onClick={handleUpdateCategory} disabled={isUploading}>
            {isUploading ? 'Updating...' : 'Update'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
