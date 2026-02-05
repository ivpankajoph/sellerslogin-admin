'use client'

import { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Header } from '@/components/layout/header'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { ConfigDrawer } from '@/components/config-drawer'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { TemplatePageLayout } from '../components/TemplatePageLayout'
import { TemplatePreviewPanel } from '../components/TemplatePreviewPanel'
import { TemplateSectionOrder } from '../components/TemplateSectionOrder'
import { ThemeSettingsSection } from '../components/form/ThemeSettingsSection'
import { ImageInput } from '../components/form/ImageInput'
import { updateFieldImmutable } from '../components/hooks/utils'
import { uploadImage } from '../helper/fileupload'
import { BASE_URL } from '@/store/slices/vendor/productSlice'
import { VITE_PUBLIC_API_URL_TEMPLATE_FRONTEND } from '@/config'
import { useSelector } from 'react-redux'
import { initialData, type TemplateData } from '../data'

type PageSection = any

type CustomPage = any

const SECTION_LABELS: Record<string, string> = {
  hero: 'Hero Banner',
  text: 'Text Block',
  image: 'Image Banner',
  features: 'Feature Grid',
  cta: 'Call To Action',
  gallery: 'Gallery',
  pricing: 'Pricing',
  faq: 'FAQ',
  testimonials: 'Testimonials',
}

const createId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `id-${Math.random().toString(36).slice(2, 10)}`
}

const createEmptySection = (type: string): PageSection => {
  const id = createId()
  if (type === 'hero') {
    return {
      id,
      type,
      data: {
        kicker: 'Page highlight',
        title: 'Page headline',
        subtitle: 'Introduce this page in a few sentences.',
        buttons: [
          { label: 'Learn More', href: '#' },
          { label: 'Get Started', href: '#' },
        ],
        style: {
          textColor: '',
          backgroundColor: '',
          fontSize: 32,
          buttonColor: '',
        },
      },
    }
  }
  if (type === 'image') {
    return {
      id,
      type,
      data: {
        imageUrl: '',
        caption: 'Add a caption for the image.',
        style: {
          textColor: '',
          backgroundColor: '',
          fontSize: 16,
        },
      },
    }
  }
  if (type === 'features') {
    return {
      id,
      type,
      data: {
        title: 'Key highlights',
        items: [
          { title: 'Feature one', description: 'Describe the benefit.' },
          { title: 'Feature two', description: 'Describe the benefit.' },
        ],
        style: {
          textColor: '',
          backgroundColor: '',
          fontSize: 16,
        },
      },
    }
  }
  if (type === 'cta') {
    return {
      id,
      type,
      data: {
        title: 'Ready to take action?',
        subtitle: 'Invite visitors to connect or shop.',
        buttons: [{ label: 'Get Started', href: '#' }],
        style: {
          textColor: '',
          backgroundColor: '',
          fontSize: 20,
          buttonColor: '',
        },
      },
    }
  }
  if (type === 'gallery') {
    return {
      id,
      type,
      data: {
        title: 'Gallery',
        images: [],
        style: {
          textColor: '',
          backgroundColor: '',
          fontSize: 16,
        },
      },
    }
  }
  if (type === 'pricing') {
    return {
      id,
      type,
      data: {
        title: 'Pricing Plans',
        subtitle: 'Choose a plan that fits your needs.',
        plans: [
          {
            name: 'Starter',
            price: '499',
            description: 'For new storefronts.',
            features: ['Basic support', 'Limited products'],
            ctaLabel: 'Select Starter',
          },
          {
            name: 'Growth',
            price: '999',
            description: 'For growing teams.',
            features: ['Priority support', 'Unlimited products'],
            ctaLabel: 'Select Growth',
          },
        ],
        style: {
          textColor: '',
          backgroundColor: '',
          fontSize: 16,
          buttonColor: '',
        },
      },
    }
  }
  if (type === 'faq') {
    return {
      id,
      type,
      data: {
        title: 'FAQs',
        subtitle: 'Quick answers for your shoppers.',
        items: [
          { question: 'Do you ship nationwide?', answer: 'Yes, we do.' },
        ],
        style: {
          textColor: '',
          backgroundColor: '',
          fontSize: 16,
        },
      },
    }
  }
  if (type === 'testimonials') {
    return {
      id,
      type,
      data: {
        title: 'Testimonials',
        subtitle: 'Hear from our happy customers.',
        items: [
          { name: 'Asha', role: 'Founder', quote: 'Excellent service!' },
        ],
        style: {
          textColor: '',
          backgroundColor: '',
          fontSize: 16,
        },
      },
    }
  }
  return {
    id,
    type,
    data: {
      title: 'Section title',
      body: 'Write a short paragraph that explains this section.',
      style: {
        textColor: '',
        backgroundColor: '',
        fontSize: 16,
      },
    },
  }
}

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')

