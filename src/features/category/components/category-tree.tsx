import { useMemo, useState } from 'react'
import axios from 'axios'
import { Edit3, Eye, Layers3, Trash2 } from 'lucide-react'
import { useSelector } from 'react-redux'
import type { RootState } from '@/store'
import { uploadImage } from '@/lib/upload-image'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { DrillPath } from '../index'

type Subcategory = {
  id?: string
  _id?: string
  name: string
  slug?: string
  description?: string | null
  image_url?: string | null
  metaTitle?: string | null
  metaDescription?: string | null
  metaKeywords?: string[] | null
}

type Category = {
  id?: string
  _id?: string
  name: string
  slug?: string
  description?: string | null
  image_url?: string | null
  metaTitle?: string | null
  metaDescription?: string | null
  metaKeywords?: string[] | null
  mainCategory?: {
    _id?: string
    name?: string
    slug?: string
    image_url?: string | null
    description?: string | null
    metaTitle?: string | null
    metaDescription?: string | null
    metaKeywords?: string[] | null
  }
  subcategories?: Subcategory[]
}

type EditTarget = {
  type: 'main' | 'category' | 'subcategory'
  id: string
  name: string
  description?: string | null
  image_url?: string | null
  metaTitle?: string | null
  metaDescription?: string | null
}

type MainGroup = {
  key: string
  main: Category['mainCategory']
  items: Category[]
}

const ImageThumb = ({
  src,
  alt,
  size = 36,
}: {
  src?: string | null
  alt?: string
  size?: number
}) => {
  if (!src) {
    return (
      <div
        className='inline-flex items-center justify-center rounded-md border border-slate-200 bg-slate-100 text-[10px] font-semibold uppercase text-slate-500'
        style={{ width: size, height: size }}
      >
        {(alt || '?').slice(0, 1)}
      </div>
    )
  }

  return (
    <img
      src={src}
      alt={alt ?? ''}
      width={size}
      height={size}
      className='rounded-md border border-slate-200 object-cover'
      style={{ width: size, height: size }}
    />
  )
}

const rowActionBtn =
  'inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/70 focus-visible:ring-offset-1'
const rowActionIconBtn =
  'inline-flex h-8 w-8 items-center justify-center rounded-lg transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/70 focus-visible:ring-offset-1'

const modalSurfaceClass =
  "w-[min(96vw,1100px)] max-w-[min(96vw,1100px)] overflow-hidden rounded-[22px] border border-slate-200/80 bg-white p-0 shadow-[0_38px_90px_-48px_rgba(15,23,42,0.78)] [&>button]:right-4 [&>button]:top-4 [&>button]:h-8 [&>button]:w-8 [&>button]:rounded-full [&>button]:border [&>button]:border-slate-200 [&>button]:bg-white/90 [&>button]:text-slate-500 [&>button]:opacity-100 [&>button]:shadow-sm [&>button]:transition [&>button]:hover:bg-slate-100 [&>button]:hover:text-slate-900"

const getCategoryId = (category: Category) => category._id || category.id || ''
const getSubcategoryId = (subcategory: Subcategory) =>
  subcategory._id || subcategory.id || ''

