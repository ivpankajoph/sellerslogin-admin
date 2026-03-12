import React, { useRef, useState } from 'react'
import { Link } from '@tanstack/react-router'
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Loader2,
  Sparkles,
  Upload,
  XCircle,
} from 'lucide-react'
import { useSelector } from 'react-redux'
import { toast } from 'sonner'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface UploadError {
  rows: number[]
  productName: string
  errors: string[]
}

interface UploadResult {
  success: boolean
  successCount: number
  failureCount: number
  errors: UploadError[]
  successfulProducts: Array<{
    productId: string
    productName: string
    slug: string
  }>
}

const MAX_FILE_SIZE_MB = 10

const normalizeRows = (value: unknown): number[] => {
  if (Array.isArray(value)) {
    return value.filter((row) => typeof row === 'number') as number[]
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return [value]
  }
  if (typeof value === 'string') {
    return value
      .split(/[,;|\s]+/)
      .map((chunk) => chunk.trim())
      .filter(Boolean)
      .map((chunk) => Number(chunk))
      .filter((row) => Number.isFinite(row) && row > 0)
  }
  return []
}

const safeResult = (raw: any): UploadResult => {
  if (!raw || typeof raw !== 'object') {
    return {
      success: false,
      successCount: 0,
      failureCount: 0,
      errors: [],
      successfulProducts: [],
    }
  }

  const errors = Array.isArray(raw.errors)
    ? raw.errors.map((entry: any) => {
        const productName =
          typeof entry.productName === 'string'
            ? entry.productName
            : 'Unknown Product'

        const messages =
          Array.isArray(entry.errors) && entry.errors.length > 0
            ? entry.errors.filter((err: any) => typeof err === 'string')
            : typeof entry.error === 'string'
              ? [entry.error]
              : ['Unknown validation error']

        return {
          rows: normalizeRows(entry.rows ?? entry.row ?? []),
          productName,
          errors: messages.length ? messages : ['Unknown validation error'],
        }
      })
    : []

  const successfulProducts = Array.isArray(raw.successfulProducts)
    ? raw.successfulProducts.map((product: any) => ({
        productId: typeof product.productId === 'string' ? product.productId : '',
        productName:
          typeof product.productName === 'string'
            ? product.productName
            : 'Unknown',
        slug: typeof product.slug === 'string' ? product.slug : '',
      }))
    : []

  return {
    success: Boolean(raw.success),
    successCount: typeof raw.successCount === 'number' ? raw.successCount : 0,
    failureCount: typeof raw.failureCount === 'number' ? raw.failureCount : 0,
    errors,
    successfulProducts,
  }
}

const formatFileSize = (file: File) => {
  if (file.size < 1024 * 1024) {
    return `${(file.size / 1024).toFixed(1)} KB`
  }
  return `${(file.size / (1024 * 1024)).toFixed(2)} MB`
}

