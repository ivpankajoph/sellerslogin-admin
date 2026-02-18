'use client'

import { type JSX, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from '@tanstack/react-router'
import { ArrowLeft, Link2, Rocket, Wand2 } from 'lucide-react'
import { Toaster } from 'react-hot-toast'
import { Button } from '@/components/ui/button'

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

export default function TemplateForm() {
  const navigate = useNavigate()
  const pathname = useLocation({ select: (location) => location.pathname })
  const {
    data,
    updateField,
    handleImageChange,
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
    setIsBuilderOpen(true)
    void navigate({ to: `/vendor-template/${templateKey}` })
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
          selectedComponent={selectedComponent}
        />
      </div>
    ),
    description: (
      <div className='rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm'>
        <DescriptionSection
          data={data}
          updateField={updateField}
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
            <div className='space-y-2'>
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
            <div className='space-y-2'>
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
          <div className='space-y-2'>
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
        topContent={!isBuilderOpen ? (
          <TemplateVariantSelector
            templates={templateCatalog}
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
        ) : null}
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
