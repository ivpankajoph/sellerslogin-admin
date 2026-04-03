/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { useNavigate } from '@tanstack/react-router'
import { ArrowLeft, Link2, Wand2 } from 'lucide-react'
import { Toaster } from 'react-hot-toast'

import { BASE_URL } from '@/store/slices/vendor/productSlice'
import { useSelector } from 'react-redux'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { ThemeSwitch } from '@/components/theme-switch'
import { DomainModal } from '../components/DomainModel'
import { SelectedFieldEditor } from '../components/SelectedFieldEditor'
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
import {
  consumePendingEditorSelection,
  resolveEditorRouteFromComponent,
  setPendingEditorSelection,
} from '../components/previewSelection'

const selectVendorId = (state: any): string => {
  const authUser = state?.auth?.user || null
  const vendorProfile =
    state?.vendorprofile?.profile?.vendor ||
    state?.vendorprofile?.profile?.data ||
    state?.vendorprofile?.profile ||
    null

  return String(
    authUser?.vendor_id ||
      authUser?.vendorId ||
      authUser?.id ||
      authUser?._id ||
      vendorProfile?._id ||
      vendorProfile?.id ||
      vendorProfile?.vendor_id ||
      ''
  ).trim()
}

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
        policy_primary_label: 'Privacy Policy',
        policy_primary_href: '/privacy',
        policy_secondary_label: 'Terms & Condition',
        policy_secondary_href: '/terms',
      },
      legal_pages: {
        privacy: {
          title: 'Privacy Policy',
          subtitle: '',
          content: '',
          style: {
            titleSize: 48,
            subtitleSize: 18,
            sectionHeadingSize: 24,
            bodySize: 16,
            titleColor: '#1d4ed8',
            subtitleColor: '#475569',
            sectionHeadingColor: '#0f172a',
            bodyColor: '#475569',
          },
        },
        terms: {
          title: 'Terms & Condition',
          subtitle: '',
          content: '',
          style: {
            titleSize: 48,
            subtitleSize: 18,
            sectionHeadingSize: 24,
            bodySize: 16,
            titleColor: '#1d4ed8',
            subtitleColor: '#475569',
            sectionHeadingColor: '#0f172a',
            bodyColor: '#475569',
          },
        },
        shipping: {
          title: 'Shipping & Return Policy',
          subtitle: '',
          content: '',
          style: {
            titleSize: 48,
            subtitleSize: 18,
            sectionHeadingSize: 24,
            bodySize: 16,
            titleColor: '#1d4ed8',
            subtitleColor: '#475569',
            sectionHeadingColor: '#0f172a',
            bodyColor: '#475569',
          },
        },
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
      legal_pages: {
        ...((safeInitialData.components.social_page as any)?.legal_pages || {}),
        ...((importedInitialData?.components?.social_page as any)?.legal_pages || {}),
        privacy: {
          ...((safeInitialData.components.social_page as any)?.legal_pages?.privacy || {}),
          ...((importedInitialData?.components?.social_page as any)?.legal_pages?.privacy || {}),
          style: {
            ...((safeInitialData.components.social_page as any)?.legal_pages?.privacy?.style || {}),
            ...((importedInitialData?.components?.social_page as any)?.legal_pages?.privacy?.style ||
              {}),
          },
        },
        terms: {
          ...((safeInitialData.components.social_page as any)?.legal_pages?.terms || {}),
          ...((importedInitialData?.components?.social_page as any)?.legal_pages?.terms || {}),
          style: {
            ...((safeInitialData.components.social_page as any)?.legal_pages?.terms?.style || {}),
            ...((importedInitialData?.components?.social_page as any)?.legal_pages?.terms?.style ||
              {}),
          },
        },
        shipping: {
          ...((safeInitialData.components.social_page as any)?.legal_pages?.shipping || {}),
          ...((importedInitialData?.components?.social_page as any)?.legal_pages?.shipping ||
            {}),
          style: {
            ...((safeInitialData.components.social_page as any)?.legal_pages?.shipping?.style || {}),
            ...((importedInitialData?.components?.social_page as any)?.legal_pages?.shipping
              ?.style || {}),
          },
        },
      },
    },
  },
}