const ExcelProductUpload: React.FC = () => {
  const token = useSelector((state: any) => state.auth?.token || '')
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<UploadResult | null>(null)
  const [dragActive, setDragActive] = useState(false)

  const openFilePicker = () => {
    fileInputRef.current?.click()
  }

  const validateFile = (nextFile: File): boolean => {
    const fileExtension = nextFile.name.split('.').pop()?.toLowerCase()
    const isValid =
      fileExtension === 'xlsx' ||
      fileExtension === 'csv' ||
      nextFile.type ===
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      nextFile.type === 'application/vnd.ms-excel' ||
      nextFile.type === 'text/csv'

    if (!isValid) {
      toast.error('Upload a valid Excel or CSV file (.xlsx or .csv).')
      return false
    }

    if (nextFile.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      toast.error(`File size must be less than ${MAX_FILE_SIZE_MB}MB.`)
      return false
    }

    return true
  }

  const setSelectedFile = (nextFile: File | null) => {
    setFile(nextFile)
    setResult(null)
  }

  const handleDrag = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
    if (event.type === 'dragenter' || event.type === 'dragover') {
      setDragActive(true)
    } else if (event.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
    setDragActive(false)

    const droppedFile = event.dataTransfer.files?.[0]
    if (!droppedFile) return

    if (validateFile(droppedFile)) {
      setSelectedFile(droppedFile)
    }
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    if (!selectedFile) return

    if (validateFile(selectedFile)) {
      setSelectedFile(selectedFile)
    }

    event.target.value = ''
  }

  const downloadTemplate = async () => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_PUBLIC_API_URL}/v1/products/download-template`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )

      if (!response.ok) {
        throw new Error('Failed to download template')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = 'product_upload_template.xlsx'
      document.body.appendChild(anchor)
      anchor.click()
      document.body.removeChild(anchor)
      window.URL.revokeObjectURL(url)
    } catch {
      toast.error('Unable to download template. Try again.')
    }
  }

  const handleUpload = async () => {
    if (!file) return

    setUploading(true)

    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await fetch(
        `${import.meta.env.VITE_PUBLIC_API_URL}/v1/products/bulk-upload`,
        {
          method: 'POST',
          body: formData,
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )

      const data = await response.json()

      if (!response.ok) {
        const message = data?.message || 'Upload failed due to server error.'
        setResult({
          success: false,
          successCount: 0,
          failureCount: 0,
          errors: [{ rows: [0], productName: 'System', errors: [message] }],
          successfulProducts: [],
        })
        toast.error(message)
        return
      }

      const parsedResult = safeResult(data.data || data)
      setResult(parsedResult)

      if (parsedResult.failureCount > 0) {
        toast.warning(
          `${parsedResult.successCount} products created, ${parsedResult.failureCount} failed.`
        )
      } else {
        toast.success(`${parsedResult.successCount} products created successfully.`)
      }
    } catch {
      const errorMessage = 'Network error. Check your connection and try again.'
      setResult({
        success: false,
        successCount: 0,
        failureCount: 0,
        errors: [{ rows: [0], productName: 'System', errors: [errorMessage] }],
        successfulProducts: [],
      })
      toast.error(errorMessage)
    } finally {
      setUploading(false)
    }
  }

  const resetUpload = () => {
    setSelectedFile(null)
  }

  const totalProcessed =
    (result?.successCount || 0) + (result?.failureCount || 0)

  return (
    <>
      <Header fixed>
        <Search />
        <div className='ms-auto flex items-center space-x-4'>
          <ThemeSwitch />
          <ConfigDrawer />
          <ProfileDropdown />
        </div>
      </Header>

      <Main className='flex flex-1 flex-col gap-4 sm:gap-6'>
        <section className='rounded-3xl border border-cyan-200/70 bg-gradient-to-br from-cyan-50/80 via-white to-indigo-50/70 p-6 shadow-[0_18px_45px_-30px_rgba(15,23,42,0.6)]'>
          <div className='flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between'>
            <div>
              <div className='mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-white/85 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-700'>
                <Sparkles className='h-3.5 w-3.5' />
                Bulk Product Upload
              </div>
              <h1 className='text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl'>
                Upload Products by Sheet
              </h1>
              <p className='mt-1 max-w-3xl text-sm text-slate-600 sm:text-base'>
                Import multiple products in one pass using the approved Excel or CSV
                template.
              </p>
            </div>

            <div className='flex flex-wrap items-center gap-2'>
              <Badge className='border border-cyan-200 bg-cyan-100/70 text-cyan-800'>
                Excel or CSV
              </Badge>
              <Badge className='border border-slate-200 bg-white text-slate-700'>
                Max {MAX_FILE_SIZE_MB}MB
              </Badge>
              <Button asChild variant='outline' className='rounded-xl border-slate-300'>
                <Link to='/products/create-products'>
                  <ArrowLeft className='h-4 w-4' />
                  Back to Product Studio
                </Link>
              </Button>
              <Button
                type='button'
                variant='outline'
                onClick={downloadTemplate}
                className='rounded-xl border-slate-300'
              >
                <Download className='h-4 w-4' />
                Download Template
              </Button>
            </div>
          </div>
        </section>

        <div className='grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_340px]'>
          <section className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
            <div className='flex flex-wrap items-center justify-between gap-3'>
              <div>
                <h2 className='text-lg font-semibold text-slate-900'>Upload File</h2>
                <p className='text-sm text-slate-500'>
                  Drop the sheet here or browse from your computer.
                </p>
              </div>
              <Badge
                className={cn(
                  'border',
                  file
                    ? 'border-emerald-200 bg-emerald-100/70 text-emerald-800'
                    : 'border-slate-200 bg-slate-100 text-slate-700'
                )}
              >
                {file ? 'Ready to upload' : 'Awaiting file'}
              </Badge>
            </div>

            <input
              ref={fileInputRef}
              type='file'
              accept='.xlsx,.csv'
              onChange={handleFileChange}
              className='hidden'
            />

            <div
              role='button'
              tabIndex={0}
              onClick={openFilePicker}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  openFilePicker()
                }
              }}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={cn(
                'mt-5 rounded-2xl border-2 border-dashed p-8 text-center transition',
                dragActive
                  ? 'border-cyan-500 bg-cyan-50/80'
                  : 'border-slate-300 bg-slate-50/70 hover:border-cyan-300 hover:bg-cyan-50/50'
              )}
            >
              {file ? (
                <div className='mx-auto max-w-xl rounded-2xl border border-emerald-200 bg-emerald-50/80 p-5 text-left shadow-sm'>
                  <div className='flex flex-wrap items-start gap-4'>
                    <div className='flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700'>
                      <FileSpreadsheet className='h-7 w-7' />
                    </div>
                    <div className='min-w-0 flex-1'>
                      <p className='truncate text-base font-semibold text-slate-900'>
                        {file.name}
                      </p>
                      <p className='mt-1 text-sm text-slate-500'>
                        {formatFileSize(file)} and ready for import.
                      </p>
                      <div className='mt-3 flex flex-wrap gap-2'>
                        <Button
                          type='button'
                          onClick={(event) => {
                            event.stopPropagation()
                            handleUpload()
                          }}
                          disabled={uploading}
                          className='rounded-xl bg-cyan-600 text-white hover:bg-cyan-700'
                        >
                          {uploading ? (
                            <>
                              <Loader2 className='h-4 w-4 animate-spin' />
                              Uploading...
                            </>
                          ) : (
                            <>
                              <Upload className='h-4 w-4' />
                              Upload Products
                            </>
                          )}
                        </Button>
                        <Button
                          type='button'
                          variant='outline'
                          onClick={(event) => {
                            event.stopPropagation()
                            openFilePicker()
                          }}
                          className='rounded-xl border-slate-300'
                        >
                          Replace File
                        </Button>
                        <Button
                          type='button'
                          variant='ghost'
                          onClick={(event) => {
                            event.stopPropagation()
                            resetUpload()
                          }}
                          className='rounded-xl text-slate-600 hover:text-slate-900'
                        >
                          Remove File
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className='space-y-5'>
                  <div className='mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-cyan-100/80 text-cyan-700'>
                    <Upload className='h-9 w-9' />
                  </div>
                  <div>
                    <p className='text-2xl font-bold text-slate-900'>
                      Drop your Excel file here
                    </p>
                    <p className='mt-1 text-sm text-slate-500'>
                      Click anywhere in this area to browse or drag the file in.
                    </p>
                  </div>
                  <div className='flex flex-wrap items-center justify-center gap-2 text-sm text-slate-500'>
                    <span>Accepted formats: .xlsx, .csv</span>
                    <span>Max size: {MAX_FILE_SIZE_MB}MB</span>
                  </div>
                </div>
              )}
            </div>
          </section>

          <div className='space-y-4'>
            <section className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
              <h2 className='text-lg font-semibold text-slate-900'>Import Checklist</h2>
              <div className='mt-4 space-y-3'>
                {[
                  'Download the template first to keep column names correct.',
                  'Fill every required field before uploading the sheet.',
                  'Keep variant payloads in valid JSON format.',
                  'Use valid image URLs if you want images attached on import.',
                  'Uploaded products go through the current approval flow.',
                ].map((item) => (
                  <div key={item} className='flex items-start gap-3 rounded-xl bg-slate-50 p-3'>
                    <div className='mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-cyan-100 text-cyan-700'>
                      <CheckCircle2 className='h-4 w-4' />
                    </div>
                    <p className='text-sm text-slate-600'>{item}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
              <h2 className='text-lg font-semibold text-slate-900'>Status</h2>
              <div className='mt-4 grid gap-3'>
                <div className='rounded-xl border border-slate-200 bg-slate-50 p-4'>
                  <p className='text-xs font-semibold uppercase tracking-[0.18em] text-slate-500'>
                    Current File
                  </p>
                  <p className='mt-2 text-sm font-medium text-slate-900'>
                    {file ? file.name : 'No file selected'}
                  </p>
                </div>
                <div className='rounded-xl border border-slate-200 bg-slate-50 p-4'>
                  <p className='text-xs font-semibold uppercase tracking-[0.18em] text-slate-500'>
                    Last Upload
                  </p>
                  <p className='mt-2 text-sm font-medium text-slate-900'>
                    {result
                      ? `${result.successCount} success, ${result.failureCount} failed`
                      : 'No upload processed yet'}
                  </p>
                </div>
              </div>
            </section>
          </div>
        </div>

        {result ? (
          <section className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
            <div className='flex flex-wrap items-center justify-between gap-3'>
              <div>
                <h2 className='text-lg font-semibold text-slate-900'>Upload Results</h2>
                <p className='text-sm text-slate-500'>
                  Review created products and row-level validation issues.
                </p>
              </div>
              <div className='flex flex-wrap items-center gap-2'>
                <Badge
                  className={cn(
                    'border',
                    result.failureCount > 0
                      ? 'border-amber-200 bg-amber-100/80 text-amber-800'
                      : 'border-emerald-200 bg-emerald-100/80 text-emerald-800'
                  )}
                >
                  {result.failureCount > 0 ? 'Completed with issues' : 'Completed'}
                </Badge>
                <Button
                  type='button'
                  variant='outline'
                  onClick={downloadTemplate}
                  className='rounded-xl border-slate-300'
                >
                  <Download className='h-4 w-4' />
                  Download Template
                </Button>
                <Button
                  type='button'
                  onClick={resetUpload}
                  className='rounded-xl bg-cyan-600 text-white hover:bg-cyan-700'
                >
                  Upload Another File
                </Button>
              </div>
            </div>

            <div className='mt-5 grid gap-4 md:grid-cols-3'>
              <div className='rounded-2xl border border-slate-200 bg-slate-50/80 p-5'>
                <div className='flex items-center justify-between'>
                  <div>
                    <p className='text-sm font-medium text-slate-500'>Processed Rows</p>
                    <p className='mt-1 text-3xl font-bold text-slate-900'>
                      {totalProcessed}
                    </p>
                  </div>
                  <div className='rounded-xl bg-cyan-100 p-3 text-cyan-700'>
                    <FileSpreadsheet className='h-6 w-6' />
                  </div>
                </div>
              </div>

              <div className='rounded-2xl border border-emerald-200 bg-emerald-50/80 p-5'>
                <div className='flex items-center justify-between'>
                  <div>
                    <p className='text-sm font-medium text-emerald-700'>Successful</p>
                    <p className='mt-1 text-3xl font-bold text-emerald-800'>
                      {result.successCount}
                    </p>
                  </div>
                  <div className='rounded-xl bg-emerald-100 p-3 text-emerald-700'>
                    <CheckCircle2 className='h-6 w-6' />
                  </div>
                </div>
              </div>

              <div className='rounded-2xl border border-rose-200 bg-rose-50/80 p-5'>
                <div className='flex items-center justify-between'>
                  <div>
                    <p className='text-sm font-medium text-rose-700'>Failed</p>
                    <p className='mt-1 text-3xl font-bold text-rose-800'>
                      {result.failureCount}
                    </p>
                  </div>
                  <div className='rounded-xl bg-rose-100 p-3 text-rose-700'>
                    <XCircle className='h-6 w-6' />
                  </div>
                </div>
              </div>
            </div>

            <div className='mt-5 grid gap-4 xl:grid-cols-2'>
              {(result.successfulProducts ?? []).length > 0 ? (
                <section className='rounded-2xl border border-emerald-200 bg-emerald-50/70 p-5'>
                  <h3 className='flex items-center gap-2 text-base font-semibold text-emerald-800'>
                    <CheckCircle2 className='h-5 w-5' />
                    Successfully Created Products
                  </h3>
                  <div className='mt-4 max-h-96 space-y-3 overflow-y-auto pr-1'>
                    {(result.successfulProducts ?? []).map((product) => (
                      <article
                        key={product.productId || `${product.slug}-${product.productName}`}
                        className='rounded-xl border border-emerald-200 bg-white p-4 shadow-sm'
                      >
                        <p className='font-semibold text-slate-900'>{product.productName}</p>
                        <p className='mt-1 text-sm text-slate-500'>
                          Slug: {product.slug || '-'}
                        </p>
                      </article>
                    ))}
                  </div>
                </section>
              ) : null}

              {(result.errors ?? []).length > 0 ? (
                <section className='rounded-2xl border border-rose-200 bg-rose-50/70 p-5'>
                  <h3 className='flex items-center gap-2 text-base font-semibold text-rose-800'>
                    <AlertCircle className='h-5 w-5' />
                    Errors ({result.errors.length})
                  </h3>
                  <div className='mt-4 max-h-96 space-y-3 overflow-y-auto pr-1'>
                    {(result.errors ?? []).map((error, index) => (
                      <article
                        key={`${error.productName}-${index}`}
                        className='rounded-xl border border-rose-200 bg-white p-4 shadow-sm'
                      >
                        <p className='font-semibold text-slate-900'>
                          {error.rows.length
                            ? error.rows.length > 1
                              ? `Rows ${error.rows.join(', ')}`
                              : `Row ${error.rows[0]}`
                            : 'Row unknown'}
                          {' : '}
                          {error.productName || 'Unknown Product'}
                        </p>
                        <ul className='mt-2 space-y-1 text-sm text-rose-700'>
                          {(error.errors ?? []).map((message, errorIndex) => (
                            <li key={`${message}-${errorIndex}`}>{message}</li>
                          ))}
                        </ul>
                      </article>
                    ))}
                  </div>
                </section>
              ) : null}
            </div>
          </section>
        ) : null}
      </Main>
    </>
  )
}

export default ExcelProductUpload
