'use client'

import { useState } from 'react'
import axios from 'axios'
import { BASE_URL } from '@/store/slices/vendor/productSlice'
import { Loader2, Sparkles,  } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'

export default function ProductDetailsSection({
  register,
  setValue,
  watch,
}: any) {
  const [features, setFeatures] = useState('')
  const [loading, setLoading] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const productName = watch('name')

  const handleGenerateAI = async () => {
    if (!productName) {
      alert('Please enter Product Name first!')
      return
    }

    if (!features.trim()) {
      alert('Please enter product features!')
      return
    }

    setLoading(true)
    try {
      const res = await axios.post(`${BASE_URL}/products/generate-description`, {
        productName,
        features,
      })

      if (res.status !== 200) throw new Error('Failed to generate description')

      const data = res.data

      const shortDesc = data.shortDescription || ''
      const fullDesc = data.fullDescription || ''

      // Update form fields
      setValue('shortDescription', shortDesc, {
        shouldDirty: true,
        shouldValidate: true,
      })
      
      setValue('fullDescription', fullDesc, {
        shouldDirty: true,
        shouldValidate: true,
      })

      // Close modal and reset
      setIsModalOpen(false)
      setFeatures('')
      alert('Descriptions generated successfully!')
    } catch (error) {
      alert('Error generating description. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const openModal = () => {
    if (!productName) {
      alert('Please enter Product Name first!')
      return
    }
    setIsModalOpen(true)
  }

  return (
    <>
      <section className='grid grid-cols-1 gap-6 md:grid-cols-2'>
        <div>
          <Label>Product Name</Label>
          <Input
            {...register('name', { required: true })}
            placeholder='e.g. Premium Wireless Headphones'
          />
        </div>

        <div>
          <Label>Short Description</Label>
          <div className='flex gap-2'>
            <Input
              {...register('shortDescription')}
              placeholder='e.g. High-quality wireless headphones with noise cancellation'
              className='flex-1'
            />
            <Button
              type='button'
              onClick={openModal}
              size='sm'
              variant='outline'
              className='whitespace-nowrap'
            >
              <Sparkles className='mr-1 h-4 w-4' />
              AI
            </Button>
          </div>
        </div>

        <div className='md:col-span-2'>
          <Label>Full Description</Label>
          <Textarea
            {...register('fullDescription')}
            placeholder='Enter full product description'
            rows={5}
          />
        </div>

        <div>
          <Label>Brand</Label>
          <Input type='text' {...register('brand')} />
        </div>
      </section>

      {/* AI Generation Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle className='flex items-center gap-2'>
              <Sparkles className='h-5 w-5 text-purple-500' />
              Generate with AI
            </DialogTitle>
            <DialogDescription>
              Enter key features and let AI create compelling product descriptions
            </DialogDescription>
          </DialogHeader>

          <div className='space-y-4 py-4'>
            <div>
              <Label>Product Name</Label>
              <Input
                value={productName || ''}
                disabled
                className='bg-gray-50'
              />
            </div>

            <div>
              <Label>Product Features *</Label>
              <Textarea
                value={features}
                onChange={(e) => setFeatures(e.target.value)}
                placeholder='e.g. Bluetooth 5.3, 40hr battery, noise cancellation, premium sound quality'
                rows={4}
                className='resize-none'
              />
              <p className='mt-1 text-xs text-gray-500'>
                Separate features with commas for best results
              </p>
            </div>
          </div>

          <DialogFooter className='flex gap-2 sm:gap-0'>
            <Button
              type='button'
              variant='outline'
              onClick={() => {
                setIsModalOpen(false)
                setFeatures('')
              }}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type='button'
              onClick={handleGenerateAI}
              disabled={loading || !features.trim()}
            >
              {loading ? (
                <>
                  <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className='mr-2 h-4 w-4' />
                  Generate
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
