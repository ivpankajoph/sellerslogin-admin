/* eslint-disable @typescript-eslint/no-explicit-any */
import { type JSX, useCallback, useEffect, useMemo, useState } from 'react'
import axios from 'axios'

import { BASE_URL } from '@/store/slices/vendor/productSlice'
import { useSelector } from 'react-redux'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
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
import { getVendorTemplatePreviewUrl } from '@/lib/storefront-url'
import {
  getStoredEditingTemplateKey,
} from '../components/templateVariantParam'

const selectVendorId = (state: any): string | undefined => state?.auth?.user?.id

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
      facebook: '',
      instagram: '',
      whatsapp: '',
      twitter: '',
      contact_phone: '',
      show_phone_button: true,
      show_whatsapp_button: true,
      footer: {
        brand_line: '',
        company_points: [],
        summary_text: '',
        quick_links_heading: '',
        quick_links: [],
        products_heading: '',
        product_links: [],
        address_heading: '',
        address_text: '',
        phone_text: '',
        email_text: '',
        copyright_text: '',
        policy_primary_label: '',
        policy_primary_href: '',
        policy_secondary_label: '',
        policy_secondary_href: '',
      },
      faqs: {
        heading: '',
        subheading: '',
        faqs: [],
      },
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
    vendor_profile: {
      ...safeInitialData.components.vendor_profile,
      ...(importedInitialData?.components?.vendor_profile || {}),
    },
    social_page: {
      ...safeInitialData.components.social_page,
      ...importedInitialData?.components?.social_page,
      footer: {
        ...(safeInitialData.components.social_page as any).footer,
        ...(importedInitialData?.components?.social_page as any)?.footer,
        company_points:
          (importedInitialData?.components?.social_page as any)?.footer
            ?.company_points ??
          (safeInitialData.components.social_page as any).footer.company_points,
        quick_links:
          (importedInitialData?.components?.social_page as any)?.footer
            ?.quick_links ??
          (safeInitialData.components.social_page as any).footer.quick_links,
        product_links:
          (importedInitialData?.components?.social_page as any)?.footer
            ?.product_links ??
          (safeInitialData.components.social_page as any).footer.product_links,
      },
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
  const [inlineEditVersion, setInlineEditVersion] = useState(0)
  const [sectionOrder, setSectionOrder] = useState(['faqs', 'social', 'footer'])
  const selectedTemplateKey = useMemo(
    () => getStoredEditingTemplateKey(vendor_id),
    [vendor_id]
  )

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

      if (payload.social_page && typeof payload.social_page === 'object') {
        const incoming = payload.social_page as Record<string, unknown>
        merged.components.social_page = {
          ...base.components.social_page,
          ...incoming,
          footer: {
            ...((base.components.social_page as any)?.footer || {}),
            ...((incoming.footer as Record<string, unknown>) || {}),
            company_points:
              ((incoming.footer as Record<string, unknown>)?.company_points as
                | unknown[]
                | undefined) ??
              ((base.components.social_page as any)?.footer?.company_points ||
                []),
            quick_links:
              ((incoming.footer as Record<string, unknown>)?.quick_links as
                | unknown[]
                | undefined) ??
              ((base.components.social_page as any)?.footer?.quick_links || []),
            product_links:
              ((incoming.footer as Record<string, unknown>)?.product_links as
                | unknown[]
                | undefined) ??
              ((base.components.social_page as any)?.footer?.product_links || []),
          },
          faqs: {
            ...(base.components.social_page?.faqs || {}),
            ...((incoming.faqs as Record<string, unknown>) || {}),
            faqs:
              ((incoming.faqs as Record<string, unknown>)?.faqs as unknown[]) ??
              base.components.social_page?.faqs?.faqs ??
              [],
          },
        } as TemplateData['components']['social_page']
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
            if (order.length) {
              const normalizedOrder = [...order]
              ;['faqs', 'social', 'footer'].forEach((id) => {
                if (!normalizedOrder.includes(id)) normalizedOrder.push(id)
              })
              setSectionOrder(normalizedOrder)
            }
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
    setInlineEditVersion((prev) => prev + 1)
  }

  const handleSave = useCallback(async (options?: { silent?: boolean }) => {
    if (!vendor_id) {
      if (!options?.silent) {
        toast.error('Vendor ID is missing. Please log in again.')
      }
      return
    }

    setIsSaving(true)

    try {
      const payload = {
        vendor_id,
        social_page: data.components.social_page,
        vendor_profile: data.components.vendor_profile,
        theme: data.components.theme,
        section_order: sectionOrder,
      }

      const response = await axios.put(
        `${BASE_URL}/v1/templates/social-faqs`,
        payload
      )

      if (response.data?.success) {
        if (!options?.silent) {
          toast.success(response.data?.message || 'Saved successfully!')
        }
      } else {
        if (!options?.silent) {
          toast.error(response.data?.message || 'Failed to save.')
        }
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
  }, [
    data.components.social_page,
    data.components.theme,
    data.components.vendor_profile,
    sectionOrder,
    vendor_id,
  ])

  useEffect(() => {
    if (inlineEditVersion === 0) return
    const timeout = window.setTimeout(() => {
      void handleSave({ silent: true })
    }, 700)
    return () => window.clearTimeout(timeout)
  }, [inlineEditVersion, handleSave])

  const previewBaseUrl = getVendorTemplatePreviewUrl(vendor_id, selectedTemplateKey)
  const footerConfig = (((data?.components?.social_page as any)?.footer ||
    {}) as Record<string, any>)

  const sections = useMemo(
    () => [
      {
        id: 'faqs',
        title: 'FAQ Content',
        description: 'Heading, subheading, and Q&A list',
      },
      {
        id: 'social',
        title: 'Social + Floating Buttons',
        description: 'Social URLs and floating call/WhatsApp controls',
      },
      {
        id: 'footer',
        title: 'Footer Content',
        description: 'Edit footer headings, labels, links, and legal text',
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

        <div className='mt-6 rounded-2xl border border-slate-200 bg-slate-50/80 p-4'>
          <h4 className='text-sm font-semibold text-slate-900'>Floating Contact Buttons</h4>
          <p className='mt-1 text-xs text-slate-600'>
            These control the right-side call and WhatsApp buttons on the live template.
          </p>

          <div className='mt-4 space-y-3'>
            <div className='space-y-1'>
              <Label htmlFor='social-contact-phone'>Call Button Number</Label>
              <Input
                id='social-contact-phone'
                value={(data?.components?.social_page?.contact_phone as string) ?? ''}
                onChange={(e) =>
                  updateField(['components', 'social_page', 'contact_phone'], e.target.value)
                }
                placeholder='+91 9876543210'
              />
              <p className='text-[11px] text-slate-500'>
                Used for floating call icon. If empty, vendor phone will be used.
              </p>
            </div>

            <div className='flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2'>
              <div>
                <p className='text-sm font-medium text-slate-900'>Show Call Button</p>
                <p className='text-xs text-slate-500'>Enable/disable floating phone icon</p>
              </div>
              <Switch
                checked={data?.components?.social_page?.show_phone_button !== false}
                onCheckedChange={(checked) =>
                  updateField(['components', 'social_page', 'show_phone_button'], Boolean(checked))
                }
              />
            </div>

            <div className='flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2'>
              <div>
                <p className='text-sm font-medium text-slate-900'>Show WhatsApp Button</p>
                <p className='text-xs text-slate-500'>
                  Enable/disable floating WhatsApp icon
                </p>
              </div>
              <Switch
                checked={data?.components?.social_page?.show_whatsapp_button !== false}
                onCheckedChange={(checked) =>
                  updateField(
                    ['components', 'social_page', 'show_whatsapp_button'],
                    Boolean(checked)
                  )
                }
              />
            </div>
          </div>
        </div>
      </div>
    ),
    footer: (
      <div className='rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm'>
        <h3 className='text-lg font-semibold text-slate-900'>Footer Content</h3>
        <p className='mt-1 text-xs text-slate-600'>
          Edit every visible footer text. Use <span className='font-semibold'>{'{year}'}</span> and{' '}
          <span className='font-semibold'>{'{business}'}</span> in copyright.
        </p>

        <div className='mt-4 grid gap-4 md:grid-cols-2'>
          <div className='space-y-1'>
            <Label>Brand Line</Label>
            <Input
              value={footerConfig.brand_line || ''}
              onChange={(e) =>
                updateField(
                  ['components', 'social_page', 'footer', 'brand_line'],
                  e.target.value
                )
              }
              placeholder='Delivering Excellence Since 2023'
            />
          </div>
          <div className='space-y-1'>
            <Label>Summary Text</Label>
            <Input
              value={footerConfig.summary_text || ''}
              onChange={(e) =>
                updateField(
                  ['components', 'social_page', 'footer', 'summary_text'],
                  e.target.value
                )
              }
              placeholder='Serving industries across India...'
            />
          </div>
        </div>

        <div className='mt-4'>
          <ArrayField
            label='Brand Points'
            items={
              Array.isArray(footerConfig.company_points)
                ? footerConfig.company_points
                : []
            }
            onAdd={() => {
              const list = Array.isArray(footerConfig.company_points)
                ? [...footerConfig.company_points]
                : []
              list.push('')
              updateField(['components', 'social_page', 'footer', 'company_points'], list)
            }}
            onRemove={(index) => {
              const list = Array.isArray(footerConfig.company_points)
                ? [...footerConfig.company_points]
                : []
              list.splice(index, 1)
              updateField(['components', 'social_page', 'footer', 'company_points'], list)
            }}
            renderItem={(item: string, idx: number) => (
              <Input
                key={idx}
                value={item || ''}
                placeholder='Inspired by Innovation'
                onChange={(e) => {
                  const list = Array.isArray(footerConfig.company_points)
                    ? [...footerConfig.company_points]
                    : []
                  list[idx] = e.target.value
                  updateField(['components', 'social_page', 'footer', 'company_points'], list)
                }}
              />
            )}
          />
        </div>

        <div className='mt-6 rounded-2xl border border-slate-200 bg-slate-50/80 p-4'>
          <h4 className='text-sm font-semibold text-slate-900'>Column Headings</h4>
          <div className='mt-3 grid gap-3 md:grid-cols-3'>
            <div className='space-y-1'>
              <Label>Quick Links Heading</Label>
              <Input
                value={footerConfig.quick_links_heading || ''}
                onChange={(e) =>
                  updateField(
                    ['components', 'social_page', 'footer', 'quick_links_heading'],
                    e.target.value
                  )
                }
                placeholder='Quick Links'
              />
            </div>
            <div className='space-y-1'>
              <Label>Products Heading</Label>
              <Input
                value={footerConfig.products_heading || ''}
                onChange={(e) =>
                  updateField(
                    ['components', 'social_page', 'footer', 'products_heading'],
                    e.target.value
                  )
                }
                placeholder='Our Products'
              />
            </div>
            <div className='space-y-1'>
              <Label>Address Heading</Label>
              <Input
                value={footerConfig.address_heading || ''}
                onChange={(e) =>
                  updateField(
                    ['components', 'social_page', 'footer', 'address_heading'],
                    e.target.value
                  )
                }
                placeholder='Address'
              />
            </div>
          </div>
        </div>

        <div className='mt-6'>
          <ArrayField
            label='Quick Links List'
            items={Array.isArray(footerConfig.quick_links) ? footerConfig.quick_links : []}
            onAdd={() => {
              const list = Array.isArray(footerConfig.quick_links)
                ? [...footerConfig.quick_links]
                : []
              list.push({ label: '', href: '' })
              updateField(['components', 'social_page', 'footer', 'quick_links'], list)
            }}
            onRemove={(index) => {
              const list = Array.isArray(footerConfig.quick_links)
                ? [...footerConfig.quick_links]
                : []
              list.splice(index, 1)
              updateField(['components', 'social_page', 'footer', 'quick_links'], list)
            }}
            renderItem={(item: { label?: string; href?: string }, idx: number) => (
              <div key={idx} className='grid gap-2 md:grid-cols-2'>
                <Input
                  placeholder='Label (e.g. About Us)'
                  value={item?.label || ''}
                  onChange={(e) => {
                    const list = Array.isArray(footerConfig.quick_links)
                      ? [...footerConfig.quick_links]
                      : []
                    list[idx] = { ...(list[idx] || {}), label: e.target.value }
                    updateField(['components', 'social_page', 'footer', 'quick_links'], list)
                  }}
                />
                <Input
                  placeholder='Href (e.g. /about or https://...)'
                  value={item?.href || ''}
                  onChange={(e) => {
                    const list = Array.isArray(footerConfig.quick_links)
                      ? [...footerConfig.quick_links]
                      : []
                    list[idx] = { ...(list[idx] || {}), href: e.target.value }
                    updateField(['components', 'social_page', 'footer', 'quick_links'], list)
                  }}
                />
              </div>
            )}
          />
        </div>

        <div className='mt-6'>
          <ArrayField
            label='Product Links Override (Optional)'
            items={
              Array.isArray(footerConfig.product_links)
                ? footerConfig.product_links
                : []
            }
            onAdd={() => {
              const list = Array.isArray(footerConfig.product_links)
                ? [...footerConfig.product_links]
                : []
              list.push({ label: '', href: '' })
              updateField(['components', 'social_page', 'footer', 'product_links'], list)
            }}
            onRemove={(index) => {
              const list = Array.isArray(footerConfig.product_links)
                ? [...footerConfig.product_links]
                : []
              list.splice(index, 1)
              updateField(['components', 'social_page', 'footer', 'product_links'], list)
            }}
            renderItem={(item: { label?: string; href?: string }, idx: number) => (
              <div key={idx} className='grid gap-2 md:grid-cols-2'>
                <Input
                  placeholder='Product Label'
                  value={item?.label || ''}
                  onChange={(e) => {
                    const list = Array.isArray(footerConfig.product_links)
                      ? [...footerConfig.product_links]
                      : []
                    list[idx] = { ...(list[idx] || {}), label: e.target.value }
                    updateField(['components', 'social_page', 'footer', 'product_links'], list)
                  }}
                />
                <Input
                  placeholder='Href (e.g. /all-products)'
                  value={item?.href || ''}
                  onChange={(e) => {
                    const list = Array.isArray(footerConfig.product_links)
                      ? [...footerConfig.product_links]
                      : []
                    list[idx] = { ...(list[idx] || {}), href: e.target.value }
                    updateField(['components', 'social_page', 'footer', 'product_links'], list)
                  }}
                />
              </div>
            )}
          />
        </div>

        <div className='mt-6 rounded-2xl border border-slate-200 bg-slate-50/80 p-4'>
          <h4 className='text-sm font-semibold text-slate-900'>Contact Overrides</h4>
          <p className='mt-1 text-xs text-slate-600'>
            Keep empty to use vendor profile values automatically.
          </p>
          <div className='mt-3 grid gap-3'>
            <div className='space-y-1'>
              <Label>Address Text Override</Label>
              <Textarea
                value={footerConfig.address_text || ''}
                onChange={(e) =>
                  updateField(
                    ['components', 'social_page', 'footer', 'address_text'],
                    e.target.value
                  )
                }
                placeholder='Greater Noida, Uttar Pradesh, India, 201306'
                className='min-h-[84px]'
              />
            </div>
            <div className='grid gap-3 md:grid-cols-2'>
              <div className='space-y-1'>
                <Label>Phone Text Override</Label>
                <Input
                  value={footerConfig.phone_text || ''}
                  onChange={(e) =>
                    updateField(
                      ['components', 'social_page', 'footer', 'phone_text'],
                      e.target.value
                    )
                  }
                  placeholder='919911064724'
                />
              </div>
              <div className='space-y-1'>
                <Label>Email Text Override</Label>
                <Input
                  value={footerConfig.email_text || ''}
                  onChange={(e) =>
                    updateField(
                      ['components', 'social_page', 'footer', 'email_text'],
                      e.target.value
                    )
                  }
                  placeholder='info@example.com'
                />
              </div>
            </div>
          </div>
        </div>

        <div className='mt-6 rounded-2xl border border-slate-200 bg-slate-50/80 p-4'>
          <h4 className='text-sm font-semibold text-slate-900'>Bottom Bar</h4>
          <div className='mt-3 space-y-3'>
            <div className='space-y-1'>
              <Label>Copyright Text</Label>
              <Input
                value={footerConfig.copyright_text || ''}
                onChange={(e) =>
                  updateField(
                    ['components', 'social_page', 'footer', 'copyright_text'],
                    e.target.value
                  )
                }
                placeholder='© {year} By {business}. All Rights Reserved.'
              />
            </div>
            <div className='grid gap-3 md:grid-cols-2'>
              <div className='space-y-1'>
                <Label>Policy Link 1 Label</Label>
                <Input
                  value={footerConfig.policy_primary_label || ''}
                  onChange={(e) =>
                    updateField(
                      ['components', 'social_page', 'footer', 'policy_primary_label'],
                      e.target.value
                    )
                  }
                  placeholder='Privacy Policy & Terms of Service'
                />
              </div>
              <div className='space-y-1'>
                <Label>Policy Link 1 Href</Label>
                <Input
                  value={footerConfig.policy_primary_href || ''}
                  onChange={(e) =>
                    updateField(
                      ['components', 'social_page', 'footer', 'policy_primary_href'],
                      e.target.value
                    )
                  }
                  placeholder='/privacy'
                />
              </div>
            </div>
            <div className='grid gap-3 md:grid-cols-2'>
              <div className='space-y-1'>
                <Label>Policy Link 2 Label</Label>
                <Input
                  value={footerConfig.policy_secondary_label || ''}
                  onChange={(e) =>
                    updateField(
                      ['components', 'social_page', 'footer', 'policy_secondary_label'],
                      e.target.value
                    )
                  }
                  placeholder='Shipping & Return Policy'
                />
              </div>
              <div className='space-y-1'>
                <Label>Policy Link 2 Href</Label>
                <Input
                  value={footerConfig.policy_secondary_href || ''}
                  onChange={(e) =>
                    updateField(
                      ['components', 'social_page', 'footer', 'policy_secondary_href'],
                      e.target.value
                    )
                  }
                  placeholder='/terms'
                />
              </div>
            </div>
          </div>
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
        editingTemplateKey={selectedTemplateKey}
        actions={
          <Button
            onClick={() => {
              void handleSave()
            }}
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
