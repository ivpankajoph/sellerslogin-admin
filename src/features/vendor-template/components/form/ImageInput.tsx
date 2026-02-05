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
}: {
  label: string
  name: string
  value: string | null
  onChange: (file: File | null) => void
  isFileInput?: boolean
  dimensions?: string
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
      {isFileInput ? (
        <>
          <Input
            id={name}
            type='file'
            accept='image/*'
            onChange={handleFileChange}
          />
          {value && (
            <img
              src={value}
              alt={label}
              className='mt-2 max-h-32 rounded border object-contain'
            />
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
