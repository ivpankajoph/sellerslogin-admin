/* eslint-disable @typescript-eslint/consistent-type-imports */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { JSX, useEffect, useMemo, useRef, useState } from 'react'
import axios from 'axios'
import { VITE_PUBLIC_API_URL_TEMPLATE_FRONTEND } from '@/config'
import { BASE_URL } from '@/store/slices/vendor/productSlice'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { debounce } from 'lodash'
import { useSelector } from 'react-redux'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { TemplatePageLayout } from '../components/TemplatePageLayout'
import { TemplatePreviewPanel } from '../components/TemplatePreviewPanel'
import { TemplateSectionOrder } from '../components/TemplateSectionOrder'
import { ImageInput } from '../components/form/ImageInput'
import { ThemeSettingsSection } from '../components/form/ThemeSettingsSection'
import { updateFieldImmutable } from '../components/hooks/utils'
import { initialData, type TemplateData } from '../data'

function VendorTemplateContact() {
  const [data, setData] = useState<TemplateData>(initialData)
  const [uploadingPaths, setUploadingPaths] = useState<Set<string>>(new Set())
  const [selectedSection, setSelectedSection] = useState<string | null>(null)
  const [isMapReady, setIsMapReady] = useState(false)
  const [sectionOrder, setSectionOrder] = useState(['hero', 'details', 'map'])
  const mapRef = useRef<HTMLDivElement>(null)
  const leafletMapRef = useRef<any>(null)
  const markerRef = useRef<any>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [suggestions, setSuggestions] = useState<
    { display_name: string; lat: string; lon: string }[]
  >([])

  const vendor_id = useSelector((state: any) => state.auth?.user?.id)
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

      if (payload.contact_page) {
        merged.components.contact_page =
          payload.contact_page as TemplateData['components']['contact_page']
      }

      return merged
    }

    const endpoints = [
      `${BASE_URL}/v1/templates/contact?vendor_id=${vendor_id}`,
      `${BASE_URL}/v1/templates/contact/${vendor_id}`,
      `${BASE_URL}/v1/templates/${vendor_id}/contact`,
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

  const fetchSuggestions = async (query: string) => {
    if (!query.trim()) {
      setSuggestions([])
      return
    }

    try {
      const response = await axios.get(
        'https://nominatim.openstreetmap.org/search',
        {
          params: {
            q: query,
            format: 'json',
            addressdetails: 1,
            limit: 5,
          },
          headers: {
            'User-Agent': 'TemplateStudio/1.0 (support@ophmate.com)',
          },
        }
      )
      setSuggestions(response.data)
    } catch {
      setSuggestions([])
    }
  }

  const debouncedFetch = useRef(debounce(fetchSuggestions, 400)).current

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setSearchQuery(value)
    debouncedFetch(value)
  }

  const handleSuggestionClick = (lat: string, lon: string) => {
    setSearchQuery('')
    setSuggestions([])
    updateField(['components', 'contact_page', 'section_2', 'lat'], lat)
    updateField(['components', 'contact_page', 'section_2', 'long'], lon)
  }

  useEffect(() => {
    const loadLeaflet = async () => {
      if (typeof window !== 'undefined') {
        const leafletModule = await import('leaflet')
        const L = leafletModule

        delete (L.Icon.Default.prototype as any)._getIconUrl
        L.Icon.Default.mergeOptions({
          iconRetinaUrl:
            'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
          iconUrl:
            'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
          shadowUrl:
            'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        })

        setIsMapReady(true)
      }
    }

    loadLeaflet()
  }, [])

  useEffect(() => {
    if (!isMapReady || !L || !mapRef.current) return

    const lat = parseFloat(data.components.contact_page.section_2.lat) || 0
    const lng = parseFloat(data.components.contact_page.section_2.long) || 0

    const defaultCenter: [number, number] =
      lat && lng ? [lat, lng] : [20.5937, 78.9629]
    const defaultZoom = lat && lng ? 14 : 4

    if (leafletMapRef.current) {
      leafletMapRef.current.remove()
      leafletMapRef.current = null
    }

    const map = L.map(mapRef.current, {
      zoomControl: true,
      scrollWheelZoom: true,
    }).setView(defaultCenter, defaultZoom)

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map)

    if (lat && lng) {
      const marker = L.marker([lat, lng], { draggable: true }).addTo(map)
      markerRef.current = marker

      marker.on('dragend', () => {
        const position = marker.getLatLng()
        updateField(
          ['components', 'contact_page', 'section_2', 'lat'],
          position.lat.toString()
        )
        updateField(
          ['components', 'contact_page', 'section_2', 'long'],
          position.lng.toString()
        )
      })
    }

    map.on('click', (e: any) => {
      const { lat, lng } = e.latlng

      if (markerRef.current) {
        map.removeLayer(markerRef.current)
      }

      const newMarker = L.marker([lat, lng], { draggable: true }).addTo(map)
      markerRef.current = newMarker

      updateField(
        ['components', 'contact_page', 'section_2', 'lat'],
        lat.toString()
      )
      updateField(
        ['components', 'contact_page', 'section_2', 'long'],
        lng.toString()
      )

      newMarker.on('dragend', () => {
        const pos = newMarker.getLatLng()
        updateField(
          ['components', 'contact_page', 'section_2', 'lat'],
          pos.lat.toString()
        )
        updateField(
          ['components', 'contact_page', 'section_2', 'long'],
          pos.lng.toString()
        )
      })
    })

    leafletMapRef.current = map

    setTimeout(() => {
      map.invalidateSize()
    }, 300)
  }, [
    isMapReady,
    data.components.contact_page.section_2.lat,
    data.components.contact_page.section_2.long,
  ])

  async function uploadImage(file: File): Promise<string | null> {
    try {
      const { data: signatureData } = await axios.get(
        `${BASE_URL}/v1/cloudinary/signature?folder=template_images`
      )
      const formData = new FormData()
      formData.append('file', file)
      formData.append('api_key', signatureData.apiKey)
      formData.append('timestamp', signatureData.timestamp)
      formData.append('signature', signatureData.signature)
      formData.append('folder', 'ecommerce')

      const uploadRes = await axios.post(
        `https://api.cloudinary.com/v1_1/${signatureData.cloudName}/image/upload`,
        formData
      )
      return uploadRes.data.secure_url
    } catch {
      alert('Failed to upload image. Please try again.')
      return null
    }
  }

  const updateField = (path: string[], value: any) => {
    setData((prev: any) => updateFieldImmutable(prev, path, value))
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
      const imageUrl = await uploadImage(file)
      if (imageUrl) updateField(path, imageUrl)
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
      await axios.put(`${BASE_URL}/v1/templates/contact`, {
        vendor_id,
        components: data.components.contact_page,
        theme: data.components.theme,
        section_order: sectionOrder,
      })
      alert('Contact page saved successfully!')
    } catch {
      alert('Failed to save contact page.')
    }
  }

  const previewBaseUrl = vendor_id
    ? `${VITE_PUBLIC_API_URL_TEMPLATE_FRONTEND}/template/${vendor_id}`
    : undefined

  const sections = useMemo(
    () => [
      {
        id: 'hero',
        title: 'Hero Block',
        description: 'Background image and hero copy',
      },
      {
        id: 'details',
        title: 'Location Details',
        description: 'Address and supporting copy',
      },
      {
        id: 'map',
        title: 'Map + Coordinates',
        description: 'Search, coordinates, and pin placement',
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
              name='contactHeroBg'
              value={data.components.contact_page.hero.backgroundImage}
              onChange={(file) =>
                handleImageChange(
                  ['components', 'contact_page', 'hero', 'backgroundImage'],
                  file
                )
              }
              isFileInput={true}
              dimensions='1920 x 900'
            />
            {uploadingPaths.has(
              ['components', 'contact_page', 'hero', 'backgroundImage'].join(
                '.'
              )
            ) && <p className='text-sm text-slate-500'>Uploading...</p>}
          </div>

          <Input
            placeholder='Hero Title'
            value={data.components.contact_page.hero.title}
            onChange={(e) =>
              updateField(
                ['components', 'contact_page', 'hero', 'title'],
                e.target.value
              )
            }
          />
          <Input
            placeholder='Hero Subtitle'
            value={data.components.contact_page.hero.subtitle}
            onChange={(e) =>
              updateField(
                ['components', 'contact_page', 'hero', 'subtitle'],
                e.target.value
              )
            }
          />
          <div className='grid gap-4 md:grid-cols-2'>
            <div className='space-y-2'>
              <Label>Hero Title Color</Label>
              <Input
                type='color'
                value={
                  data.components.contact_page.hero_style?.titleColor ||
                  '#0f172a'
                }
                onChange={(e) =>
                  updateField(
                    ['components', 'contact_page', 'hero_style', 'titleColor'],
                    e.target.value
                  )
                }
              />
            </div>
            <div className='space-y-2'>
              <Label>
                Hero Title Size{' '}
                {data.components.contact_page.hero_style?.titleSize || 48}
              </Label>
              <Input
                type='range'
                min='20'
                max='72'
                value={data.components.contact_page.hero_style?.titleSize || 48}
                onChange={(e) =>
                  updateField(
                    ['components', 'contact_page', 'hero_style', 'titleSize'],
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
                  data.components.contact_page.hero_style?.subtitleColor ||
                  '#64748b'
                }
                onChange={(e) =>
                  updateField(
                    ['components', 'contact_page', 'hero_style', 'subtitleColor'],
                    e.target.value
                  )
                }
              />
            </div>
            <div className='space-y-2'>
              <Label>
                Hero Subtitle Size{' '}
                {data.components.contact_page.hero_style?.subtitleSize || 18}
              </Label>
              <Input
                type='range'
                min='12'
                max='32'
                value={
                  data.components.contact_page.hero_style?.subtitleSize || 18
                }
                onChange={(e) =>
                  updateField(
                    ['components', 'contact_page', 'hero_style', 'subtitleSize'],
                    Number(e.target.value || 0)
                  )
                }
              />
            </div>
          </div>
        </div>
      </div>
    ),
    details: (
      <div className='rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm'>
        <div className='space-y-4'>
          <Input
            placeholder='Section Title'
            value={data.components.contact_page.section_2.hero_title}
            onChange={(e) =>
              updateField(
                ['components', 'contact_page', 'section_2', 'hero_title'],
                e.target.value
              )
            }
          />
          <Input
            placeholder='Section Subtitle'
            value={data.components.contact_page.section_2.hero_subtitle}
            onChange={(e) =>
              updateField(
                ['components', 'contact_page', 'section_2', 'hero_subtitle'],
                e.target.value
              )
            }
          />
          <Input
            placeholder='Second Title (Optional)'
            value={data.components.contact_page.section_2.hero_title2}
            onChange={(e) =>
              updateField(
                ['components', 'contact_page', 'section_2', 'hero_title2'],
                e.target.value
              )
            }
          />
          <Input
            placeholder='Second Subtitle (Optional)'
            value={data.components.contact_page.section_2.hero_subtitle2}
            onChange={(e) =>
              updateField(
                ['components', 'contact_page', 'section_2', 'hero_subtitle2'],
                e.target.value
              )
            }
          />
        </div>
      </div>
    ),
    map: (
      <div className='rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm'>
        <div className='space-y-4'>
          <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
            <div>
              <Label>Latitude</Label>
              <Input
                value={data.components.contact_page.section_2.lat}
                onChange={(e) =>
                  updateField(
                    ['components', 'contact_page', 'section_2', 'lat'],
                    e.target.value
                  )
                }
                placeholder='e.g. 20.5937'
              />
            </div>
            <div>
              <Label>Longitude</Label>
              <Input
                value={data.components.contact_page.section_2.long}
                onChange={(e) =>
                  updateField(
                    ['components', 'contact_page', 'section_2', 'long'],
                    e.target.value
                  )
                }
                placeholder='e.g. 78.9629'
              />
            </div>
          </div>

          <div className='space-y-2'>
            <Label>Search Location</Label>
            <Input
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder='Type an address or place...'
            />
            {suggestions.length > 0 && (
              <ul className='z-10 max-h-60 overflow-auto rounded-md border border-slate-200 bg-white'>
                {suggestions.map((suggestion, idx) => (
                  <li
                    key={idx}
                    className='cursor-pointer px-3 py-2 text-sm hover:bg-slate-50'
                    onClick={() =>
                      handleSuggestionClick(suggestion.lat, suggestion.lon)
                    }
                  >
                    {suggestion.display_name}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <Label>Location on Map</Label>
            <div
              ref={mapRef}
              className='leaflet-container mt-2 h-[400px] w-full overflow-hidden rounded-2xl border bg-slate-100'
            />
            <p className='mt-2 text-sm text-slate-500'>
              Click to drop a pin. Drag the marker to fine-tune the position.
            </p>
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
        title='Contact Page Builder'
        description='Configure contact hero content, location messaging, and pin placement. Sync to preview how customers will reach you.'
        activeKey='contact'
        actions={
          <Button
            onClick={handleSave}
            disabled={uploadingPaths.size > 0}
            className='rounded-full bg-slate-900 text-white shadow-lg shadow-slate-900/20 hover:bg-slate-800'
          >
            {uploadingPaths.size > 0 ? 'Uploading...' : 'Save Contact Page'}
          </Button>
        }
        preview={
          <TemplatePreviewPanel
            title='Live Contact Preview'
            subtitle='Sync to refresh the right-side preview'
            baseSrc={previewBaseUrl}
            previewQuery=''
            defaultPath='/contact'
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
            page='contact'
            previewData={data}
            sectionOrder={sectionOrder}
            onSelectSection={(sectionId) => setSelectedSection(sectionId)}
            onInlineEdit={handleInlineEdit}
          />
        }
      >
        <ThemeSettingsSection data={data} updateField={updateField} />

        <TemplateSectionOrder
          title='Contact Page Sections'
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

export default VendorTemplateContact
