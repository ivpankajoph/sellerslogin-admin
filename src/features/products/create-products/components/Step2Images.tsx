import React, { useState } from 'react'
import { ImageOff, ImagePlus, Loader2, Trash2, UploadCloud } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { studioCardClass } from './studio-ui'

interface Props {
  defaultImages: {
    url: string
    publicId?: string
    uploading?: boolean
    tempId?: string
  }[]
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
  onReplace: (index: number, e: React.ChangeEvent<HTMLInputElement>) => void
  onDelete: (index: number) => void
  onDrop: (files: File[]) => void
}

const Step2Images: React.FC<Props> = ({
  defaultImages,
  onUpload,
  onReplace,
  onDelete,
  onDrop,
}) => {
  const [isDragging, setIsDragging] = useState(false)

  return (
    <div className='space-y-6'>
      <section className={studioCardClass}>


        <input
          type='file'
          multiple
          accept='image/*'
          onChange={onUpload}
          className='hidden'
          id='default-images'
        />

        <div
          onDragOver={(event) => {
            event.preventDefault()
            event.dataTransfer.dropEffect = 'copy'
            setIsDragging(true)
          }}
          onDragLeave={(event) => {
            const nextTarget = event.relatedTarget as Node | null
            if (nextTarget && event.currentTarget.contains(nextTarget)) return
            setIsDragging(false)
          }}
          onDrop={(event) => {
            event.preventDefault()
            setIsDragging(false)
            const files = Array.from(event.dataTransfer.files || [])
            if (files.length) onDrop(files)
          }}
          className={cn(
            'rounded-2xl border border-dashed px-6 py-8 text-center transition',
            isDragging
              ? 'border-indigo-400 bg-indigo-50/80 dark:bg-indigo-500/10'
              : 'border-border bg-background/60'
          )}
        >
          <div className='mx-auto flex max-w-md flex-col items-center gap-3'>
            <Button
              type='button'
              variant='outline'
              className='h-11 rounded-xl hover:bg-white hover:text-black'
              asChild
            >
              <label htmlFor='default-images' className='cursor-pointer'>
                <UploadCloud className='mr-2 h-4 w-4' />
                Upload images
              </label>
            </Button>
          </div>
        </div>

        <div className='mt-6'>
          {defaultImages.length ? (
            <div className='grid gap-4 sm:grid-cols-2 xl:grid-cols-4'>
              {defaultImages.map((img, index) => (
                <div
                  key={img.tempId || img.publicId || `${img.url}-${index}`}
                  className='group border-border bg-card overflow-hidden rounded-2xl border shadow-sm'
                >
                  <input
                    id={`default-image-replace-${index}`}
                    type='file'
                    accept='image/*'
                    onChange={(event) => onReplace(index, event)}
                    className='hidden'
                  />
                  <div className='bg-background relative aspect-square overflow-hidden'>
                    {img.url ? (
                      <img
                        src={img.url}
                        alt={`Product image ${index + 1}`}
                        className={cn(
                          'h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]',
                          img.uploading && 'opacity-40'
                        )}
                      />
                    ) : (
                      <div className='text-muted-foreground flex h-full items-center justify-center'>
                        <ImageOff className='h-8 w-8' />
                      </div>
                    )}

                    <div className='absolute top-3 left-3 rounded-full bg-black/70 px-2.5 py-1 text-[11px] font-semibold text-white'>
                      {index === 0 ? 'Primary' : `Image ${index + 1}`}
                    </div>

                    {img.uploading ? (
                      <div className='bg-background/70 absolute inset-0 flex items-center justify-center backdrop-blur-sm'>
                        <Loader2 className='h-5 w-5 animate-spin text-indigo-600' />
                      </div>
                    ) : (
                      <>
                        <label
                          htmlFor={`default-image-replace-${index}`}
                          className='absolute top-3 right-14 inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-white/95 text-slate-700 shadow-md transition hover:bg-indigo-600 hover:text-white'
                          aria-label={`Replace product image ${index + 1}`}
                          title={`Replace product image ${index + 1}`}
                        >
                          <ImagePlus className='h-4 w-4' />
                        </label>
                        <button
                          type='button'
                          onClick={() => onDelete(index)}
                          className='absolute top-3 right-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-slate-700 shadow-md transition hover:bg-red-500 hover:text-white'
                          aria-label={`Remove product image ${index + 1}`}
                        >
                          <Trash2 className='h-4 w-4' />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </section>
    </div>
  )
}

export default Step2Images
