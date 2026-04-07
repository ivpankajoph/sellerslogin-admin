import { useState, type ChangeEvent } from 'react'
import { ImageOff, ImagePlus, Loader2, Trash2, UploadCloud } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { StudioSection } from './studio-ui'

type MediaImage = {
  url: string
  publicId?: string
  uploading?: boolean
  tempId?: string
}

type Props = {
  defaultImages: MediaImage[]
  onUpload: (event: ChangeEvent<HTMLInputElement>) => void
  onDelete: (index: number) => void
  onDrop: (files: File[]) => void
}

export default function ProductMediaSection({
  defaultImages,
  onUpload,
  onDelete,
  onDrop,
}: Props) {
  const [isDragging, setIsDragging] = useState(false)

  return (
    <StudioSection
      icon={ImagePlus}
      tone='indigo'
      title='Media'
      description=''
      action={
        <label
          htmlFor='product-default-images-upload'
          className='border-border bg-card text-foreground hover:bg-white hover:text-black inline-flex h-11 cursor-pointer items-center gap-2 rounded-xl border px-4 text-sm font-semibold transition'
        >
          <UploadCloud className='h-4 w-4' />
          Upload media
        </label>
      }
    >
      <input
        id='product-default-images-upload'
        type='file'
        multiple
        accept='image/*'
        onChange={onUpload}
        className='hidden'
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
          if (files.length) {
            onDrop(files)
          }
        }}
        className={cn(
          'rounded-3xl border border-dashed p-8 text-center transition',
          isDragging
            ? 'border-sky-400 bg-sky-50/80 dark:bg-sky-500/10'
            : 'border-border bg-background/70'
        )}
      >
        <div className='mx-auto flex max-w-xl flex-col items-center gap-4'>
          <div className='border-border bg-card flex h-14 w-14 items-center justify-center rounded-2xl border shadow-sm'>
            <UploadCloud className='h-6 w-6 text-sky-600 dark:text-sky-300' />
          </div>
          <div className='space-y-1'>
            <h3 className='text-foreground text-lg font-semibold'>
              Add images
            </h3>
          </div>
          <label
            htmlFor='product-default-images-upload'
            className='inline-flex cursor-pointer items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white hover:text-black dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100'
          >
            <ImagePlus className='h-4 w-4' />
            Choose files
          </label>
        </div>
      </div>

      <div className='mt-6'>
        <div className='mb-3 flex items-center justify-between gap-3'>
          <div>
            <h3 className='text-foreground text-sm font-semibold'>Gallery</h3>
          </div>
        </div>

        {defaultImages.length ? (
          <div className='grid gap-4 sm:grid-cols-2 xl:grid-cols-3'>
            {defaultImages.map((image, index) => (
              <div
                key={image.tempId || image.publicId || `${image.url}-${index}`}
                className='group border-border bg-card overflow-hidden rounded-3xl border shadow-sm'
              >
                <div className='bg-background relative aspect-square overflow-hidden'>
                  {image.url ? (
                    <img
                      src={image.url}
                      alt={`Product image ${index + 1}`}
                      className={cn(
                        'h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]',
                        image.uploading && 'opacity-40'
                      )}
                    />
                  ) : (
                    <div className='text-muted-foreground flex h-full items-center justify-center'>
                      <ImageOff className='h-8 w-8' />
                    </div>
                  )}

                  <div className='absolute top-3 left-3 inline-flex rounded-full bg-black/70 px-2.5 py-1 text-[11px] font-semibold text-white'>
                    {index === 0 ? 'Primary' : `Image ${index + 1}`}
                  </div>

                  {image.uploading ? (
                    <div className='bg-background/70 absolute inset-0 flex items-center justify-center backdrop-blur-sm'>
                      <Loader2 className='h-5 w-5 animate-spin text-sky-600' />
                    </div>
                  ) : (
                    <button
                      type='button'
                      onClick={() => onDelete(index)}
                      className='absolute top-3 right-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-slate-700 shadow-md transition hover:bg-red-500 hover:text-white'
                      aria-label={`Remove product image ${index + 1}`}
                    >
                      <Trash2 className='h-4 w-4' />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className='border-border bg-background/60 rounded-3xl border border-dashed px-6 py-10 text-center'>
            <div className='mx-auto flex max-w-md flex-col items-center gap-3'>
              <div className='border-border bg-card flex h-12 w-12 items-center justify-center rounded-2xl border'>
                <ImageOff className='text-muted-foreground h-5 w-5' />
              </div>
              <div className='space-y-1'>
                <p className='text-foreground text-sm font-semibold'>
                  No media yet
                </p>
              </div>
            </div>
          </div>
        )}

        <div className='mt-5 flex flex-wrap gap-3'>
          <Button
            type='button'
            variant='outline'
            className='h-10 rounded-xl px-4 hover:bg-white hover:text-black'
            asChild
          >
            <label
              htmlFor='product-default-images-upload'
              className='cursor-pointer'
            >
              Add more images
            </label>
          </Button>
        </div>
      </div>
    </StudioSection>
  )
}
