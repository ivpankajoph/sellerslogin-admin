'use client'

import { useState } from 'react'
import axios from 'axios'
import { BASE_URL } from '@/store/slices/vendor/productSlice'
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

interface AddSpecificationsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  category: any
}

export default function AddSpecificationsModal({
  open,
  onOpenChange,
  category,
}: AddSpecificationsModalProps) {
  const [specTitle, setSpecTitle] = useState('')
  const [specKeys, setSpecKeys] = useState<string>('')

  const handleAddSpecifications = async () => {
    if (!specTitle.trim() || !specKeys.trim()) {
      toast.error('Please fill all required fields.')
      return
    }

    try {
      // Parse the specKeys string into an array
      const keysArray = specKeys
        .split('\n')
        .map((key) => key.trim())
        .filter((key) => key.length > 0)

      // Transform into the required format
      const specs: any = keysArray.map((key) => ({ key }))

      await axios.post(`${BASE_URL}/specifications`, {
        category_id: category.id,
        title: specTitle,
        specs: specs,
      })

      toast.success('Specifications created successfully!')
      setSpecTitle('')
      setSpecKeys('')
      onOpenChange(false)
    } catch (err: any) {
      toast.error(err.message || 'Failed to create specifications.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-[550px]'>
        <DialogHeader>
          <DialogTitle className='text-xl font-semibold'>
            Create Specifications
          </DialogTitle>
          <DialogDescription className='text-sm'>
            Add specifications for category{' '}
            <span className='text-primary font-medium'>{category.name}</span>.
          </DialogDescription>
        </DialogHeader>

        <div className='grid gap-6 py-4'>
          {/* Title */}
          <div className='space-y-2'>
            <Label htmlFor='specTitle'>Specification Group Title</Label>
            <Input
              id='specTitle'
              placeholder='Example: Basic Details'
              value={specTitle}
              onChange={(e) => setSpecTitle(e.target.value)}
            />
          </div>

          {/* Keys */}
          <div className='space-y-2'>
            <div className='flex items-center justify-between'>
              <Label htmlFor='specKeys'>Specification Keys</Label>
              <span className='text-muted-foreground text-xs'>
                One key per line
              </span>
            </div>

            <Textarea
              id='specKeys'
              placeholder={'Brand\nMaterial\nColor\nWeight'}
              value={specKeys}
              onChange={(e) => setSpecKeys(e.target.value)}
              className='h-40 resize-none'
            />
          </div>

          {/* Live Preview */}
          {specKeys.trim().length > 0 && (
            <div className='space-y-2'>
              <Label>Preview</Label>
              <div className='bg-muted/40 flex flex-wrap gap-2 rounded-md border p-3'>
                {specKeys
                  .split('\n')
                  .map((key) => key.trim())
                  .filter((k) => k !== '')
                  .map((k, i) => (
                    <span
                      key={i}
                      className='bg-primary/10 text-primary rounded-full px-3 py-1 text-sm'
                    >
                      {k}
                    </span>
                  ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer buttons */}
        <div className='flex justify-end gap-2'>
          <Button
            variant='outline'
            onClick={() => {
              onOpenChange(false)
              setSpecTitle('')
              setSpecKeys('')
            }}
          >
            Cancel
          </Button>
          <Button onClick={handleAddSpecifications}>Create</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
