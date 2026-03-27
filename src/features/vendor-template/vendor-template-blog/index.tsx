/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { useNavigate } from '@tanstack/react-router'
import { ArrowLeft, ImagePlus, Link2, Plus, Trash2, Wand2 } from 'lucide-react'
import { Toaster } from 'react-hot-toast'

import { BASE_URL } from '@/store/slices/vendor/productSlice'
import { useSelector } from 'react-redux'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { ThemeSwitch } from '@/components/theme-switch'
import { DomainModal } from '../components/DomainModel'
import { TemplatePageLayout } from '../components/TemplatePageLayout'
import { TemplatePreviewPanel } from '../components/TemplatePreviewPanel'
import { ThemeSettingsSection } from '../components/form/ThemeSettingsSection'
import { updateFieldImmutable } from '../components/hooks/utils'
import { initialData as importedInitialData, type TemplateData } from '../data'
import {
  getVendorTemplatePreviewUrl,
  resolvePreviewCityFromVendorProfile,
} from '@/lib/storefront-url'
import { getStoredEditingTemplateKey } from '../components/templateVariantParam'
import { useActiveWebsiteSelection } from '../components/websiteStudioStorage'
import { useConnectedTemplateDomain } from '../components/hooks/useConnectedTemplateDomain'
import { uploadImage } from '../helper/fileupload'

const MAX_BLOG_COVER_SIZE_BYTES = 10 * 1024 * 1024

const selectVendorId = (state: any): string => {
  const authUser = state?.auth?.user || null
  const vendorProfile =
    state?.vendorprofile?.profile?.vendor ||
    state?.vendorprofile?.profile?.data ||
    state?.vendorprofile?.profile ||
    null

  return String(
    authUser?.id ||
      authUser?._id ||
      authUser?.vendor_id ||
      authUser?.vendorId ||
      vendorProfile?._id ||
      vendorProfile?.id ||
      vendorProfile?.vendor_id ||
      ''
  ).trim()
}

const slugify = (value: unknown) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

const createBlogId = () =>
  `blog-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`

const createBlogPost = (overrides?: Record<string, unknown>) => ({
  id: createBlogId(),
  title: '',
  slug: '',
  excerpt: '',
  cover_image: '',
  content: '',
  isPublished: true,
  published_at: new Date().toISOString().slice(0, 10),
  ...overrides,
})

const isSupportedImageUrl = (value: unknown) => {
  const normalized = String(value || '').trim()
  return (
    normalized.startsWith('http://') ||
    normalized.startsWith('https://') ||
    normalized.startsWith('data:image/') ||
    normalized.startsWith('blob:')
  )
}

const verifyImageUrl = (value: string) =>
  new Promise<boolean>((resolve) => {
    if (!isSupportedImageUrl(value)) {
      resolve(false)
      return
    }

    const image = new window.Image()
    image.onload = () => resolve(true)
    image.onerror = () => resolve(false)
    image.src = value
  })

const safeInitialData: TemplateData = {
  components: {
    theme: {
      templateColor: '#0f172a',
      bannerColor: '#0f172a',
      fontScale: 1,
      headingFont: 'Poppins',
      bodyFont: 'Poppins',
      textColor: '#1f2937',
      headingColor: '#0f172a',
      surfaceColor: '#ffffff',
      surfaceMutedColor: '#f8fafc',
      borderColor: '#e2e8f0',
    },
    social_page: {
      footer: {
        blog_label: 'Blog',
        blog_href: '/blog',
      },
      blogs: [],
    },
    logo: '',
    vendor_profile: {},
    home_page: {
      header_text: '',
      backgroundImage: '',
      header_text_small: '',
      button_header: '',
      description: {
        large_text: '',
        summary: '',
        percent: {
          percent_in_number: '',
          percent_text: '',
        },
        sold: {
          sold_number: '',
          sold_text: '',
        },
      },
    },
    about_page: {
      hero: {
        backgroundImage: '',
        title: '',
        subtitle: '',
      },
      story: {
        heading: '',
        paragraphs: [],
        image: '',
      },
      vendorStories: {
        heading: '',
        subtitle: '',
        items: [],
      },
      values: [],
      team: [],
      stats: [],
    },
    contact_page: {
      section_2: {
        hero_title: '',
        hero_subtitle: '',
        hero_title2: '',
        hero_subtitle2: '',
        lat: '',
        long: '',
      },
      hero: {
        backgroundImage: '',
        title: '',
        subtitle: '',
      },
      contactInfo: [],
      contactForm: {
        heading: '',
        description: '',
        fields: [],
        submitButtonText: '',
      },
      visitInfo: {
        heading: '',
        description: '',
        mapImage: '',
        reasonsHeading: '',
        reasonsList: [],
      },
      faqSection: {
        heading: '',
        subheading: '',
        faqs: [],
      },
      socialMedia: {
        facebook: '',
        instagram: '',
        whatsapp: '',
        twitter: '',
      },
    },
    custom_pages: [],
  },
}

