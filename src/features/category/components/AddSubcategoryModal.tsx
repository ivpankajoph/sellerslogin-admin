'use client'

import { useState } from 'react'
import { type AppDispatch } from '@/store'
import { createSubcategory } from '@/store/slices/admin/subcategorySlice'

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

interface AddSubcategoryModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  category: any
  dispatch: AppDispatch
}

export default function AddSubcategoryModal({
  open,
  onOpenChange,
  category,
  dispatch,
}: AddSubcategoryModalProps) {
  const [subName, setSubName] = useState('')
  const [description, setDescription] = useState('')
  const [image, setImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setImage(file)
      setImagePreview(URL.createObjectURL(file))
    }
  }

  const handleAddSubcategory = async () => {
    if (!subName.trim() || !description.trim()) {
      toast.error('Please fill all required fields.')
      return
    }

    if (!image) {
      toast.error('Please upload an image.')
      return
    }

    setIsUploading(true)

    try {
      // Upload image to get URL
      const imageUrl = await uploadImage(image,"subcategory_images")

      const payload = {
        name: subName,
        description: description,
        category_name: category.name,
        image_url: imageUrl,
      }

      await dispatch(createSubcategory(payload)).unwrap()

      toast.success('Subcategory created successfully!')
      setSubName('')
      setDescription('')
      setImage(null)
      setImagePreview(null)
      onOpenChange(false)
    } catch (err: any) {
      toast.error(err.message || 'Failed to create subcategory.')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-[450px]'>
        <DialogHeader>
          <DialogTitle>Add Subcategory</DialogTitle>
          <DialogDescription>
            Create a new subcategory under{' '}
            <span className='text-primary font-medium'>{category.name}</span>.
          </DialogDescription>
        </DialogHeader>

        <div className='grid gap-4 py-4'>
          {/* Name */}
          <div className='grid grid-cols-4 items-center gap-4'>
            <Label htmlFor='subName' className='text-right'>
              Name
            </Label>
            <Input
              id='subName'
              placeholder='Enter subcategory name'
              value={subName}
              onChange={(e) => setSubName(e.target.value)}
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
              placeholder='Enter subcategory description'
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
              {imagePreview && (
                <div className='mt-2'>
                  <img
                    src={imagePreview}
                    alt='Preview'
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
              onOpenChange(false)
              setSubName('')
              setDescription('')
              setImage(null)
              setImagePreview(null)
            }}
          >
            Cancel
          </Button>
          <Button onClick={handleAddSubcategory} disabled={isUploading}>
            {isUploading ? 'Uploading...' : 'Create'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