export function CategoryTree({
  categories,
  onRefresh,
  canEdit = false,
  drillPath,
  setDrillPath,
}: {
  categories: Category[]
  onRefresh?: () => void
  canEdit?: boolean
  drillPath: DrillPath
  setDrillPath: (path: DrillPath) => void
}) {
  const token = useSelector((state: RootState) => state.auth?.token)
  const [editTarget, setEditTarget] = useState<EditTarget | null>(null)
  const [formState, setFormState] = useState({
    description: '',
    metaTitle: '',
    metaDescription: '',
    imageUrl: '',
  })
  const [preview, setPreview] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const grouped = useMemo<MainGroup[]>(() => {
    const groups = categories.reduce<
      Record<string, { main: Category['mainCategory']; items: Category[] }>
    >((acc, category) => {
      const main = category.mainCategory
      const key = main?._id || main?.name || 'unassigned'
      if (!acc[key]) {
        acc[key] = { main, items: [] }
      }
      acc[key].items.push(category)
      return acc
    }, {})

    return Object.entries(groups)
      .map(([key, value]) => ({ key, main: value.main, items: value.items }))
      .sort((a, b) =>
        (a.main?.name || 'Unassigned').localeCompare(b.main?.name || 'Unassigned')
      )
  }, [categories])

  const openEdit = (target: EditTarget) => {
    if (!canEdit) return
    const isSubcategory = target.type === 'subcategory'
    setEditTarget(target)
    setFormState({
      description: target.description || '',
      metaTitle: target.metaTitle || '',
      metaDescription: target.metaDescription || '',
      imageUrl: isSubcategory ? '' : target.image_url || '',
    })
    setPreview(isSubcategory ? null : target.image_url || null)
  }

  const closeEdit = () => {
    setEditTarget(null)
    setPreview(null)
    setSaving(false)
  }

  const handleImageChange = async (file?: File | null) => {
    if (!file) return
    setPreview(URL.createObjectURL(file))
    const url = await uploadImage(file, 'category_images')
    if (url) {
      setFormState((prev) => ({ ...prev, imageUrl: url }))
    }
  }

  const handleSave = async () => {
    if (!editTarget || !canEdit) return
    try {
      setSaving(true)
      const payload =
        editTarget.type === 'subcategory'
          ? {
              description: formState.description,
              metaTitle: formState.metaTitle,
              metaDescription: formState.metaDescription,
            }
          : {
              description: formState.description,
              image_url: formState.imageUrl || undefined,
              meta_title: formState.metaTitle,
              meta_description: formState.metaDescription,
            }

      const endpoint =
        editTarget.type === 'main'
          ? `${import.meta.env.VITE_PUBLIC_API_URL}/v1/maincategories/update/${editTarget.id}`
          : editTarget.type === 'category'
            ? `${import.meta.env.VITE_PUBLIC_API_URL}/v1/categories/update/${editTarget.id}`
            : `${import.meta.env.VITE_PUBLIC_API_URL}/v1/subcategories/update/${editTarget.id}`

      await axios.put(endpoint, payload, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      })
      onRefresh?.()
      closeEdit()
    } finally {
      setSaving(false)
    }
  }

  const getHeaders = () =>
    token ? { Authorization: `Bearer ${token}` } : undefined

  const handleDelete = async (
    type: 'main' | 'category' | 'subcategory',
    id: string
  ) => {
    if (!canEdit || !id) return

    const message =
      type === 'main'
        ? 'Delete this main category? All child categories and subcategories will be deleted.'
        : type === 'category'
          ? 'Delete this category? All its subcategories will be deleted.'
          : 'Delete this subcategory?'

    const ok = window.confirm(message)
    if (!ok) return

    try {
      setDeletingId(id)
      const url =
        type === 'main'
          ? `${import.meta.env.VITE_PUBLIC_API_URL}/v1/maincategories/delete/${id}`
          : type === 'category'
            ? `${import.meta.env.VITE_PUBLIC_API_URL}/v1/categories/delete/${id}`
            : `${import.meta.env.VITE_PUBLIC_API_URL}/v1/subcategories/${id}`
      await axios.delete(url, { headers: getHeaders() })
      onRefresh?.()
    } finally {
      setDeletingId(null)
    }
  }

  const renderMainTable = () => (
    <Table>
      <TableHeader>
        <TableRow className='bg-slate-100/90'>
          <TableHead className='h-11 px-4'>Main Category</TableHead>
          <TableHead className='h-11'>Slug</TableHead>
          <TableHead className='h-11'>Categories</TableHead>
          <TableHead className='h-11'>Subcategories</TableHead>
          <TableHead className='h-11 min-w-[360px] pr-4 text-right'>
            Actions
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {grouped.map((group) => {
          const mainName = group.main?.name || 'Unassigned'
          const mainSlug = group.main?.slug || '-'
          const mainId = group.main?._id || ''
          const totalSubcategories = group.items.reduce(
            (sum, item) => sum + (item.subcategories?.length || 0),
            0
          )

          return (
            <TableRow
              key={group.key}
              className='bg-white transition hover:bg-cyan-50/40'
            >
              <TableCell className='whitespace-normal px-4 py-3'>
                <div className='flex items-center gap-3'>
                  <ImageThumb src={group.main?.image_url} alt={mainName} size={38} />
                  <div className='min-w-0'>
                    <div className='truncate text-sm font-semibold text-slate-900'>
                      {mainName}
                    </div>
                  </div>
                </div>
              </TableCell>
              <TableCell className='max-w-[220px] truncate py-3 text-xs text-slate-600'>
                {mainSlug}
              </TableCell>
              <TableCell className='py-3'>
                <Badge className='border border-cyan-200 bg-cyan-100/70 text-cyan-800'>
                  {group.items.length}
                </Badge>
              </TableCell>
              <TableCell className='py-3'>
                <Badge className='border border-emerald-200 bg-emerald-100/70 text-emerald-800'>
                  {totalSubcategories}
                </Badge>
              </TableCell>
              <TableCell className='whitespace-nowrap py-3 pr-4 text-right'>
                <div className='flex items-center justify-end gap-1.5'>
                  <button
                    type='button'
                    className={`${rowActionBtn} border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100`}
                    onClick={() =>
                      setDrillPath({
                        level: 'category',
                        mainId: mainId,
                        mainName: mainName,
                      })
                    }
                  >
                    <Eye className='h-3.5 w-3.5' />
                    View Categories
                  </button>

                  {canEdit && mainId ? (
                    <>
                      <button
                        type='button'
                        className={`${rowActionBtn} border border-cyan-200 bg-cyan-50 text-cyan-700 hover:bg-cyan-100`}
                        onClick={() =>
                          openEdit({
                            type: 'main',
                            id: mainId,
                            name: mainName,
                            description: group.main?.description,
                            image_url: group.main?.image_url,
                            metaTitle: group.main?.metaTitle,
                            metaDescription: group.main?.metaDescription,
                          })
                        }
                      >
                        <Edit3 className='h-3.5 w-3.5' />
                        Edit
                      </button>
                      <button
                        type='button'
                        className={`${rowActionBtn} border border-red-200 bg-red-50 text-red-700 hover:bg-red-100`}
                        disabled={deletingId === mainId}
                        onClick={() => handleDelete('main', mainId)}
                      >
                        <Trash2 className='h-3.5 w-3.5' />
                        {deletingId === mainId ? 'Deleting...' : 'Delete'}
                      </button>
                    </>
                  ) : null}
                </div>
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )

  const renderCategoryTable = () => {
    const selectedGroup = grouped.find((g) => g.key === drillPath.mainId)
    if (!selectedGroup) return <div className='p-4 text-center'>Select a main category first.</div>

    return (
      <Table>
        <TableHeader>
          <TableRow className='bg-slate-100/90'>
            <TableHead className='h-11 px-4'>Category</TableHead>
            <TableHead className='h-11'>Slug</TableHead>
            <TableHead className='h-11'>Subcategories</TableHead>
            <TableHead className='h-11 min-w-[200px] pr-4 text-right'>
              Actions
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {selectedGroup.items
            .slice()
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((category) => {
              const categoryId = getCategoryId(category)
              const subs = category.subcategories || []

              return (
                <TableRow
                  key={categoryId || category.name}
                  className='bg-white transition hover:bg-indigo-50/40'
                >
                  <TableCell className='whitespace-normal px-4 py-3'>
                    <div className='flex items-center gap-3'>
                      <ImageThumb
                        src={category.image_url}
                        alt={category.name}
                        size={34}
                      />
                      <div className='font-semibold text-slate-900'>
                        {category.name}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className='max-w-[220px] truncate py-3 text-xs text-slate-600'>
                    {category.slug || '-'}
                  </TableCell>
                  <TableCell className='py-3'>
                    <Badge className='border border-emerald-200 bg-emerald-100/70 text-emerald-800'>
                      {subs.length}
                    </Badge>
                  </TableCell>
                  <TableCell className='whitespace-nowrap py-3 pr-4 text-right'>
                    <div className='flex items-center justify-end gap-1.5'>
                      <button
                        type='button'
                        className={`${rowActionIconBtn} border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100`}
                        onClick={() =>
                          setDrillPath({
                            ...drillPath,
                            level: 'subcategory',
                            categoryId: categoryId,
                            categoryName: category.name,
                          })
                        }
                        disabled={!subs.length}
                        title={
                          subs.length
                            ? 'View subcategories'
                            : 'No subcategories available'
                        }
                      >
                        <Layers3 className='h-3.5 w-3.5' />
                      </button>

                      {canEdit && categoryId ? (
                        <>
                          <button
                            type='button'
                            className={`${rowActionIconBtn} border border-cyan-200 bg-cyan-50 text-cyan-700 hover:bg-cyan-100`}
                            onClick={() =>
                              openEdit({
                                type: 'category',
                                id: categoryId,
                                name: category.name,
                                description: category.description,
                                image_url: category.image_url,
                                metaTitle: category.metaTitle,
                                metaDescription: category.metaDescription,
                              })
                            }
                            title='Edit category'
                          >
                            <Edit3 className='h-3.5 w-3.5' />
                          </button>
                          <button
                            type='button'
                            className={`${rowActionIconBtn} border border-red-200 bg-red-50 text-red-700 hover:bg-red-100`}
                            disabled={deletingId === categoryId}
                            onClick={() => handleDelete('category', categoryId)}
                            title='Delete category'
                          >
                            <Trash2 className='h-3.5 w-3.5' />
                          </button>
                        </>
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
        </TableBody>
      </Table>
    )
  }

  const renderSubcategoryTable = () => {
    let subcategories: Subcategory[] = []
    
    for (const group of grouped) {
      const category = group.items.find(c => getCategoryId(c) === drillPath.categoryId)
      if (category) {
        subcategories = category.subcategories || []
        break
      }
    }

    return (
      <Table>
        <TableHeader>
          <TableRow className='bg-slate-100/90'>
            <TableHead className='h-11 px-4'>Subcategory</TableHead>
            <TableHead className='h-11'>Slug</TableHead>
            <TableHead className='h-11 min-w-[150px] pr-4 text-right'>
              Actions
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {subcategories
            .slice()
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((sub) => {
              const subId = getSubcategoryId(sub)

              return (
                <TableRow
                  key={subId || sub.name}
                  className='bg-white transition hover:bg-emerald-50/40'
                >
                  <TableCell className='whitespace-normal px-4 py-3'>
                    <div className='text-sm font-medium text-slate-900'>
                      {sub.name}
                    </div>
                  </TableCell>
                  <TableCell className='max-w-[220px] truncate py-3 text-xs text-slate-600'>
                    {sub.slug || '-'}
                  </TableCell>
                  <TableCell className='whitespace-nowrap py-3 pr-4 text-right'>
                    {canEdit && subId ? (
                      <div className='flex items-center justify-end gap-1.5'>
                        <button
                          type='button'
                          className={`${rowActionIconBtn} border border-cyan-200 bg-cyan-50 text-cyan-700 hover:bg-cyan-100`}
                          onClick={() =>
                            openEdit({
                              type: 'subcategory',
                              id: subId,
                              name: sub.name,
                              description: sub.description,
                              image_url: sub.image_url,
                              metaTitle: sub.metaTitle,
                              metaDescription: sub.metaDescription,
                            })
                          }
                          title='Edit subcategory'
                        >
                          <Edit3 className='h-3.5 w-3.5' />
                        </button>
                        <button
                          type='button'
                          className={`${rowActionIconBtn} border border-red-200 bg-red-50 text-red-700 hover:bg-red-100`}
                          disabled={deletingId === subId}
                          onClick={() => handleDelete('subcategory', subId)}
                          title='Delete subcategory'
                        >
                          <Trash2 className='h-3.5 w-3.5' />
                        </button>
                      </div>
                    ) : null}
                  </TableCell>
                </TableRow>
              )
            })}
        </TableBody>
      </Table>
    )
  }

  return (
    <>
      <div className='overflow-hidden rounded-2xl border border-slate-200 bg-white/95 shadow-sm'>
        {drillPath.level === 'main' && renderMainTable()}
        {drillPath.level === 'category' && renderCategoryTable()}
        {drillPath.level === 'subcategory' && renderSubcategoryTable()}
      </div>

      {canEdit ? (
        <Dialog
          open={!!editTarget}
          onOpenChange={(open) => {
            if (!open) closeEdit()
          }}
        >
          <DialogContent
            className={`${modalSurfaceClass} max-h-[92vh] w-[min(96vw,760px)] max-w-[min(96vw,760px)] sm:!max-w-[min(96vw,760px)]`}
          >
            <div className='pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-cyan-400 via-indigo-400 to-violet-400' />
            <div className='flex max-h-[92vh] flex-col'>
              <DialogHeader className='gap-1 border-b border-slate-200/90 bg-gradient-to-r from-cyan-50/90 via-white to-indigo-50/90 px-5 py-4 pr-14 sm:px-6 sm:py-5 sm:pr-16'>
                <DialogTitle className='text-xl font-bold text-slate-900'>
                  Edit{' '}
                  {editTarget?.type === 'main'
                    ? 'Main Category'
                    : editTarget?.type === 'category'
                      ? 'Category'
                      : 'Subcategory'}
                </DialogTitle>
                <DialogDescription className='text-sm text-slate-600'>
                  Update details and save changes instantly.
                </DialogDescription>
              </DialogHeader>

              <div className='flex-1 overflow-y-auto overscroll-contain px-5 py-4 sm:px-6 sm:py-5'>
                <div className='grid gap-4 py-1'>
                  <div className='grid gap-2'>
                    <Label className='text-xs font-semibold uppercase tracking-[0.1em] text-slate-600'>
                      Title (locked)
                    </Label>
                    <Input
                      value={editTarget?.name || ''}
                      disabled
                      className='h-11 rounded-xl border-slate-200 bg-slate-100 text-slate-700'
                    />
                  </div>
                  <div className='grid gap-2'>
                    <Label className='text-xs font-semibold uppercase tracking-[0.1em] text-slate-600'>
                      Description
                    </Label>
                    <Textarea
                      value={formState.description}
                      onChange={(e) =>
                        setFormState((prev) => ({ ...prev, description: e.target.value }))
                      }
                      placeholder='Add a description'
                      className='min-h-[120px] rounded-xl border-slate-300 bg-white/95'
                    />
                  </div>
                  <div className='grid gap-2'>
                    <Label className='text-xs font-semibold uppercase tracking-[0.1em] text-slate-600'>
                      Meta Title
                    </Label>
                    <Input
                      value={formState.metaTitle}
                      onChange={(e) =>
                        setFormState((prev) => ({ ...prev, metaTitle: e.target.value }))
                      }
                      placeholder='SEO meta title'
                      className='h-11 rounded-xl border-slate-300 bg-white/95'
                    />
                  </div>
                  <div className='grid gap-2'>
                    <Label className='text-xs font-semibold uppercase tracking-[0.1em] text-slate-600'>
                      Meta Description
                    </Label>
                    <Textarea
                      value={formState.metaDescription}
                      onChange={(e) =>
                        setFormState((prev) => ({
                          ...prev,
                          metaDescription: e.target.value,
                        }))
                      }
                      placeholder='SEO meta description'
                      className='min-h-[120px] rounded-xl border-slate-300 bg-white/95'
                    />
                  </div>
                  {editTarget?.type !== 'subcategory' ? (
                    <div className='grid gap-2'>
                      <Label className='text-xs font-semibold uppercase tracking-[0.1em] text-slate-600'>
                        Image
                      </Label>
                      <Input
                        type='file'
                        accept='image/*'
                        className='h-11 rounded-xl border-slate-300 bg-white/95'
                        onChange={(e) => handleImageChange(e.target.files?.[0] || null)}
                      />
                      {preview ? (
                        <div className='mt-1 rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-slate-100/70 p-2.5'>
                          <img
                            src={preview}
                            alt='Preview'
                            className='h-20 w-20 rounded-lg border border-slate-200 object-cover shadow-sm'
                          />
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </div>

              <div className='flex items-center justify-end gap-2 border-t border-slate-200/90 bg-white/95 px-5 py-3 sm:px-6'>
                <Button variant='outline' className='rounded-xl' onClick={closeEdit}>
                  Cancel
                </Button>
                <Button className='rounded-xl' onClick={handleSave} disabled={saving}>
                  {saving ? 'Saving...' : 'Save changes'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      ) : null}
    </>
  )
}
