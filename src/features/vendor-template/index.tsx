'use client'

import { type JSX, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from '@tanstack/react-router'
import {
  ArrowLeft,
  ChevronRight,
  Eye,
  EyeOff,
  ImageIcon,
  Link2,
  Menu as MenuIcon,
  MousePointerClick,
  Palette,
  PanelTop,
  Search as SearchIcon,
  Type,
  Wand2,
} from 'lucide-react'
import { Toaster } from 'react-hot-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

import { DomainModal } from './components/DomainModel'
import { TemplatePageLayout } from './components/TemplatePageLayout'
import { TemplatePreviewPanel } from './components/TemplatePreviewPanel'
import { TemplateSectionOrder } from './components/TemplateSectionOrder'
import { ArrayField } from './components/form/ArrayField'
import { BasicInfoSection } from './components/form/BasicInfoSection'
import { ColorPreviewChip } from './components/form/ColorPreviewChip'
import { DescriptionSection } from './components/form/DescriptionSection'
import { HeroSection } from './components/form/HeroSection'
import { TemplateVariantSelector } from './components/form/TemplateVariantSelector'
import { VisibleOnBadge } from './components/form/VisibleOnBadge'

import { ThemeSettingsSection } from './components/form/ThemeSettingsSection'
import { useTemplateForm } from './components/hooks/useTemplateForm'
import { useConnectedTemplateDomain } from './components/hooks/useConnectedTemplateDomain'
import { Header } from '@/components/layout/header'
import { ThemeSwitch } from '@/components/theme-switch'
import { ConfigDrawer } from '@/components/config-drawer'
import { ProfileDropdown } from '@/components/profile-dropdown'
import {
  getVendorTemplateBaseUrl,
  getVendorTemplatePreviewUrl,
  resolvePreviewCityFromVendorProfile,
} from '@/lib/storefront-url'
import {
  getStoredEditingTemplateKey,
  normalizeTemplateParam,
  setStoredEditingTemplateKey,
} from './components/templateVariantParam'
import {
  consumePendingEditorSelection,
  resolveEditorRouteFromComponent,
  setPendingEditorSelection,
} from './components/previewSelection'

type BuilderSearchTarget = {
  id: string
  label: string
  sectionId: string
  componentId?: string
  keywords?: string[]
}

export default function TemplateForm() {
  const navigate = useNavigate()
  const pathname = useLocation({ select: (location) => location.pathname })
  const {
    data,
    updateField,
    handleImageChange,
    handleDocumentChange,
    handleSubmit,
    vendor_id,
    uploadingPaths,
    templateCatalog,
    selectedTemplateKey,
    activeTemplateKey,
    setSelectedTemplateKey,
    applyTemplateVariant,
    isUpdatingTemplate,

    isSubmitting,
    loadedSectionOrder,
    isAdmin,
    deleteTemplateVariant,
    isDeletingTemplateKey,
    vendor_default_city_slug,
    activeWebsiteId,
    activeWebsite,
    token,
  } = useTemplateForm()

  const handleInlineEdit = (path: string[], value: unknown) => {
    updateField(path, value)
  }

  const [domainOpen, setDomainOpen] = useState(false)
  const [selectedSection, setSelectedSection] = useState<string | null>(null)
  const [selectedComponent, setSelectedComponent] = useState<string | null>(null)
  const [isBuilderOpen, setIsBuilderOpen] = useState(false)
  const [templateSearchTerm, setTemplateSearchTerm] = useState('')
  const [builderSearchTerm, setBuilderSearchTerm] = useState('')
  const [expandedSectionId, setExpandedSectionId] = useState('hero')
  const [sectionOrder, setSectionOrder] = useState([
    'header',
    'branding',
    'hero',
    'description',
    'faqs',
    'products',
    'footer',
  ])
  const [saveState, setSaveState] = useState<'saved' | 'dirty' | 'saving'>(
    'saved'
  )
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null)
  const [saveTrigger, setSaveTrigger] = useState<'manual' | 'refresh' | null>(null)
  const lastSavedSignatureRef = useRef('')
  const shellCardClassName =
    'rounded-[28px] border border-slate-200/80 bg-white/92 p-5 shadow-[0_24px_50px_-38px_rgba(15,23,42,0.3)] backdrop-blur'
  const shellSectionClassName =
    'rounded-[28px] border border-slate-200/80 bg-white/94 shadow-[0_26px_60px_-42px_rgba(15,23,42,0.32)] backdrop-blur'
  const saveSignature = useMemo(
    () =>
      JSON.stringify({
        vendorId: vendor_id,
        websiteId: activeWebsiteId || '',
        templateKey: selectedTemplateKey,
        sectionOrder,
        components: data.components,
      }),
    [
      activeWebsiteId,
      data.components,
      sectionOrder,
      selectedTemplateKey,
      vendor_id,
    ]
  )
  const handleSubmitWithOrder = useCallback(
    async (options?: { silent?: boolean }) => {
      const signatureBeforeSave = saveSignature
      setSaveTrigger(options?.silent ? 'refresh' : 'manual')
      setSaveState('saving')
      const success = await handleSubmit(sectionOrder, options)
      if (success) {
        lastSavedSignatureRef.current = signatureBeforeSave
        setSaveState('saved')
        setLastSavedAt(Date.now())
        setSaveTrigger(null)
        return true
      }
      setSaveState('dirty')
      setSaveTrigger(null)
      return false
    },
    [handleSubmit, saveSignature, sectionOrder]
  )
  const pathnameTemplateKey = useMemo(() => {
    const segments = pathname.split('/').filter(Boolean)
    if (segments[0] !== 'vendor-template') return undefined
    return normalizeTemplateParam(segments[1])
  }, [pathname])
  const isTemplateBaseRoute = useMemo(() => {
    const segments = pathname.split('/').filter(Boolean)
    return segments.length === 1 && segments[0] === 'vendor-template'
  }, [pathname])

  useEffect(() => {
    if (loadedSectionOrder.length) {
      const normalized = [...loadedSectionOrder]
      ;['header', 'branding', 'hero', 'description', 'faqs', 'products', 'footer'].forEach((id) => {
        if (!normalized.includes(id)) normalized.push(id)
      })
      setSectionOrder(normalized)
    }
  }, [loadedSectionOrder])

  useEffect(() => {
    lastSavedSignatureRef.current = ''
    setSaveState('saved')
  }, [activeWebsiteId, selectedTemplateKey, vendor_id])

  useEffect(() => {
    if (!vendor_id || !isBuilderOpen) return
    if (!lastSavedSignatureRef.current) {
      lastSavedSignatureRef.current = saveSignature
      setSaveState('saved')
      return
    }

    if (saveSignature !== lastSavedSignatureRef.current) {
      setSaveState('dirty')
      return
    }

    setSaveState('saved')
  }, [isBuilderOpen, saveSignature, vendor_id])

  useEffect(() => {
    if (!selectedSection) return
    setExpandedSectionId(selectedSection)
    const container = document.querySelector(
      '[data-editor-scroll-container="true"]'
    ) as HTMLElement | null
    const target = document.querySelector(
      `[data-editor-section="${selectedSection}"]`
    ) as HTMLElement | null
    if (container && target) {
      const containerRect = container.getBoundingClientRect()
      const targetRect = target.getBoundingClientRect()
      const top =
        targetRect.top - containerRect.top + container.scrollTop - 12
      container.scrollTo({ top, behavior: 'smooth' })
      return
    }
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [selectedSection])

  useEffect(() => {
    if (!selectedComponent) return
    const escaped = selectedComponent.replace(/"/g, '\\"')
    const target = document.querySelector(
      `[data-editor-component="${escaped}"]`
    ) as HTMLElement | null
    if (!target) return

    const container = document.querySelector(
      '[data-editor-scroll-container="true"]'
    ) as HTMLElement | null
    if (container) {
      const containerRect = container.getBoundingClientRect()
      const targetRect = target.getBoundingClientRect()
      const top = targetRect.top - containerRect.top + container.scrollTop - 20
      container.scrollTo({ top, behavior: 'smooth' })
    } else {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [selectedComponent])

  useEffect(() => {
    const pendingSelection = consumePendingEditorSelection(pathname)
    if (!pendingSelection) return
    if (pendingSelection.sectionId) {
      setSelectedSection(pendingSelection.sectionId)
    }
    if (pendingSelection.componentId) {
      setSelectedComponent(pendingSelection.componentId)
    }
  }, [pathname])

  useEffect(() => {
    if (!vendor_id || !templateCatalog.length) return
    if (pathnameTemplateKey) return
    const storedTemplateKey = getStoredEditingTemplateKey(vendor_id)
    if (!storedTemplateKey) return
    if (!templateCatalog.some((item) => item.key === storedTemplateKey)) return
    if (selectedTemplateKey === storedTemplateKey) return
    setSelectedTemplateKey(storedTemplateKey)
  }, [
    vendor_id,
    templateCatalog,
    pathnameTemplateKey,
    selectedTemplateKey,
    setSelectedTemplateKey,
  ])

  useEffect(() => {
    if (!vendor_id || !templateCatalog.length) return
    if (!pathnameTemplateKey) {
      setIsBuilderOpen(false)
      return
    }
    const matchedTemplate = templateCatalog.find(
      (item) => item.key === pathnameTemplateKey
    )
    if (!matchedTemplate) {
      setIsBuilderOpen(false)
      return
    }
    if (selectedTemplateKey !== matchedTemplate.key) {
      setSelectedTemplateKey(matchedTemplate.key)
    }
    setStoredEditingTemplateKey(vendor_id, matchedTemplate.key)
    setIsBuilderOpen(true)
  }, [
    vendor_id,
    templateCatalog,
    pathnameTemplateKey,
    selectedTemplateKey,
    setSelectedTemplateKey,
  ])

  useEffect(() => {
    if (!isTemplateBaseRoute) return
    if (!activeWebsiteId || !vendor_id || !selectedTemplateKey || pathnameTemplateKey) return
    setIsBuilderOpen(true)
    void navigate({ to: `/vendor-template/${selectedTemplateKey}` })
  }, [
    activeWebsiteId,
    isTemplateBaseRoute,
    navigate,
    pathnameTemplateKey,
    selectedTemplateKey,
    vendor_id,
  ])

  useEffect(() => {
    if (!activeWebsiteId || typeof window === 'undefined') return
    const url = new URL(window.location.href)
    if (url.searchParams.get('website') === activeWebsiteId) return
    url.searchParams.set('website', activeWebsiteId)
    window.history.replaceState(window.history.state, '', `${url.pathname}?${url.searchParams.toString()}`)
  }, [activeWebsiteId, pathname])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const url = new URL(window.location.href)
    let changed = false
    if (url.searchParams.has('template')) {
      url.searchParams.delete('template')
      changed = true
    }
    if (url.searchParams.get('domain') === 'true') {
      setDomainOpen(true)
      url.searchParams.delete('domain')
      changed = true
    }
    if (changed) {
      const nextSearch = url.searchParams.toString()
      const nextUrl = nextSearch ? `${url.pathname}?${nextSearch}` : url.pathname
      window.history.replaceState(window.history.state, '', nextUrl)
    }
  }, [pathname])

  const storefrontBaseUrl = getVendorTemplateBaseUrl(vendor_id)
  const previewCity = useMemo(
    () =>
      resolvePreviewCityFromVendorProfile(
        data?.components?.vendor_profile,
        vendor_default_city_slug
      ),
    [data?.components?.vendor_profile, vendor_default_city_slug]
  )
  const previewBaseUrl = getVendorTemplatePreviewUrl(
    vendor_id,
    selectedTemplateKey,
    previewCity.slug,
    activeWebsiteId
  )
  const previewOpenUrl = previewBaseUrl
    ? `${previewBaseUrl}${previewBaseUrl.includes('?') ? '&' : '?'}template_refresh=${Date.now()}`
    : ''
  const { connectedDomain, connectedDomainState } = useConnectedTemplateDomain({
    vendorId: vendor_id,
    token,
    activeWebsiteId,
    skip: domainOpen,
  })
  const isEditingWebsite = Boolean(activeWebsiteId)

  const handleTemplateSelect = (templateKey: string) => {
    setSelectedTemplateKey(templateKey)
    setStoredEditingTemplateKey(vendor_id, templateKey)
    setSelectedSection(null)
    setSelectedComponent(null)
    setBuilderSearchTerm('')
    setIsBuilderOpen(true)
    void navigate({ to: `/vendor-template/${templateKey}` })
  }

  const handleBuilderSearchSelect = (target: BuilderSearchTarget) => {
    setSelectedSection(target.sectionId)
    setSelectedComponent(target.componentId || null)
    setExpandedSectionId(target.sectionId)
    setBuilderSearchTerm(target.label)
  }

  const handlePreviewSelect = (sectionId: string, componentId?: string) => {
    const route = resolveEditorRouteFromComponent(componentId, selectedTemplateKey)
    setPendingEditorSelection({
      route: route || pathname,
      sectionId,
      componentId: componentId || null,
    })
    if (route && route !== pathname) {
      void navigate({ to: route })
      return
    }
    setSelectedSection(sectionId)
    setSelectedComponent(componentId || null)
    setExpandedSectionId(sectionId)
  }

  const sections = useMemo(
    () => [
      {
        id: 'header',
        title: 'Menu bar labels',
        description: 'Website name, call text, and menu link names',
        icon: MenuIcon,
      },
      {
        id: 'branding',
        title: 'Logo & banner images',
        description: 'Change the logo and the large home page banner image',
        icon: ImageIcon,
      },
      {
        id: 'hero',
        title: 'Main banner text',
        description: 'Headline, subtitle, buttons, price, and feature pills',
        icon: Type,
      },
      {
        id: 'description',
        title: 'Home Sections',
        description: 'Services, story content, and highlight stats',
        icon: PanelTop,
      },
      {
        id: 'faqs',
        title: 'FAQ Content',
        description: 'Questions and answers shown on template pages',
        icon: MousePointerClick,
      },
      {
        id: 'footer',
        title: 'Footer',
        description: 'Footer headings, newsletter copy, and links',
        icon: PanelTop,
      },
      {
        id: 'products',
        title: 'Product Grid',
        description: 'Auto-populated from your dashboard inventory',
        icon: PanelTop,
      },
    ],
    []
  )

  const sectionTitleById = useMemo(
    () =>
      sections.reduce<Record<string, string>>((acc, section) => {
        acc[section.id] = section.title
        return acc
      }, {}),
    [sections]
  )

  const productsKickerPath = 'components.home_page.products_kicker'
  const productsHeadingPath = 'components.home_page.products_heading'
  const productsSubtitlePath = 'components.home_page.products_subtitle'
  const recipeSectionHeadingPath = 'components.home_page.recipe_section_heading'
  const footerNewsletterPath = 'components.social_page.footer.newsletter_text'

  const builderSearchTargets = useMemo<BuilderSearchTarget[]>(
    () => [
      {
        id: 'header-call-label',
        label: 'Header Call Label',
        sectionId: 'header',
        componentId: 'components.home_page.header.callLabel',
        keywords: ['phone label', 'call text'],
      },
      {
        id: 'header-menu-label',
        label: 'Menu Nav Label',
        sectionId: 'header',
        componentId: 'components.home_page.header.navMenuLabel',
        keywords: ['navigation', 'menu'],
      },
      {
        id: 'header-combo-label',
        label: 'Combo Nav Label',
        sectionId: 'header',
        componentId: 'components.home_page.header.navComboLabel',
        keywords: ['navigation', 'combo'],
      },
      {
        id: 'branding-banner',
        label: 'Banner Image',
        sectionId: 'branding',
        componentId: 'components.home_page.backgroundImage',
        keywords: ['hero background', 'cover image'],
      },
      {
        id: 'branding-logo',
        label: 'Company Logo',
        sectionId: 'branding',
        componentId: 'components.logo',
        keywords: ['brand logo'],
      },
      {
        id: 'hero-title',
        label: 'Hero Title',
        sectionId: 'hero',
        componentId: 'components.home_page.header_text',
        keywords: ['headline', 'welcome text'],
      },
      {
        id: 'hero-eyebrow',
        label: 'Hero Eyebrow',
        sectionId: 'hero',
        componentId: 'components.home_page.hero_kicker',
        keywords: ['kicker', 'top label'],
      },
      {
        id: 'hero-subtitle',
        label: 'Hero Subtitle',
        sectionId: 'hero',
        componentId: 'components.home_page.header_text_small',
        keywords: ['subheading'],
      },
      {
        id: 'hero-detail',
        label: 'Hero Small Description',
        sectionId: 'hero',
        componentId: 'components.home_page.hero_detail',
        keywords: ['top section', 'description', 'offer detail'],
      },
      {
        id: 'hero-primary-button',
        label: 'Header Button Text',
        sectionId: 'hero',
        componentId: 'components.home_page.button_header',
        keywords: ['cta', 'primary button'],
      },
      {
        id: 'hero-secondary-button',
        label: 'Secondary Button Text',
        sectionId: 'hero',
        componentId: 'components.home_page.button_secondary',
        keywords: ['secondary cta'],
      },
      {
        id: 'hero-badge',
        label: 'Hero Badge Text',
        sectionId: 'hero',
        componentId: 'components.home_page.badge_text',
        keywords: ['badge'],
      },
      {
        id: 'hero-price',
        label: 'Hero Price',
        sectionId: 'hero',
        componentId: 'components.home_page.hero_price',
        keywords: ['price', 'top section'],
      },
      {
        id: 'hero-card-title',
        label: 'Hero Side Card Title',
        sectionId: 'hero',
        componentId: 'components.home_page.hero_card_title',
        keywords: ['side card', 'top section'],
      },
      {
        id: 'hero-rating',
        label: 'Hero Rating',
        sectionId: 'hero',
        componentId: 'components.home_page.hero_rating_value',
        keywords: ['rating', 'side card'],
      },
      {
        id: 'hero-feature-1',
        label: 'Hero Pill 1',
        sectionId: 'hero',
        componentId: 'components.home_page.hero_features.0',
        keywords: ['feature pill', 'delivery'],
      },
      {
        id: 'hero-feature-2',
        label: 'Hero Pill 2',
        sectionId: 'hero',
        componentId: 'components.home_page.hero_features.1',
        keywords: ['feature pill', 'toppings'],
      },
      {
        id: 'hero-feature-3',
        label: 'Hero Pill 3',
        sectionId: 'hero',
        componentId: 'components.home_page.hero_features.2',
        keywords: ['feature pill', 'oven'],
      },
      {
        id: 'hero-catalog-label',
        label: 'Catalog Button Label',
        sectionId: 'hero',
        componentId: 'components.home_page.catalog_button_label',
        keywords: ['download catalog text', 'catalog button'],
      },
      {
        id: 'hero-catalog-pdf',
        label: 'Catalog PDF Upload',
        sectionId: 'hero',
        componentId: 'components.home_page.catalog_pdf_url',
        keywords: ['pdf', 'download file', 'catalog document'],
      },
      {
        id: 'offer-banner-eyebrow',
        label: 'Offer Banner Eyebrow',
        sectionId: 'hero',
        componentId: 'components.home_page.offer_section_eyebrow',
        keywords: ['combo offer', 'offer section', 'banner text'],
      },
      {
        id: 'offer-banner-image',
        label: 'Offer Banner Image',
        sectionId: 'hero',
        componentId: 'components.home_page.offer_section_background_image',
        keywords: ['combo offer', 'offer section', 'background image'],
      },
      {
        id: 'offer-banner-colors',
        label: 'Offer Banner Colors',
        sectionId: 'hero',
        componentId: 'components.home_page.offer_section_title_color',
        keywords: ['combo offer', 'offer section', 'color'],
      },
      {
        id: 'description-large',
        label: 'Large Description',
        sectionId: 'description',
        componentId: 'components.home_page.description.large_text',
        keywords: ['about text', 'long text'],
      },
      {
        id: 'description-summary',
        label: 'Description Summary',
        sectionId: 'description',
        componentId: 'components.home_page.description.summary',
        keywords: ['summary'],
      },
      {
        id: 'description-percent-value',
        label: 'Percent Number',
        sectionId: 'description',
        componentId:
          'components.home_page.description.percent.percent_in_number',
        keywords: ['metric percent'],
      },
      {
        id: 'description-percent-label',
        label: 'Percent Label',
        sectionId: 'description',
        componentId: 'components.home_page.description.percent.percent_text',
      },
      {
        id: 'description-sold-value',
        label: 'Sold Number',
        sectionId: 'description',
        componentId: 'components.home_page.description.sold.sold_number',
      },
      {
        id: 'description-sold-label',
        label: 'Sold Label',
        sectionId: 'description',
        componentId: 'components.home_page.description.sold.sold_text',
      },
      {
        id: 'benefits-heading',
        label: 'Benefits Heading',
        sectionId: 'description',
        componentId: 'components.home_page.benefits.heading',
      },
      {
        id: 'benefits-subtitle',
        label: 'Benefits Subtitle',
        sectionId: 'description',
        componentId: 'components.home_page.benefits.subtitle',
      },
      {
        id: 'advantage-heading',
        label: 'Advantage Heading',
        sectionId: 'description',
        componentId: 'components.home_page.advantage.heading',
      },
      {
        id: 'advantage-subtitle',
        label: 'Advantage Subtitle',
        sectionId: 'description',
        componentId: 'components.home_page.advantage.subtitle',
      },
      {
        id: 'advantage-image',
        label: 'Advantage Image',
        sectionId: 'description',
        componentId: 'components.home_page.advantage.image',
      },
      {
        id: 'advantage-visual-card',
        label: 'Advantage Visual Card',
        sectionId: 'description',
        componentId: 'components.home_page.advantage.visualCardTitle',
        keywords: ['quality card', 'daily quality', 'visual card'],
      },
      {
        id: 'advantage-promise',
        label: 'Advantage Promise Text',
        sectionId: 'description',
        componentId: 'components.home_page.advantage.promiseText',
        keywords: ['healthy promise', 'crisp ingredients'],
      },
      {
        id: 'advantage-colors',
        label: 'Advantage Colors',
        sectionId: 'description',
        componentId: 'components.home_page.advantage.accentColor',
        keywords: ['advantage color', 'health section color'],
      },
      {
        id: 'hero-stat-1',
        label: 'Hero Stat 1',
        sectionId: 'description',
        componentId: 'components.home_page.heroStats.0.value',
        keywords: ['project delivered', 'metrics'],
      },
      {
        id: 'industries-heading',
        label: 'Industries Heading',
        sectionId: 'description',
        componentId: 'components.home_page.industries.heading',
        keywords: ['strategic sectors', 'industries'],
      },
      {
        id: 'faq-heading',
        label: 'FAQ Heading',
        sectionId: 'faqs',
        componentId: 'components.social_page.faqs.heading',
        keywords: ['faq', 'questions'],
      },
      {
        id: 'faq-subheading',
        label: 'FAQ Subheading',
        sectionId: 'faqs',
        componentId: 'components.social_page.faqs.subheading',
      },
      {
        id: 'products-kicker',
        label: 'Products Kicker',
        sectionId: 'products',
        componentId: productsKickerPath,
      },
      {
        id: 'products-heading',
        label: 'Products Heading',
        sectionId: 'products',
        componentId: productsHeadingPath,
      },
      {
        id: 'products-subtitle',
        label: 'Products Subtitle',
        sectionId: 'products',
        componentId: productsSubtitlePath,
      },
      {
        id: 'recipe-section-heading',
        label: 'Top Recipes Heading',
        sectionId: 'products',
        componentId: recipeSectionHeadingPath,
        keywords: ['top recipes', 'recipes heading', 'section heading'],
      },
      {
        id: 'footer-book-text',
        label: 'Footer Book Text',
        sectionId: 'footer',
        componentId: 'components.social_page.footer.book_text',
        keywords: ['footer', 'book table'],
      },
      {
        id: 'footer-newsletter',
        label: 'Footer Newsletter Text',
        sectionId: 'footer',
        componentId: footerNewsletterPath,
        keywords: ['footer', 'subscribe'],
      },
      {
        id: 'footer-orders-label',
        label: 'Footer Orders Label',
        sectionId: 'footer',
        componentId: 'components.social_page.footer.orders_label',
        keywords: ['footer', 'my orders'],
      },
    ],
    [
      footerNewsletterPath,
      productsHeadingPath,
      productsKickerPath,
      productsSubtitlePath,
    ]
  )

  const filteredTemplateCatalog = useMemo(() => {
    const query = templateSearchTerm.trim().toLowerCase()
    if (!query) return templateCatalog
    return templateCatalog.filter((template) => {
      const haystack = `${template.name} ${template.key} ${template.description || ''}`
        .trim()
        .toLowerCase()
      return haystack.includes(query)
    })
  }, [templateCatalog, templateSearchTerm])

  const filteredBuilderSearchTargets = useMemo(() => {
    const query = builderSearchTerm.trim().toLowerCase()
    if (!query) return []
    return builderSearchTargets
      .filter((target) => {
        const haystack = `${target.label} ${target.sectionId} ${target.keywords?.join(' ') || ''}`
          .trim()
          .toLowerCase()
        return haystack.includes(query)
      })
      .slice(0, 12)
  }, [builderSearchTargets, builderSearchTerm])

  const quickEditActions = useMemo(
    () => [
      {
        label: 'Change logo',
        description: 'Header/footer brand image',
        icon: ImageIcon,
        targetId: 'branding-logo',
      },
      {
        label: 'Change banner',
        description: 'Big home page image',
        icon: ImageIcon,
        targetId: 'branding-banner',
      },
      {
        label: 'Edit menu',
        description: 'Add/remove visible links',
        icon: MenuIcon,
        targetId: 'header-menu-label',
      },
      {
        label: 'Edit headline',
        description: 'Main banner text',
        icon: Type,
        targetId: 'hero-title',
      },
    ],
    []
  )

  const websiteEditorAreas = useMemo(
    () => [
      { label: 'Home page - Menu bar', value: 'section:header' },
      { label: 'Home page - Logo & banner images', value: 'section:branding' },
      { label: 'Home page - Main banner text', value: 'section:hero' },
      { label: 'Home page - Content sections', value: 'section:description' },
      { label: 'Home page - Product grid', value: 'section:products' },
      { label: 'Footer', value: 'section:footer' },
      { label: 'About page', value: 'route:/vendor-template-about' },
      { label: 'Contact page', value: 'route:/vendor-template-contact' },
      { label: 'Custom pages', value: 'route:/vendor-template-pages' },
      { label: 'Social links & FAQ', value: 'route:/vendor-template-other' },
      { label: 'Blog page', value: 'route:/vendor-template-blog' },
      { label: 'Privacy, Terms & Shipping policy', value: 'route:/vendor-template-policy' },
      { label: 'Product benefits page', value: 'route:/vendor-template-product-benefits' },
    ],
    []
  )

  const handleQuickEdit = (targetId: string) => {
    const target = builderSearchTargets.find((item) => item.id === targetId)
    if (target) handleBuilderSearchSelect(target)
  }

  const handleWebsiteAreaSelect = (value: string) => {
    if (value.startsWith('route:')) {
      void navigate({ to: value.replace('route:', '') })
      return
    }
    const sectionId = value.replace('section:', '')
    setSelectedSection(sectionId)
    setSelectedComponent(null)
    setExpandedSectionId(sectionId)
  }

  const orderedSections = useMemo(
    () =>
      sectionOrder
        .map((id) => sections.find((section) => section.id === id))
        .filter((section): section is (typeof sections)[number] => Boolean(section)),
    [sectionOrder, sections]
  )
  const homeSidebarGroups = useMemo(
    () => [
      {
        title: 'Header',
        items: orderedSections.filter((section) =>
          ['header', 'branding'].includes(section.id)
        ),
      },
      {
        title: 'Template',
        items: orderedSections.filter(
          (section) => !['header', 'branding', 'footer'].includes(section.id)
        ),
      },
      {
        title: 'Footer',
        items: orderedSections.filter((section) => section.id === 'footer'),
      },
      {
        title: 'Settings',
        items: [
          {
            id: '__theme',
            title: 'Theme settings',
            description: 'Colors, typography, and global style',
            icon: Palette,
          },
          {
            id: '__order',
            title: 'Section order',
            description: 'Reorder blocks on the home page',
            icon: PanelTop,
          },
        ],
      },
    ],
    [orderedSections]
  )

  const builderHeaderActions = isBuilderOpen ? (
    <>
      <Button
        variant='outline'
        onClick={() => {
          setIsBuilderOpen(false)
          setSelectedSection(null)
          setSelectedComponent(null)
          void navigate({ to: '/template-workspace' })
        }}
        className='h-10 shrink-0 whitespace-nowrap rounded-full border-slate-300 bg-white px-4 text-xs font-semibold text-slate-700 shadow-[0_10px_24px_-18px_rgba(15,23,42,0.28)] sm:px-5 sm:text-sm'
      >
        <ArrowLeft className='h-4 w-4' /> My Websites
      </Button>
      {!isEditingWebsite ? (
        <Button
          onClick={applyTemplateVariant}
          disabled={isUpdatingTemplate || selectedTemplateKey === activeTemplateKey}
          className='h-10 shrink-0 whitespace-nowrap rounded-full bg-slate-900 px-4 text-xs font-semibold text-white shadow-[0_16px_30px_-18px_rgba(15,23,42,0.8)] hover:bg-slate-800 sm:px-5 sm:text-sm'
        >
          {isUpdatingTemplate ? 'Applying...' : 'Set as Default'}
        </Button>
      ) : null}
      <Button
        onClick={() => {
          void handleSubmitWithOrder()
        }}
        disabled={isSubmitting || uploadingPaths.size > 0}
        className='h-10 shrink-0 whitespace-nowrap rounded-full bg-slate-900 px-4 text-xs font-semibold text-white shadow-[0_16px_30px_-18px_rgba(15,23,42,0.8)] hover:bg-slate-800 sm:px-5 sm:text-sm'
      >
        {isSubmitting && saveTrigger === 'manual' ? 'Saving...' : 'Save Now'}
      </Button>
      <Button
        variant='outline'
        onClick={() => {
          void handleSubmitWithOrder({ silent: true })
        }}
        disabled={isSubmitting || uploadingPaths.size > 0}
        className='h-10 shrink-0 whitespace-nowrap rounded-full border-slate-300 bg-white px-4 text-xs font-semibold text-slate-700 shadow-[0_10px_24px_-18px_rgba(15,23,42,0.35)] sm:px-5 sm:text-sm'
      >
        {isSubmitting && saveTrigger === 'refresh' ? 'Refreshing...' : 'Refresh Preview'}
      </Button>
      <div
        className={cn(
          'inline-flex h-10 items-center rounded-full border px-4 text-xs font-semibold sm:px-5 sm:text-sm',
          uploadingPaths.size > 0
            ? 'border-amber-200 bg-amber-50 text-amber-700'
            : saveState === 'saving'
              ? 'border-sky-200 bg-sky-50 text-sky-700'
              : saveState === 'dirty'
                ? 'border-rose-200 bg-rose-50 text-rose-700'
                : 'border-emerald-200 bg-emerald-50 text-emerald-700'
        )}
      >
        {uploadingPaths.size > 0
          ? 'Uploading media...'
          : saveState === 'saving'
            ? saveTrigger === 'refresh'
              ? 'Saving before preview refresh...'
              : 'Saving changes...'
            : saveState === 'dirty'
              ? 'Unsaved changes. Click Save Now.'
              : lastSavedAt
                ? `All changes saved at ${new Date(lastSavedAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}`
                : 'All changes saved'}
      </div>
      {!isAdmin && (
        <Button
          variant='outline'
          onClick={() => setDomainOpen(true)}
          className='h-10 shrink-0 whitespace-nowrap rounded-full border-slate-300 bg-white px-4 text-xs font-semibold text-slate-700 shadow-[0_10px_24px_-18px_rgba(15,23,42,0.28)] sm:px-5 sm:text-sm'
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
      {previewOpenUrl ? (
        <a
          href={previewOpenUrl}
          target='_blank'
          rel='noopener noreferrer'
          className='shrink-0'
        >
          <Button
            variant='outline'
            className='h-10 whitespace-nowrap rounded-full border-slate-300 bg-white px-4 text-xs font-semibold text-slate-700 shadow-[0_10px_24px_-18px_rgba(15,23,42,0.28)] sm:px-5 sm:text-sm'
          >
            <Link2 className='h-4 w-4' /> Open Preview
          </Button>
        </a>
      ) : null}
    </>
  ) : null

  const headerConfig: any = data.components.home_page.header || {}
  const footerConfig: any = data.components.social_page?.footer || {}
  const themeConfig: any = data.components.theme || {}

  const sectionBlocks: Record<string, JSX.Element> = {
    header: (
      <div className='rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm'>
        <div className='space-y-5'>
          <div>
            <p className='text-xs font-semibold uppercase tracking-[0.3em] text-slate-400'>
              Menu bar
            </p>
            <h3 className='mt-1 text-lg font-semibold text-slate-900'>
              Website name and menu links
            </h3>
            <p className='mt-1 text-sm text-slate-500'>
              These controls change the top navigation bar. Use the checkboxes to show or hide menu items.
            </p>
          </div>
          <div className='grid gap-4 md:grid-cols-2'>
            {[
              ['Website short name', 'brandLabel', 'Oph!', 'Shown beside the logo.'],
              ['Call label', 'callLabel', 'Call and order in', 'Text above the phone number.'],
              ['Home menu text', 'navHomeLabel', 'Home', 'Menu link that opens the home page.'],
              ['Products menu text', 'navMenuLabel', 'Menu', 'Menu link that opens all products.'],
              ['Combo menu text', 'navComboLabel', 'Combo', 'Menu link that opens combo offers.'],
              ['Blog menu text', 'navBlogLabel', 'Blog', 'Menu link that opens blog posts.'],
              ['Contact menu text', 'navContactLabel', 'Contact', 'Menu link that opens the contact page.'],
            ].map(([label, key, placeholder, helper]) => {
              const path = `components.home_page.header.${key}`
              return (
                <div
                  key={key}
                  className={cn(
                    'space-y-2',
                    selectedComponent === path &&
                      'rounded-lg ring-2 ring-slate-900/25 ring-offset-2 ring-offset-white'
                  )}
                  data-editor-component={path}
                >
                  <Label>{label}</Label>
                  <p className='text-xs text-slate-500'>{helper}</p>
                  <Input
                    value={headerConfig?.[key] || ''}
                    onChange={(event) =>
                      updateField(
                        ['components', 'home_page', 'header', key],
                        event.target.value
                      )
                    }
                    placeholder={placeholder}
                  />
                </div>
              )
            })}
          </div>
          <div className='rounded-2xl border border-slate-200 bg-slate-50 p-4'>
            <p className='text-xs font-semibold uppercase tracking-[0.25em] text-slate-500'>
              Show / hide menu links
            </p>
            <p className='mt-1 text-xs text-slate-500'>
              Turn off a link when that page is not ready. Home stays available as the main website entry.
            </p>
            <div className='mt-4 grid gap-3 md:grid-cols-2'>
              {[
                ['Products menu', 'showMenuLink'],
                ['Combo menu', 'showComboLink'],
                ['Blog menu', 'showBlogLink'],
                ['Contact menu', 'showContactLink'],
              ].map(([label, key]) => {
                const checked = headerConfig?.[key] !== false
                return (
                  <label
                    key={key}
                    className='flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-medium text-slate-800'
                  >
                    <span className='flex items-center gap-2'>
                      {checked ? (
                        <Eye className='h-4 w-4 text-emerald-600' />
                      ) : (
                        <EyeOff className='h-4 w-4 text-slate-400' />
                      )}
                      {label}
                    </span>
                    <input
                      type='checkbox'
                      checked={checked}
                      onChange={(event) =>
                        updateField(
                          ['components', 'home_page', 'header', key],
                          event.target.checked
                        )
                      }
                      className='h-4 w-4 rounded border-slate-300'
                    />
                  </label>
                )
              })}
            </div>
          </div>
          <div className='rounded-2xl border border-slate-200 bg-slate-50 p-4'>
            <p className='text-xs font-semibold uppercase tracking-[0.25em] text-slate-500'>
              Header Colors
            </p>
            <p className='mt-1 text-xs text-slate-500'>
              These are the colors currently used in the PocoFood header. Changes should update the live preview immediately.
            </p>
            <div className='mt-4 grid gap-4'>
              {[
                [
                  'Header Area Background',
                  'headerBackground',
                  '#ffffff',
                  'Visible on the full top logo and navigation bar background.',
                  'Home Header Background',
                  'Section preview',
                  'surface',
                ],
                [
                  'Header Labels and Business Name',
                  'headerTextColor',
                  '#171717',
                  'Visible on the business name, menu links, and most header labels.',
                  'Home Header Text',
                  'Text preview',
                  'text',
                ],
                [
                  'Header Accent Buttons and Counters',
                  'accentColor',
                  '#ffc222',
                  'Visible on highlighted menu pills, cart counters, and accent badges in the header.',
                  'Home Header Accent',
                  'Accent preview',
                  'accent',
                ],
                [
                  'Brand Highlight and Danger Accent',
                  'footerBottomBackground',
                  '#d94b2b',
                  'Visible on the red brand text near the logo and danger-style header accents.',
                  'Home Header Brand Highlight',
                  'Accent preview',
                  'accent',
                ],
              ].map(([label, key, fallback, helper, badge, previewLabel, previewVariant]) => (
                <div key={String(key)} className='space-y-2 rounded-2xl border border-slate-200 bg-white p-4'>
                  <Label>{String(label)}</Label>
                  <VisibleOnBadge label={String(badge)} />
                  <p className='text-xs text-slate-500'>{String(helper)}</p>
                  <ColorPreviewChip
                    color={String(themeConfig?.[String(key)] || fallback)}
                    label={String(previewLabel)}
                    variant={previewVariant as 'button' | 'surface' | 'text' | 'accent'}
                  />
                  <Input
                    type='color'
                    value={themeConfig?.[String(key)] || fallback}
                    onChange={(event) =>
                      updateField(['components', 'theme', String(key)], event.target.value)
                    }
                    className='h-11 p-1'
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    ),
    branding: (
      <div className='rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm'>
        <BasicInfoSection
          data={data}
          updateField={updateField}
          handleImageChange={handleImageChange}
          uploadingPaths={uploadingPaths}
          selectedComponent={selectedComponent}
        />
      </div>
    ),
    hero: (
      <div className='rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm'>
        <HeroSection
          data={data}
          updateField={updateField}
          handleDocumentChange={handleDocumentChange}
          uploadingPaths={uploadingPaths}
          selectedComponent={selectedComponent}
        />
      </div>
    ),
    description: (
      <div className='rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm'>
        <DescriptionSection
          data={data}
          updateField={updateField}
          handleImageChange={handleImageChange}
          uploadingPaths={uploadingPaths}
          selectedComponent={selectedComponent}
          templateKey={selectedTemplateKey}
        />
      </div>
    ),
    faqs: (
      <div className='rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm'>
        <div className='space-y-4'>
          <p className='text-xs font-semibold uppercase tracking-[0.3em] text-slate-400'>
            FAQ Content
          </p>
          <h3 className='text-lg font-semibold text-slate-900'>
            Questions & answers
          </h3>

          <div
            className={cn(
              'space-y-2',
              selectedComponent === 'components.social_page.faqs.heading' &&
                'rounded-lg ring-2 ring-slate-900/25 ring-offset-2 ring-offset-white'
            )}
            data-editor-component='components.social_page.faqs.heading'
          >
            <Label>FAQ Heading</Label>
            <Input
              value={data.components.social_page?.faqs?.heading || ''}
              onChange={(e) =>
                updateField(['components', 'social_page', 'faqs', 'heading'], e.target.value)
              }
              placeholder='Frequently Asked Questions'
            />
          </div>

          <div
            className={cn(
              'space-y-2',
              selectedComponent === 'components.social_page.faqs.subheading' &&
                'rounded-lg ring-2 ring-slate-900/25 ring-offset-2 ring-offset-white'
            )}
            data-editor-component='components.social_page.faqs.subheading'
          >
            <Label>FAQ Subheading</Label>
            <Textarea
              value={data.components.social_page?.faqs?.subheading || ''}
              onChange={(e) =>
                updateField(
                  ['components', 'social_page', 'faqs', 'subheading'],
                  e.target.value
                )
              }
              placeholder='Quick answers to common shopper questions.'
              className='min-h-[88px]'
            />
          </div>

          <ArrayField
            label='FAQ Items'
            items={data.components.social_page?.faqs?.faqs || []}
            onAdd={() => {
              const list = [...(data.components.social_page?.faqs?.faqs || [])]
              list.push({ question: '', answer: '' })
              updateField(['components', 'social_page', 'faqs', 'faqs'], list)
            }}
            onRemove={(index) => {
              const list = [...(data.components.social_page?.faqs?.faqs || [])]
              list.splice(index, 1)
              updateField(['components', 'social_page', 'faqs', 'faqs'], list)
            }}
            renderItem={(item: { question?: string; answer?: string }, index: number) => (
              <div className='space-y-3'>
                <div
                  className={cn(
                    'space-y-2',
                    selectedComponent ===
                      `components.social_page.faqs.faqs.${index}.question` &&
                      'rounded-lg ring-2 ring-slate-900/25 ring-offset-2 ring-offset-white'
                  )}
                  data-editor-component={`components.social_page.faqs.faqs.${index}.question`}
                >
                  <Label>Question</Label>
                  <Input
                    value={item?.question || ''}
                    onChange={(e) => {
                      const list = [...(data.components.social_page?.faqs?.faqs || [])]
                      list[index] = { ...(list[index] || {}), question: e.target.value }
                      updateField(['components', 'social_page', 'faqs', 'faqs'], list)
                    }}
                    placeholder='Enter FAQ question'
                  />
                </div>
                <div
                  className={cn(
                    'space-y-2',
                    selectedComponent ===
                      `components.social_page.faqs.faqs.${index}.answer` &&
                      'rounded-lg ring-2 ring-slate-900/25 ring-offset-2 ring-offset-white'
                  )}
                  data-editor-component={`components.social_page.faqs.faqs.${index}.answer`}
                >
                  <Label>Answer</Label>
                  <Textarea
                    value={item?.answer || ''}
                    onChange={(e) => {
                      const list = [...(data.components.social_page?.faqs?.faqs || [])]
                      list[index] = { ...(list[index] || {}), answer: e.target.value }
                      updateField(['components', 'social_page', 'faqs', 'faqs'], list)
                    }}
                    placeholder='Enter FAQ answer'
                    className='min-h-[92px]'
                  />
                </div>
              </div>
            )}
          />
        </div>
      </div>
    ),
    products: (
      <div className='rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm'>
        {selectedComponent ? (
          <p className='mb-3 text-xs text-slate-500'>
            Selected component: {selectedComponent}
          </p>
        ) : null}
        <div className='space-y-4'>
          <p className='text-xs font-semibold uppercase tracking-[0.3em] text-slate-400'>
            Products
          </p>
          <h3 className='text-lg font-semibold text-slate-900'>
            Product grid settings
          </h3>
          <div className='grid gap-4 md:grid-cols-2'>
            <div
              className={cn(
                'space-y-2',
                selectedComponent === productsKickerPath &&
                'rounded-lg ring-2 ring-slate-900/25 ring-offset-2 ring-offset-white'
              )}
              data-editor-component={productsKickerPath}
            >
              <label className='text-sm font-medium text-gray-700'>
                Products Kicker
              </label>
              <input
                className='h-12 w-full rounded-md border border-slate-200 px-3'
                value={data.components.home_page.products_kicker || ''}
                onChange={(e) =>
                  updateField(
                    ['components', 'home_page', 'products_kicker'],
                    e.target.value
                  )
                }
                placeholder='Catalog'
              />
            </div>
            <div
              className={cn(
                'space-y-2',
                selectedComponent === productsHeadingPath &&
                'rounded-lg ring-2 ring-slate-900/25 ring-offset-2 ring-offset-white'
              )}
              data-editor-component={productsHeadingPath}
            >
              <label className='text-sm font-medium text-gray-700'>
                Products Heading
              </label>
              <input
                className='h-12 w-full rounded-md border border-slate-200 px-3'
                value={data.components.home_page.products_heading || ''}
                onChange={(e) =>
                  updateField(
                    ['components', 'home_page', 'products_heading'],
                    e.target.value
                  )
                }
                placeholder='Products in this template'
              />
            </div>
          </div>
          <div
            className={cn(
              'space-y-2',
              selectedComponent === productsSubtitlePath &&
              'rounded-lg ring-2 ring-slate-900/25 ring-offset-2 ring-offset-white'
            )}
            data-editor-component={productsSubtitlePath}
          >
            <label className='text-sm font-medium text-gray-700'>
              Products Subtitle
            </label>
            <input
              className='h-12 w-full rounded-md border border-slate-200 px-3'
              value={data.components.home_page.products_subtitle || ''}
              onChange={(e) =>
                updateField(
                  ['components', 'home_page', 'products_subtitle'],
                  e.target.value
                )
              }
              placeholder='Auto-populated from your dashboard inventory.'
            />
          </div>
          <div
            className={cn(
              'space-y-2',
              selectedComponent === recipeSectionHeadingPath &&
              'rounded-lg ring-2 ring-slate-900/25 ring-offset-2 ring-offset-white'
            )}
            data-editor-component={recipeSectionHeadingPath}
          >
            <label className='text-sm font-medium text-gray-700'>
              Top Recipes Heading
            </label>
            <input
              className='h-12 w-full rounded-md border border-slate-200 px-3'
              value={data.components.home_page.recipe_section_heading || ''}
              onChange={(e) =>
                updateField(
                  ['components', 'home_page', 'recipe_section_heading'],
                  e.target.value
                )
              }
              placeholder='Top recipes'
            />
          </div>
          <div className='rounded-2xl border border-slate-200 bg-slate-50 p-4'>
            <p className='text-xs font-semibold uppercase tracking-[0.3em] text-slate-500'>
              Products Style
            </p>
            <div className='mt-4 grid gap-4 md:grid-cols-2'>
              <div className='space-y-2'>
                <label className='text-sm font-medium text-gray-700'>
                  Section Background
                </label>
                <input
                  type='color'
                  className='h-10 w-full rounded-md border border-slate-200 px-3'
                  value={
                    data.components.home_page.products_style?.backgroundColor || '#ffffff'
                  }
                  onChange={(e) =>
                    updateField(
                      ['components', 'home_page', 'products_style', 'backgroundColor'],
                      e.target.value
                    )
                  }
                />
              </div>
              <div className='space-y-2'>
                <label className='text-sm font-medium text-gray-700'>
                  Category Button Color
                </label>
                <input
                  type='color'
                  className='h-10 w-full rounded-md border border-slate-200 px-3'
                  value={
                    data.components.home_page.products_style?.buttonColor || '#ffc222'
                  }
                  onChange={(e) =>
                    updateField(
                      ['components', 'home_page', 'products_style', 'buttonColor'],
                      e.target.value
                    )
                  }
                />
              </div>
              <div className='space-y-2'>
                <label className='text-sm font-medium text-gray-700'>
                  Heading Color
                </label>
                <input
                  type='color'
                  className='h-10 w-full rounded-md border border-slate-200 px-3'
                  value={
                    data.components.home_page.products_style?.titleColor || '#0f172a'
                  }
                  onChange={(e) =>
                    updateField(
                      ['components', 'home_page', 'products_style', 'titleColor'],
                      e.target.value
                    )
                  }
                />
              </div>
              <div className='space-y-2'>
                <label className='text-sm font-medium text-gray-700'>
                  Heading Font Size
                </label>
                <input
                  type='range'
                  min='16'
                  max='36'
                  className='h-10 w-full rounded-md border border-slate-200 px-3'
                  value={data.components.home_page.products_style?.titleSize || 24}
                  onChange={(e) =>
                    updateField(
                      ['components', 'home_page', 'products_style', 'titleSize'],
                      Number(e.target.value || 0)
                    )
                  }
                />
              </div>
              <div className='space-y-2'>
                <label className='text-sm font-medium text-gray-700'>
                  Kicker Color
                </label>
                <input
                  type='color'
                  className='h-10 w-full rounded-md border border-slate-200 px-3'
                  value={
                    data.components.home_page.products_style?.kickerColor || '#94a3b8'
                  }
                  onChange={(e) =>
                    updateField(
                      ['components', 'home_page', 'products_style', 'kickerColor'],
                      e.target.value
                    )
                  }
                />
              </div>
              <div className='space-y-2'>
                <label className='text-sm font-medium text-gray-700'>
                  Kicker Font Size
                </label>
                <input
                  type='range'
                  min='10'
                  max='20'
                  className='h-10 w-full rounded-md border border-slate-200 px-3'
                  value={data.components.home_page.products_style?.kickerSize || 12}
                  onChange={(e) =>
                    updateField(
                      ['components', 'home_page', 'products_style', 'kickerSize'],
                      Number(e.target.value || 0)
                    )
                  }
                />
              </div>
            </div>
          </div>
          <p className='text-sm text-slate-600'>
            Upload products from your dashboard to show them in the live
            template preview.
          </p>
        </div>
      </div>
    ),
    footer: (
      <div className='rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm'>
        <div className='space-y-5'>
          <div>
            <p className='text-xs font-semibold uppercase tracking-[0.3em] text-slate-400'>
              Footer
            </p>
            <h3 className='mt-1 text-lg font-semibold text-slate-900'>
              Footer content and newsletter
            </h3>
          </div>
          <div className='grid gap-4 md:grid-cols-2'>
            {[
              ['Brand Heading', 'brand_heading', 'Oph!'],
              ['Book Heading', 'book_heading', 'Book a Table'],
              ['Opening Heading', 'opening_heading', 'Opening Hours'],
              ['Newsletter Heading', 'newsletter_heading', 'Newsletter'],
              ['Newsletter Placeholder', 'newsletter_placeholder', 'Your Email...'],
              ['Newsletter Button', 'newsletter_button', 'SUBSCRIBE'],
              ['Orders Link Label', 'orders_label', 'My Orders'],
            ].map(([label, key, placeholder]) => {
              const path = `components.social_page.footer.${key}`
              return (
                <div
                  key={key}
                  className={cn(
                    'space-y-2',
                    selectedComponent === path &&
                      'rounded-lg ring-2 ring-slate-900/25 ring-offset-2 ring-offset-white'
                  )}
                  data-editor-component={path}
                >
                  <Label>{label}</Label>
                  <Input
                    value={footerConfig?.[key] || ''}
                    onChange={(event) =>
                      updateField(
                        ['components', 'social_page', 'footer', key],
                        event.target.value
                      )
                    }
                    placeholder={placeholder}
                  />
                </div>
              )
            })}
          </div>
          {[
            ['Book Text', 'book_text', 'Fresh burgers, pizzas, combos...'],
            ['Newsletter Text', 'newsletter_text', 'Subscribe for weekly offers...'],
          ].map(([label, key, placeholder]) => {
            const path = `components.social_page.footer.${key}`
            return (
              <div
                key={key}
                className={cn(
                  'space-y-2',
                  selectedComponent === path &&
                    'rounded-lg ring-2 ring-slate-900/25 ring-offset-2 ring-offset-white'
                )}
                data-editor-component={path}
              >
                <Label>{label}</Label>
                <Textarea
                  value={footerConfig?.[key] || ''}
                  onChange={(event) =>
                    updateField(
                      ['components', 'social_page', 'footer', key],
                      event.target.value
                    )
                  }
                  placeholder={placeholder}
                  className='min-h-[92px]'
                />
              </div>
            )
          })}
          <div className='rounded-2xl border border-slate-200 bg-slate-50 p-4'>
            <p className='text-xs font-semibold uppercase tracking-[0.25em] text-slate-500'>
              Footer Colors
            </p>
            <div className='mt-4 grid gap-4 md:grid-cols-3'>
              {[
                ['Footer Background', 'footerBackground', '#18171c'],
                ['Bottom Bar', 'footerBottomBackground', '#d94b2b'],
                ['Footer Accent', 'footerAccentColor', '#ffc222'],
              ].map(([label, key, fallback]) => (
                <div key={key} className='space-y-2'>
                  <Label>{label}</Label>
                  <Input
                    type='color'
                    value={themeConfig?.[key] || fallback}
                    onChange={(event) =>
                      updateField(['components', 'theme', key], event.target.value)
                    }
                    className='h-11 p-1'
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    ),
  }

  return (
    <>
      <Header fixed>
        <div className='flex min-w-0 flex-1 items-center gap-3 overflow-hidden'>
          <div className='shrink-0 text-sm font-semibold text-slate-900 sm:text-base'>
            Edit Website
          </div>
          {builderHeaderActions ? (
            <div className='min-w-0 flex-1 overflow-x-auto'>
              <div className='flex min-w-max items-center gap-2 pe-2'>
                {builderHeaderActions}
              </div>
            </div>
          ) : null}
        </div>
        <div className='ms-auto flex shrink-0 items-center space-x-4'>
          <ThemeSwitch />
          <ConfigDrawer />
          <ProfileDropdown />
        </div>
      </Header>
      <Toaster position='top-right' />

      <TemplatePageLayout
        title={isBuilderOpen ? (isEditingWebsite ? 'Edit Website' : 'Website Builder') : 'Choose Template'}
        description={
          isBuilderOpen
            ? isEditingWebsite
              ? 'Update this website using the selected template. Template changes are locked for existing websites, but all page content remains editable.'
              : 'Craft your storefront hero, brand story, and key metrics. Drag sections to reorder and sync to preview how products appear on your live template.'
            : 'Select a storefront template card first. The editor and live preview will open after selection.'
        }
        activeKey='home'
        vendorId={vendor_id}
        connectedDomainHost={connectedDomain?.hostname || ''}
        connectedDomainState={connectedDomainState}
        editingTemplateKey={selectedTemplateKey}
        showNavigation={isBuilderOpen}
        topContent={
          !isBuilderOpen ? (
            <>
              <div className='rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm'>
                <p className='text-xs font-semibold uppercase tracking-[0.2em] text-slate-500'>
                  Template Search
                </p>
                <div className='relative mt-3'>
                  <SearchIcon className='pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400' />
                  <input
                    type='text'
                    value={templateSearchTerm}
                    onChange={(event) => setTemplateSearchTerm(event.target.value)}
                    placeholder='Search template by name, key, or description'
                    className='h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm text-slate-700 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-900/10'
                  />
                </div>
              </div>
              <TemplateVariantSelector
                templates={filteredTemplateCatalog}
                selectedKey={selectedTemplateKey}
                activeKey={activeTemplateKey}
                previewBaseUrl={storefrontBaseUrl}
                onSelect={handleTemplateSelect}
                onApply={applyTemplateVariant}
                isApplying={isUpdatingTemplate}
                showApplyControls={false}
                canDeleteTemplates={isAdmin}
                deletingKey={isDeletingTemplateKey}
                onDelete={deleteTemplateVariant}
              />
              {filteredTemplateCatalog.length === 0 ? (
                <p className='text-sm text-slate-500'>
                  No templates found for "{templateSearchTerm.trim()}".
                </p>
              ) : null}
            </>
          ) : null
        }
        preview={
          isBuilderOpen ? (
            <TemplatePreviewPanel
              title='Live Website Preview'
              subtitle={`Sync to refresh the right-side preview. Default city: ${previewCity.label}`}
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
              onSync={handleSubmitWithOrder}
              isSyncing={isSubmitting}
              syncDisabled={uploadingPaths.size > 0}
              vendorId={vendor_id}
              page='home'
              previewData={data}
              sectionOrder={sectionOrder}
              onSelectSection={handlePreviewSelect}
              onInlineEdit={handleInlineEdit}
            />
          ) : undefined
        }
      >
        {isBuilderOpen ? (
          <>
            <div className={shellCardClassName}>
              <p className='text-xs font-semibold uppercase tracking-[0.28em] text-slate-400'>
                Website editor
              </p>
              <h3 className='mt-1 text-[20px] font-semibold tracking-tight text-slate-950'>
                Select what you want to edit
              </h3>
              <p className='mt-1 max-w-xl text-sm leading-6 text-slate-500'>
                Choose a page or section from this dropdown, like WordPress customizer.
              </p>
              <select
                className='mt-4 h-12 rounded-2xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-900/10'
                value={expandedSectionId ? `section:${expandedSectionId}` : ''}
                onChange={(event) => handleWebsiteAreaSelect(event.target.value)}
              >
                <option value='' disabled>
                  Choose page or section
                </option>
                {websiteEditorAreas.map((area) => (
                  <option key={area.value} value={area.value}>
                    {area.label}
                  </option>
                ))}
              </select>
            </div>

            <div className={shellCardClassName}>
              <div className='flex items-start gap-3'>
                <div className='rounded-2xl bg-slate-900 p-2.5 text-white shadow-[0_14px_28px_-18px_rgba(15,23,42,0.8)]'>
                  <MousePointerClick className='h-5 w-5' />
                </div>
                <div>
                  <h3 className='text-[19px] font-semibold tracking-tight text-slate-900'>
                    What do you want to edit?
                  </h3>
                  <p className='mt-1 text-sm leading-6 text-slate-500'>
                    Pick a common task below, or click text/images directly in the preview.
                  </p>
                </div>
              </div>
              <div className='mt-5 grid gap-3'>
                {quickEditActions.map((action) => {
                  const Icon = action.icon
                  return (
                    <button
                      key={action.targetId}
                      type='button'
                      onClick={() => handleQuickEdit(action.targetId)}
                      className='flex w-full items-center justify-between rounded-[22px] border border-slate-200 bg-[linear-gradient(135deg,rgba(248,250,252,0.95),rgba(255,255,255,0.98))] px-4 py-3.5 text-left shadow-[0_14px_30px_-26px_rgba(15,23,42,0.3)] transition hover:-translate-y-0.5 hover:border-slate-300 hover:bg-white'
                    >
                      <span className='flex min-w-0 items-center gap-3'>
                        <span className='rounded-2xl bg-white p-2.5 text-slate-700 shadow-[0_14px_24px_-18px_rgba(15,23,42,0.28)]'>
                          <Icon className='h-4 w-4' />
                        </span>
                        <span className='min-w-0'>
                          <span className='block text-sm font-semibold text-slate-900'>
                            {action.label}
                          </span>
                          <span className='block truncate text-xs text-slate-500'>
                            {action.description}
                          </span>
                        </span>
                      </span>
                      <ChevronRight className='h-4 w-4 shrink-0 text-slate-400' />
                    </button>
                  )
                })}
              </div>
            </div>

            <div className={shellCardClassName}>
              <div className='relative'>
                <SearchIcon className='pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400' />
                <input
                  type='text'
                  value={builderSearchTerm}
                  onChange={(event) => setBuilderSearchTerm(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key !== 'Enter') return
                    if (!filteredBuilderSearchTargets.length) return
                    event.preventDefault()
                    handleBuilderSearchSelect(filteredBuilderSearchTargets[0])
                  }}
                  placeholder='Search: logo, banner, menu, headline, footer...'
                  className='h-12 w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-700 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-900/10'
                />
              </div>
              {builderSearchTerm.trim() ? (
                <div className='mt-3 space-y-2'>
                  {filteredBuilderSearchTargets.length > 0 ? (
                    filteredBuilderSearchTargets.map((target) => (
                      <button
                        key={target.id}
                        type='button'
                        onClick={() => handleBuilderSearchSelect(target)}
                        className='flex w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-left transition hover:border-slate-400 hover:bg-white'
                      >
                        <div>
                          <p className='text-sm font-semibold text-slate-900'>{target.label}</p>
                          <p className='text-xs text-slate-500'>
                            {sectionTitleById[target.sectionId] || target.sectionId}
                          </p>
                        </div>
                        <ChevronRight className='h-4 w-4 text-slate-400' />
                      </button>
                    ))
                  ) : (
                    <p className='text-sm text-slate-500'>
                      No matching fields found for "{builderSearchTerm.trim()}".
                    </p>
                  )}
                </div>
              ) : (
                <p className='mt-2 text-xs text-slate-500'>
                  Search jumps to the exact setting and highlights it.
                </p>
              )}
            </div>

            <div className={shellSectionClassName}>
              <div className='border-b border-slate-200/80 px-5 py-5'>
                <h3 className='text-[19px] font-semibold tracking-tight text-slate-900'>Home page sections</h3>
                <p className='mt-1 text-sm leading-6 text-slate-500'>
                  Open a section to see all editable fields for that part of the website.
                </p>
              </div>
              <div className='space-y-7 p-5'>
                {homeSidebarGroups.map((group) => (
                  <div key={group.title} className='space-y-3'>
                    <p className='text-[12px] font-semibold uppercase tracking-[0.18em] text-slate-400'>{group.title}</p>
                    <div className='space-y-2'>
                      {group.items.map((item) => {
                        const isExpanded = expandedSectionId === item.id
                        const isSelected = selectedSection === item.id
                        const isEditableSection = !item.id.startsWith('__')
                        const ItemIcon = item.icon
                        return (
                          <div key={item.id} className='space-y-3'>
                            <button
                              type='button'
                              data-editor-section={item.id}
                              onClick={() => {
                                setExpandedSectionId(item.id)
                                if (isEditableSection) {
                                  setSelectedSection(item.id)
                                } else {
                                  setSelectedSection(null)
                                  setSelectedComponent(null)
                                }
                              }}
                              className={cn(
                                'flex w-full items-center justify-between rounded-[22px] border px-4 py-3.5 text-left transition',
                                isExpanded || isSelected
                                  ? 'border-slate-200 bg-[linear-gradient(135deg,rgba(248,250,252,0.98),rgba(241,245,249,0.85))] text-slate-900 shadow-[0_18px_32px_-28px_rgba(15,23,42,0.38)]'
                                  : 'border-transparent bg-transparent text-slate-700 hover:border-slate-200 hover:bg-slate-50'
                              )}
                            >
                              <div className='flex min-w-0 items-center gap-3'>
                                <ChevronRight
                                  className={cn(
                                    'h-4 w-4 shrink-0 text-slate-400 transition',
                                    isExpanded && 'rotate-90 text-slate-700'
                                  )}
                                />
                                {ItemIcon ? (
                                  <span className='rounded-2xl bg-white p-2.5 text-slate-600 shadow-[0_14px_24px_-18px_rgba(15,23,42,0.28)]'>
                                    <ItemIcon className='h-4 w-4' />
                                  </span>
                                ) : null}
                                <span className='min-w-0'>
                                  <span className='block text-[15px] font-semibold'>
                                    {item.title}
                                  </span>
                                  <span className='block text-xs font-normal text-slate-500'>
                                    {item.description}
                                  </span>
                                </span>
                              </div>
                            </button>
                            {isExpanded && isEditableSection ? (
                              <div className='rounded-[24px] border border-slate-200 bg-[linear-gradient(180deg,rgba(248,250,252,0.92),rgba(255,255,255,0.78))] p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]'>
                                <div data-editor-section={item.id}>
                                  {sectionBlocks[item.id]}
                                </div>
                              </div>
                            ) : null}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {expandedSectionId === '__theme' ? (
              <ThemeSettingsSection data={data} updateField={updateField} />
            ) : expandedSectionId === '__order' ? (
              <TemplateSectionOrder
                title='Reorder Home Sections'
                items={sections}
                order={sectionOrder}
                setOrder={setSectionOrder}
              />
            ) : expandedSectionId ? (
              null
            ) : null}
          </>
        ) : null}
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