const POLICY_SECTIONS = [
  {
    key: 'privacy',
    pageId: 'privacy-policy',
    slug: 'privacy',
    heading: 'Privacy Policy',
    labelPath: ['components', 'social_page', 'footer', 'policy_primary_label'],
    hrefPath: ['components', 'social_page', 'footer', 'policy_primary_href'],
    defaultHref: '/privacy',
  },
  {
    key: 'terms',
    pageId: 'terms-condition',
    slug: 'terms',
    heading: 'Terms & Condition',
    labelPath: ['components', 'social_page', 'footer', 'policy_secondary_label'],
    hrefPath: ['components', 'social_page', 'footer', 'policy_secondary_href'],
    defaultHref: '/terms',
  },
  {
    key: 'shipping',
    pageId: 'shipping-return-policy',
    slug: 'shipping-return-policy',
    heading: 'Shipping & Return Policy',
    labelPath: null,
    hrefPath: null,
    defaultHref: '/shipping-return-policy',
  },
] as const

const createPolicyTextSection = (heading: string, content = '') => ({
  id: `${heading.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-content`,
  type: 'text',
  data: {
    title: heading,
    body: content,
    style: {
      titleSize: 48,
      subtitleSize: 18,
      sectionHeadingSize: 24,
      fontSize: 16,
      titleColor: '#1d4ed8',
      subtitleColor: '#475569',
      sectionHeadingColor: '#0f172a',
      bodyColor: '#475569',
    },
  },
})

type CustomPageRecord = NonNullable<TemplateData['components']['custom_pages']>[number]

const getPolicyPages = (template: TemplateData) =>
  Array.isArray(template.components.custom_pages)
    ? (template.components.custom_pages as CustomPageRecord[])
    : []

const getPolicyPageRecord = (
  template: TemplateData,
  policyKey: (typeof POLICY_SECTIONS)[number]['key']
) => {
  const config = POLICY_SECTIONS.find((item) => item.key === policyKey)
  if (!config) return null

  return (
    getPolicyPages(template).find(
      (page) => page?.slug === config.slug || page?.id === config.pageId
    ) || null
  )
}

const upsertPolicyPageRecord = (
  template: TemplateData,
  policyKey: (typeof POLICY_SECTIONS)[number]['key'],
  patch: Record<string, unknown>
) => {
  const config = POLICY_SECTIONS.find((item) => item.key === policyKey)
  if (!config) return template

  const pages = getPolicyPages(template)
  const existing =
    pages.find((page) => page?.slug === config.slug || page?.id === config.pageId) ||
    null

  const nextPage = {
    ...(existing || {
      id: config.pageId,
      title: config.heading,
      slug: config.slug,
      subtitle: '',
      isPublished: true,
      sections: [createPolicyTextSection(config.heading, '')],
    }),
    ...patch,
    id: config.pageId,
    slug: config.slug,
    isPublished: true,
  } as CustomPageRecord

  const nextPages = pages.filter(
    (page) => page?.slug !== config.slug && page?.id !== config.pageId
  )
  nextPages.push(nextPage)

  return {
    ...template,
    components: {
      ...template.components,
      custom_pages: nextPages,
    },
  }
}

