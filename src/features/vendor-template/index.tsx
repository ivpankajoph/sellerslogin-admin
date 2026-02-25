'use client'

import { type JSX, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from '@tanstack/react-router'
import { ArrowLeft, Link2, Rocket, Search as SearchIcon, Wand2 } from 'lucide-react'
import { Toaster } from 'react-hot-toast'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

import { DomainModal } from './components/DomainModel'
import { TemplatePageLayout } from './components/TemplatePageLayout'
import { TemplatePreviewPanel } from './components/TemplatePreviewPanel'
import { TemplateSectionOrder } from './components/TemplateSectionOrder'
import { BasicInfoSection } from './components/form/BasicInfoSection'
import { DeploymentModal } from './components/form/DeploymentModal'
import { DescriptionSection } from './components/form/DescriptionSection'
import { HeroSection } from './components/form/HeroSection'
import { TemplateVariantSelector } from './components/form/TemplateVariantSelector'

import { ThemeSettingsSection } from './components/form/ThemeSettingsSection'
import { useTemplateForm } from './components/hooks/useTemplateForm'
import { Header } from '@/components/layout/header'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { ConfigDrawer } from '@/components/config-drawer'
import { ProfileDropdown } from '@/components/profile-dropdown'
import {
  getVendorTemplateBaseUrl,
  getVendorTemplatePreviewUrl,
} from '@/lib/storefront-url'
import {
  getStoredEditingTemplateKey,
  normalizeTemplateParam,
  setStoredEditingTemplateKey,
} from './components/templateVariantParam'

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
    open,
    setOpen,
    handleDeploy,
    isDeploying,
    deployMessage,
    handleCancel,
    loadedSectionOrder,
    isAdmin,
    deleteTemplateVariant,
    isDeletingTemplateKey,
  } = useTemplateForm()

  const handleInlineEdit = (path: string[], value: unknown) => {
    updateField(path, value)
    setInlineEditVersion((prev) => prev + 1)
  }

  const [domainOpen, setDomainOpen] = useState(false)
  const [selectedSection, setSelectedSection] = useState<string | null>(null)
  const [selectedComponent, setSelectedComponent] = useState<string | null>(null)
  const [isBuilderOpen, setIsBuilderOpen] = useState(false)
  const [inlineEditVersion, setInlineEditVersion] = useState(0)
  const [templateSearchTerm, setTemplateSearchTerm] = useState('')
  const [builderSearchTerm, setBuilderSearchTerm] = useState('')
  const [sectionOrder, setSectionOrder] = useState([
    'branding',
    'hero',
    'description',
    'products',
  ])
  const pathnameTemplateKey = useMemo(() => {
    const segments = pathname.split('/').filter(Boolean)
    if (segments[0] !== 'vendor-template') return undefined
    return normalizeTemplateParam(segments[1])
  }, [pathname])

  useEffect(() => {
    if (loadedSectionOrder.length) {
      setSectionOrder(loadedSectionOrder)
    }
  }, [loadedSectionOrder])

  useEffect(() => {
    if (!selectedSection) return
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
    if (typeof window === 'undefined') return
    const url = new URL(window.location.href)
    if (!url.searchParams.has('template')) return
    url.searchParams.delete('template')
    const nextSearch = url.searchParams.toString()
    const nextUrl = nextSearch ? `${url.pathname}?${nextSearch}` : url.pathname
    window.history.replaceState(window.history.state, '', nextUrl)
  }, [pathname])

  useEffect(() => {
    if (!isBuilderOpen || inlineEditVersion === 0) return
    const timeout = window.setTimeout(() => {
      void handleSubmit(sectionOrder, { silent: true })
    }, 700)
    return () => window.clearTimeout(timeout)
  }, [inlineEditVersion, isBuilderOpen, handleSubmit, sectionOrder])

  const storefrontBaseUrl = getVendorTemplateBaseUrl(vendor_id)
  const previewBaseUrl = getVendorTemplatePreviewUrl(
    vendor_id,
    selectedTemplateKey
  )

  const handleSubmitWithOrder = () => handleSubmit(sectionOrder)

  const handleSelectSection = (sectionId: string, componentId?: string) => {
    setSelectedSection(sectionId)
    setSelectedComponent(componentId || null)
  }

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
    setBuilderSearchTerm(target.label)
  }

  const sections = useMemo(
    () => [
      {
        id: 'branding',
        title: 'Branding + Media',
        description: 'Hero banner and logo assets',
      },
      {
        id: 'hero',
        title: 'Hero Headline',
        description: 'Primary headline and CTA copy',
      },
      {
        id: 'description',
        title: 'Story + Metrics',
        description: 'Long-form description and highlight stats',
      },
      {
        id: 'products',
        title: 'Product Grid',
        description: 'Auto-populated from your dashboard inventory',
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

  const builderSearchTargets = useMemo<BuilderSearchTarget[]>(
    () => [
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
    ],
    [productsHeadingPath, productsKickerPath, productsSubtitlePath]
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

  const sectionBlocks: Record<string, JSX.Element> = {
    branding: (
      <div className='rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm'>
        <BasicInfoSection
          data={data}
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
        />
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
          <div className='rounded-2xl border border-slate-200 bg-slate-50 p-4'>
            <p className='text-xs font-semibold uppercase tracking-[0.3em] text-slate-500'>
              Products Style
            </p>
            <div className='mt-4 grid gap-4 md:grid-cols-2'>
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
      <Toaster position='top-right' />

    <TemplatePageLayout
        title={isBuilderOpen ? 'Website Builder' : 'Choose Template'}
        description={
          isBuilderOpen
            ? 'Craft your storefront hero, brand story, and key metrics. Drag sections to reorder and sync to preview how products appear on your live template.'
            : 'Select a storefront template card first. The editor and live preview will open after selection.'
        }
        activeKey='home'
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
        actions={
          isBuilderOpen ? (
          <>
            <Button
              variant='outline'
              onClick={() => {
                setIsBuilderOpen(false)
                setSelectedSection(null)
                setSelectedComponent(null)
                void navigate({ to: '/vendor-template' })
              }}
              className='rounded-full border-slate-300'
            >
              <ArrowLeft className='h-4 w-4' /> All Templates
            </Button>
            <Button
              onClick={applyTemplateVariant}
              disabled={isUpdatingTemplate || selectedTemplateKey === activeTemplateKey}
              className='rounded-full bg-slate-900 text-white shadow-lg shadow-slate-900/20 hover:bg-slate-800'
            >
              {isUpdatingTemplate ? 'Applying...' : 'Set as Default'}
            </Button>
            <Button
              onClick={handleSubmitWithOrder}
              disabled={isSubmitting || uploadingPaths.size > 0}
              className='rounded-full bg-slate-900 text-white shadow-lg shadow-slate-900/20 hover:bg-slate-800'
            >
              {isSubmitting ? 'Saving...' : 'Save Template'}
            </Button>
            <Button
              onClick={() => setOpen(true)}
              className='rounded-full bg-slate-900 text-white shadow-lg shadow-slate-900/20 hover:bg-slate-800'
            >
              <Rocket className='h-4 w-4' /> Deploy
            </Button>
            <Button
              variant='outline'
              onClick={() => setDomainOpen(true)}
              className='rounded-full border-slate-300'
            >
              <Wand2 className='h-4 w-4' /> Connect Domain
            </Button>
            {previewBaseUrl ? (
              <a
                href={previewBaseUrl}
                target='_blank'
                rel='noopener noreferrer'
              >
                <Button
                  variant='outline'
                  className='rounded-full border-slate-300'
                >
                  <Link2 className='h-4 w-4' /> Open Preview
                </Button>
              </a>
            ) : null}
          </>
          ) : null
        }
        preview={
          isBuilderOpen ? (
          <TemplatePreviewPanel
            title='Live Website Preview'
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
            onSync={handleSubmitWithOrder}
            isSyncing={isSubmitting}
            syncDisabled={uploadingPaths.size > 0}
            vendorId={vendor_id}
            page='home'
            previewData={data}
            sectionOrder={sectionOrder}
            onSelectSection={handleSelectSection}
            onInlineEdit={handleInlineEdit}
          />
          ) : undefined
        }
      >
        {isBuilderOpen ? (
          <>
            <div className='rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm'>
              <p className='text-xs font-semibold uppercase tracking-[0.2em] text-slate-500'>
                Quick Field Search
              </p>
              <div className='relative mt-3'>
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
                  placeholder='Find any editable field (hero, products, story, catalog...)'
                  className='h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm text-slate-700 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-900/10'
                />
              </div>
              {builderSearchTerm.trim() ? (
                <div className='mt-3 grid gap-2 sm:grid-cols-2'>
                  {filteredBuilderSearchTargets.length > 0 ? (
                    filteredBuilderSearchTargets.map((target) => (
                      <button
                        key={target.id}
                        type='button'
                        onClick={() => handleBuilderSearchSelect(target)}
                        className='rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-left transition hover:border-slate-400 hover:bg-white'
                      >
                        <p className='text-sm font-semibold text-slate-900'>
                          {target.label}
                        </p>
                        <p className='text-xs text-slate-500'>
                          {sectionTitleById[target.sectionId] || target.sectionId}
                        </p>
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
                  Start typing to jump to a section or editable field.
                </p>
              )}
            </div>

            <ThemeSettingsSection data={data} updateField={updateField} />

            <TemplateSectionOrder
              title='Home Sections'
              items={sections}
              order={sectionOrder}
              setOrder={setSectionOrder}
            />

            {sectionOrder.map((sectionId) => (
              <div
                key={sectionId}
                data-editor-section={sectionId}
                className={
                  selectedSection === sectionId
                    ? 'rounded-3xl ring-2 ring-slate-900/15 ring-offset-2 ring-offset-slate-50'
                    : undefined
                }
              >
                {sectionBlocks[sectionId]}
              </div>
            ))}
          </>
        ) : null}
      </TemplatePageLayout>

      <DeploymentModal
        open={open}
        setOpen={setOpen}
        isDeploying={isDeploying}
        deployMessage={deployMessage}
        handleDeploy={handleDeploy}
        handleCancel={handleCancel}
      />
      <DomainModal open={domainOpen} setOpen={setDomainOpen} />
    </>
  )
}