const initialData: TemplateData = {
  ...safeInitialData,
  ...importedInitialData,
  components: {
    ...safeInitialData.components,
    ...importedInitialData?.components,
    vendor_profile: {
      ...safeInitialData.components.vendor_profile,
      ...(importedInitialData?.components?.vendor_profile || {}),
    },
    social_page: {
      ...safeInitialData.components.social_page,
      ...importedInitialData?.components?.social_page,
      footer: {
        ...((safeInitialData.components.social_page as any)?.footer || {}),
        ...((importedInitialData?.components?.social_page as any)?.footer || {}),
      },
      blogs: Array.isArray((importedInitialData?.components?.social_page as any)?.blogs)
        ? (importedInitialData?.components?.social_page as any).blogs
        : [],
    },
  },
}

function VendorTemplateBlog() {
  const navigate = useNavigate()
  const vendor_id = useSelector(selectVendorId)
  const token = useSelector((state: any) => state.auth?.token)
  const authDefaultCitySlug = useSelector(
    (state: any) => state.auth?.user?.default_city_slug || ''
  )
  const [data, setData] = useState<TemplateData>(initialData)
  const [isSaving, setIsSaving] = useState(false)
  const [inlineEditVersion, setInlineEditVersion] = useState(0)
  const [domainOpen, setDomainOpen] = useState(false)
  const [uploadingBlogId, setUploadingBlogId] = useState<string | null>(null)
  const [testingCoverBlogId, setTestingCoverBlogId] = useState<string | null>(null)
  const [coverInputById, setCoverInputById] = useState<Record<string, string>>({})
  const selectedTemplateKey = useMemo(
    () => getStoredEditingTemplateKey(vendor_id),
    [vendor_id]
  )
  const { activeWebsiteId, activeWebsite } = useActiveWebsiteSelection(vendor_id)

  useEffect(() => {
    if (!vendor_id) return

    const mergeTemplate = (payload: Record<string, unknown>): TemplateData => {
      const base = structuredClone(initialData)
      const incomingComponents =
        payload.components && typeof payload.components === 'object'
          ? (payload.components as TemplateData['components'])
          : null
      const incomingSocial =
        payload.social_page && typeof payload.social_page === 'object'
          ? (payload.social_page as Record<string, unknown>)
          : null

      return {
        ...base,
        components: {
          ...base.components,
          ...(incomingComponents || {}),
          theme: {
            ...base.components.theme,
            ...(incomingComponents as any)?.theme,
            ...(payload.theme as any),
          },
          vendor_profile: {
            ...base.components.vendor_profile,
            ...((incomingComponents as any)?.vendor_profile || {}),
          },
          social_page: {
            ...base.components.social_page,
            ...((incomingComponents as any)?.social_page || {}),
            ...(incomingSocial || {}),
            footer: {
              ...((base.components.social_page as any)?.footer || {}),
              ...(((incomingComponents as any)?.social_page?.footer as
                | Record<string, unknown>
                | undefined) || {}),
              ...((incomingSocial?.footer as Record<string, unknown>) || {}),
            },
            blogs:
              (((incomingComponents as any)?.social_page?.blogs ||
                incomingSocial?.blogs) as unknown[]) || [],
          },
        },
      }
    }

    const endpoints = [
      `${BASE_URL}/v1/templates/social-faqs?vendor_id=${vendor_id}${
        activeWebsiteId ? `&website_id=${encodeURIComponent(activeWebsiteId)}` : ''
      }`,
      `${BASE_URL}/v1/templates/social-faqs/${vendor_id}`,
      `${BASE_URL}/v1/templates/${vendor_id}/social`,
      `${BASE_URL}/v1/templates/${vendor_id}`,
    ]

    const load = async () => {
      let nextData = structuredClone(initialData)

      for (const url of endpoints) {
        try {
          const res = await axios.get(url, {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          })
          const root = res.data as unknown
          const record =
            root && typeof root === 'object'
              ? (root as Record<string, unknown>)
              : null
          const payload =
            (record?.data as Record<string, unknown>) ||
            (record?.template as Record<string, unknown>) ||
            record

          if (payload && typeof payload === 'object') {
            nextData = mergeTemplate(payload as Record<string, unknown>)
            break
          }
        } catch {
          continue
        }
      }

      const blogs = Array.isArray((nextData.components.social_page as any)?.blogs)
        ? ((nextData.components.social_page as any).blogs as any[])
        : []
      ;(nextData.components.social_page as any).blogs = blogs.map((item, index) =>
        createBlogPost({
          ...item,
          id: String(item?.id || createBlogId()),
          slug: String(item?.slug || item?.title || `blog-${index + 1}`),
        })
      )

      setData(nextData)
      setCoverInputById(
        Object.fromEntries(
          (((nextData.components.social_page as any)?.blogs as any[]) || []).map((item: any) => [
            String(item?.id || ''),
            String(item?.cover_image || ''),
          ])
        )
      )
    }

    load()
  }, [activeWebsiteId, token, vendor_id])

  const updateField = useCallback(
    (path: string[], value: unknown, options?: { markDirty?: boolean }) => {
      setData((prev) => updateFieldImmutable(prev, path, value))
      if (options?.markDirty !== false) {
        setInlineEditVersion((prev) => prev + 1)
      }
    },
    []
  )

  const handleInlineEdit = (path: string[], value: unknown) => {
    updateField(path, value)
  }

  const blogs = useMemo(
    () =>
      (Array.isArray((data.components.social_page as any)?.blogs)
        ? ((data.components.social_page as any).blogs as any[])
        : []) as Array<Record<string, any>>,
    [data.components.social_page]
  )

  const updateBlog = (blogId: string, patch: Record<string, unknown>) => {
    setData((prev) => {
      const existingBlogs = Array.isArray((prev.components.social_page as any)?.blogs)
        ? [ ...((prev.components.social_page as any).blogs as any[]) ]
        : []
      const nextBlogs = existingBlogs.map((item) =>
        String(item?.id || '') === blogId ? { ...item, ...patch } : item
      )

      return updateFieldImmutable(prev, ['components', 'social_page', 'blogs'], nextBlogs)
    })
    setInlineEditVersion((prev) => prev + 1)
  }

  const handleBlogTitleChange = (blog: Record<string, any>, value: string) => {
    const previousTitle = String(blog?.title || '')
    const previousSlug = String(blog?.slug || '')
    const nextSlug =
      !previousSlug || previousSlug === slugify(previousTitle) ? slugify(value) : previousSlug

    updateBlog(String(blog.id), {
      title: value,
      slug: nextSlug,
    })
  }

  const handleAddBlog = () => {
    const nextBlogs = [...blogs, createBlogPost()]
    updateField(['components', 'social_page', 'blogs'], nextBlogs)
  }

  const handleRemoveBlog = (blogId: string) => {
    const nextBlogs = blogs.filter((item) => String(item?.id || '') !== blogId)
    updateField(['components', 'social_page', 'blogs'], nextBlogs)
  }

  const handleBlogImageUpload = async (blogId: string, file: File) => {
    if (file.size > MAX_BLOG_COVER_SIZE_BYTES) {
      toast.error('Please upload an image smaller than 10MB.')
      return
    }

    setUploadingBlogId(blogId)
    try {
      const imageUrl = await uploadImage(file, 'template_images', {
        suppressErrorToast: true,
      })

      if (!imageUrl) {
        toast.error('Cover image upload failed. Please try again.')
        return
      }

      setCoverInputById((prev) => ({
        ...prev,
        [blogId]: imageUrl,
      }))
      updateBlog(blogId, {
        cover_image: imageUrl,
      })
      toast.success('Template saved successfully')
    } catch {
      toast.error('Cover image upload failed. Please try again.')
    } finally {
      setUploadingBlogId(null)
    }
  }

  const requestCoverUrl = (blogId: string) => {
    const currentValue = String(
      coverInputById[blogId] !== undefined
        ? coverInputById[blogId]
        : blogs.find((item) => String(item?.id || '') === blogId)?.cover_image || ''
    ).trim()

    const nextValue = window.prompt('Paste a direct image URL', currentValue)
    if (nextValue === null) {
      return null
    }

    const normalized = nextValue.trim()
    setCoverInputById((prev) => ({
      ...prev,
      [blogId]: normalized,
    }))
    return normalized
  }

  const applyCoverUrl = (blogId: string, value: string) => {
    const normalized = String(value || '').trim()
    setCoverInputById((prev) => ({
      ...prev,
      [blogId]: normalized,
    }))

    if (!normalized) {
      updateBlog(blogId, {
        cover_image: '',
      })
      return
    }

    if (!isSupportedImageUrl(normalized)) {
      toast.error('Please enter a valid image URL.')
      return
    }

    updateBlog(blogId, {
      cover_image: normalized,
    })
  }

  const testAndApplyCoverUrl = async (
    blogId: string,
    value: string,
    options?: { silentSuccess?: boolean }
  ) => {
    const normalized = String(value || '').trim()

    setCoverInputById((prev) => ({
      ...prev,
      [blogId]: normalized,
    }))

    if (!normalized) {
      updateBlog(blogId, {
        cover_image: '',
      })
      if (!options?.silentSuccess) {
        toast.success('Cover image removed.')
      }
      return
    }

    if (!isSupportedImageUrl(normalized)) {
      toast.error('Please enter a valid image URL.')
      return
    }

    setTestingCoverBlogId(blogId)
    const isValid = await verifyImageUrl(normalized)
    setTestingCoverBlogId(null)

    if (!isValid) {
      toast.error('Image URL could not be loaded. Please use a direct image link.')
      return
    }

    updateBlog(blogId, {
      cover_image: normalized,
    })

    if (!options?.silentSuccess) {
      toast.success('Template saved successfully')
    }
  }

  const handleSave = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!vendor_id) {
        if (!options?.silent) {
          toast.error('Vendor ID is missing. Please log in again.')
        }
        return
      }

      setIsSaving(true)

      try {
        const response = await axios.put(
          `${BASE_URL}/v1/templates/social-faqs`,
          {
            vendor_id,
            website_id: activeWebsiteId,
            social_page: data.components.social_page,
            vendor_profile: data.components.vendor_profile,
            theme: data.components.theme,
          },
          {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          }
        )

        if (response.data?.success) {
          if (!options?.silent) {
            toast.success('Template saved successfully')
          }
        } else if (!options?.silent) {
          toast.error(response.data?.message || 'Failed to save.')
        }
      } catch (error: unknown) {
        if (!options?.silent) {
          if (axios.isAxiosError(error)) {
            toast.error(
              error.response?.data?.message ||
                error.message ||
                'An error occurred while saving.'
            )
          } else {
            toast.error('Unexpected error occurred.')
          }
        }
      } finally {
        setIsSaving(false)
      }
    },
    [activeWebsiteId, data, token, vendor_id]
  )

  useEffect(() => {
    if (inlineEditVersion === 0) return
    const timeout = window.setTimeout(() => {
      void handleSave({ silent: true })
    }, 700)
    return () => window.clearTimeout(timeout)
  }, [handleSave, inlineEditVersion])

  const previewCity = useMemo(
    () =>
      resolvePreviewCityFromVendorProfile(
        data?.components?.vendor_profile,
        authDefaultCitySlug
      ),
    [authDefaultCitySlug, data?.components?.vendor_profile]
  )
  const previewBaseUrl = getVendorTemplatePreviewUrl(
    vendor_id,
    selectedTemplateKey,
    previewCity.slug,
    activeWebsiteId
  )
  const { connectedDomain, connectedDomainState } = useConnectedTemplateDomain({
    vendorId: vendor_id,
    token,
    activeWebsiteId,
    skip: domainOpen,
  })

  const footerConfig =
    (((data?.components?.social_page as any)?.footer ||
      {}) as Record<string, string>) || {}

  const headerActions = (
    <>
      <Button
        variant='outline'
        onClick={() => void navigate({ to: '/template-workspace' })}
        className='h-9 shrink-0 whitespace-nowrap rounded-full border-slate-300 px-3 text-xs sm:px-4 sm:text-sm'
      >
        <ArrowLeft className='h-4 w-4' /> My Websites
      </Button>
      <Button
        onClick={() => {
          void handleSave()
        }}
        disabled={isSaving || !vendor_id}
        className='h-9 shrink-0 whitespace-nowrap rounded-full bg-slate-900 px-3 text-xs text-white shadow-lg shadow-slate-900/20 hover:bg-slate-800 sm:px-4 sm:text-sm'
      >
        {isSaving ? 'Saving...' : 'Save Template'}
      </Button>
      <Button
        variant='outline'
        onClick={() => setDomainOpen(true)}
        className='h-9 shrink-0 whitespace-nowrap rounded-full border-slate-300 px-3 text-xs sm:px-4 sm:text-sm'
      >
        <Wand2 className='h-4 w-4' />{' '}
        {connectedDomainState === 'connected'
          ? 'Domain Connected'
          : connectedDomainState === 'error'
            ? 'Domain Error'
            : connectedDomain?.hostname
              ? 'Domain Pending'
              : 'Connect Domain'}
      </Button>
      {previewBaseUrl ? (
        <a
          href={previewBaseUrl}
          target='_blank'
          rel='noopener noreferrer'
          className='shrink-0'
        >
          <Button
            variant='outline'
            className='h-9 whitespace-nowrap rounded-full border-slate-300 px-3 text-xs sm:px-4 sm:text-sm'
          >
            <Link2 className='h-4 w-4' /> Open Preview
          </Button>
        </a>
      ) : null}
    </>
  )

  return (
    <>
      <Header fixed>
        <div className='flex min-w-0 flex-1 items-center gap-3 overflow-hidden'>
          <div className='shrink-0 text-sm font-semibold text-slate-900 sm:text-base'>
            Edit Website
          </div>
          <div className='min-w-0 flex-1 overflow-x-auto'>
            <div className='flex min-w-max items-center gap-2 pe-2'>
              {headerActions}
            </div>
          </div>
        </div>
        <div className='ms-auto flex shrink-0 items-center space-x-4'>
          <ThemeSwitch />
          <ConfigDrawer />
          <ProfileDropdown />
        </div>
      </Header>
      <Toaster position='top-right' />

      <TemplatePageLayout
        title='Blog'
        description='Create and publish blog posts that customers can open from the website footer.'
        activeKey='blog'
        vendorId={vendor_id}
        connectedDomainHost={connectedDomain?.hostname || ''}
        connectedDomainState={connectedDomainState}
        editingTemplateKey={selectedTemplateKey}
        preview={
          <TemplatePreviewPanel
            title='Live Template Preview'
            subtitle={`Open and sync the right-side preview. Default city: ${previewCity.label}`}
            baseSrc={previewBaseUrl}
            defaultPath='/blog'
            pageOptions={[
              { label: 'Home', path: '' },
              { label: 'Blog', path: '/blog' },
              { label: 'About', path: '/about' },
              { label: 'Contact', path: '/contact' },
            ]}
            onSync={handleSave}
            isSyncing={isSaving}
            syncDisabled={!vendor_id}
            vendorId={vendor_id}
            page='full'
            previewData={data}
            onInlineEdit={handleInlineEdit}
          />
        }
      >
        <ThemeSettingsSection data={data} updateField={updateField} />

        <div className='rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm'>
          <div className='flex flex-col gap-2'>
            <h3 className='text-lg font-semibold text-slate-900'>Footer Blog Link</h3>
            <p className='text-sm text-slate-600'>
              This link will appear in footer quick links after Contact Us.
            </p>
          </div>

          <div className='mt-5 grid gap-4 md:grid-cols-2'>
            <div className='space-y-1'>
              <Label>Footer Link Label</Label>
              <Input
                value={footerConfig.blog_label || ''}
                onChange={(event) =>
                  updateField(
                    ['components', 'social_page', 'footer', 'blog_label'],
                    event.target.value
                  )
                }
                placeholder='Blog'
              />
            </div>
            <div className='space-y-1'>
              <Label>Footer Link Path</Label>
              <Input
                value={footerConfig.blog_href || ''}
                onChange={(event) =>
                  updateField(
                    ['components', 'social_page', 'footer', 'blog_href'],
                    event.target.value
                  )
                }
                placeholder='/blog'
              />
            </div>
          </div>
        </div>

        <div className='space-y-6'>
          <div className='flex items-center justify-between rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm'>
            <div>
              <h3 className='text-lg font-semibold text-slate-900'>Blog Posts</h3>
              <p className='text-sm text-slate-600'>
                Vendors can add multiple blogs here. Published blogs will show on the
                website blog page.
              </p>
            </div>
            <Button
              type='button'
              onClick={handleAddBlog}
              className='rounded-full bg-slate-900 text-white hover:bg-slate-800'
            >
              <Plus className='mr-2 h-4 w-4' /> Add Blog
            </Button>
          </div>

          {blogs.length === 0 ? (
            <div className='rounded-3xl border border-dashed border-slate-300 bg-white/70 p-10 text-center text-sm text-slate-500'>
              No blogs yet. Click Add Blog to publish your first post.
            </div>
          ) : null}

          {blogs.map((blog, index) => {
            const blogId = String(blog?.id || '')
            const isUploading = uploadingBlogId === blogId
            const isTestingUrl = testingCoverBlogId === blogId
            return (
              <div
                key={blogId}
                className='rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm'
              >
                <div className='flex flex-wrap items-center justify-between gap-3'>
                  <div>
                    <h3 className='text-lg font-semibold text-slate-900'>
                      Blog {index + 1}
                    </h3>
                    <p className='text-sm text-slate-600'>
                      Manage the content customers will read on the blog page.
                    </p>
                  </div>
                  <Button
                    type='button'
                    variant='outline'
                    onClick={() => handleRemoveBlog(blogId)}
                    className='rounded-full border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700'
                  >
                    <Trash2 className='mr-2 h-4 w-4' /> Remove
                  </Button>
                </div>

                <div className='mt-5 grid gap-4 md:grid-cols-2'>
                  <div className='space-y-1'>
                    <Label>Blog Title</Label>
                    <Input
                      value={String(blog?.title || '')}
                      onChange={(event) =>
                        handleBlogTitleChange(blog, event.target.value)
                      }
                      placeholder='Write your blog title'
                    />
                  </div>
                  <div className='space-y-1'>
                    <Label>Slug</Label>
                    <Input
                      value={String(blog?.slug || '')}
                      onChange={(event) =>
                        updateBlog(blogId, {
                          slug: slugify(event.target.value),
                        })
                      }
                      placeholder='blog-title'
                    />
                  </div>
                </div>

                <div className='mt-5 grid gap-4 md:grid-cols-2'>
                  <div className='space-y-1'>
                    <Label>Short Excerpt</Label>
                    <Textarea
                      value={String(blog?.excerpt || '')}
                      onChange={(event) =>
                        updateBlog(blogId, {
                          excerpt: event.target.value,
                        })
                      }
                      placeholder='Short summary shown on the blog listing page'
                      className='min-h-[110px]'
                    />
                  </div>
                  <div className='space-y-4'>
                    <div className='space-y-1'>
                      <Label>Publish Date</Label>
                      <Input
                        type='date'
                        value={String(blog?.published_at || '')}
                        onChange={(event) =>
                          updateBlog(blogId, {
                            published_at: event.target.value,
                          })
                        }
                      />
                    </div>
                    <div className='flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3'>
                      <Checkbox
                        id={`publish-${blogId}`}
                        checked={blog?.isPublished !== false}
                        onCheckedChange={(checked) =>
                          updateBlog(blogId, {
                            isPublished: checked === true,
                          })
                        }
                      />
                      <Label
                        htmlFor={`publish-${blogId}`}
                        className='cursor-pointer text-sm font-medium text-slate-700'
                      >
                        Show this blog on the website
                      </Label>
                    </div>
                  </div>
                </div>

                <div className='mt-5 space-y-1'>
                  <Label>Cover Image</Label>
                  <div className='flex flex-col gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4'>
                    {String(blog?.cover_image || '').trim() ? (
                      <img
                        src={String(blog.cover_image)}
                        alt={String(blog?.title || 'Blog cover')}
                        className='h-48 w-full rounded-2xl object-cover'
                        onError={(event) => {
                          event.currentTarget.style.display = 'none'
                        }}
                      />
                    ) : (
                      <div className='flex h-40 items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white text-sm text-slate-500'>
                        Upload a cover image for this blog
                      </div>
                    )}
                    <div className='flex flex-wrap gap-3'>
                      <Label
                        htmlFor={`blog-cover-${blogId}`}
                        className='inline-flex cursor-pointer items-center rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800'
                      >
                        <ImagePlus className='mr-2 h-4 w-4' />
                        {isUploading ? 'Uploading...' : 'Upload Cover'}
                      </Label>
                      <input
                        id={`blog-cover-${blogId}`}
                        type='file'
                        accept='image/*'
                        className='hidden'
                        onChange={(event) => {
                          const file = event.target.files?.[0]
                          if (!file) return
                          void handleBlogImageUpload(blogId, file)
                          event.currentTarget.value = ''
                        }}
                      />
                    </div>
                    <div className='flex flex-wrap gap-3'>
                      <Button
                        type='button'
                        variant='outline'
                        disabled={isTestingUrl}
                        onClick={() => {
                          const requestedValue = requestCoverUrl(blogId)
                          if (requestedValue === null) return
                          void testAndApplyCoverUrl(blogId, requestedValue, {
                            silentSuccess: true,
                          })
                        }}
                        className='rounded-full'
                      >
                        {isTestingUrl ? 'Previewing...' : 'Preview Image'}
                      </Button>
                      <Button
                        type='button'
                        disabled={isTestingUrl}
                        onClick={() => {
                          const requestedValue = requestCoverUrl(blogId)
                          if (requestedValue === null) return
                          void testAndApplyCoverUrl(blogId, requestedValue)
                        }}
                        className='rounded-full bg-slate-900 text-white hover:bg-slate-800'
                      >
                        Use URL
                      </Button>
                      <Button
                        type='button'
                        variant='outline'
                        onClick={() => applyCoverUrl(blogId, '')}
                        className='rounded-full'
                      >
                        Remove Image
                      </Button>
                    </div>
                    <p className='text-xs text-slate-500'>
                      Tip: direct `https://...jpg/png/webp` links or uploaded files up to
                      10MB work best.
                    </p>
                  </div>
                </div>

                <div className='mt-5 space-y-1'>
                  <Label>Blog Content</Label>
                  <Textarea
                    value={String(blog?.content || '')}
                    onChange={(event) =>
                      updateBlog(blogId, {
                        content: event.target.value,
                      })
                    }
                    placeholder='Write the full blog content here. Use blank lines between paragraphs.'
                    className='min-h-[260px]'
                  />
                </div>
              </div>
            )
          })}
        </div>
      </TemplatePageLayout>

      <DomainModal
        open={domainOpen}
        setOpen={setDomainOpen}
        activeWebsiteName={activeWebsite?.name || activeWebsite?.websiteSlug || ''}
        initialDomain={connectedDomain}
      />
    </>
  )
}

export default VendorTemplateBlog
