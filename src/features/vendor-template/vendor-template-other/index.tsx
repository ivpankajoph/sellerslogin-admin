/* eslint-disable @typescript-eslint/no-explicit-any */
import { type JSX, useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { VITE_PUBLIC_API_URL_TEMPLATE_FRONTEND } from '@/config'
import { BASE_URL } from '@/store/slices/vendor/productSlice'
import { useSelector } from 'react-redux'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { TemplatePageLayout } from '../components/TemplatePageLayout'
import { TemplatePreviewPanel } from '../components/TemplatePreviewPanel'
import { TemplateSectionOrder } from '../components/TemplateSectionOrder'
import { ArrayField } from '../components/form/ArrayField'
import { ThemeSettingsSection } from '../components/form/ThemeSettingsSection'
import { updateFieldImmutable } from '../components/hooks/utils'
import { initialData as importedInitialData, type TemplateData } from '../data'

const selectVendorId = (state: any): string | undefined => state?.auth?.user?.id

const safeInitialData: TemplateData = {
  components: {
    theme: {
      templateColor: '#0f172a',
      bannerColor: '#0f172a',
      fontScale: 1,
    },
    social_page: {
      facebook: '',
      instagram: '',
      whatsapp: '',
      twitter: '',
      faqs: {
        heading: '',
        subheading: '',
        faqs: [],
      },
    },
    logo: '',
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
  },
}

const initialData: TemplateData = {
  ...safeInitialData,
  ...importedInitialData,
  components: {
    ...safeInitialData.components,
    ...importedInitialData?.components,
    social_page: {
      ...safeInitialData.components.social_page,
      ...importedInitialData?.components?.social_page,
      faqs: {
        ...safeInitialData.components.social_page.faqs,
        ...importedInitialData?.components?.social_page?.faqs,
        faqs:
          importedInitialData?.components?.social_page?.faqs?.faqs ??
          safeInitialData.components.social_page.faqs.faqs,
      },
    },
  },
}

function VendorTemplateOther() {
  const vendor_id = useSelector(selectVendorId)
  const token = useSelector((state: any) => state.auth?.token)
  const [data, setData] = useState<TemplateData>(initialData)
  const [isSaving, setIsSaving] = useState(false)
  const [sectionOrder, setSectionOrder] = useState(['faqs', 'social'])

  useEffect(() => {
    if (!vendor_id) return

    const pickArray = (value: unknown): string[] =>
      Array.isArray(value) ? (value as string[]) : []

    const firstNonEmpty = (...values: string[][]) =>
      values.find((value) => value.length > 0) || []

    const mergeTemplate = (payload: Record<string, unknown>): TemplateData => {
      const base = structuredClone(initialData)
      const merged = {
        ...base,
        components: {
          ...base.components,
          ...(payload.components && typeof payload.components === 'object'
            ? (payload.components as TemplateData['components'])
            : {}),
        },
      }

      merged.components.theme = {
        ...base.components.theme,
        ...(payload.components && typeof payload.components === 'object'
          ? (payload.components as any).theme
          : {}),
        ...(payload.theme
          ? (payload.theme as TemplateData['components']['theme'])
          : {}),
      }

      if (payload.social_page) {
        merged.components.social_page =
          payload.social_page as TemplateData['components']['social_page']
      }

      return merged
    }

    const endpoints = [
      `${BASE_URL}/v1/templates/social-faqs?vendor_id=${vendor_id}`,
      `${BASE_URL}/v1/templates/social-faqs/${vendor_id}`,
      `${BASE_URL}/v1/templates/${vendor_id}/social`,
      `${BASE_URL}/v1/templates/${vendor_id}`,
    ]

    const load = async () => {
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
            const order = firstNonEmpty(
              pickArray((payload as Record<string, unknown>).section_order),
              pickArray((payload as Record<string, unknown>).sectionOrder),
              pickArray(
                (
                  (payload as Record<string, unknown>).components as Record<
                    string,
                    unknown
                  >
                )?.section_order
              )
            )
            setData(mergeTemplate(payload as Record<string, unknown>))
            if (order.length) setSectionOrder(order)
            return
          }
        } catch {
          continue
        }
      }
    }

    load()
  }, [vendor_id, token])

  const updateField = (path: string[], value: unknown) => {
    setData((prev) => updateFieldImmutable(prev, path, value))
  }

  const handleInlineEdit = (path: string[], value: unknown) => {
    updateField(path, value)
  }

  const handleSave = async () => {
    if (!vendor_id) {
      toast.error('Vendor ID is missing. Please log in again.')
      return
    }

    setIsSaving(true)

    try {
      const payload = {
        vendor_id,
        social_page: data.components.social_page,
        theme: data.components.theme,
        section_order: sectionOrder,
      }

      const response = await axios.put(
        `${BASE_URL}/v1/templates/social-faqs`,
        payload
      )

      if (response.data?.success) {
        toast.success(response.data?.message || 'Saved successfully!')
      } else {
        toast.error(response.data?.message || 'Failed to save.')
      }
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        toast.error(
          error.response?.data?.message ||
            error.message ||
            'An error occurred while saving.'
        )
      } else {
        toast.error('Unexpected error occurred.')
      }
    } finally {
      setIsSaving(false)
    }
  }

  const previewBaseUrl = vendor_id
    ? `${VITE_PUBLIC_API_URL_TEMPLATE_FRONTEND}/template/${vendor_id}`
    : undefined

  const sections = useMemo(
    () => [
      {
        id: 'faqs',
        title: 'FAQ Content',
        description: 'Heading, subheading, and Q&A list',
      },
      {
        id: 'social',
        title: 'Social Links',
        description: 'Footer and contact social URLs',
      },
    ],
    []
  )

  const sectionBlocks: Record<string, JSX.Element> = {
    faqs: (
      <div className='rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm'>
        <div className='space-y-3'>
          <Label>FAQ Heading</Label>
          <Input
            value={data?.components?.social_page?.faqs?.heading ?? ''}
            onChange={(e) =>
              updateField(
                ['components', 'social_page', 'faqs', 'heading'],
                e.target.value
              )
            }
            placeholder='Enter FAQ heading'
          />

          <Label>FAQ Subheading</Label>
          <Input
            value={data?.components?.social_page?.faqs?.subheading ?? ''}
            onChange={(e) =>
              updateField(
                ['components', 'social_page', 'faqs', 'subheading'],
                e.target.value
              )
            }
            placeholder='Enter FAQ subheading'
          />

          <ArrayField
            label='FAQs'
            items={data?.components?.social_page?.faqs?.faqs ?? []}
            onAdd={() => {
              const list = [
                ...(data?.components?.social_page?.faqs?.faqs ?? []),
              ]
              list.push({ question: '', answer: '' })
              updateField(['components', 'social_page', 'faqs', 'faqs'], list)
            }}
            onRemove={(i) => {
              const list = [
                ...(data?.components?.social_page?.faqs?.faqs ?? []),
              ]
              list.splice(i, 1)
              updateField(['components', 'social_page', 'faqs', 'faqs'], list)
            }}
            renderItem={(
              item: { question: string; answer: string },
              idx: number
            ) => (
              <div key={idx} className='space-y-2'>
                <Input
                  placeholder='Question'
                  value={item.question}
                  onChange={(e) => {
                    const list = [
                      ...(data?.components?.social_page?.faqs?.faqs ?? []),
                    ]
                    list[idx] = { ...list[idx], question: e.target.value }
                    updateField(
                      ['components', 'social_page', 'faqs', 'faqs'],
                      list
                    )
                  }}
                />
                <Textarea
                  placeholder='Answer'
                  value={item.answer}
                  onChange={(e) => {
                    const list = [
                      ...(data?.components?.social_page?.faqs?.faqs ?? []),
                    ]
                    list[idx] = { ...list[idx], answer: e.target.value }
                    updateField(
                      ['components', 'social_page', 'faqs', 'faqs'],
                      list
                    )
                  }}
                />
              </div>
            )}
          />
        </div>
      </div>
    ),
    social: (
      <div className='rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm'>
        <h3 className='text-lg font-semibold text-slate-900'>
          Social Media Links
        </h3>
        <div className='mt-4 grid gap-3'>
          {[
            { key: 'facebook', label: 'Facebook URL' },
            { key: 'instagram', label: 'Instagram URL' },
            { key: 'whatsapp', label: 'WhatsApp Number or Link' },
            { key: 'twitter', label: 'Twitter/X URL' },
          ].map((platform) => (
            <div key={platform.key} className='space-y-1'>
              <Label htmlFor={`social-${platform.key}`}>{platform.label}</Label>
              <Input
                id={`social-${platform.key}`}
                value={
                  (data?.components?.social_page?.[
                    platform.key as keyof TemplateData['components']['social_page']
                  ] as string) ?? ''
                }
                onChange={(e) =>
                  updateField(
                    ['components', 'social_page', platform.key],
                    e.target.value
                  )
                }
                placeholder='https://...'
              />
            </div>
          ))}
        </div>
      </div>
    ),
  }

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
        title='Social + FAQ Builder'
        description='Configure FAQ content and social channels that appear across the template. Reorder sections to control the flow.'
        activeKey='other'
        actions={
          <Button
            onClick={handleSave}
            disabled={isSaving || !vendor_id}
            className='rounded-full bg-slate-900 text-white shadow-lg shadow-slate-900/20 hover:bg-slate-800'
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        }
        preview={
          <TemplatePreviewPanel
            title='Live Template Preview'
            subtitle='Sync to refresh the right-side preview'
            baseSrc={previewBaseUrl}
            previewQuery=''
            defaultPath=''
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
            syncDisabled={!vendor_id}
            vendorId={vendor_id}
            page='full'
            previewData={data}
            sectionOrder={sectionOrder}
            onInlineEdit={handleInlineEdit}
          />
        }
      >
        <ThemeSettingsSection data={data} updateField={updateField} />

        <TemplateSectionOrder
          title='Social + FAQ Sections'
          items={sections}
          order={sectionOrder}
          setOrder={setSectionOrder}
        />

        {sectionOrder.map((sectionId) => (
          <div key={sectionId}>{sectionBlocks[sectionId]}</div>
        ))}
      </TemplatePageLayout>
    </>
  )
}

export default VendorTemplateOther
