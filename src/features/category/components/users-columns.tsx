'use client'

import { type ColumnDef } from '@tanstack/react-table'
import { Eye } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog'
import { DataTableColumnHeader } from '@/components/data-table'
import { LongText } from '@/components/long-text'
import { DataTableRowActions } from './data-table-row-actions'

// Fallback Image component for environments without next/image
const Image = ({
  src,
  alt,
  width,
  height,
  className,
}: {
  src: string
  alt?: string
  width?: number
  height?: number
  className?: string
}) => {
  return (
    <img
      src={src}
      alt={alt ?? ''}
      width={width}
      height={height}
      className={className}
    />
  )
}

// 🧩 Type definition for Category
export type Category = {
  id: string
  name: string
  slug: string
  description: string | null
  image_url: string | null
  mainCategory?: {
    _id?: string
    name?: string
    slug?: string
    image_url?: string | null
  }
  meta_title: string | null
  meta_description: string | null
  meta_keywords: string | null
  display_order: number | null
  parent_id?: string | null
  level?: number | null
  is_active: boolean
  createdAt: string
  updatedAt: string
  subcategories: {
    id: string
    _id?: string
    name: string
    slug: string
    description?: string
    is_active?: boolean
  }[]
}

// 🧱 Table column definitions
export const categoryColumns: ColumnDef<Category>[] = [
  // ✅ Checkbox select
  {
    id: 'select',
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && 'indeterminate')
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label='Select all'
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label='Select row'
      />
    ),
    enableSorting: false,
    enableHiding: false,
    meta: { className: 'w-10' },
  },

  {
    accessorKey: 'mainCategory',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Main Category' />
    ),
    cell: ({ row }) => {
      const main = row.original.mainCategory
      return (
        <div className='flex items-center gap-2'>
          {main?.image_url ? (
            <Image
              src={main.image_url}
              alt={main.name || 'Main Category'}
              width={28}
              height={28}
              className='h-7 w-7 rounded-md border object-cover'
            />
          ) : (
            <div className='h-7 w-7 rounded-md border bg-muted/40' />
          )}
          <span className='text-sm font-medium'>{main?.name || '-'}</span>
        </div>
      )
    },
    meta: { className: 'min-w-[220px]' },
  },

  {
    accessorKey: 'name',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Category Name' />
    ),
    cell: ({ row }) => (
      <LongText className='font-medium max-w-[180px]'>
        {row.getValue('name')}
      </LongText>
    ),
    meta: { className: 'min-w-[180px]' },
  },

  {
    accessorKey: 'image_url',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Category Image' />
    ),
    cell: ({ row }) => {
      const imageUrl = row.original.image_url
      return imageUrl ? (
        <Image
          src={imageUrl}
          alt={row.original.name}
          width={36}
          height={36}
          className='h-9 w-9 rounded-md border object-cover'
        />
      ) : (
        <span className='text-xs text-muted-foreground'>No image</span>
      )
    },
    meta: { className: 'min-w-[140px]' },
  },

  {
    accessorKey: 'description',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Description' />
    ),
    cell: ({ row }) => (
      <LongText className='text-muted-foreground max-w-56'>
        {row.getValue('description') || '-'}
      </LongText>
    ),
    meta: { className: 'min-w-[200px]' },
  },

  {
    id: 'subcategories',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Subcategories' />
    ),
    cell: ({ row }) => {
      const subs = row.original.subcategories || []
      if (!subs.length) {
        return (
          <span className='text-muted-foreground text-sm italic'>None</span>
        )
      }

      const preview = subs.slice(0, 3)
      const remaining = subs.length - preview.length

      return (
        <div className='flex flex-wrap items-center gap-2'>
          {preview.map((sub) => (
            <div
              key={sub.id || sub._id}
              className='flex items-center gap-1 rounded-full border border-border bg-muted/20 px-2 py-1'
            >
              <span className='text-xs'>{sub.name}</span>
            </div>
          ))}
          {remaining > 0 ? (
            <Badge variant='secondary' className='text-xs'>
              +{remaining} more
            </Badge>
          ) : null}
        </div>
      )
    },
    enableSorting: false,
  },

  // 🧩 Slug
  {
    accessorKey: 'slug',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Slug' />
    ),
    cell: ({ row }) => (
      <div className='text-muted-foreground'>{row.getValue('slug')}</div>
    ),
  },

  // {
  //   id: 'subcategories',
  //   header: ({ column }) => (
  //     <DataTableColumnHeader column={column} title='Subcategories' />
  //   ),
  //   cell: ({ row }) => {
  //     const subs = row.original.subcategories
  //     if (!subs?.length)
  //       return (
  //         <span className='text-muted-foreground text-sm italic'>None</span>
  //       )

  //     return (
  //       <div className='flex flex-wrap gap-1'>
  //         {subs.map((sub) => (
  //           <Badge key={sub.id} variant='secondary' className='capitalize'>
  //             {sub.name}
  //           </Badge>
  //         ))}
  //       </div>
  //     )
  //   },
  //   enableSorting: false,
  // },

  // 🟢 Active Status
  {
    accessorKey: 'is_active',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Status' />
    ),
    cell: ({ row }) => {
      const isActive = row.getValue('is_active')
      return (
        <Badge
          variant='outline'
          className={cn(
            'capitalize',
            isActive
              ? 'border-green-400 text-green-600'
              : 'border-red-400 text-red-600'
          )}
        >
          {isActive ? 'Active' : 'Inactive'}
        </Badge>
      )
    },
  },

  // 📅 Created At
  {
    accessorKey: 'createdAt',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Created At' />
    ),
    cell: ({ row }) => {
      const date = new Date(row.getValue('createdAt')).toLocaleDateString()
      return <div className='text-muted-foreground'>{date}</div>
    },
  },

  // 👁️ Expand Button + ⚙️ Actions
  {
    id: 'actions',
    cell: ({ row }) => (
      <div className='flex items-center gap-2'>
        {/* 👁️ View Details Popup */}
        <Dialog>
          <DialogTrigger asChild>
            <Button variant='outline' size='icon'>
              <Eye className='h-4 w-4' />
            </Button>
          </DialogTrigger>

          <DialogContent className='h-full max-w-2xl overflow-y-auto'>
            <DialogHeader>
              <DialogTitle className='text-xl font-semibold'>
                {row.original.name}
              </DialogTitle>
              <DialogDescription>
                Detailed information about this category.
              </DialogDescription>
            </DialogHeader>

            <div className='grid grid-cols-2 gap-4 py-4'>
              <div>
                <p className='font-medium'>Slug:</p>
                <p className='text-muted-foreground text-sm'>
                  {row.original.slug}
                </p>
              </div>

              <div>
                <p className='font-medium'>Description:</p>
                <p className='text-muted-foreground text-sm'>
                  {row.original.description || '-'}
                </p>
              </div>

              <div>
                <p className='font-medium'>Meta Title:</p>
                <p className='text-muted-foreground text-sm'>
                  {row.original.meta_title || '-'}
                </p>
              </div>

              <div>
                <p className='font-medium'>Meta Description:</p>
                <p className='text-muted-foreground text-sm'>
                  {row.original.meta_description || '-'}
                </p>
              </div>

              <div>
                <p className='font-medium'>Meta Keywords:</p>
                <p className='text-muted-foreground text-sm'>
                  {row.original.meta_keywords || '-'}
                </p>
              </div>

              {/* <div>
                <p className='font-medium'>Display Order:</p>
                <p className='text-muted-foreground text-sm'>
                  {row.original.display_order ?? '-'}
                </p>
              </div> */}

              <div>
                <p className='font-medium'>Status:</p>
                <Badge
                  variant='outline'
                  className={cn(
                    row.original.is_active
                      ? 'border-green-400 text-green-600'
                      : 'border-red-400 text-red-600'
                  )}
                >
                  {row.original.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>

              <div>
                <p className='font-medium'>Created At:</p>
                <p className='text-muted-foreground text-sm'>
                  {new Date(row.original.createdAt).toLocaleString()}
                </p>
              </div>

              <div className='col-span-2'>
                <p className='font-medium'>Main Category:</p>
                <div className='mt-2 flex items-center gap-3'>
                  {row.original.mainCategory?.image_url ? (
                    <Image
                      src={row.original.mainCategory.image_url}
                      alt={row.original.mainCategory?.name || 'Main Category'}
                      width={200}
                      height={200}
                      className='h-16 w-16 rounded-md border object-cover'
                    />
                  ) : (
                    <div className='h-16 w-16 rounded-md border bg-muted/40' />
                  )}
                  <div>
                    <div className='text-sm font-medium'>
                      {row.original.mainCategory?.name || '-'}
                    </div>
                    <div className='text-xs text-muted-foreground'>
                      {row.original.mainCategory?.slug || ''}
                    </div>
                  </div>
                </div>
              </div>

              <div className='col-span-2'>
                <p className='font-medium'>Image:</p>
                {row.original.image_url ? (
                  <div className='mt-2'>
                    <Image
                      src={row.original.image_url}
                      alt={row.original.name}
                      width={200}
                      height={200}
                      className='rounded-md border'
                    />
                  </div>
                ) : (
                  <p className='text-muted-foreground text-sm'>No image</p>
                )}
              </div>

              <div className='col-span-2'>
                <p className='mb-1 font-medium'>Subcategories:</p>
                {row.original.subcategories?.length ? (
                  <div className='grid gap-2 sm:grid-cols-2'>
                    {row.original.subcategories.map((sub) => (
                      <div
                        key={sub.id || sub._id}
                        className='flex items-center gap-2 rounded-md border border-border bg-muted/10 p-2'
                      >
                        <div>
                          <div className='text-sm font-medium'>{sub.name}</div>
                          <div className='text-xs text-muted-foreground'>
                            {sub.slug || ''}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className='text-muted-foreground text-sm italic'>None</p>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* ⚙️ Edit/Delete actions */}
        <DataTableRowActions row={row} />
      </div>
    ),
    meta: { className: 'w-10' },
  },
]
