import { FileText, Upload, Zap } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

interface Type {
  data: any
  updateField: any
  handleDocumentChange?: (path: string[], file: File | null) => Promise<void> | void
  uploadingPaths?: Set<string>
  selectedComponent?: string | null
}
export function HeroSection({
  data,
  updateField,
  handleDocumentChange,
  uploadingPaths,
  selectedComponent,
}: Type) {
  const titlePath = 'components.home_page.header_text'
  const kickerPath = 'components.home_page.hero_kicker'
  const subtitlePath = 'components.home_page.header_text_small'
  const primaryButtonPath = 'components.home_page.button_header'
  const secondaryButtonPath = 'components.home_page.button_secondary'
  const badgePath = 'components.home_page.badge_text'
  const catalogLabelPath = 'components.home_page.catalog_button_label'
  const catalogPdfPath = 'components.home_page.catalog_pdf_url'
  const catalogPdfUrl = String(data?.components?.home_page?.catalog_pdf_url || '')
  const isUploadingCatalogPdf = Boolean(uploadingPaths?.has(catalogPdfPath))

  return (
    <div className='rounded-xl border bg-white p-5 shadow-sm'>
      <h2 className='mb-4 flex items-center border-b pb-2 text-xl font-semibold text-gray-800'>
        <div className='mr-3 rounded-lg bg-indigo-100 p-2'>
          <Zap className='h-5 w-5 text-indigo-600' />
        </div>
        Hero Section
      </h2>

      <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
        <div
          className={cn(
            'space-y-2',
            selectedComponent === titlePath &&
              'rounded-lg ring-2 ring-slate-900/25 ring-offset-2 ring-offset-white'
          )}
          data-editor-component={titlePath}
        >
          <label className='text-sm font-medium text-gray-700'>
            Hero Title
          </label>
          <Input
            placeholder='Enter hero title'
            value={data.components.home_page.header_text}
            onChange={(e) =>
              updateField(
                ['components', 'home_page', 'header_text'],
                e.target.value
              )
            }
            className='h-12'
          />
        </div>

        <div
          className={cn(
            'space-y-2',
            selectedComponent === kickerPath &&
              'rounded-lg ring-2 ring-slate-900/25 ring-offset-2 ring-offset-white'
          )}
          data-editor-component={kickerPath}
        >
          <label className='text-sm font-medium text-gray-700'>
            Hero Eyebrow
          </label>
          <Input
            placeholder='Featured Collection'
            value={data.components.home_page.hero_kicker || ''}
            onChange={(e) =>
              updateField(
                ['components', 'home_page', 'hero_kicker'],
                e.target.value
              )
            }
            className='h-12'
          />
        </div>

        <div
          className={cn(
            'space-y-2',
            selectedComponent === subtitlePath &&
              'rounded-lg ring-2 ring-slate-900/25 ring-offset-2 ring-offset-white'
          )}
          data-editor-component={subtitlePath}
        >
          <label className='text-sm font-medium text-gray-700'>
            Hero Subtitle
          </label>
          <Input
            placeholder='Enter hero subtitle'
            value={data.components.home_page.header_text_small}
            onChange={(e) =>
              updateField(
                ['components', 'home_page', 'header_text_small'],
                e.target.value
              )
            }
            className='h-12'
          />
        </div>
      </div>

      <div className='mt-4 grid grid-cols-1 gap-4 md:grid-cols-2'>
        <div
          className={cn(
            'space-y-2',
            selectedComponent === primaryButtonPath &&
              'rounded-lg ring-2 ring-slate-900/25 ring-offset-2 ring-offset-white'
          )}
          data-editor-component={primaryButtonPath}
        >
          <label className='text-sm font-medium text-gray-700'>
            Header Button Text
          </label>
          <Input
            placeholder='Button text'
            value={data.components.home_page.button_header}
            onChange={(e) =>
              updateField(
                ['components', 'home_page', 'button_header'],
                e.target.value
              )
            }
            className='h-12'
          />
        </div>
        <div
          className={cn(
            'space-y-2',
            selectedComponent === secondaryButtonPath &&
              'rounded-lg ring-2 ring-slate-900/25 ring-offset-2 ring-offset-white'
          )}
          data-editor-component={secondaryButtonPath}
        >
          <label className='text-sm font-medium text-gray-700'>
            Secondary Button Text
          </label>
          <Input
            placeholder='New arrivals weekly'
            value={data.components.home_page.button_secondary || ''}
            onChange={(e) =>
              updateField(
                ['components', 'home_page', 'button_secondary'],
                e.target.value
              )
            }
            className='h-12'
          />
        </div>
        <div
          className={cn(
            'space-y-2',
            selectedComponent === badgePath &&
              'rounded-lg ring-2 ring-slate-900/25 ring-offset-2 ring-offset-white'
          )}
          data-editor-component={badgePath}
        >
          <label className='text-sm font-medium text-gray-700'>
            Badge Text
          </label>
          <Input
            placeholder='New arrivals weekly'
            value={data.components.home_page.badge_text || ''}
            onChange={(e) =>
              updateField(
                ['components', 'home_page', 'badge_text'],
                e.target.value
              )
            }
            className='h-12'
          />
        </div>
        <div
          className={cn(
            'space-y-2',
            selectedComponent === catalogLabelPath &&
              'rounded-lg ring-2 ring-slate-900/25 ring-offset-2 ring-offset-white'
          )}
          data-editor-component={catalogLabelPath}
        >
          <label className='text-sm font-medium text-gray-700'>
            Catalog Button Label
          </label>
          <Input
            placeholder='Download Catalog'
            value={data.components.home_page.catalog_button_label || ''}
            onChange={(e) =>
              updateField(
                ['components', 'home_page', 'catalog_button_label'],
                e.target.value
              )
            }
            className='h-12'
          />
        </div>
      </div>

      <div
        className={cn(
          'mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4',
          selectedComponent === catalogPdfPath &&
            'ring-2 ring-slate-900/25 ring-offset-2 ring-offset-white'
        )}
        data-editor-component={catalogPdfPath}
      >
        <div className='flex items-center gap-2'>
          <FileText className='h-4 w-4 text-slate-600' />
          <p className='text-sm font-semibold text-slate-900'>Catalog PDF Upload</p>
        </div>
        <p className='mt-1 text-xs text-slate-500'>
          Upload the PDF catalog customers will download from the website.
        </p>
        <Input
          type='file'
          accept='application/pdf'
          className='mt-3'
          onChange={(event) => {
            const file = event.target.files?.[0] || null
            if (!handleDocumentChange) return
            void handleDocumentChange(
              ['components', 'home_page', 'catalog_pdf_url'],
              file
            )
          }}
        />
        {isUploadingCatalogPdf ? (
          <p className='mt-2 flex items-center text-sm text-gray-600'>
            <Upload className='mr-2 h-4 w-4 animate-pulse' /> Uploading catalog
            PDF...
          </p>
        ) : null}
        {catalogPdfUrl ? (
          <div className='mt-2 flex flex-wrap items-center gap-3 text-sm'>
            <a
              href={catalogPdfUrl}
              target='_blank'
              rel='noreferrer'
              className='font-medium text-indigo-600 underline underline-offset-2'
            >
              View uploaded catalog
            </a>
            <button
              type='button'
              onClick={() =>
                updateField(['components', 'home_page', 'catalog_pdf_url'], '')
              }
              className='font-medium text-rose-600 underline underline-offset-2'
            >
              Remove file
            </button>
          </div>
        ) : null}
      </div>

      <p className='mt-4 text-xs text-slate-500'>
        Banner image is managed from <span className='font-semibold'>Branding + Media</span> and uploaded via Cloudinary.
      </p>

      <div className='mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4'>
        <p className='text-xs font-semibold uppercase tracking-[0.3em] text-slate-500'>
          Hero Styles
        </p>
        <div className='mt-4 grid grid-cols-1 gap-4 md:grid-cols-2'>
          <div className='space-y-2'>
            <Label>Title Color</Label>
            <Input
              type='color'
              value={data.components.home_page.hero_style?.titleColor || '#0f172a'}
              onChange={(e) =>
                updateField(
                  ['components', 'home_page', 'hero_style', 'titleColor'],
                  e.target.value
                )
              }
              className='h-12'
            />
          </div>
          <div className='space-y-2'>
            <Label>
              Title Font Size {data.components.home_page.hero_style?.titleSize || 48}
            </Label>
            <Input
              type='range'
              min='20'
              max='72'
              value={data.components.home_page.hero_style?.titleSize || 48}
              onChange={(e) =>
                updateField(
                  ['components', 'home_page', 'hero_style', 'titleSize'],
                  Number(e.target.value || 0)
                )
              }
            />
          </div>
          <div className='space-y-2'>
            <Label>Subtitle Color</Label>
            <Input
              type='color'
              value={
                data.components.home_page.hero_style?.subtitleColor || '#64748b'
              }
              onChange={(e) =>
                updateField(
                  ['components', 'home_page', 'hero_style', 'subtitleColor'],
                  e.target.value
                )
              }
              className='h-12'
            />
          </div>
          <div className='space-y-2'>
            <Label>
              Subtitle Font Size{' '}
              {data.components.home_page.hero_style?.subtitleSize || 18}
            </Label>
            <Input
              type='range'
              min='12'
              max='32'
              value={data.components.home_page.hero_style?.subtitleSize || 18}
              onChange={(e) =>
                updateField(
                  ['components', 'home_page', 'hero_style', 'subtitleSize'],
                  Number(e.target.value || 0)
                )
              }
            />
          </div>
          <div className='space-y-2'>
            <Label>Primary Button Color</Label>
            <Input
              type='color'
              value={
                data.components.home_page.hero_style?.primaryButtonColor || '#0f172a'
              }
              onChange={(e) =>
                updateField(
                  [
                    'components',
                    'home_page',
                    'hero_style',
                    'primaryButtonColor',
                  ],
                  e.target.value
                )
              }
              className='h-12'
            />
          </div>
          <div className='space-y-2'>
            <Label>Secondary Button Color</Label>
            <Input
              type='color'
              value={
                data.components.home_page.hero_style?.secondaryButtonColor || '#e2e8f0'
              }
              onChange={(e) =>
                updateField(
                  [
                    'components',
                    'home_page',
                    'hero_style',
                    'secondaryButtonColor',
                  ],
                  e.target.value
                )
              }
              className='h-12'
            />
          </div>
          <div className='space-y-2'>
            <Label>Overlay Base Color</Label>
            <Input
              type='color'
              value={data.components.home_page.hero_style?.overlayColor || '#0f172a'}
              onChange={(e) =>
                updateField(
                  ['components', 'home_page', 'hero_style', 'overlayColor'],
                  e.target.value
                )
              }
              className='h-12'
            />
          </div>
          <div className='space-y-2'>
            <Label>Overlay Accent Color</Label>
            <Input
              type='color'
              value={
                data.components.home_page.hero_style?.overlayAccentColor || '#f59e0b'
              }
              onChange={(e) =>
                updateField(
                  ['components', 'home_page', 'hero_style', 'overlayAccentColor'],
                  e.target.value
                )
              }
              className='h-12'
            />
          </div>
          <div className='space-y-2 md:col-span-2'>
            <Label>
              Overlay Opacity{' '}
              {Number.isFinite(
                Number(data.components.home_page.hero_style?.overlayOpacity)
              )
                ? Number(data.components.home_page.hero_style?.overlayOpacity)
                : 70}
              %
            </Label>
            <Input
              type='range'
              min='0'
              max='100'
              value={data.components.home_page.hero_style?.overlayOpacity ?? 70}
              onChange={(e) =>
                updateField(
                  ['components', 'home_page', 'hero_style', 'overlayOpacity'],
                  Number(e.target.value || 0)
                )
              }
            />
          </div>
          <div className='space-y-2'>
            <Label>Badge Text Color</Label>
            <Input
              type='color'
              value={data.components.home_page.hero_style?.badgeColor || '#ffffff'}
              onChange={(e) =>
                updateField(
                  ['components', 'home_page', 'hero_style', 'badgeColor'],
                  e.target.value
                )
              }
              className='h-12'
            />
          </div>
          <div className='space-y-2'>
            <Label>
              Badge Font Size {data.components.home_page.hero_style?.badgeSize || 12}
            </Label>
            <Input
              type='range'
              min='10'
              max='20'
              value={data.components.home_page.hero_style?.badgeSize || 12}
              onChange={(e) =>
                updateField(
                  ['components', 'home_page', 'hero_style', 'badgeSize'],
                  Number(e.target.value || 0)
                )
              }
            />
          </div>
        </div>
      </div>
    </div>
  )
}
