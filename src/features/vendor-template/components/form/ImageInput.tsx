// src/components/form/ImageInput.tsx
import { useState } from 'react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

export function ImageInput({
  label,
  name,
  value, // string (preview URL) or null
  onChange,
  isFileInput = false,
  dimensions,
  helperText,
}: {
  label: string
  name: string
  value: string | null
  onChange: (file: File | null) => void
  isFileInput?: boolean
  dimensions?: string
  helperText?: string
}) {
  const [open, setOpen] = useState(false)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null
    onChange(file)
  }

  return (
    <div className='space-y-2'>
      <div className='flex items-center justify-between gap-2'>
        <Label htmlFor={name}>{label}</Label>
        {dimensions ? (
          <Button
            type='button'
            variant='ghost'
            className='h-auto px-2 py-1 text-xs text-slate-500'
            onClick={() => setOpen(true)}
          >
            Image size
          </Button>
        ) : null}
      </div>
      {helperText ? <p className='text-xs text-slate-500'>{helperText}</p> : null}
      {isFileInput ? (
        <>
          <Input
            id={name}
            type='file'
            accept='image/*'
            onChange={handleFileChange}
          />
          {value && (
            <div className='mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3'>
              <img
                src={value}
                alt={label}
                className='max-h-40 w-full rounded-lg object-contain'
              />
              <Button
                type='button'
                variant='outline'
                className='mt-3 h-9 border-slate-300 bg-white text-xs'
                onClick={() => onChange(null)}
              >
                Remove image
              </Button>
            </div>
          )}
        </>
      ) : (
        <Input
          id={name}
          value={value || ''}
          onChange={(e) => onChange(e.target.value as any)}
        />
      )}

      {dimensions ? (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className='max-w-sm'>
            <DialogHeader>
              <DialogTitle>Recommended Image Size</DialogTitle>
            </DialogHeader>
            <div className='space-y-2 text-sm text-slate-600'>
              <p>
                Use an image sized around{' '}
                <span className='font-semibold text-slate-900'>
                  {dimensions}
                </span>
                .
              </p>
              <p>Keep the same aspect ratio for best results.</p>
            </div>
          </DialogContent>
        </Dialog>
      ) : null}
    </div>
  )
}
