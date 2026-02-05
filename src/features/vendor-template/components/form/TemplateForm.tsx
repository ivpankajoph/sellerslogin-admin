/* eslint-disable @typescript-eslint/consistent-type-imports */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from 'react'
import axios from 'axios'
import { VITE_PUBLIC_API_URL_TEMPLATE_FRONTEND } from '@/config'
import { AppDispatch } from '@/store'
import { BASE_URL } from '@/store/slices/vendor/productSlice'
import { fetchVendorProfile } from '@/store/slices/vendor/profileSlice'
import {
  Link2,
  Rocket,
  CheckCircle,
  AlertCircle,
  Upload,
  Shield,
  Zap,
} from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'
import { useSelector } from 'react-redux'
import { useDispatch } from 'react-redux'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { initialData, TemplateData } from '../../data'
import { uploadImage } from '../../helper/fileupload'
import { ImageInput } from './ImageInput'

export function TemplateForm() {
  const [data, setData] = useState<TemplateData>(initialData)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<
    'idle' | 'success' | 'error'
  >('idle')
  const [uploadingPaths, setUploadingPaths] = useState<Set<string>>(new Set())
  const [open, setOpen] = useState(false)
  const [isDeploying, setIsDeploying] = useState(false)
  const [deployMessage, setDeployMessage] = useState(
    'Deploying your website...'
  )
  const vendor_id = useSelector((state: any) => state?.auth?.user?.id)

  // Cloudinary upload function

  const updateField = (path: string[], value: any) => {
    setData((prev) => {
      const clone = JSON.parse(JSON.stringify(prev))
      let current: any = clone
      for (let i = 0; i < path.length - 1; i++) {
        current = current[path[i]]
      }
      current[path[path.length - 1]] = value
      return clone
    })
  }

  const handleImageChange = async (path: string[], file: File | null) => {
    const pathKey = path.join('.')

    if (!file) {
      updateField(path, '')
      setUploadingPaths((prev) => {
        const newSet = new Set(prev)
        newSet.delete(pathKey)
        return newSet
      })
      return
    }

    setUploadingPaths((prev) => new Set(prev).add(pathKey))

    try {
      const imageUrl = await uploadImage(file, 'template_images')
      if (imageUrl) {
        updateField(path, imageUrl)
      } else {
        updateField(path, '')
      }
    } finally {
      setUploadingPaths((prev) => {
        const newSet = new Set(prev)
        newSet.delete(pathKey)
        return newSet
      })
    }
  }

  async function handleCancel() {
    try {
      await axios.post(`${BASE_URL}/deploy/cancel`)
      toast.success('🚫 Deployment canceled successfully!')
    } catch (err) {
      toast.error('❌ Failed to cancel deployment.')
    }
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    setSubmitStatus('idle')

    try {
      const payload = {
        vendor_id,
        components: data.components,
      }

      const res = await axios.put(`${BASE_URL}/v1/templates/home`, payload, {
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (res.status === 200 || res.status === 201) {
        setSubmitStatus('success')
        toast.success('Template saved successfully!')
      } else {
        setSubmitStatus('error')
        toast.error('Failed to save template')
      }
    } catch {
      setSubmitStatus('error')
      toast.error('Submission failed. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const isUploadingPreview = uploadingPaths.has(
    'components.home_page.backgroundImage'
  )
  const isUploadingLogo = uploadingPaths.has('components.logo')

  const handleDeploy = async () => {
    setIsDeploying(true)
    toast.loading('🚀 Starting deployment...', { id: 'deploy' })

    try {
      const response = await fetch(`${BASE_URL}/v1/templates/deploy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectName: `vendor-${vendor_id}`,
          templatePath: `../vendor-template`,
        }),
      })

      if (!response.ok || !response.body) {
        toast.error('❌ Deployment failed to start', { id: 'deploy' })
        setIsDeploying(false)
        return
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let serviceUrl = null

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        // ✅ decode the current chunk safely
        const chunkText = decoder.decode(value, { stream: true })

        // Optional: live append to modal display
        setDeployMessage((prev) => prev + chunkText)

        // 🔍 try to extract deployed URL
        const match = chunkText.match(/https:\/\/[a-zA-Z0-9.-]+\.run\.app/)
        if (match) {
          serviceUrl = match[0]
        }
      }

      toast.success('✅ Deployment completed!', { id: 'deploy' })

      if (serviceUrl) {
        toast.success(`🌐 Live URL: ${serviceUrl}`, { id: 'deploy-url' })

        const bindResult = await bind_url_with_vendor_id(serviceUrl)
        if (bindResult.success) {
          toast.success('🔗 URL bound successfully!', { id: 'bind' })
        } else {
          toast.error('⚠️ Failed to bind URL.', { id: 'bind' })
        }
      } else {
        toast.error('⚠️ Deployment complete, but URL not found', {
          id: 'deploy',
        })
      }
    } catch {
      toast.error('❌ Deployment failed', { id: 'deploy' })
    } finally {
      setIsDeploying(false)
    }
  }

  const bind_url_with_vendor_id = async (url: string) => {
    try {
      const res = await axios.put(`${BASE_URL}/vendor/bind-url`, {
        url,
        vendor_id,
      })

      if (res.status !== 200 && res.status !== 201) {
        return { success: false, message: 'URL binding failed' }
      }

      return { success: true, data: res.data }
    } catch {
      return {
        success: false,
        message: 'An error occurred while binding the URL',
      }
    }
  }
  const dispatch = useDispatch<AppDispatch>()

  useEffect(() => {
    dispatch(fetchVendorProfile())
  })

  const vendor_weburl = useSelector(
    (state: any) => state?.vendorprofile?.profile?.vendor?.bound_url
  )

  return (
    <div className='space-y-6'>
      <Toaster position='top-right' />

      <Card className='border-0 bg-gradient-to-br from-gray-50 to-gray-100 shadow-lg shadow-gray-200/50'>
        <CardHeader className='relative overflow-hidden rounded-t-2xl bg-gradient-to-r from-slate-50 to-slate-100 p-6 shadow-sm'>
          <div className='relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
            {/* Title & Subtitle */}
            <div>
              <CardTitle className='text-3xl font-extrabold tracking-tight text-slate-800'>
                Template Builder
              </CardTitle>
              <p className='mt-1 text-sm text-slate-600 sm:text-base'>
                Customize your storefront and deploy instantly
              </p>
            </div>

            {/* Action Buttons */}
            <div className='flex flex-col gap-3 sm:flex-row'>
              <Button
                onClick={() => setOpen(true)}
                className='rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-5 py-2 text-white shadow-lg shadow-emerald-500/20 hover:from-emerald-600 hover:to-teal-600'
              >
                <Rocket className='mr-2 h-4 w-4' /> Deploy Website
              </Button>

              <a
                className='w-full sm:w-fit'
                href={`${VITE_PUBLIC_API_URL_TEMPLATE_FRONTEND}?vendor_id=${vendor_id}`}
                target='_blank'
                rel='noopener noreferrer'
              >
                <Button
                  variant='outline'
                  className='w-full rounded-xl border-indigo-300 px-5 py-2 text-indigo-600 hover:bg-indigo-50 sm:w-fit'
                >
                  <Link2 className='mr-2 h-4 w-4' /> Preview
                </Button>
              </a>

              <Button
                variant='outline'
                className='rounded-xl border-slate-300 px-5 py-2 hover:bg-slate-50'
              >
                <Link2 className='mr-2 h-4 w-4' /> Connect Your Domain
              </Button>
            </div>
          </div>

          {/* Website Display */}
          <div className='mt-4 ml-1 text-sm font-medium text-slate-700 sm:ml-12'>
            Your website:{' '}
            <span className='text-indigo-600'>{vendor_weburl}</span>
          </div>
        </CardHeader>

        <CardContent className='space-y-6 p-6'>
          {/* Basic Info */}
          <div className='grid grid-cols-1 gap-6 md:grid-cols-2'>
            <div className='space-y-4'>
              <div className='rounded-xl border border-gray-100 bg-white p-5 shadow-sm'>
                <ImageInput
                  label='Banner Image'
                  name='backgroundImage'
                  value={data.components.home_page.backgroundImage}
                  onChange={(file) =>
                    handleImageChange(
                      ['components', 'home_page', 'backgroundImage'],
                      file
                    )
                  }
                  isFileInput={true}
                  dimensions='1920 x 1080'
                />
                {isUploadingPreview && (
                  <div className='text-muted-foreground mt-2 flex items-center text-sm'>
                    <Upload className='mr-2 h-4 w-4 animate-pulse' />
                    Uploading banner...
                  </div>
                )}
              </div>
            </div>

            <div className='space-y-4'>
              <div className='rounded-xl border border-gray-100 bg-white p-5 shadow-sm'>
                <ImageInput
                  label='Company Logo'
                  name='logo'
                  value={data.components.logo}
                  onChange={(file) =>
                    handleImageChange(['components', 'logo'], file)
                  }
                  isFileInput={true}
                  dimensions='600 x 600'
                />
                {isUploadingLogo && (
                  <div className='text-muted-foreground mt-2 flex items-center text-sm'>
                    <Upload className='mr-2 h-4 w-4 animate-pulse' />
                    Uploading logo...
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Home Page Section 1 */}
          <div className='rounded-xl border border-gray-100 bg-white p-5 shadow-sm'>
            <h2 className='mb-4 flex items-center border-b border-gray-100 pb-2 text-xl font-semibold text-gray-800'>
              <div className='mr-3 rounded-lg bg-indigo-100 p-2'>
                <Zap className='h-5 w-5 text-indigo-600' />
              </div>
              Hero Section
            </h2>

            <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
              <div className='space-y-2'>
                <label className='text-sm font-medium text-gray-700'>
                  Hero Title
                </label>
                <Input
                  placeholder='Enter hero title'
                  value={data.components.home_page.header_text}
                  onChange={(e) =>
                    updateField(
                      ['components', 'home_page', 'header_text'],
                      e.target.value
                    )
                  }
                  className='h-12'
                />
              </div>

              <div className='space-y-2'>
                <label className='text-sm font-medium text-gray-700'>
                  Hero Subtitle
                </label>
                <Input
                  placeholder='Enter hero subtitle'
                  value={data.components.home_page.header_text_small}
                  onChange={(e) =>
                    updateField(
                      ['components', 'home_page', 'header_text_small'],
                      e.target.value
                    )
                  }
                  className='h-12'
                />
              </div>
            </div>

            <div className='mt-4 space-y-2'>
              <label className='text-sm font-medium text-gray-700'>
                Header Button Text
              </label>
              <Input
                placeholder='Button text'
                value={data.components.home_page.button_header}
                onChange={(e) =>
                  updateField(
                    ['components', 'home_page', 'button_header'],
                    e.target.value
                  )
                }
                className='h-12'
              />
            </div>
          </div>

          {/* Home Page Section 2 */}
          <div className='rounded-xl border border-gray-100 bg-white p-5 shadow-sm'>
            <h2 className='mb-4 flex items-center border-b border-gray-100 pb-2 text-xl font-semibold text-gray-800'>
              <div className='mr-3 rounded-lg bg-purple-100 p-2'>
                <Shield className='h-5 w-5 text-purple-600' />
              </div>
              Description Section
            </h2>

            <div className='space-y-4'>
              <div className='space-y-2'>
                <label className='text-sm font-medium text-gray-700'>
                  Large Description
                </label>
                <Textarea
                  placeholder='Enter detailed description'
                  value={data.components.home_page.description.large_text}
                  onChange={(e) =>
                    updateField(
                      ['components', 'home_page', 'description', 'large_text'],
                      e.target.value
                    )
                  }
                  className='min-h-[120px]'
                />
              </div>

              <div className='space-y-2'>
                <label className='text-sm font-medium text-gray-700'>
                  Summary
                </label>
                <Textarea
                  placeholder='Enter summary'
                  value={data.components.home_page.description.summary}
                  onChange={(e) =>
                    updateField(
                      ['components', 'home_page', 'description', 'summary'],
                      e.target.value
                    )
                  }
                  className='min-h-[100px]'
                />
              </div>

              <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
                <div className='space-y-2'>
                  <label className='text-sm font-medium text-gray-700'>
                    Percent (e.g. 90)
                  </label>
                  <Input
                    placeholder='Percent number'
                    value={
                      data.components.home_page.description.percent
                        .percent_in_number
                    }
                    onChange={(e) =>
                      updateField(
                        [
                          'components',
                          'home_page',
                          'description',
                          'percent',
                          'percent_in_number',
                        ],
                        e.target.value
                      )
                    }
                    className='h-12'
                  />
                </div>

                <div className='space-y-2'>
                  <label className='text-sm font-medium text-gray-700'>
                    Percent Label
                  </label>
                  <Input
                    placeholder='Percent text'
                    value={
                      data.components.home_page.description.percent.percent_text
                    }
                    onChange={(e) =>
                      updateField(
                        [
                          'components',
                          'home_page',
                          'description',
                          'percent',
                          'percent_text',
                        ],
                        e.target.value
                      )
                    }
                    className='h-12'
                  />
                </div>
              </div>

              <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
                <div className='space-y-2'>
                  <label className='text-sm font-medium text-gray-700'>
                    Sold Number
                  </label>
                  <Input
                    placeholder='Sold number'
                    value={
                      data.components.home_page.description.sold.sold_number
                    }
                    onChange={(e) =>
                      updateField(
                        [
                          'components',
                          'home_page',
                          'description',
                          'sold',
                          'sold_number',
                        ],
                        e.target.value
                      )
                    }
                    className='h-12'
                  />
                </div>

                <div className='space-y-2'>
                  <label className='text-sm font-medium text-gray-700'>
                    Sold Label
                  </label>
                  <Input
                    placeholder='Sold text'
                    value={data.components.home_page.description.sold.sold_text}
                    onChange={(e) =>
                      updateField(
                        [
                          'components',
                          'home_page',
                          'description',
                          'sold',
                          'sold_text',
                        ],
                        e.target.value
                      )
                    }
                    className='h-12'
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Submit Section */}
          <div className='flex flex-col items-center justify-between gap-4 pt-4 sm:flex-row'>
            <div className='flex items-center'>
              {submitStatus === 'success' && (
                <div className='flex items-center text-green-600'>
                  <CheckCircle className='mr-2 h-5 w-5' />
                  <span>Template saved successfully!</span>
                </div>
              )}
              {submitStatus === 'error' && (
                <div className='flex items-center text-red-600'>
                  <AlertCircle className='mr-2 h-5 w-5' />
                  <span>Failed to save. Please try again.</span>
                </div>
              )}
            </div>

            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || uploadingPaths.size > 0}
              className='h-12 bg-gradient-to-r from-indigo-600 to-purple-600 px-8 text-white shadow-lg shadow-indigo-500/20 hover:from-indigo-700 hover:to-purple-700'
            >
              {isSubmitting ? (
                <div className='flex items-center'>
                  <div className='mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent'></div>
                  Saving...
                </div>
              ) : uploadingPaths.size > 0 ? (
                <div className='flex items-center'>
                  <Upload className='mr-2 h-4 w-4 animate-pulse' />
                  Uploading Images...
                </div>
              ) : (
                <div className='flex items-center'>
                  <CheckCircle className='mr-2 h-4 w-4' />
                  Save Template
                </div>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Deployment Modal */}
      {open && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm'>
          <div className='animate-fadeIn relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl'>
            {/* Decorative elements */}
            <div className='absolute -top-6 -right-6 h-24 w-24 rounded-full bg-gradient-to-r from-indigo-400 to-purple-400 opacity-20 blur-2xl'></div>
            <div className='absolute -bottom-6 -left-6 h-24 w-24 rounded-full bg-gradient-to-r from-emerald-400 to-teal-400 opacity-20 blur-2xl'></div>

            {!isDeploying ? (
              <div className='relative z-10 space-y-6'>
                <div className='flex justify-center'>
                  <div className='rounded-full bg-gradient-to-r from-indigo-100 to-purple-100 p-4'>
                    <Rocket className='h-12 w-12 text-indigo-600' />
                  </div>
                </div>

                <div className='text-center'>
                  <h2 className='text-2xl font-bold text-gray-900'>
                    Deploy Your Website
                  </h2>
                  <p className='mt-2 text-gray-600'>
                    Your customized storefront will be deployed to our secure
                    servers. This process typically takes 2-3 minutes.
                  </p>
                </div>

                <div className='space-y-4'>
                  <div className='flex items-start'>
                    <div className='mt-1 flex-shrink-0'>
                      <div className='flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100'>
                        <span className='text-sm font-bold text-indigo-600'>
                          1
                        </span>
                      </div>
                    </div>
                    <div className='ml-3'>
                      <p className='text-sm font-medium text-gray-900'>
                        Build Process
                      </p>
                      <p className='text-sm text-gray-500'>
                        Your site will be built with the latest technologies
                      </p>
                    </div>
                  </div>

                  <div className='flex items-start'>
                    <div className='mt-1 flex-shrink-0'>
                      <div className='flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100'>
                        <span className='text-sm font-bold text-indigo-600'>
                          2
                        </span>
                      </div>
                    </div>
                    <div className='ml-3'>
                      <p className='text-sm font-medium text-gray-900'>
                        Secure Hosting
                      </p>
                      <p className='text-sm text-gray-500'>
                        Your site will be hosted on our secure infrastructure
                      </p>
                    </div>
                  </div>

                  <div className='flex items-start'>
                    <div className='mt-1 flex-shrink-0'>
                      <div className='flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100'>
                        <span className='text-sm font-bold text-indigo-600'>
                          3
                        </span>
                      </div>
                    </div>
                    <div className='ml-3'>
                      <p className='text-sm font-medium text-gray-900'>
                        Go Live
                      </p>
                      <p className='text-sm text-gray-500'>
                        Your custom domain will be activated
                      </p>
                    </div>
                  </div>
                </div>

                <div className='flex flex-col gap-3 pt-4 sm:flex-row'>
                  <Button
                    variant='outline'
                    onClick={() => setOpen(false)}
                    className='flex-1'
                  >
                    Cancel
                  </Button>
                  <Button
                    className='flex-1 bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:from-emerald-600 hover:to-teal-600'
                    onClick={handleDeploy}
                  >
                    <Rocket className='mr-2 h-4 w-4' />
                    Deploy Now
                  </Button>
                </div>
              </div>
            ) : (
              <div className='relative z-10 flex flex-col items-center py-8'>
                <div className='mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-r from-emerald-100 to-teal-100'>
                  <div className='h-16 w-16 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent'></div>
                </div>

                <h3 className='text-xl font-bold text-gray-900'>
                  Building Your Website
                </h3>
                <pre className='mt-2 max-h-60 overflow-y-auto rounded bg-gray-50 p-3 text-left text-xs text-gray-600'>
                  {deployMessage}
                </pre>

                <div className='mt-8 w-full'>
                  <div className='mb-1 flex justify-between text-sm text-gray-600'>
                    <span>Progress</span>
                    <span>75%</span>
                  </div>
                  <Button onClick={handleCancel}>Cancel Deployment</Button>
                  <div className='h-2 w-full rounded-full bg-gray-200'>
                    <div
                      className='h-2 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-500 ease-out'
                      style={{ width: '75%' }}
                    ></div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