export default function VendorTemplatePages() {
  const [data, setData] = useState<TemplateData>(initialData)
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [uploadingPaths, setUploadingPaths] = useState<Set<string>>(new Set())
  const vendor_id = useSelector((state: any) => state.auth?.user?.id)

  useEffect(() => {
    if (!vendor_id) return

    const load = async () => {
      try {
        const res = await axios.get(
          `${BASE_URL}/v1/templates/pages?vendor_id=${vendor_id}`
        )
        const payload =
          res.data?.data?.components?.custom_pages ||
          res.data?.components?.custom_pages ||
          res.data?.custom_pages ||
          []
        const next = structuredClone(initialData)
        next.components.custom_pages = payload
        setData(next)
        if (payload.length) setSelectedPageId(payload[0].id)
      } catch {
        setData(initialData)
      }
    }

    load()
  }, [vendor_id])

  const pages = (data.components.custom_pages as any[]) || []
  const selectedPage =
    (pages.find((page) => page.id === selectedPageId) as any) || pages[0]

  const previewBaseUrl = vendor_id
    ? `${VITE_PUBLIC_API_URL_TEMPLATE_FRONTEND}/template/${vendor_id}`
    : undefined
  const previewPath = selectedPage?.slug ? `/page/${selectedPage.slug}` : ''

  const sectionOrder = useMemo(() => {
    const sections = (selectedPage?.sections as any[]) || []
    return sections.map((section) => section.id) || []
  }, [selectedPage?.sections])

  const updatePages = (nextPages: CustomPage[]) => {
    setData((prev) => ({
      ...prev,
      components: {
        ...prev.components,
        custom_pages: nextPages,
      },
    }))
  }

  const handleAddPage = () => {
    const id = createId()
    const newPage: CustomPage = {
      id,
      title: 'New Page',
      slug: `page-${id.slice(0, 6)}`,
      isPublished: true,
      sections: [createEmptySection('hero'), createEmptySection('text')],
    }
    updatePages([newPage, ...pages])
    setSelectedPageId(id)
  }

  const handleDeletePage = (id: string) => {
    const next = pages.filter((page) => page.id !== id)
    updatePages(next)
    if (selectedPageId === id) {
      setSelectedPageId(next[0]?.id || null)
    }
  }

  const handlePageChange = (patch: Partial<CustomPage>) => {
    if (!selectedPage) return
    const next = pages.map((page: any) =>
      page.id === selectedPage.id ? { ...page, ...patch } : page
    )
    updatePages(next)
  }

  const handleSectionChange = (sectionId: string, patch: Partial<PageSection>) => {
    if (!selectedPage) return
    const nextSections = selectedPage.sections.map((section: any) =>
      section.id === sectionId ? { ...section, ...patch } : section
    )
    const nextPages = pages.map((page: any) =>
      page.id === selectedPage.id ? { ...page, sections: nextSections } : page
    )
    updatePages(nextPages)
  }

  const handleSectionDataChange = (
    sectionId: string,
    key: string,
    value: any
  ) => {
    const section = selectedPage?.sections.find(
      (item: any) => item.id === sectionId
    )
    if (!section) return
    handleSectionChange(sectionId, {
      data: { ...section.data, [key]: value },
    })
  }

  const handleSectionOrder = (nextOrder: string[]) => {
    if (!selectedPage) return
    const byId = new Map(
      selectedPage.sections.map((section: any) => [section.id, section])
    )
    const nextSections = nextOrder
      .map((id) => byId.get(id))
      .filter((section): section is PageSection => Boolean(section))
    const nextPages = pages.map((page: any) =>
      page.id === selectedPage.id ? { ...page, sections: nextSections } : page
    )
    updatePages(nextPages)
  }

  const handleAddSection = (type: string) => {
    if (!selectedPage) return
    const nextSections = [...selectedPage.sections, createEmptySection(type)]
    const nextPages = pages.map((page: any) =>
      page.id === selectedPage.id ? { ...page, sections: nextSections } : page
    )
    updatePages(nextPages)
  }

  const handleRemoveSection = (sectionId: string) => {
    if (!selectedPage) return
    const nextSections = selectedPage.sections.filter(
      (section: any) => section.id !== sectionId
    )
    const nextPages = pages.map((page: any) =>
      page.id === selectedPage.id ? { ...page, sections: nextSections } : page
    )
    updatePages(nextPages)
  }

  const handleImageChange = async (sectionId: string, file: File | null) => {
    if (!selectedPage) return
    const pathKey = `custom_pages.${selectedPage.id}.${sectionId}.imageUrl`
    if (!file) {
      handleSectionDataChange(sectionId, 'imageUrl', '')
      setUploadingPaths((prev) => {
        const next = new Set(prev)
        next.delete(pathKey)
        return next
      })
      return
    }

    setUploadingPaths((prev) => new Set(prev).add(pathKey))
    try {
      const url = await uploadImage(file, 'template_images')
      handleSectionDataChange(sectionId, 'imageUrl', url || '')
    } finally {
      setUploadingPaths((prev) => {
        const next = new Set(prev)
        next.delete(pathKey)
        return next
      })
    }
  }

  const handleGalleryImageChange = async (
    sectionId: string,
    index: number,
    file: File | null
  ) => {
    if (!selectedPage) return
    const pathKey = `custom_pages.${selectedPage.id}.${sectionId}.gallery.${index}`
    if (!file) {
      const section = selectedPage.sections.find(
        (item: any) => item.id === sectionId
      )
      const images = Array.isArray(section?.data?.images)
        ? [...section.data.images]
        : []
      images[index] = ''
      handleSectionDataChange(sectionId, 'images', images)
      setUploadingPaths((prev) => {
        const next = new Set(prev)
        next.delete(pathKey)
        return next
      })
      return
    }

    setUploadingPaths((prev) => new Set(prev).add(pathKey))
    try {
      const url = await uploadImage(file, 'template_images')
      const section = selectedPage.sections.find(
        (item: any) => item.id === sectionId
      )
      const images = Array.isArray(section?.data?.images)
        ? [...section.data.images]
        : []
      images[index] = url || ''
      handleSectionDataChange(sectionId, 'images', images)
    } finally {
      setUploadingPaths((prev) => {
        const next = new Set(prev)
        next.delete(pathKey)
        return next
      })
    }
  }

  const handleSave = async () => {
    if (!vendor_id) return
    setIsSaving(true)
    try {
      await axios.put(`${BASE_URL}/v1/templates/pages`, {
        vendor_id,
        custom_pages: pages,
        theme: data.components.theme,
      })
    } finally {
      setIsSaving(false)
    }
  }

  const updateField = (path: string[], value: any) => {
    setData((prev) => updateFieldImmutable(prev, path, value))
  }

  const handleInlineEdit = (path: string[], value: unknown) => {
    updateField(path, value)
  }

  const sectionItems = useMemo(() => {
    const sections = (selectedPage?.sections as any[]) || []
    return sections.map((section) => ({
      id: section.id,
      title: SECTION_LABELS[section.type] || 'Section',
      description: String(section.type || '').toUpperCase(),
    }))
  }, [selectedPage?.sections])

  const selectedSections = (selectedPage?.sections as any[]) || []

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

      <TemplatePageLayout
        title='Custom Pages Builder'
        description='Create additional pages for your storefront, organize sections, and keep the navbar in sync.'
        activeKey='pages'
        actions={
          <>
            <Button
              onClick={handleAddPage}
              variant='outline'
              className='rounded-full border-slate-300'
            >
              Add Page
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className='rounded-full bg-slate-900 text-white shadow-lg shadow-slate-900/20 hover:bg-slate-800'
            >
              {isSaving ? 'Saving...' : 'Save Pages'}
            </Button>
          </>
        }
        preview={
          <TemplatePreviewPanel
            title='Live Page Preview'
            subtitle='Custom pages render in the storefront'
            baseSrc={previewBaseUrl}
            previewQuery=''
            defaultPath={previewPath}
            pageOptions={[
              { label: 'Home', path: '' },
              { label: 'About', path: '/about' },
              { label: 'Contact', path: '/contact' },
              { label: 'Cart', path: '/cart' },
              { label: 'Orders', path: '/orders' },
              { label: 'Profile', path: '/profile' },
              { label: 'Logout', path: '/login' },
              { label: 'Category', path: '/category' },
              { label: 'Login', path: '/login' },
            ]}
            onSync={handleSave}
            isSyncing={isSaving}
            syncDisabled={uploadingPaths.size > 0}
            vendorId={vendor_id}
            page='home'
            previewData={data}
            sectionOrder={sectionOrder}
            onInlineEdit={handleInlineEdit}
          />
        }
      >
        <ThemeSettingsSection data={data} updateField={updateField} />

        <div className='grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]'>
          <div className='space-y-4 rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-xs font-semibold uppercase tracking-[0.3em] text-slate-400'>
                  Pages
                </p>
                <h3 className='text-lg font-semibold text-slate-900'>
                  Navigation
                </h3>
              </div>
            </div>
            <div className='space-y-2'>
              {pages.map((page) => (
                <button
                  key={page.id}
                  type='button'
                  onClick={() => setSelectedPageId(page.id)}
                  className={`w-full rounded-xl border px-3 py-2 text-left text-sm font-semibold transition ${
                    selectedPage?.id === page.id
                      ? 'border-slate-900 bg-slate-900 text-white'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-400'
                  }`}
                >
                  {page.title}
                </button>
              ))}
              {pages.length === 0 && (
                <div className='rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-6 text-center text-xs text-slate-400'>
                  No pages yet
                </div>
              )}
            </div>
          </div>

          <div className='space-y-6'>
            {selectedPage ? (
              <>
                <div className='rounded-2xl border border-slate-200 bg-white/90 p-6 shadow-sm'>
                  <div className='flex flex-col gap-4'>
                    <div className='grid gap-4 md:grid-cols-2'>
                      <div className='space-y-2'>
                        <Label>Page Title</Label>
                        <Input
                          value={selectedPage.title}
                          onChange={(event) => {
                            const title = event.target.value
                            handlePageChange({
                              title,
                              slug: selectedPage.slug || slugify(title),
                            })
                          }}
                        />
                      </div>
                      <div className='space-y-2'>
                        <Label>Page Slug</Label>
                        <Input
                          value={selectedPage.slug}
                          onChange={(event) =>
                            handlePageChange({ slug: slugify(event.target.value) })
                          }
                        />
                      </div>
                    </div>

                    <div className='flex items-center justify-between gap-3'>
                      <label className='flex items-center gap-2 text-sm text-slate-600'>
                        <input
                          type='checkbox'
                          checked={selectedPage.isPublished !== false}
                          onChange={(event) =>
                            handlePageChange({ isPublished: event.target.checked })
                          }
                        />
                        Show in navbar
                      </label>
                      <Button
                        variant='outline'
                        className='border-rose-200 text-rose-600 hover:bg-rose-50'
                        onClick={() => handleDeletePage(selectedPage.id)}
                      >
                        Delete Page
                      </Button>
                    </div>
                  </div>
                </div>

                <TemplateSectionOrder
                  title='Page Sections'
                  items={sectionItems}
                  order={sectionOrder}
                  setOrder={handleSectionOrder}
                />

                <div className='grid gap-3 sm:grid-cols-2'>
                  {(
                    [
                      'hero',
                      'text',
                      'image',
                      'features',
                      'cta',
                      'gallery',
                      'pricing',
                      'faq',
                      'testimonials',
                    ] as const
                  ).map((type) => (
                    <Button
                      key={type}
                      variant='outline'
                      className='justify-start'
                      onClick={() => handleAddSection(type)}
                    >
                      Add {SECTION_LABELS[type]}
                    </Button>
                  ))}
                </div>

                <div className='space-y-6'>
                  {selectedSections.map((section: any) => (
                    <div
                      key={section.id}
                      className='rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm'
                    >
                      <div className='flex items-center justify-between'>
                        <div>
                          <p className='text-xs font-semibold uppercase tracking-[0.3em] text-slate-400'>
                            {SECTION_LABELS[section.type]}
                          </p>
                          <h3 className='text-lg font-semibold text-slate-900'>
                            Section {section.id.slice(0, 6)}
                          </h3>
                        </div>
                        <Button
                          variant='outline'
                          className='border-rose-200 text-rose-600 hover:bg-rose-50'
                          onClick={() => handleRemoveSection(section.id)}
                        >
                          Remove
                        </Button>
                      </div>

                      {section.type === 'hero' && (
                        <div className='mt-4 grid gap-4'>
                          <Input
                            value={section.data.kicker || ''}
                            onChange={(event) =>
                              handleSectionDataChange(
                                section.id,
                                'kicker',
                                event.target.value
                              )
                            }
                            placeholder='Eyebrow / kicker'
                          />
                          <Input
                            value={section.data.title || ''}
                            onChange={(event) =>
                              handleSectionDataChange(
                                section.id,
                                'title',
                                event.target.value
                              )
                            }
                            placeholder='Headline'
                          />
                          <Textarea
                            value={section.data.subtitle || ''}
                            onChange={(event) =>
                              handleSectionDataChange(
                                section.id,
                                'subtitle',
                                event.target.value
                              )
                            }
                            placeholder='Supporting paragraph'
                          />
                          <div className='space-y-3'>
                            {(section.data.buttons || []).map(
                              (button: any, index: number) => (
                                <div
                                  key={`${section.id}-button-${index}`}
                                  className='grid gap-3 md:grid-cols-2'
                                >
                                  <Input
                                    value={button.label || ''}
                                    onChange={(event) => {
                                      const buttons = [
                                        ...(section.data.buttons || []),
                                      ]
                                      buttons[index] = {
                                        ...buttons[index],
                                        label: event.target.value,
                                      }
                                      handleSectionDataChange(
                                        section.id,
                                        'buttons',
                                        buttons
                                      )
                                    }}
                                    placeholder='Button label'
                                  />
                                  <Input
                                    value={button.href || ''}
                                    onChange={(event) => {
                                      const buttons = [
                                        ...(section.data.buttons || []),
                                      ]
                                      buttons[index] = {
                                        ...buttons[index],
                                        href: event.target.value,
                                      }
                                      handleSectionDataChange(
                                        section.id,
                                        'buttons',
                                        buttons
                                      )
                                    }}
                                    placeholder='Button link'
                                  />
                                </div>
                              )
                            )}
                            <Button
                              variant='outline'
                              onClick={() =>
                                handleSectionDataChange(section.id, 'buttons', [
                                  ...(section.data.buttons || []),
                                  { label: 'New Button', href: '#' },
                                ])
                              }
                            >
                              Add Button
                            </Button>
                          </div>
                          <div className='grid gap-4 md:grid-cols-4'>
                            <Input
                              value={section.data.style?.fontSize || ''}
                              onChange={(event) =>
                                handleSectionDataChange(section.id, 'style', {
                                  ...section.data.style,
                                  fontSize: Number(event.target.value || 0),
                                })
                              }
                              placeholder='Font size'
                            />
                            <Input
                              value={section.data.style?.textColor || ''}
                              onChange={(event) =>
                                handleSectionDataChange(section.id, 'style', {
                                  ...section.data.style,
                                  textColor: event.target.value,
                                })
                              }
                              placeholder='Text color (hex)'
                            />
                            <Input
                              value={section.data.style?.backgroundColor || ''}
                              onChange={(event) =>
                                handleSectionDataChange(section.id, 'style', {
                                  ...section.data.style,
                                  backgroundColor: event.target.value,
                                })
                              }
                              placeholder='Background color (hex)'
                            />
                            <Input
                              value={section.data.style?.buttonColor || ''}
                              onChange={(event) =>
                                handleSectionDataChange(section.id, 'style', {
                                  ...section.data.style,
                                  buttonColor: event.target.value,
                                })
                              }
                              placeholder='Button color (hex)'
                            />
                          </div>
                        </div>
                      )}

                      {section.type === 'text' && (
                        <div className='mt-4 grid gap-4'>
                          <Input
                            value={section.data.title || ''}
                            onChange={(event) =>
                              handleSectionDataChange(
                                section.id,
                                'title',
                                event.target.value
                              )
                            }
                            placeholder='Section title'
                          />
                          <Textarea
                            value={section.data.body || ''}
                            onChange={(event) =>
                              handleSectionDataChange(
                                section.id,
                                'body',
                                event.target.value
                              )
                            }
                            placeholder='Write content for this section'
                          />
                          <div className='grid gap-4 md:grid-cols-4'>
                            <Input
                              value={section.data.style?.fontSize || ''}
                              onChange={(event) =>
                                handleSectionDataChange(section.id, 'style', {
                                  ...section.data.style,
                                  fontSize: Number(event.target.value || 0),
                                })
                              }
                              placeholder='Font size'
                            />
                            <Input
                              value={section.data.style?.textColor || ''}
                              onChange={(event) =>
                                handleSectionDataChange(section.id, 'style', {
                                  ...section.data.style,
                                  textColor: event.target.value,
                                })
                              }
                              placeholder='Text color (hex)'
                            />
                            <Input
                              value={section.data.style?.backgroundColor || ''}
                              onChange={(event) =>
                                handleSectionDataChange(section.id, 'style', {
                                  ...section.data.style,
                                  backgroundColor: event.target.value,
                                })
                              }
                              placeholder='Background color (hex)'
                            />
                            <Input
                              value={section.data.style?.buttonColor || ''}
                              onChange={(event) =>
                                handleSectionDataChange(section.id, 'style', {
                                  ...section.data.style,
                                  buttonColor: event.target.value,
                                })
                              }
                              placeholder='Button color (hex)'
                            />
                          </div>
                        </div>
                      )}

                      {section.type === 'image' && (
                        <div className='mt-4 space-y-4'>
                          <ImageInput
                            label='Image'
                            name={`page-${selectedPage.id}-${section.id}`}
                            value={section.data.imageUrl || ''}
                            onChange={(file) => handleImageChange(section.id, file)}
                            isFileInput={true}
                            dimensions='1600 x 900'
                          />
                          <Input
                            value={section.data.caption || ''}
                            onChange={(event) =>
                              handleSectionDataChange(
                                section.id,
                                'caption',
                                event.target.value
                              )
                            }
                            placeholder='Caption'
                          />
                          <div className='grid gap-4 md:grid-cols-4'>
                            <Input
                              value={section.data.style?.fontSize || ''}
                              onChange={(event) =>
                                handleSectionDataChange(section.id, 'style', {
                                  ...section.data.style,
                                  fontSize: Number(event.target.value || 0),
                                })
                              }
                              placeholder='Font size'
                            />
                            <Input
                              value={section.data.style?.textColor || ''}
                              onChange={(event) =>
                                handleSectionDataChange(section.id, 'style', {
                                  ...section.data.style,
                                  textColor: event.target.value,
                                })
                              }
                              placeholder='Text color (hex)'
                            />
                            <Input
                              value={section.data.style?.backgroundColor || ''}
                              onChange={(event) =>
                                handleSectionDataChange(section.id, 'style', {
                                  ...section.data.style,
                                  backgroundColor: event.target.value,
                                })
                              }
                              placeholder='Background color (hex)'
                            />
                            <Input
                              value={section.data.style?.buttonColor || ''}
                              onChange={(event) =>
                                handleSectionDataChange(section.id, 'style', {
                                  ...section.data.style,
                                  buttonColor: event.target.value,
                                })
                              }
                              placeholder='Button color (hex)'
                            />
                          </div>
                        </div>
                      )}

                      {section.type === 'features' && (
                        <div className='mt-4 space-y-4'>
                          <Input
                            value={section.data.title || ''}
                            onChange={(event) =>
                              handleSectionDataChange(
                                section.id,
                                'title',
                                event.target.value
                              )
                            }
                            placeholder='Grid title'
                          />
                          {(section.data.items || []).map(
                            (item: any, index: number) => (
                              <div
                                key={`${section.id}-item-${index}`}
                                className='grid gap-3 md:grid-cols-2'
                              >
                                <Input
                                  value={item.title || ''}
                                  onChange={(event) => {
                                    const items = [...(section.data.items || [])]
                                    items[index] = {
                                      ...items[index],
                                      title: event.target.value,
                                    }
                                    handleSectionDataChange(
                                      section.id,
                                      'items',
                                      items
                                    )
                                  }}
                                  placeholder='Feature title'
                                />
                                <Input
                                  value={item.description || ''}
                                  onChange={(event) => {
                                    const items = [...(section.data.items || [])]
                                    items[index] = {
                                      ...items[index],
                                      description: event.target.value,
                                    }
                                    handleSectionDataChange(
                                      section.id,
                                      'items',
                                      items
                                    )
                                  }}
                                  placeholder='Feature description'
                                />
                              </div>
                            )
                          )}
                          <Button
                            variant='outline'
                            onClick={() =>
                              handleSectionDataChange(section.id, 'items', [
                                ...(section.data.items || []),
                                { title: 'New feature', description: '' },
                              ])
                            }
                          >
                            Add Feature
                          </Button>
                          <div className='grid gap-4 md:grid-cols-3'>
                            <Input
                              value={section.data.style?.fontSize || ''}
                              onChange={(event) =>
                                handleSectionDataChange(section.id, 'style', {
                                  ...section.data.style,
                                  fontSize: Number(event.target.value || 0),
                                })
                              }
                              placeholder='Font size'
                            />
                            <Input
                              value={section.data.style?.textColor || ''}
                              onChange={(event) =>
                                handleSectionDataChange(section.id, 'style', {
                                  ...section.data.style,
                                  textColor: event.target.value,
                                })
                              }
                              placeholder='Text color (hex)'
                            />
                            <Input
                              value={section.data.style?.backgroundColor || ''}
                              onChange={(event) =>
                                handleSectionDataChange(section.id, 'style', {
                                  ...section.data.style,
                                  backgroundColor: event.target.value,
                                })
                              }
                              placeholder='Background color (hex)'
                            />
                          </div>
                        </div>
                      )}

                      {section.type === 'cta' && (
                        <div className='mt-4 grid gap-4'>
                          <Input
                            value={section.data.title || ''}
                            onChange={(event) =>
                              handleSectionDataChange(
                                section.id,
                                'title',
                                event.target.value
                              )
                            }
                            placeholder='CTA title'
                          />
                          <Textarea
                            value={section.data.subtitle || ''}
                            onChange={(event) =>
                              handleSectionDataChange(
                                section.id,
                                'subtitle',
                                event.target.value
                              )
                            }
                            placeholder='CTA description'
                          />
                          <div className='space-y-3'>
                            {(section.data.buttons || []).map(
                              (button: any, index: number) => (
                                <div
                                  key={`${section.id}-cta-button-${index}`}
                                  className='grid gap-3 md:grid-cols-2'
                                >
                                  <Input
                                    value={button.label || ''}
                                    onChange={(event) => {
                                      const buttons = [
                                        ...(section.data.buttons || []),
                                      ]
                                      buttons[index] = {
                                        ...buttons[index],
                                        label: event.target.value,
                                      }
                                      handleSectionDataChange(
                                        section.id,
                                        'buttons',
                                        buttons
                                      )
                                    }}
                                    placeholder='Button label'
                                  />
                                  <Input
                                    value={button.href || ''}
                                    onChange={(event) => {
                                      const buttons = [
                                        ...(section.data.buttons || []),
                                      ]
                                      buttons[index] = {
                                        ...buttons[index],
                                        href: event.target.value,
                                      }
                                      handleSectionDataChange(
                                        section.id,
                                        'buttons',
                                        buttons
                                      )
                                    }}
                                    placeholder='Button link'
                                  />
                                </div>
                              )
                            )}
                            <Button
                              variant='outline'
                              onClick={() =>
                                handleSectionDataChange(section.id, 'buttons', [
                                  ...(section.data.buttons || []),
                                  { label: 'New Button', href: '#' },
                                ])
                              }
                            >
                              Add Button
                            </Button>
                          </div>
                          <div className='grid gap-4 md:grid-cols-3'>
                            <Input
                              value={section.data.style?.fontSize || ''}
                              onChange={(event) =>
                                handleSectionDataChange(section.id, 'style', {
                                  ...section.data.style,
                                  fontSize: Number(event.target.value || 0),
                                })
                              }
                              placeholder='Font size'
                            />
                            <Input
                              value={section.data.style?.textColor || ''}
                              onChange={(event) =>
                                handleSectionDataChange(section.id, 'style', {
                                  ...section.data.style,
                                  textColor: event.target.value,
                                })
                              }
                              placeholder='Text color (hex)'
                            />
                            <Input
                              value={section.data.style?.backgroundColor || ''}
                              onChange={(event) =>
                                handleSectionDataChange(section.id, 'style', {
                                  ...section.data.style,
                                  backgroundColor: event.target.value,
                                })
                              }
                              placeholder='Background color (hex)'
                            />
                          </div>
                        </div>
                      )}

                      {section.type === 'gallery' && (
                        <div className='mt-4 space-y-4'>
                          <Input
                            value={section.data.title || ''}
                            onChange={(event) =>
                              handleSectionDataChange(
                                section.id,
                                'title',
                                event.target.value
                              )
                            }
                            placeholder='Gallery title'
                          />
                          <div className='grid gap-4 md:grid-cols-2'>
                            {(section.data.images || []).map(
                              (image: string, index: number) => (
                                <ImageInput
                                  key={`${section.id}-gallery-${index}`}
                                  label={`Image ${index + 1}`}
                                  name={`gallery-${section.id}-${index}`}
                                  value={image}
                                  onChange={(file) =>
                                    handleGalleryImageChange(
                                      section.id,
                                      index,
                                      file
                                    )
                                  }
                                  isFileInput={true}
                                  dimensions='1200 x 900'
                                />
                              )
                            )}
                          </div>
                          <div className='flex flex-wrap gap-2'>
                            <Button
                              variant='outline'
                              onClick={() =>
                                handleSectionDataChange(section.id, 'images', [
                                  ...(section.data.images || []),
                                  '',
                                ])
                              }
                            >
                              Add Image
                            </Button>
                            {section.data.images?.length ? (
                              <Button
                                variant='outline'
                                className='border-rose-200 text-rose-600 hover:bg-rose-50'
                                onClick={() => {
                                  const nextImages = [
                                    ...(section.data.images || []),
                                  ]
                                  nextImages.pop()
                                  handleSectionDataChange(
                                    section.id,
                                    'images',
                                    nextImages
                                  )
                                }}
                              >
                                Remove Last
                              </Button>
                            ) : null}
                          </div>
                          <div className='grid gap-4 md:grid-cols-3'>
                            <Input
                              value={section.data.style?.fontSize || ''}
                              onChange={(event) =>
                                handleSectionDataChange(section.id, 'style', {
                                  ...section.data.style,
                                  fontSize: Number(event.target.value || 0),
                                })
                              }
                              placeholder='Font size'
                            />
                            <Input
                              value={section.data.style?.textColor || ''}
                              onChange={(event) =>
                                handleSectionDataChange(section.id, 'style', {
                                  ...section.data.style,
                                  textColor: event.target.value,
                                })
                              }
                              placeholder='Text color (hex)'
                            />
                            <Input
                              value={section.data.style?.backgroundColor || ''}
                              onChange={(event) =>
                                handleSectionDataChange(section.id, 'style', {
                                  ...section.data.style,
                                  backgroundColor: event.target.value,
                                })
                              }
                              placeholder='Background color (hex)'
                            />
                          </div>
                        </div>
                      )}

                      {section.type === 'pricing' && (
                        <div className='mt-4 space-y-4'>
                          <Input
                            value={section.data.title || ''}
                            onChange={(event) =>
                              handleSectionDataChange(
                                section.id,
                                'title',
                                event.target.value
                              )
                            }
                            placeholder='Pricing title'
                          />
                          <Textarea
                            value={section.data.subtitle || ''}
                            onChange={(event) =>
                              handleSectionDataChange(
                                section.id,
                                'subtitle',
                                event.target.value
                              )
                            }
                            placeholder='Subtitle'
                          />
                          {(section.data.plans || []).map(
                            (plan: any, index: number) => (
                              <div
                                key={`${section.id}-plan-${index}`}
                                className='rounded-2xl border border-slate-200 bg-slate-50 p-4'
                              >
                                <div className='grid gap-3 md:grid-cols-2'>
                                  <Input
                                    value={plan.name || ''}
                                    onChange={(event) => {
                                      const plans = [
                                        ...(section.data.plans || []),
                                      ]
                                      plans[index] = {
                                        ...plans[index],
                                        name: event.target.value,
                                      }
                                      handleSectionDataChange(
                                        section.id,
                                        'plans',
                                        plans
                                      )
                                    }}
                                    placeholder='Plan name'
                                  />
                                  <Input
                                    value={plan.price || ''}
                                    onChange={(event) => {
                                      const plans = [
                                        ...(section.data.plans || []),
                                      ]
                                      plans[index] = {
                                        ...plans[index],
                                        price: event.target.value,
                                      }
                                      handleSectionDataChange(
                                        section.id,
                                        'plans',
                                        plans
                                      )
                                    }}
                                    placeholder='Price'
                                  />
                                </div>
                                <Input
                                  className='mt-3'
                                  value={plan.description || ''}
                                  onChange={(event) => {
                                    const plans = [
                                      ...(section.data.plans || []),
                                    ]
                                    plans[index] = {
                                      ...plans[index],
                                      description: event.target.value,
                                    }
                                    handleSectionDataChange(
                                      section.id,
                                      'plans',
                                      plans
                                    )
                                  }}
                                  placeholder='Description'
                                />
                                <Input
                                  className='mt-3'
                                  value={plan.ctaLabel || ''}
                                  onChange={(event) => {
                                    const plans = [
                                      ...(section.data.plans || []),
                                    ]
                                    plans[index] = {
                                      ...plans[index],
                                      ctaLabel: event.target.value,
                                    }
                                    handleSectionDataChange(
                                      section.id,
                                      'plans',
                                      plans
                                    )
                                  }}
                                  placeholder='CTA Label'
                                />
                              </div>
                            )
                          )}
                          <Button
                            variant='outline'
                            onClick={() =>
                              handleSectionDataChange(section.id, 'plans', [
                                ...(section.data.plans || []),
                                {
                                  name: 'New Plan',
                                  price: '',
                                  description: '',
                                  features: [],
                                  ctaLabel: 'Choose Plan',
                                },
                              ])
                            }
                          >
                            Add Plan
                          </Button>
                          <div className='grid gap-4 md:grid-cols-3'>
                            <Input
                              value={section.data.style?.fontSize || ''}
                              onChange={(event) =>
                                handleSectionDataChange(section.id, 'style', {
                                  ...section.data.style,
                                  fontSize: Number(event.target.value || 0),
                                })
                              }
                              placeholder='Font size'
                            />
                            <Input
                              value={section.data.style?.textColor || ''}
                              onChange={(event) =>
                                handleSectionDataChange(section.id, 'style', {
                                  ...section.data.style,
                                  textColor: event.target.value,
                                })
                              }
                              placeholder='Text color (hex)'
                            />
                            <Input
                              value={section.data.style?.backgroundColor || ''}
                              onChange={(event) =>
                                handleSectionDataChange(section.id, 'style', {
                                  ...section.data.style,
                                  backgroundColor: event.target.value,
                                })
                              }
                              placeholder='Background color (hex)'
                            />
                          </div>
                        </div>
                      )}

                      {section.type === 'faq' && (
                        <div className='mt-4 space-y-4'>
                          <Input
                            value={section.data.title || ''}
                            onChange={(event) =>
                              handleSectionDataChange(
                                section.id,
                                'title',
                                event.target.value
                              )
                            }
                            placeholder='FAQ title'
                          />
                          <Textarea
                            value={section.data.subtitle || ''}
                            onChange={(event) =>
                              handleSectionDataChange(
                                section.id,
                                'subtitle',
                                event.target.value
                              )
                            }
                            placeholder='FAQ subtitle'
                          />
                          {(section.data.items || []).map(
                            (item: any, index: number) => (
                              <div
                                key={`${section.id}-faq-${index}`}
                                className='grid gap-3'
                              >
                                <Input
                                  value={item.question || ''}
                                  onChange={(event) => {
                                    const items = [
                                      ...(section.data.items || []),
                                    ]
                                    items[index] = {
                                      ...items[index],
                                      question: event.target.value,
                                    }
                                    handleSectionDataChange(
                                      section.id,
                                      'items',
                                      items
                                    )
                                  }}
                                  placeholder='Question'
                                />
                                <Textarea
                                  value={item.answer || ''}
                                  onChange={(event) => {
                                    const items = [
                                      ...(section.data.items || []),
                                    ]
                                    items[index] = {
                                      ...items[index],
                                      answer: event.target.value,
                                    }
                                    handleSectionDataChange(
                                      section.id,
                                      'items',
                                      items
                                    )
                                  }}
                                  placeholder='Answer'
                                />
                              </div>
                            )
                          )}
                          <Button
                            variant='outline'
                            onClick={() =>
                              handleSectionDataChange(section.id, 'items', [
                                ...(section.data.items || []),
                                { question: 'New question', answer: '' },
                              ])
                            }
                          >
                            Add FAQ
                          </Button>
                          <div className='grid gap-4 md:grid-cols-3'>
                            <Input
                              value={section.data.style?.fontSize || ''}
                              onChange={(event) =>
                                handleSectionDataChange(section.id, 'style', {
                                  ...section.data.style,
                                  fontSize: Number(event.target.value || 0),
                                })
                              }
                              placeholder='Font size'
                            />
                            <Input
                              value={section.data.style?.textColor || ''}
                              onChange={(event) =>
                                handleSectionDataChange(section.id, 'style', {
                                  ...section.data.style,
                                  textColor: event.target.value,
                                })
                              }
                              placeholder='Text color (hex)'
                            />
                            <Input
                              value={section.data.style?.backgroundColor || ''}
                              onChange={(event) =>
                                handleSectionDataChange(section.id, 'style', {
                                  ...section.data.style,
                                  backgroundColor: event.target.value,
                                })
                              }
                              placeholder='Background color (hex)'
                            />
                          </div>
                        </div>
                      )}

                      {section.type === 'testimonials' && (
                        <div className='mt-4 space-y-4'>
                          <Input
                            value={section.data.title || ''}
                            onChange={(event) =>
                              handleSectionDataChange(
                                section.id,
                                'title',
                                event.target.value
                              )
                            }
                            placeholder='Testimonials title'
                          />
                          <Textarea
                            value={section.data.subtitle || ''}
                            onChange={(event) =>
                              handleSectionDataChange(
                                section.id,
                                'subtitle',
                                event.target.value
                              )
                            }
                            placeholder='Testimonials subtitle'
                          />
                          {(section.data.items || []).map(
                            (item: any, index: number) => (
                              <div
                                key={`${section.id}-testimonial-${index}`}
                                className='grid gap-3 md:grid-cols-3'
                              >
                                <Input
                                  value={item.name || ''}
                                  onChange={(event) => {
                                    const items = [
                                      ...(section.data.items || []),
                                    ]
                                    items[index] = {
                                      ...items[index],
                                      name: event.target.value,
                                    }
                                    handleSectionDataChange(
                                      section.id,
                                      'items',
                                      items
                                    )
                                  }}
                                  placeholder='Name'
                                />
                                <Input
                                  value={item.role || ''}
                                  onChange={(event) => {
                                    const items = [
                                      ...(section.data.items || []),
                                    ]
                                    items[index] = {
                                      ...items[index],
                                      role: event.target.value,
                                    }
                                    handleSectionDataChange(
                                      section.id,
                                      'items',
                                      items
                                    )
                                  }}
                                  placeholder='Role'
                                />
                                <Input
                                  value={item.quote || ''}
                                  onChange={(event) => {
                                    const items = [
                                      ...(section.data.items || []),
                                    ]
                                    items[index] = {
                                      ...items[index],
                                      quote: event.target.value,
                                    }
                                    handleSectionDataChange(
                                      section.id,
                                      'items',
                                      items
                                    )
                                  }}
                                  placeholder='Quote'
                                />
                              </div>
                            )
                          )}
                          <Button
                            variant='outline'
                            onClick={() =>
                              handleSectionDataChange(section.id, 'items', [
                                ...(section.data.items || []),
                                { name: 'New', role: '', quote: '' },
                              ])
                            }
                          >
                            Add Testimonial
                          </Button>
                          <div className='grid gap-4 md:grid-cols-3'>
                            <Input
                              value={section.data.style?.fontSize || ''}
                              onChange={(event) =>
                                handleSectionDataChange(section.id, 'style', {
                                  ...section.data.style,
                                  fontSize: Number(event.target.value || 0),
                                })
                              }
                              placeholder='Font size'
                            />
                            <Input
                              value={section.data.style?.textColor || ''}
                              onChange={(event) =>
                                handleSectionDataChange(section.id, 'style', {
                                  ...section.data.style,
                                  textColor: event.target.value,
                                })
                              }
                              placeholder='Text color (hex)'
                            />
                            <Input
                              value={section.data.style?.backgroundColor || ''}
                              onChange={(event) =>
                                handleSectionDataChange(section.id, 'style', {
                                  ...section.data.style,
                                  backgroundColor: event.target.value,
                                })
                              }
                              placeholder='Background color (hex)'
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className='rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500'>
                Create a page to start editing.
              </div>
            )}
          </div>
        </div>
      </TemplatePageLayout>
    </>
  )
}