function VendorTemplatePolicy() {
  const navigate = useNavigate()
  const user = useSelector((state: any) => state.auth?.user || null)
  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin'
  const vendor_id = useSelector(selectVendorId)
  const token = useSelector((state: any) => state.auth?.token)
  const authDefaultCitySlug = useSelector(
    (state: any) => state.auth?.user?.default_city_slug || ''
  )
  const [data, setData] = useState<TemplateData>(initialData)
  const [isSaving, setIsSaving] = useState(false)
  const [selectedComponent, setSelectedComponent] = useState<string | null>(null)
  const [, setInlineEditVersion] = useState(0)
  const [domainOpen, setDomainOpen] = useState(false)
  const [activePreviewPath, setActivePreviewPath] = useState('/privacy')
  const selectedTemplateKey = useMemo(
    () => getStoredEditingTemplateKey(vendor_id),
    [vendor_id]
  )
  const { activeWebsiteId, activeWebsite } = useActiveWebsiteSelection(vendor_id)

  useEffect(() => {
    if (!vendor_id) return

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
          },
          legal_pages: {
            ...((base.components.social_page as any)?.legal_pages || {}),
            ...((incoming.legal_pages as Record<string, unknown>) || {}),
            privacy: {
              ...((base.components.social_page as any)?.legal_pages?.privacy || {}),
              ...(((incoming.legal_pages as Record<string, unknown>)?.privacy as
                | Record<string, unknown>
                | undefined) || {}),
              style: {
                ...((base.components.social_page as any)?.legal_pages?.privacy?.style || {}),
                ...((((incoming.legal_pages as Record<string, unknown>)?.privacy as
                  | Record<string, unknown>
                  | undefined)?.style as Record<string, unknown> | undefined) || {}),
              },
            },
            terms: {
              ...((base.components.social_page as any)?.legal_pages?.terms || {}),
              ...(((incoming.legal_pages as Record<string, unknown>)?.terms as
                | Record<string, unknown>
                | undefined) || {}),
              style: {
                ...((base.components.social_page as any)?.legal_pages?.terms?.style || {}),
                ...((((incoming.legal_pages as Record<string, unknown>)?.terms as
                  | Record<string, unknown>
                  | undefined)?.style as Record<string, unknown> | undefined) || {}),
              },
            },
            shipping: {
              ...((base.components.social_page as any)?.legal_pages?.shipping || {}),
              ...(((incoming.legal_pages as Record<string, unknown>)?.shipping as
                | Record<string, unknown>
                | undefined) || {}),
              style: {
                ...((base.components.social_page as any)?.legal_pages?.shipping?.style || {}),
                ...((((incoming.legal_pages as Record<string, unknown>)?.shipping as
                  | Record<string, unknown>
                  | undefined)?.style as Record<string, unknown> | undefined) || {}),
              },
            },
          },
        } as TemplateData['components']['social_page']
      }

      return merged
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

      try {
        const pageRes = await axios.get(
          `${BASE_URL}/v1/templates/pages?vendor_id=${vendor_id}${
            activeWebsiteId ? `&website_id=${encodeURIComponent(activeWebsiteId)}` : ''
          }`,
          {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          }
        )

        const root = pageRes.data as unknown
        const record =
          root && typeof root === 'object'
            ? (root as Record<string, unknown>)
            : null
        const payload =
          (record?.data as Record<string, unknown>) ||
          (record?.template as Record<string, unknown>) ||
          record

        const customPages =
          (payload?.components as Record<string, unknown>)?.custom_pages ||
          payload?.custom_pages ||
          []

        nextData.components.custom_pages = Array.isArray(customPages)
          ? (customPages as any)
          : []
      } catch {
        // Keep the editor usable if the pages endpoint is unavailable.
      }

      setData(nextData)
    }

    load()
  }, [activeWebsiteId, token, vendor_id])

  const updateField = useCallback((
    path: string[],
    value: unknown,
    options?: { markDirty?: boolean }
  ) => {
    setData((prev) => updateFieldImmutable(prev, path, value))
    if (options?.markDirty !== false) {
      setInlineEditVersion((prev) => prev + 1)
    }
  }, [])

  const handleInlineEdit = (path: string[], value: unknown) => {
    updateField(path, value)
    setSelectedComponent(path.join('.'))
  }

  const handlePreviewSelect = (_sectionId: string, componentId?: string) => {
    const route = resolveEditorRouteFromComponent(componentId, selectedTemplateKey)
    setPendingEditorSelection({
      route: route || '/vendor-template-policy',
      componentId: componentId || null,
    })
    if (route && route !== '/vendor-template-policy') {
      void navigate({ to: route })
    }
    setSelectedComponent(componentId || null)
  }

  useEffect(() => {
    const pendingSelection = consumePendingEditorSelection('/vendor-template-policy')
    if (!pendingSelection?.componentId) return
    setSelectedComponent(pendingSelection.componentId)
  }, [])

  const updatePolicyPageTitle = (
    policyKey: (typeof POLICY_SECTIONS)[number]['key'],
    title: string
  ) => {
    setData((prev) => {
      const current = getPolicyPageRecord(prev, policyKey)
      const sections = Array.isArray(current?.sections) ? [...current.sections] : []
      const textSection = sections.find((section) => section?.type === 'text')
      const nextSections = textSection
        ? sections.map((section) =>
            section?.id === textSection.id
              ? {
                  ...section,
                  data: {
                    ...(section.data || {}),
                    title,
                    style: {
                      ...((section.data as any)?.style || {}),
                      ...((((prev?.components?.social_page as any)?.legal_pages?.[policyKey] || {})
                        .style || {}) as Record<string, unknown>),
                    },
                  },
                }
              : section
          )
        : [createPolicyTextSection(title, '')]

      const nextTemplate = upsertPolicyPageRecord(prev, policyKey, {
        title,
        sections: nextSections,
      })

      return updateFieldImmutable(
        nextTemplate,
        ['components', 'social_page', 'legal_pages', policyKey, 'title'],
        title
      )
    })
    setInlineEditVersion((prev) => prev + 1)
  }

  const updatePolicyPageSubtitle = (
    policyKey: (typeof POLICY_SECTIONS)[number]['key'],
    subtitle: string
  ) => {
    setData((prev) => {
      const nextTemplate = upsertPolicyPageRecord(prev, policyKey, { subtitle })
      return updateFieldImmutable(
        nextTemplate,
        ['components', 'social_page', 'legal_pages', policyKey, 'subtitle'],
        subtitle
      )
    })
    setInlineEditVersion((prev) => prev + 1)
  }

  const updatePolicyPageContent = (
    policyKey: (typeof POLICY_SECTIONS)[number]['key'],
    content: string,
    fallbackTitle: string
  ) => {
    setData((prev) => {
      const current = getPolicyPageRecord(prev, policyKey)
      const sections = Array.isArray(current?.sections) ? [...current.sections] : []
      const textSection = sections.find((section) => section?.type === 'text')
      const nextSections = textSection
        ? sections.map((section) =>
            section?.id === textSection.id
              ? {
                  ...section,
                  data: {
                    ...(section.data || {}),
                    title:
                      String(section?.data?.title || '').trim() || fallbackTitle,
                    body: content,
                    style: {
                      ...((section.data as any)?.style || {}),
                      ...((((prev?.components?.social_page as any)?.legal_pages?.[policyKey] || {})
                        .style || {}) as Record<string, unknown>),
                    },
                  },
                }
              : section
          )
        : [createPolicyTextSection(fallbackTitle, content)]

      const nextTemplate = upsertPolicyPageRecord(prev, policyKey, {
        sections: nextSections,
      })

      return updateFieldImmutable(
        nextTemplate,
        ['components', 'social_page', 'legal_pages', policyKey, 'content'],
        content
      )
    })
    setInlineEditVersion((prev) => prev + 1)
  }

  const updatePolicyStyle = (
    policyKey: (typeof POLICY_SECTIONS)[number]['key'],
    styleKey: string,
    value: unknown
  ) => {
    setData((prev) => {
      const nextTemplate = updateFieldImmutable(
        prev,
        ['components', 'social_page', 'legal_pages', policyKey, 'style', styleKey],
        value
      )
      const current = getPolicyPageRecord(nextTemplate, policyKey)
      const sections = Array.isArray(current?.sections) ? [...current.sections] : []
      const textSection = sections.find((section) => section?.type === 'text')
      if (!textSection) {
        return nextTemplate
      }

      const nextSections = sections.map((section) =>
        section?.id === textSection.id
          ? {
              ...section,
              data: {
                ...(section.data || {}),
                style: {
                  ...((section.data as any)?.style || {}),
                  [styleKey]: value,
                },
              },
            }
          : section
      )

      return upsertPolicyPageRecord(nextTemplate, policyKey, {
        sections: nextSections,
      })
    })
    setInlineEditVersion((prev) => prev + 1)
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
        const socialPayload = {
          vendor_id,
          website_id: activeWebsiteId,
          social_page: data.components.social_page,
          vendor_profile: data.components.vendor_profile,
          theme: data.components.theme,
        }

        const pagesPayload = {
          vendor_id,
          website_id: activeWebsiteId,
          custom_pages: getPolicyPages(data),
          theme: data.components.theme,
        }

        const [response] = await Promise.all([
          axios.put(`${BASE_URL}/v1/templates/social-faqs`, socialPayload, {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          }),
          axios.put(`${BASE_URL}/v1/templates/pages`, pagesPayload, {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          }),
        ])

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
    [
      activeWebsiteId,
      data,
      token,
      vendor_id,
    ]
  )

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
      {!isAdmin && (
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
      )}
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
        title='Privacy / Terms / Shipping Policy'
        description='Write the legal pages that will open from the website footer.'
        activeKey='policy'
        vendorId={vendor_id}
        connectedDomainHost={connectedDomain?.hostname || ''}
        connectedDomainState={connectedDomainState}
        editingTemplateKey={selectedTemplateKey}
        preview={
          <TemplatePreviewPanel
            title='Live Template Preview'
            subtitle={`Open and sync the right-side preview. Default city: ${previewCity.label}`}
            baseSrc={previewBaseUrl}
            defaultPath={activePreviewPath}
            pageOptions={[
              { label: 'Home', path: '' },
              { label: 'Privacy Policy', path: '/privacy' },
              { label: 'Terms & Condition', path: '/terms' },
              { label: 'Shipping & Return Policy', path: '/shipping-return-policy' },
              { label: 'About', path: '/about' },
              { label: 'Contact', path: '/contact' },
            ]}
            onSync={handleSave}
            isSyncing={isSaving}
            syncDisabled={!vendor_id}
            vendorId={vendor_id}
            page='full'
            previewData={data}
            onSelectSection={handlePreviewSelect}
            onInlineEdit={handleInlineEdit}
          />
        }
      >
        <SelectedFieldEditor
          data={data}
          selectedComponent={selectedComponent}
          updateField={updateField}
        />

        <ThemeSettingsSection data={data} updateField={updateField} />

        <div className='space-y-6'>
          {POLICY_SECTIONS.map((section) => {
            const pageRecord = getPolicyPageRecord(data, section.key)
            const textSection = Array.isArray(pageRecord?.sections)
              ? pageRecord.sections.find((item: any) => item?.type === 'text')
              : null
            const pageConfig = {
              title: String(pageRecord?.title || '').trim() || section.heading,
              subtitle: String((pageRecord as any)?.subtitle || '').trim(),
              content: String(textSection?.data?.body || ''),
            }
            const pageStyle =
              (((data?.components?.social_page as any)?.legal_pages?.[section.key]?.style ||
                {}) as Record<string, number>) || {}
            const footerConfig =
              (((data?.components?.social_page as any)?.footer ||
                {}) as Record<string, string>) || {}

            return (
              <div
                key={section.key}
                className='rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm'
                onClick={() => setActivePreviewPath(section.defaultHref)}
              >
                <div className='flex flex-col gap-2'>
                  <h3 className='text-lg font-semibold text-slate-900'>
                    {section.heading}
                  </h3>
                  <p className='text-sm text-slate-600'>
                    Vendors can write their own {section.heading.toLowerCase()} page
                    here. The footer link label and path can also be managed below.
                  </p>
                </div>

                <div className='mt-5 grid gap-4 md:grid-cols-2'>
                  {section.labelPath && section.hrefPath ? (
                    <>
                      <div className='space-y-1'>
                        <Label>Footer Link Label</Label>
                        <Input
                          value={footerConfig[section.labelPath[3]] || ''}
                          onChange={(event) =>
                            updateField(Array.from(section.labelPath), event.target.value)
                          }
                          placeholder={section.heading}
                        />
                      </div>
                      <div className='space-y-1'>
                        <Label>Footer Link Path</Label>
                        <Input
                          value={footerConfig[section.hrefPath[3]] || ''}
                          onChange={(event) =>
                            updateField(Array.from(section.hrefPath), event.target.value)
                          }
                          placeholder={section.defaultHref}
                        />
                      </div>
                    </>
                  ) : (
                    <div className='space-y-1 md:col-span-2'>
                      <Label>Quick Links Path</Label>
                      <Input value={section.defaultHref} disabled />
                    </div>
                  )}
                </div>

                <div className='mt-5 grid gap-4 md:grid-cols-2'>
                  <div className='space-y-1'>
                    <Label>Page Title</Label>
                    <Input
                      value={pageConfig.title || ''}
                      onFocus={() => setActivePreviewPath(section.defaultHref)}
                      onChange={(event) =>
                        updatePolicyPageTitle(section.key, event.target.value)
                      }
                      placeholder={section.heading}
                    />
                  </div>
                  <div className='space-y-1'>
                    <Label>Short Intro</Label>
                    <Input
                      value={pageConfig.subtitle || ''}
                      onFocus={() => setActivePreviewPath(section.defaultHref)}
                      onChange={(event) =>
                        updatePolicyPageSubtitle(section.key, event.target.value)
                      }
                      placeholder='Add a short summary for visitors'
                    />
                  </div>
                </div>

                <details className='mt-5 rounded-2xl border border-slate-200 bg-slate-50/80 p-4'>
                  <summary className='cursor-pointer list-none text-sm font-semibold text-slate-900'>
                    Advanced Appearance
                  </summary>
                  <p className='mt-2 text-xs text-slate-500'>
                    Open only if you want custom sizes or colors. Otherwise vendors can
                    just fill title, intro, and content.
                  </p>
                  <div className='mt-4 grid gap-4 md:grid-cols-2'>
                    <div className='space-y-1'>
                      <Label>Title Size</Label>
                      <Input
                        type='number'
                        min='28'
                        max='72'
                        value={String(pageStyle.titleSize ?? 48)}
                        onFocus={() => setActivePreviewPath(section.defaultHref)}
                        onChange={(event) =>
                          updatePolicyStyle(section.key, 'titleSize', Number(event.target.value) || 48)
                        }
                      />
                    </div>
                    <div className='space-y-1'>
                      <Label>Short Intro Size</Label>
                      <Input
                        type='number'
                        min='14'
                        max='32'
                        value={String(pageStyle.subtitleSize ?? 18)}
                        onFocus={() => setActivePreviewPath(section.defaultHref)}
                        onChange={(event) =>
                          updatePolicyStyle(section.key, 'subtitleSize', Number(event.target.value) || 18)
                        }
                      />
                    </div>
                    <div className='space-y-1'>
                      <Label>Section Heading Size</Label>
                      <Input
                        type='number'
                        min='18'
                        max='40'
                        value={String(pageStyle.sectionHeadingSize ?? 24)}
                        onFocus={() => setActivePreviewPath(section.defaultHref)}
                        onChange={(event) =>
                          updatePolicyStyle(
                            section.key,
                            'sectionHeadingSize',
                            Number(event.target.value) || 24
                          )
                        }
                      />
                    </div>
                    <div className='space-y-1'>
                      <Label>Body Text Size</Label>
                      <Input
                        type='number'
                        min='14'
                        max='24'
                        value={String(pageStyle.bodySize ?? 16)}
                        onFocus={() => setActivePreviewPath(section.defaultHref)}
                        onChange={(event) =>
                          updatePolicyStyle(section.key, 'bodySize', Number(event.target.value) || 16)
                        }
                      />
                    </div>
                    <div className='space-y-1'>
                      <Label>Title Color</Label>
                      <Input
                        type='color'
                        value={String(pageStyle.titleColor ?? '#1d4ed8')}
                        onFocus={() => setActivePreviewPath(section.defaultHref)}
                        onChange={(event) =>
                          updatePolicyStyle(section.key, 'titleColor', event.target.value)
                        }
                      />
                    </div>
                    <div className='space-y-1'>
                      <Label>Short Intro Color</Label>
                      <Input
                        type='color'
                        value={String(pageStyle.subtitleColor ?? '#475569')}
                        onFocus={() => setActivePreviewPath(section.defaultHref)}
                        onChange={(event) =>
                          updatePolicyStyle(section.key, 'subtitleColor', event.target.value)
                        }
                      />
                    </div>
                    <div className='space-y-1'>
                      <Label>Section Heading Color</Label>
                      <Input
                        type='color'
                        value={String(pageStyle.sectionHeadingColor ?? '#0f172a')}
                        onFocus={() => setActivePreviewPath(section.defaultHref)}
                        onChange={(event) =>
                          updatePolicyStyle(section.key, 'sectionHeadingColor', event.target.value)
                        }
                      />
                    </div>
                    <div className='space-y-1'>
                      <Label>Body Text Color</Label>
                      <Input
                        type='color'
                        value={String(pageStyle.bodyColor ?? '#475569')}
                        onFocus={() => setActivePreviewPath(section.defaultHref)}
                        onChange={(event) =>
                          updatePolicyStyle(section.key, 'bodyColor', event.target.value)
                        }
                      />
                    </div>
                  </div>
                </details>

                <div className='mt-5 space-y-1'>
                  <Label>Page Content</Label>
                  <Textarea
                    value={pageConfig.content || ''}
                    onFocus={() => setActivePreviewPath(section.defaultHref)}
                    onChange={(event) =>
                      updatePolicyPageContent(
                        section.key,
                        event.target.value,
                        pageConfig.title || section.heading
                      )
                    }
                    placeholder={`Write the full ${section.heading.toLowerCase()} here. Separate paragraphs with a blank line.`}
                    className='min-h-[240px]'
                  />
                  <p className='text-xs text-slate-500'>
                    Tip: short standalone lines become sub-headings, and lines starting
                    with `-`, `*`, or `•` become bullet points on the website.
                  </p>
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

export default VendorTemplatePolicy
