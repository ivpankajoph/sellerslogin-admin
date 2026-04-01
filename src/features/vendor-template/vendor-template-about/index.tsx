/* eslint-disable @typescript-eslint/no-explicit-any */
import { type JSX, useCallback, useEffect, useMemo, useState } from 'react'
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
import { TemplateSectionOrder } from '../components/TemplateSectionOrder'
import { ArrayField } from '../components/form/ArrayField'
import { ImageInput } from '../components/form/ImageInput'
import { ThemeSettingsSection } from '../components/form/ThemeSettingsSection'
import { VendorProfileFieldsSection } from '../components/form/VendorProfileFieldsSection'
import { updateFieldImmutable } from '../components/hooks/utils'
import { initialData, type TemplateData } from '../data'
import { uploadImage } from '../helper/fileupload'
import {
  getVendorTemplatePreviewUrl,
  resolvePreviewCityFromVendorProfile,
} from '@/lib/storefront-url'
import {
  getStoredEditingTemplateKey,
} from '../components/templateVariantParam'
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

function VendorTemplateAbout() {
  const navigate = useNavigate()
  const [data, setData] = useState<TemplateData>(initialData)
  const [isSaving, setIsSaving] = useState(false)
  const [uploadingPaths, setUploadingPaths] = useState<Set<string>>(new Set())
  const [selectedSection, setSelectedSection] = useState<string | null>(null)
  const [selectedComponent, setSelectedComponent] = useState<string | null>(null)
  const [, setInlineEditVersion] = useState(0)
  const [domainOpen, setDomainOpen] = useState(false)
  const [sectionOrder, setSectionOrder] = useState([
    'hero',
    'story',
    'values',
    'team',
    'stats',
    'vendorStories',
    'vendor',
  ])
  const vendor_id = useSelector(selectVendorId)
  const token = useSelector((state: any) => state.auth?.token)
  const authDefaultCitySlug = useSelector(
    (state: any) => state.auth?.user?.default_city_slug || ''
  )
  const selectedTemplateKey = useMemo(
    () => getStoredEditingTemplateKey(vendor_id),
    [vendor_id]
  )
  const { activeWebsiteId, activeWebsite } = useActiveWebsiteSelection(vendor_id)

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

      if (payload.about_page) {
        merged.components.about_page =
          payload.about_page as TemplateData['components']['about_page']
      }

      const valueFallbacks = [
        {
          icon: 'award',
          title: 'Integrity',
          description: 'We maintain honesty in all our dealings.',
        },
        {
          icon: 'heart',
          title: 'Innovation',
          description: 'We constantly evolve to meet customer needs.',
        },
        {
          icon: 'users',
          title: 'Customer Focus',
          description: 'We prioritize practical solutions for every client.',
        },
      ]
      const normalizedValues = Array.isArray(merged.components.about_page.values)
        ? [...merged.components.about_page.values]
        : []
      while (normalizedValues.length < 3) {
        normalizedValues.push(valueFallbacks[normalizedValues.length] || valueFallbacks[0])
      }
      merged.components.about_page.values = normalizedValues

      const vendorStoryFallbacks = [
        {
          tag: 'Since 2025',
          title: 'How It Started',
          narrative: 'Share how your business started and who you serve.',
        },
        {
          tag: 'Catalog',
          title: 'What We Focus On',
          narrative: 'Describe your main product categories and strengths.',
        },
        {
          tag: 'Service',
          title: 'How We Serve',
          narrative: 'Explain support, delivery, and return process in simple words.',
        },
        {
          tag: 'Scale',
          title: 'Team & Growth',
          narrative: 'Add team size, operations, and growth highlights.',
        },
      ]
      const vendorStories =
        merged.components.about_page.vendorStories &&
        typeof merged.components.about_page.vendorStories === 'object'
          ? { ...merged.components.about_page.vendorStories }
          : {
              heading: '',
              subtitle: '',
              items: [],
            }
      const normalizedVendorStoryItems = Array.isArray(vendorStories.items)
        ? [...vendorStories.items]
        : []
      while (normalizedVendorStoryItems.length < 4) {
        normalizedVendorStoryItems.push(
          vendorStoryFallbacks[normalizedVendorStoryItems.length] || vendorStoryFallbacks[0]
        )
      }
      vendorStories.heading =
        typeof vendorStories.heading === 'string' ? vendorStories.heading : ''
      vendorStories.subtitle =
        typeof vendorStories.subtitle === 'string' ? vendorStories.subtitle : ''
      vendorStories.items = normalizedVendorStoryItems
      merged.components.about_page.vendorStories = vendorStories

      return merged
    }

    const endpoints = [
      `${BASE_URL}/v1/templates/about?vendor_id=${vendor_id}${
        activeWebsiteId ? `&website_id=${encodeURIComponent(activeWebsiteId)}` : ''
      }`,
      `${BASE_URL}/v1/templates/about/${vendor_id}`,
      `${BASE_URL}/v1/templates/${vendor_id}/about`,
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
              const normalizedOrder = Array.from(
                new Set([...order, 'vendorStories', 'vendor'])
              )
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
  }, [activeWebsiteId, vendor_id, token])

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
      const top = targetRect.top - containerRect.top + container.scrollTop - 12
      container.scrollTo({ top, behavior: 'smooth' })
      return
    }
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [selectedSection])

  useEffect(() => {
    const pendingSelection = consumePendingEditorSelection('/vendor-template-about')
    if (!pendingSelection) return
    if (pendingSelection.sectionId) {
      setSelectedSection(pendingSelection.sectionId)
    }
    if (pendingSelection.componentId) {
      setSelectedComponent(pendingSelection.componentId)
    }
  }, [])

  const updateField = (path: string[], value: any) => {
    setData((prev) => updateFieldImmutable(prev, path, value))
  }

  const handleInlineEdit = (path: string[], value: unknown) => {
    updateField(path, value)
    setSelectedComponent(path.join('.'))
    setInlineEditVersion((prev) => prev + 1)
  }

  const handlePreviewSelect = (sectionId: string, componentId?: string) => {
    const route = resolveEditorRouteFromComponent(componentId, selectedTemplateKey)
    setPendingEditorSelection({
      route: route || '/vendor-template-about',
      sectionId,
      componentId: componentId || null,
    })
    if (route && route !== '/vendor-template-about') {
      void navigate({ to: route })
      return
    }
    setSelectedSection(sectionId)
    setSelectedComponent(componentId || null)
  }

  const updateStoryParagraph = (index: number, value: string) => {
    const paragraphs = Array.isArray(data.components.about_page.story.paragraphs)
      ? [...data.components.about_page.story.paragraphs]
      : []
    while (paragraphs.length <= index) {
      paragraphs.push('')
    }
    paragraphs[index] = value
    updateField(['components', 'about_page', 'story', 'paragraphs'], paragraphs)
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
      updateField(path, imageUrl || '')
    } finally {
      setUploadingPaths((prev) => {
        const newSet = new Set(prev)
        newSet.delete(pathKey)
        return newSet
      })
    }
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
      const response = await axios.put(
        `${BASE_URL}/v1/templates/about`,
        {
          vendor_id,
          website_id: activeWebsiteId,
          components: data.components.about_page,
          vendor_profile: data.components.vendor_profile,
          theme: data.components.theme,
          section_order: sectionOrder,
        },
        {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        }
      )

      if (response.data?.success === false) {
        throw new Error(response.data?.message || 'Failed to save about page.')
      }

      if (!options?.silent) {
        toast.success('Template saved successfully')
      }
    } catch (error: unknown) {
      if (!options?.silent) {
        if (axios.isAxiosError(error)) {
          toast.error(
            error.response?.data?.message ||
              error.message ||
              'Failed to save about page.'
          )
        } else if (error instanceof Error) {
          toast.error(error.message)
        } else {
          toast.error('Failed to save about page.')
        }
      }
    } finally {
      setIsSaving(false)
    }
  }, [
    activeWebsiteId,
    data.components.about_page,
    data.components.theme,
    data.components.vendor_profile,
    sectionOrder,
    token,
    vendor_id,
  ])

  const previewCity = useMemo(
    () =>
      resolvePreviewCityFromVendorProfile(
        data?.components?.vendor_profile,
        authDefaultCitySlug
      ),
    [data?.components?.vendor_profile, authDefaultCitySlug]
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
        disabled={isSaving || uploadingPaths.size > 0 || !vendor_id}
        className='h-9 shrink-0 whitespace-nowrap rounded-full bg-slate-900 px-3 text-xs text-white shadow-lg shadow-slate-900/20 hover:bg-slate-800 sm:px-4 sm:text-sm'
      >
        {uploadingPaths.size > 0
          ? 'Uploading...'
          : isSaving
            ? 'Saving...'
            : 'Save Template'}
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

  const sections = useMemo(
    () => [
      {
        id: 'hero',
        title: 'Hero Block',
        description: 'Hero background, title, and subtitle',
      },
      {
        id: 'story',
        title: 'Story + Media',
        description: 'Narrative paragraphs and featured image',
      },
      {
        id: 'values',
        title: 'Core Values',
        description: 'Iconic value statements',
      },
      {
        id: 'team',
        title: 'Team Spotlight',
        description: 'Team member cards',
      },
      {
        id: 'stats',
        title: 'Highlight Stats',
        description: 'Numbers that build trust',
      },
      {
        id: 'vendorStories',
        title: 'Vendor Stories',
        description: 'Journey cards shown below About sections',
      },
      {
        id: 'vendor',
        title: 'Vendor Profile',
        description: 'Override vendor details shown in About and Contact pages',
      },
    ],
    []
  )

  const sectionBlocks: Record<string, JSX.Element> = {
    hero: (
      <div className='rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm'>
        <div className='space-y-4'>
          <div className='space-y-2'>
            <ImageInput
              label='Hero Background'
              name='aboutHeroBg'
              value={data.components.about_page.hero.backgroundImage}
              onChange={(file) =>
                handleImageChange(
                  ['components', 'about_page', 'hero', 'backgroundImage'],
                  file
                )
              }
              isFileInput={true}
              dimensions='1920 x 900'
            />
            {uploadingPaths.has(
              ['components', 'about_page', 'hero', 'backgroundImage'].join('.')
            ) && <p className='text-sm text-slate-500'>Uploading...</p>}
          </div>

          <Input
            value={data.components.about_page.hero.kicker || ''}
            onChange={(e) =>
              updateField(
                ['components', 'about_page', 'hero', 'kicker'],
                e.target.value
              )
            }
            placeholder='Hero Eyebrow (e.g. Built for Industry)'
          />
          <Input
            value={data.components.about_page.hero.title}
            onChange={(e) =>
              updateField(
                ['components', 'about_page', 'hero', 'title'],
                e.target.value
              )
            }
            placeholder='Hero Title'
          />
          <Input
            value={data.components.about_page.hero.subtitle}
            onChange={(e) =>
              updateField(
                ['components', 'about_page', 'hero', 'subtitle'],
                e.target.value
              )
            }
            placeholder='Hero Subtitle'
          />
          <div className='grid gap-4 md:grid-cols-2'>
            <div className='space-y-2'>
              <Label>Hero Title Color</Label>
              <Input
                type='color'
                value={
                  data.components.about_page.hero_style?.titleColor || '#0f172a'
                }
                onChange={(e) =>
                  updateField(
                    ['components', 'about_page', 'hero_style', 'titleColor'],
                    e.target.value
                  )
                }
              />
            </div>
            <div className='space-y-2'>
              <Label>
                Hero Title Size{' '}
                {data.components.about_page.hero_style?.titleSize || 48}
              </Label>
              <Input
                type='range'
                min='20'
                max='72'
                value={data.components.about_page.hero_style?.titleSize || 48}
                onChange={(e) =>
                  updateField(
                    ['components', 'about_page', 'hero_style', 'titleSize'],
                    Number(e.target.value || 0)
                  )
                }
              />
            </div>
            <div className='space-y-2'>
              <Label>Hero Subtitle Color</Label>
              <Input
                type='color'
                value={
                  data.components.about_page.hero_style?.subtitleColor ||
                  '#64748b'
                }
                onChange={(e) =>
                  updateField(
                    ['components', 'about_page', 'hero_style', 'subtitleColor'],
                    e.target.value
                  )
                }
              />
            </div>
            <div className='space-y-2'>
              <Label>
                Hero Subtitle Size{' '}
                {data.components.about_page.hero_style?.subtitleSize || 18}
              </Label>
              <Input
                type='range'
                min='12'
                max='32'
                value={data.components.about_page.hero_style?.subtitleSize || 18}
                onChange={(e) =>
                  updateField(
                    ['components', 'about_page', 'hero_style', 'subtitleSize'],
                    Number(e.target.value || 0)
                  )
                }
              />
            </div>
          </div>
        </div>
      </div>
    ),
    story: (
      <div className='rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm'>
        <div className='space-y-4'>
          <Input
            value={data.components.about_page.story.heading}
            onChange={(e) =>
              updateField(
                ['components', 'about_page', 'story', 'heading'],
                e.target.value
              )
            }
            placeholder='Story Heading'
          />
          <div className='space-y-2'>
            <Label>Story Paragraphs</Label>
            <ArrayField
              label='Paragraphs'
              items={data.components.about_page.story.paragraphs}
              onAdd={() =>
                updateField(
                  ['components', 'about_page', 'story', 'paragraphs'],
                  [...data.components.about_page.story.paragraphs, '']
                )
              }
              onRemove={(i) => {
                const list = [...data.components.about_page.story.paragraphs]
                list.splice(i, 1)
                updateField(
                  ['components', 'about_page', 'story', 'paragraphs'],
                  list
                )
              }}
              renderItem={(item, idx) => (
                <Textarea
                  value={item}
                  onChange={(e) => {
                    const list = [
                      ...data.components.about_page.story.paragraphs,
                    ]
                    list[idx] = e.target.value
                    updateField(
                      ['components', 'about_page', 'story', 'paragraphs'],
                      list
                    )
                  }}
                />
              )}
            />
          </div>

          <div className='space-y-2'>
            <ImageInput
              label='Story Image'
              name='storyImage'
              value={data.components.about_page.story.image}
              onChange={(file) =>
                handleImageChange(
                  ['components', 'about_page', 'story', 'image'],
                  file
                )
              }
              isFileInput={true}
              dimensions='1200 x 800'
            />
            {uploadingPaths.has(
              ['components', 'about_page', 'story', 'image'].join('.')
            ) && <p className='text-sm text-slate-500'>Uploading...</p>}
          </div>
        </div>
      </div>
    ),
    values: (
      <div className='rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm'>
        <ArrayField
          label='Core Values'
          items={data.components.about_page.values}
          onAdd={() =>
            updateField(
              ['components', 'about_page', 'values'],
              [
                ...data.components.about_page.values,
                { icon: '', title: '', description: '' },
              ]
            )
          }
          onRemove={(i) => {
            if (data.components.about_page.values.length <= 3) return
            const list = [...data.components.about_page.values]
            list.splice(i, 1)
            updateField(['components', 'about_page', 'values'], list)
          }}
          renderItem={(item, idx) => (
            <div className='grid grid-cols-1 gap-2 md:grid-cols-3'>
              <Input
                placeholder='Icon (e.g. leaf)'
                value={item.icon}
                onChange={(e) => {
                  const list = [...data.components.about_page.values]
                  list[idx].icon = e.target.value
                  updateField(['components', 'about_page', 'values'], list)
                }}
              />
              <Input
                placeholder='Title'
                value={item.title}
                onChange={(e) => {
                  const list = [...data.components.about_page.values]
                  list[idx].title = e.target.value
                  updateField(['components', 'about_page', 'values'], list)
                }}
              />
              <Input
                placeholder='Description'
                value={item.description}
                onChange={(e) => {
                  const list = [...data.components.about_page.values]
                  list[idx].description = e.target.value
                  updateField(['components', 'about_page', 'values'], list)
                }}
              />
            </div>
          )}
        />
      </div>
    ),
    team: (
      <div className='rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm'>
        <ArrayField
          label='Team Members'
          items={data.components.about_page.team}
          onAdd={() =>
            updateField(
              ['components', 'about_page', 'team'],
              [
                ...data.components.about_page.team,
                { name: '', role: '', image: '' },
              ]
            )
          }
          onRemove={(i) => {
            const list = [...data.components.about_page.team]
            list.splice(i, 1)
            updateField(['components', 'about_page', 'team'], list)
          }}
          renderItem={(item, idx) => (
            <div className='space-y-2'>
              <Input
                placeholder='Name'
                value={item.name}
                onChange={(e) => {
                  const list = [...data.components.about_page.team]
                  list[idx].name = e.target.value
                  updateField(['components', 'about_page', 'team'], list)
                }}
              />
              <Input
                placeholder='Role'
                value={item.role}
                onChange={(e) => {
                  const list = [...data.components.about_page.team]
                  list[idx].role = e.target.value
                  updateField(['components', 'about_page', 'team'], list)
                }}
              />
              <div className='space-y-2'>
                <ImageInput
                  label='Team Member Image'
                  name={`team-${idx}-image`}
                  value={item.image}
                  onChange={(file) => {
                    handleImageChange(
                      [
                        'components',
                        'about_page',
                        'team',
                        idx.toString(),
                        'image',
                      ],
                      file
                    )
                  }}
                  isFileInput={true}
                  dimensions='600 x 600'
                />
                {uploadingPaths.has(
                  [
                    'components',
                    'about_page',
                    'team',
                    idx.toString(),
                    'image',
                  ].join('.')
                ) && <p className='text-sm text-slate-500'>Uploading...</p>}
              </div>
            </div>
          )}
        />
      </div>
    ),
    stats: (
      <div className='rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm'>
        <ArrayField
          label='Stats'
          items={data.components.about_page.stats}
          onAdd={() =>
            updateField(
              ['components', 'about_page', 'stats'],
              [...data.components.about_page.stats, { value: '', label: '' }]
            )
          }
          onRemove={(i) => {
            const list = [...data.components.about_page.stats]
            list.splice(i, 1)
            updateField(['components', 'about_page', 'stats'], list)
          }}
          renderItem={(item, idx) => (
            <div className='grid grid-cols-2 gap-2'>
              <Input
                placeholder='Value (e.g. 10+)'
                value={item.value}
                onChange={(e) => {
                  const list = [...data.components.about_page.stats]
                  list[idx].value = e.target.value
                  updateField(['components', 'about_page', 'stats'], list)
                }}
              />
              <Input
                placeholder='Label'
                value={item.label}
                onChange={(e) => {
                  const list = [...data.components.about_page.stats]
                  list[idx].label = e.target.value
                  updateField(['components', 'about_page', 'stats'], list)
                }}
              />
            </div>
          )}
        />
      </div>
    ),
    vendorStories: (
      <div className='rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm'>
        <div className='space-y-4'>
          <Input
            value={data.components.about_page.vendorStories.heading}
            onChange={(e) =>
              updateField(
                ['components', 'about_page', 'vendorStories', 'heading'],
                e.target.value
              )
            }
            placeholder='Section Heading (e.g. Vendor Stories)'
          />
          <Input
            value={data.components.about_page.vendorStories.subtitle}
            onChange={(e) =>
              updateField(
                ['components', 'about_page', 'vendorStories', 'subtitle'],
                e.target.value
              )
            }
            placeholder='Section Subtitle'
          />

          <ArrayField
            label='Story Cards'
            items={data.components.about_page.vendorStories.items}
            onAdd={() => {
              if (data.components.about_page.vendorStories.items.length >= 4) return
              updateField(
                ['components', 'about_page', 'vendorStories', 'items'],
                [
                  ...data.components.about_page.vendorStories.items,
                  { tag: '', title: '', narrative: '' },
                ]
              )
            }}
            onRemove={(i) => {
              if (data.components.about_page.vendorStories.items.length <= 4) return
              const list = [...data.components.about_page.vendorStories.items]
              list.splice(i, 1)
              updateField(['components', 'about_page', 'vendorStories', 'items'], list)
            }}
            renderItem={(item, idx) => (
              <div className='space-y-2'>
                <div className='grid grid-cols-1 gap-2 md:grid-cols-2'>
                  <Input
                    placeholder='Tag (e.g. Since 2025)'
                    value={item.tag}
                    onChange={(e) => {
                      const list = [...data.components.about_page.vendorStories.items]
                      list[idx].tag = e.target.value
                      updateField(
                        ['components', 'about_page', 'vendorStories', 'items'],
                        list
                      )
                    }}
                  />
                  <Input
                    placeholder='Card Title'
                    value={item.title}
                    onChange={(e) => {
                      const list = [...data.components.about_page.vendorStories.items]
                      list[idx].title = e.target.value
                      updateField(
                        ['components', 'about_page', 'vendorStories', 'items'],
                        list
                      )
                    }}
                  />
                </div>
                <Textarea
                  placeholder='Card Description'
                  value={item.narrative}
                  onChange={(e) => {
                    const list = [...data.components.about_page.vendorStories.items]
                    list[idx].narrative = e.target.value
                    updateField(
                      ['components', 'about_page', 'vendorStories', 'items'],
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
    vendor: (
      <VendorProfileFieldsSection
        vendorProfile={data.components.vendor_profile}
        updateField={updateField}
      />
    ),
  }

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
        title='About Page Builder'
        description='Tell your story, highlight your values, and introduce the team. Reorder sections to control how the narrative flows.'
        activeKey='about'
        vendorId={vendor_id}
        connectedDomainHost={connectedDomain?.hostname || ''}
        connectedDomainState={connectedDomainState}
        editingTemplateKey={selectedTemplateKey}
        preview={
          <TemplatePreviewPanel
            title='Live About Preview'
            subtitle={`Sync to refresh the right-side preview. Default city: ${previewCity.label}`}
            baseSrc={previewBaseUrl}
            previewQuery='?previewChrome=content-only'
            defaultPath='/about'
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
            syncDisabled={uploadingPaths.size > 0}
            vendorId={vendor_id}
            page='about'
            previewData={data}
            sectionOrder={sectionOrder}
            onSelectSection={handlePreviewSelect}
            onInlineEdit={handleInlineEdit}
          />
        }
      >
        <div className='rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm'>
          <div className='flex flex-col gap-2'>
            <p className='text-xs font-semibold uppercase tracking-[0.2em] text-slate-500'>
              Quick About Editor
            </p>
            <h3 className='text-xl font-semibold text-slate-900'>
              Edit the exact content vendors see in About preview
            </h3>
            <p className='text-sm text-slate-600'>
              Blog editor ki tarah yahan se About page ka main heading, subtitle,
              story, aur fallback business details directly edit kar sakte ho.
              Agar About title/subtitle blank chhode jaate hain, preview vendor
              profile details se auto-generate hota hai.
            </p>
          </div>

          <div className='mt-6 grid gap-4 md:grid-cols-2'>
            <div className='space-y-2'>
              <Label>About Eyebrow</Label>
              <Input
                value={data.components.about_page.hero.kicker || ''}
                onChange={(e) =>
                  updateField(
                    ['components', 'about_page', 'hero', 'kicker'],
                    e.target.value
                  )
                }
                placeholder='Warehouse Experts'
              />
            </div>
            <div className='space-y-2'>
              <Label>About Heading</Label>
              <Input
                value={data.components.about_page.hero.title || ''}
                onChange={(e) =>
                  updateField(
                    ['components', 'about_page', 'hero', 'title'],
                    e.target.value
                  )
                }
                placeholder='About Cookmytech'
              />
            </div>
          </div>

          <div className='mt-4 space-y-2'>
            <Label>About Subtitle</Label>
            <Textarea
              value={data.components.about_page.hero.subtitle || ''}
              onChange={(e) =>
                updateField(
                  ['components', 'about_page', 'hero', 'subtitle'],
                  e.target.value
                )
              }
              placeholder='Tell visitors what your business does and where you are based.'
              className='min-h-[90px]'
            />
          </div>

          <div className='mt-6 grid gap-4 md:grid-cols-2'>
            <div className='space-y-2'>
              <Label>Story Heading</Label>
              <Input
                value={data.components.about_page.story.heading || ''}
                onChange={(e) =>
                  updateField(
                    ['components', 'about_page', 'story', 'heading'],
                    e.target.value
                  )
                }
                placeholder='Our Story'
              />
            </div>
            <div className='space-y-2'>
              <Label>Story Image</Label>
              <ImageInput
                label='Story Image'
                name='aboutQuickStoryImage'
                value={data.components.about_page.story.image}
                onChange={(file) =>
                  handleImageChange(
                    ['components', 'about_page', 'story', 'image'],
                    file
                  )
                }
                isFileInput={true}
                dimensions='1200 x 800'
              />
            </div>
          </div>

          <div className='mt-6 space-y-3'>
            <Label>Main Story Content</Label>
            {[0, 1, 2].map((index) => (
              <Textarea
                key={`about-story-para-${index}`}
                value={data.components.about_page.story.paragraphs?.[index] || ''}
                onChange={(e) => updateStoryParagraph(index, e.target.value)}
                placeholder={`Story paragraph ${index + 1}`}
                className='min-h-[100px]'
              />
            ))}
          </div>

          <div className='mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4'>
            <div className='flex flex-col gap-2'>
              <h4 className='text-sm font-semibold text-slate-900'>
                Fallback Business Details
              </h4>
              <p className='text-xs text-slate-600'>
                Ye details tab use hoti hain jab About content blank hota hai.
                Isse auto-generated title/subtitle aur story text bhi better ho
                jayega.
              </p>
            </div>

            <div className='mt-4 grid gap-4 md:grid-cols-2'>
              <div className='space-y-2'>
                <Label>Store Display Name</Label>
                <Input
                  value={(data.components.vendor_profile as any)?.name || ''}
                  onChange={(e) =>
                    updateField(
                      ['components', 'vendor_profile', 'name'],
                      e.target.value
                    )
                  }
                  placeholder='Cookmytech'
                />
              </div>
              <div className='space-y-2'>
                <Label>Business Name</Label>
                <Input
                  value={(data.components.vendor_profile as any)?.business_name || ''}
                  onChange={(e) =>
                    updateField(
                      ['components', 'vendor_profile', 'business_name'],
                      e.target.value
                    )
                  }
                  placeholder='Cookmytech Private Limited'
                />
              </div>
              <div className='space-y-2'>
                <Label>Business Type</Label>
                <Input
                  value={(data.components.vendor_profile as any)?.business_type || ''}
                  onChange={(e) =>
                    updateField(
                      ['components', 'vendor_profile', 'business_type'],
                      e.target.value
                    )
                  }
                  placeholder='Manufacturer / Retail / Wholesaler'
                />
              </div>
              <div className='space-y-2'>
                <Label>City</Label>
                <Input
                  value={(data.components.vendor_profile as any)?.city || ''}
                  onChange={(e) =>
                    updateField(
                      ['components', 'vendor_profile', 'city'],
                      e.target.value
                    )
                  }
                  placeholder='Greater Noida'
                />
              </div>
              <div className='space-y-2'>
                <Label>State</Label>
                <Input
                  value={(data.components.vendor_profile as any)?.state || ''}
                  onChange={(e) =>
                    updateField(
                      ['components', 'vendor_profile', 'state'],
                      e.target.value
                    )
                  }
                  placeholder='Uttar Pradesh'
                />
              </div>
              <div className='space-y-2'>
                <Label>Country</Label>
                <Input
                  value={(data.components.vendor_profile as any)?.country || ''}
                  onChange={(e) =>
                    updateField(
                      ['components', 'vendor_profile', 'country'],
                      e.target.value
                    )
                  }
                  placeholder='India'
                />
              </div>
            </div>
          </div>
        </div>

        <SelectedFieldEditor
          data={data}
          selectedComponent={selectedComponent}
          updateField={updateField}
          handleImageChange={handleImageChange}
        />

        <ThemeSettingsSection data={data} updateField={updateField} />

        <TemplateSectionOrder
          title='About Page Sections'
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

export default VendorTemplateAbout
