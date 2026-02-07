'use client'

import { useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { type AppDispatch } from '@/store'
import { createCategory } from '@/store/slices/admin/categorySlice'
import { useDispatch } from 'react-redux'
import Swal from 'sweetalert2'
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
import { uploadImage } from '@/lib/upload-image'

const formSchema = z.object({
  name: z.string().min(1, 'Category name is required.'),
  description: z.string().min(1, 'Description is required.'),
  meta_title: z.string().min(1, 'Meta title is required.'),
  meta_description: z.string().min(1, 'Meta description is required.'),
  meta_keywords: z.string().min(1, 'Meta keywords are required.'),
  image: z
    .any()
    .refine(
      (file) => file instanceof File || file?.length,
      'Image is required.'
    ),
})

type CategoryForm = z.infer<typeof formSchema>

type CategoryDialogProps = {
  currentRow?: any
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CategoryDialog({
  currentRow,
  open,
  onOpenChange,
}: CategoryDialogProps) {
  const isEdit = !!currentRow
  const dispatch = useDispatch<AppDispatch>()
  const [preview, setPreview] = useState<string | null>(null)
  const [imageUrl, setImageUrl] = useState<string | null>(null)

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
  if (!imageUrl) {
    Swal.fire('Error', 'Please upload an image.', 'error')
    return
  }

  onOpenChange(false)

  try {
    Swal.fire({
      title: 'Please wait...',
      text: 'Saving category...',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
    })

    // Send as JSON
    const payload = {
      name: values.name,
      description: values.description,
      meta_title: values.meta_title,
      meta_description: values.meta_description,
      meta_keywords: values.meta_keywords,
      image_url: imageUrl,
    }

    const res = await dispatch(createCategory(payload))

    if (res.meta.requestStatus === 'fulfilled') {
      Swal.fire('Success!', 'Category created successfully.', 'success')
      form.reset()
      setPreview(null)
      setImageUrl(null)
    } else {
      Swal.fire('Failed!', res.payload || 'Unable to create category.', 'error')
    }
  } catch {
    Swal.fire('Error', 'Something went wrong.', 'error')
  }
}


  const handleDialogClose = () => {
    form.reset()
    setPreview(null)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleDialogClose}>
      <DialogContent className='h-full overflow-y-auto sm:max-w-lg'>
        <DialogHeader className='text-start'>
          <DialogTitle>
            {isEdit ? 'Edit Category' : 'Add New Category'}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Update the category details.'
              : 'Create a new category with SEO fields.'}
          </DialogDescription>
        </DialogHeader>

        <div className='py-2 pe-3'>
          <Form {...form}>
            <form
              id='category-form'
              onSubmit={form.handleSubmit(onSubmit)}
              className='space-y-4 px-0.5'
              encType='multipart/form-data'
            >
              {/* Category Name */}
              <FormField
                control={form.control}
                name='name'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category Name</FormLabel>
                    <FormControl>
                      <Input placeholder='e.g., Electronics' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Description */}
              <FormField
                control={form.control}
                name='description'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Input
                        placeholder='e.g., Devices and gadgets'
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Meta Title */}
              <FormField
                control={form.control}
                name='meta_title'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Meta Title</FormLabel>
                    <FormControl>
                      <Input
                        placeholder='e.g., Best Electronics Online'
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Meta Description */}
              <FormField
                control={form.control}
                name='meta_description'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Meta Description</FormLabel>
                    <FormControl>
                      <Input
                        placeholder='e.g., Buy the latest electronics at best prices'
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Meta Keywords */}
              <FormField
                control={form.control}
                name='meta_keywords'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Meta Keywords</FormLabel>
                    <FormControl>
                      <Input
                        placeholder='e.g., electronics, gadgets, phones'
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Image Upload */}
              <FormField
                control={form.control}
                name='image'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category Image</FormLabel>
                    <FormControl>
                      <Input
                        type='file'
                        accept='image/*'
                        onChange={async (e) => {
                          const file = e.target.files
                          field.onChange(file)

                          if (file && file[0]) {
                            // Upload image
                            const url = await uploadImage(
                              file[0],
                              'category_images'
                            )
                            setImageUrl(url) // <-- store URL
                            setPreview(URL.createObjectURL(file[0]))
                          }
                        }}
                      />
                    </FormControl>
                    {preview && (
                      <div className='mt-2'>
                        <img
                          src={preview}
                          alt='Preview'
                          className='h-32 w-32 rounded border object-cover'
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
          <Button
            type='submit'
            form='category-form'
            disabled={!imageUrl || form.formState.isSubmitting}
          >
            {isEdit ? 'Update Category' : 'Create Category'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

