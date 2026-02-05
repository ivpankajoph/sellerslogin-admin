'use client'

import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import Swal from 'sweetalert2'
import { createCategory } from '@/store/slices/admin/categorySlice'
import { useDispatch } from 'react-redux'
import { type AppDispatch } from '@/store'
import { useState } from 'react'

const formSchema = z.object({
  name: z.string().min(1, 'Category name is required.'),
  description: z.string().min(1, 'Description is required.'),
  meta_title: z.string().min(1, 'Meta title is required.'),
  meta_description: z.string().min(1, 'Meta description is required.'),
  meta_keywords: z.string().min(1, 'Meta keywords are required.'),
  image: z
    .any()
    .refine((file) => file instanceof File || file?.length, 'Image is required.'),
})

type CategoryForm = z.infer<typeof formSchema>

type CategoryDialogProps = {
  currentRow?: any
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CategoryDialog({ currentRow, open, onOpenChange }: CategoryDialogProps) {
  const isEdit = !!currentRow
  const dispatch = useDispatch<AppDispatch>()
  const [preview, setPreview] = useState<string | null>(null)

  const form = useForm<CategoryForm>({
    resolver: zodResolver(formSchema),
    defaultValues: isEdit
      ? {
          name: currentRow.name,
          description: currentRow.description,
          meta_title: currentRow.meta_title || '',
          meta_description: currentRow.meta_description || '',
          meta_keywords: currentRow.meta_keywords || '',
        }
      : {
          name: '',
          description: '',
          meta_title: '',
          meta_description: '',
          meta_keywords: '',
        },
  })

  const onSubmit = async (values: CategoryForm) => {
    onOpenChange(false)
    try {
      Swal.fire({
        title: 'Please wait...',
        text: 'Saving category...',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading(),
      })

      const formData = new FormData() as any
      formData.append('name', values.name)
      formData.append('description', values.description)
      formData.append('meta_title', values.meta_title)
      formData.append('meta_description', values.meta_description)
      formData.append('meta_keywords', values.meta_keywords)
      formData.append('image', values.image[0])

      const res = await dispatch(createCategory(formData))

      if (res.meta.requestStatus === 'fulfilled') {
        Swal.fire({
          icon: 'success',
          title: 'Success!',
          text: 'Category created successfully.',
          timer: 2000,
          showConfirmButton: false,
        })
        form.reset()
        setPreview(null)
        onOpenChange(false)
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Failed!',
          text: (res.payload as string) || 'Unable to create category.',
        })
      }
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Something went wrong while creating category.',
      })
    }
  }

  const handleDialogClose = () => {
    form.reset()
    setPreview(null)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleDialogClose}>
      <DialogContent className="sm:max-w-lg h-full overflow-y-auto">
        <DialogHeader className="text-start">
          <DialogTitle>{isEdit ? 'Edit Category' : 'Add New Category'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Update the category details.' : 'Create a new category with SEO fields.'}
          </DialogDescription>
        </DialogHeader>

        <div className="py-2 pe-3">
          <Form {...form}>
            <form
              id="category-form"
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-4 px-0.5"
              encType="multipart/form-data"
            >
              {/* Category Name */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Electronics" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Description */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Devices and gadgets" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Meta Title */}
              <FormField
                control={form.control}
                name="meta_title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Meta Title</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Best Electronics Online" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Meta Description */}
              <FormField
                control={form.control}
                name="meta_description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Meta Description</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Buy the latest electronics at best prices" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Meta Keywords */}
              <FormField
                control={form.control}
                name="meta_keywords"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Meta Keywords</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., electronics, gadgets, phones" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Image Upload */}
              <FormField
                control={form.control}
                name="image"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category Image</FormLabel>
                    <FormControl>
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files
                          field.onChange(file)
                          if (file && file[0]) {
                            setPreview(URL.createObjectURL(file[0]))
                          }
                        }}
                      />
                    </FormControl>
                    {preview && (
                      <div className="mt-2">
                        <img
                          src={preview}
                          alt="Preview"
                          className="w-32 h-32 object-cover rounded border"
                        />
                      </div>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>
        </div>

        <DialogFooter>
          <Button type="submit" form="category-form">
            {isEdit ? 'Update Category' : 'Create Category'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
