/* eslint-disable @typescript-eslint/no-explicit-any */
import { type JSX, useEffect, useMemo, useState } from 'react'
import axios from 'axios'

import { BASE_URL } from '@/store/slices/vendor/productSlice'
import { useSelector } from 'react-redux'
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
import { ImageInput } from '../components/form/ImageInput'
import { ThemeSettingsSection } from '../components/form/ThemeSettingsSection'
import { updateFieldImmutable } from '../components/hooks/utils'
import { initialData, type TemplateData } from '../data'
import { uploadImage } from '../helper/fileupload'

function VendorTemplateAbout() {
  const [data, setData] = useState<TemplateData>(initialData)
  const [uploadingPaths, setUploadingPaths] = useState<Set<string>>(new Set())
  const [selectedSection, setSelectedSection] = useState<string | null>(null)
  const [sectionOrder, setSectionOrder] = useState([
    'hero',
    'story',
    'values',
    'team',
    'stats',
  ])

  const vendor_id = useSelector((state: any) => state.auth.user.id)
  const token = useSelector((state: any) => state.auth?.token)

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

      return merged
    }

    const endpoints = [
      `${BASE_URL}/v1/templates/about?vendor_id=${vendor_id}`,
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

  const updateField = (path: string[], value: any) => {
    setData((prev) => updateFieldImmutable(prev, path, value))
  }

  const handleInlineEdit = (path: string[], value: unknown) => {
    updateField(path, value)
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

  const handleSave = async () => {
    try {
      await axios.put(`${BASE_URL}/v1/templates/about`, {
        vendor_id,
        components: data.components.about_page,
        theme: data.components.theme,
        section_order: sectionOrder,
      })
      alert('About page saved successfully!')
    } catch {
      alert('Failed to save about page.')
    }
  }

  const previewBaseUrl = vendor_id
    ? `${import.meta.env.VITE_PUBLIC_API_URL_TEMPLATE_FRONTEND}/template/${vendor_id}`
    : undefined

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
        title='About Page Builder'
        description='Tell your story, highlight your values, and introduce the team. Reorder sections to control how the narrative flows.'
        activeKey='about'
        actions={
          <Button
            onClick={handleSave}
            disabled={uploadingPaths.size > 0}
            className='rounded-full bg-slate-900 text-white shadow-lg shadow-slate-900/20 hover:bg-slate-800'
          >
            {uploadingPaths.size > 0 ? 'Uploading...' : 'Save About Page'}
          </Button>
        }
        preview={
          <TemplatePreviewPanel
            title='Live About Preview'
            subtitle='Sync to refresh the right-side preview'
            baseSrc={previewBaseUrl}
            previewQuery=''
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
            onSelectSection={(sectionId) => setSelectedSection(sectionId)}
            onInlineEdit={handleInlineEdit}
          />
        }
      >
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
    </>
  )
}

export default VendorTemplateAbout
