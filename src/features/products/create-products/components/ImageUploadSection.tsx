import { motion } from 'framer-motion'
import { Label } from '@/components/ui/label'
import { Upload, Trash2 } from 'lucide-react'

export default function ImageUploadSection({ state, actions }: any) {
  const { imagePreviews, imageInputRef } = state
  const { setImageFiles, setImagePreviews } = actions

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files) {
      const newFiles = Array.from(files)
      setImageFiles((prev: File[]) => [...prev, ...newFiles])
      setImagePreviews((prev: string[]) => [
        ...prev,
        ...newFiles.map((file) => URL.createObjectURL(file)),
      ])
    }
  }

  const handleRemoveImage = (index: number) => {
    setImagePreviews((prev: string[]) => prev.filter((_, i) => i !== index))
    setImageFiles((prev: File[]) => prev.filter((_, i) => i !== index))
  }

  return (
    <section className='space-y-4'>
      <Label>Upload Global Product Images</Label>
      <div className='flex flex-wrap gap-4'>
        {imagePreviews.map((src: string, index: number) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className='relative h-32 w-32 overflow-hidden rounded-lg border border-gray-300 shadow-sm'
          >
            <img
              src={src}
              alt='preview'
              className='h-full w-full object-cover'
            />
            <button
              type='button'
              className='absolute top-1 right-1 rounded-full bg-white p-1 shadow'
              onClick={() => handleRemoveImage(index)}
            >
              <Trash2 className='h-4 w-4 text-red-600' />
            </button>
          </motion.div>
        ))}

        <button
          type='button'
          className='flex h-32 w-32 flex-col items-center justify-center rounded-lg border-2 border-dashed text-gray-500 transition hover:border-blue-500 hover:text-gray-700'
          onClick={() => imageInputRef.current?.click()}
        >
          <Upload className='mb-1 h-6 w-6' />
          <span>Upload</span>
        </button>

        <input
          ref={imageInputRef}
          type='file'
          multiple
          accept='image/*'
          onChange={handleImageChange}
          className='hidden'
        />
      </div>
    </section>
  )
}
