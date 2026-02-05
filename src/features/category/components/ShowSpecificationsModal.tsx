'use client'

import { useState, useEffect } from 'react'
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

// Define types for the API response
type Specification = {
  _id: string
  key: string
}

type SpecificationSet = {
  _id: string
  category_id: string
  title: string
  specs: Specification[]
  createdAt: string
  updatedAt: string
  __v: number
}

type SpecificationsResponse = {
  data: SpecificationSet[]
}

interface ShowSpecificationsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  categoryId: string
}

export default function ShowSpecificationsModal({
  open,
  onOpenChange,
  categoryId,
}: ShowSpecificationsModalProps) {
  const [specifications, setSpecifications] = useState<SpecificationSet[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open) {
      fetchSpecifications()
    }
  }, [open, categoryId])

  const fetchSpecifications = async () => {
    setLoading(true)
    try {
      const response = await axios.get<SpecificationsResponse>(
        `${BASE_URL}/specifications/category/${categoryId}`
      )

      setSpecifications(response.data.data)
    } catch {
      toast.error('Failed to fetch specifications.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-h-[80vh] overflow-y-auto sm:max-w-[600px]'>
        <DialogHeader>
          <DialogTitle>Specifications</DialogTitle>
          <DialogDescription>
            All specification sets for this category
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className='flex h-20 items-center justify-center'>
            <p>Loading specifications...</p>
          </div>
        ) : specifications.length === 0 ? (
          <div className='py-4 text-center'>
            <p>No specifications found for this category.</p>
          </div>
        ) : (
          <div className='space-y-6'>
            {specifications.map((specSet) => (
              <div key={specSet._id} className='rounded-lg border p-4'>
                <h3 className='mb-2 text-lg font-semibold'>
                  {specSet.title}
                </h3>
                <p className='mb-3 text-sm text-gray-500'>
                  Created: {new Date(specSet.createdAt).toLocaleDateString()}
                </p>
                <div className='grid grid-cols-2 gap-2 sm:grid-cols-3'>
                  {specSet.specs.map((spec) => (
                    <div
                      key={spec._id}
                      className='rounded bg-gray-100 px-3 py-1 text-sm'
                    >
                      {spec.key}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className='flex justify-end'>
          <Button onClick={() => onOpenChange(false)}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
