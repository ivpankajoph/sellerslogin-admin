import { FileText, Upload, Zap } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { ColorPreviewChip } from './ColorPreviewChip'
import { VisibleOnBadge } from './VisibleOnBadge'

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
  const detailPath = 'components.home_page.hero_detail'
  const subtitlePath = 'components.home_page.header_text_small'
  const primaryButtonPath = 'components.home_page.button_header'
  const secondaryButtonPath = 'components.home_page.button_secondary'
  const pricePath = 'components.home_page.hero_price'
  const oldPricePath = 'components.home_page.hero_old_price'
  const cardKickerPath = 'components.home_page.hero_card_kicker'
  const cardTitlePath = 'components.home_page.hero_card_title'
  const cardBadgePath = 'components.home_page.hero_card_badge'
  const startingLabelPath = 'components.home_page.hero_starting_label'
  const ratingLabelPath = 'components.home_page.hero_rating_label'
  const ratingValuePath = 'components.home_page.hero_rating_value'
  const offerEyebrowPath = 'components.home_page.offer_section_eyebrow'
  const offerButtonPath = 'components.home_page.offer_section_button_label'
  const offerBackgroundImagePath = 'components.home_page.offer_section_background_image'
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

      <div className='mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-4'>
        <p className='text-xs font-semibold uppercase tracking-[0.25em] text-amber-700'>
          Top Hero Section
        </p>
        <p className='mt-1 text-xs text-amber-800/80'>
          These fields control the first banner visitors see on the website.
        </p>
      </div>

      <div className='grid grid-cols-1 gap-4'>
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
          <VisibleOnBadge label='Home Hero' />
          <p className='text-xs text-slate-500'>
            This appears as the main heading in the home hero section.
          </p>
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
          <VisibleOnBadge label='Home Hero' />
          <p className='text-xs text-slate-500'>
            This appears as the small label above the main hero heading.
          </p>
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
          <VisibleOnBadge label='Home Hero' />
          <p className='text-xs text-slate-500'>
            This appears as the supporting line below the hero title.
          </p>
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

      <div
        className={cn(
          'mt-4 space-y-2',
          selectedComponent === detailPath &&
            'rounded-lg ring-2 ring-slate-900/25 ring-offset-2 ring-offset-white'
        )}
        data-editor-component={detailPath}
      >
        <label className='text-sm font-medium text-gray-700'>
          Hero Small Description
        </label>
        <VisibleOnBadge label='Home Hero' />
        <p className='text-xs text-slate-500'>
          This appears as the supporting description around the hero buttons.
        </p>
        <Textarea
          placeholder='Bundle pricing for a ready-to-order combo meal.'
          value={data.components.home_page.hero_detail || ''}
          onChange={(e) =>
            updateField(
              ['components', 'home_page', 'hero_detail'],
              e.target.value
            )
          }
          className='min-h-[90px]'
        />
      </div>

      <div className='mt-4 grid grid-cols-1 gap-4'>
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
          <VisibleOnBadge label='Home Hero Primary Button' />
          <p className='text-xs text-slate-500'>
            This is the text shown on the main hero CTA button.
          </p>
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
          <VisibleOnBadge label='Home Hero Secondary Button' />
          <p className='text-xs text-slate-500'>
            This appears on the secondary hero button.
          </p>
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
          <VisibleOnBadge label='Home Hero Badge' />
          <p className='text-xs text-slate-500'>
            This appears inside the small highlight badge in the hero section.
          </p>
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
          <VisibleOnBadge label='Home Hero Catalog Button' />
          <p className='text-xs text-slate-500'>
            This is the label shown on the catalog download button.
          </p>
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
        <div
          className={cn(
            'space-y-2',
            selectedComponent === pricePath &&
              'rounded-lg ring-2 ring-slate-900/25 ring-offset-2 ring-offset-white'
          )}
          data-editor-component={pricePath}
        >
          <label className='text-sm font-medium text-gray-700'>Hero Price</label>
          <VisibleOnBadge label='Home Hero Price Card' />
          <p className='text-xs text-slate-500'>
            This appears in the hero price card or starting-price area.
          </p>
          <Input
            placeholder='197'
            value={data.components.home_page.hero_price || ''}
            onChange={(e) =>
              updateField(['components', 'home_page', 'hero_price'], e.target.value)
            }
            className='h-12'
          />
        </div>
        <div
          className={cn(
            'space-y-2',
            selectedComponent === oldPricePath &&
              'rounded-lg ring-2 ring-slate-900/25 ring-offset-2 ring-offset-white'
          )}
          data-editor-component={oldPricePath}
        >
          <label className='text-sm font-medium text-gray-700'>Old Price</label>
          <VisibleOnBadge label='Home Hero Price Card' />
          <p className='text-xs text-slate-500'>
            This appears as the previous or crossed-out price next to the discount.
          </p>
          <Input
            placeholder='69'
            value={data.components.home_page.hero_old_price || ''}
            onChange={(e) =>
              updateField(
                ['components', 'home_page', 'hero_old_price'],
                e.target.value
              )
            }
            className='h-12'
          />
        </div>
      </div>

      <div className='mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4'>
        <p className='text-xs font-semibold uppercase tracking-[0.25em] text-slate-500'>
          Hero Side Card
        </p>
        <div className='mt-4 grid grid-cols-1 gap-4'>
          {[
            ['Card Kicker', cardKickerPath, 'Spice Route Kitchen', 'hero_card_kicker'],
            ['Card Title', cardTitlePath, 'Paneer Tikka Wrap + Masala Loaded Fries', 'hero_card_title'],
            ['Card Badge', cardBadgePath, 'Live', 'hero_card_badge'],
            ['Starting Label', startingLabelPath, 'Starting at', 'hero_starting_label'],
            ['Rating Label', ratingLabelPath, 'Rating', 'hero_rating_label'],
            ['Rating Value', ratingValuePath, '4.9/5', 'hero_rating_value'],
          ].map(([label, path, placeholder, key]) => (
            <div
              key={key}
              className={cn(
                'space-y-2',
                selectedComponent === path &&
                  'rounded-lg ring-2 ring-slate-900/25 ring-offset-2 ring-offset-white'
              )}
              data-editor-component={path}
            >
              <label className='text-sm font-medium text-gray-700'>{label}</label>
              <VisibleOnBadge label='Home Hero Side Card' />
              <p className='text-xs text-slate-500'>
                This appears inside the hero side information card.
              </p>
              <Input
                placeholder={placeholder}
                value={data.components.home_page?.[key] || ''}
                onChange={(e) =>
                  updateField(['components', 'home_page', key], e.target.value)
                }
                className='h-12'
              />
            </div>
          ))}
        </div>
      </div>

      <div className='mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4'>
        <p className='text-xs font-semibold uppercase tracking-[0.25em] text-slate-500'>
          Hero Feature Pills
        </p>
        <p className='mt-1 text-xs text-slate-500'>
          Controls the three pill labels below the hero buttons.
        </p>
        <div className='mt-4 grid grid-cols-1 gap-4'>
          {Array.from({ length: 3 }, (_, index) => {
            const path = `components.home_page.hero_features.${index}`
            const features = Array.isArray(data.components.home_page.hero_features)
              ? data.components.home_page.hero_features
              : []
            return (
              <div
                key={path}
                className={cn(
                  'space-y-2',
                  selectedComponent === path &&
                    'rounded-lg ring-2 ring-slate-900/25 ring-offset-2 ring-offset-white'
                )}
                data-editor-component={path}
                >
                  <label className='text-sm font-medium text-gray-700'>
                    Pill {index + 1}
                  </label>
                  <VisibleOnBadge label='Home Hero Feature Pills' />
                  <p className='text-xs text-slate-500'>
                    This appears inside the small feature pill below the hero buttons.
                  </p>
                  <Input
                  placeholder={
                    ['30 min delivery', 'Premium toppings', 'Fresh oven baked'][index]
                  }
                  value={features[index] || ''}
                  onChange={(e) => {
                    const nextFeatures = [...features]
                    nextFeatures[index] = e.target.value
                    updateField(
                      ['components', 'home_page', 'hero_features'],
                      nextFeatures
                    )
                  }}
                  className='h-12'
                />
              </div>
            )
          })}
        </div>
      </div>

      <div className='mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4'>
        <p className='text-xs font-semibold uppercase tracking-[0.25em] text-amber-700'>
          Offer Banner
        </p>
        <p className='mt-1 text-xs text-amber-800/80'>
          Controls the combo offer section. Leave the background image empty to auto-use the current combo item image.
        </p>
        <div className='mt-4 grid grid-cols-1 gap-4'>
          <div
            className={cn(
              'space-y-2',
              selectedComponent === offerEyebrowPath &&
                'rounded-lg ring-2 ring-slate-900/25 ring-offset-2 ring-offset-white'
            )}
            data-editor-component={offerEyebrowPath}
          >
            <Label>Offer Eyebrow</Label>
            <VisibleOnBadge label='Offer Banner' />
            <p className='text-xs text-slate-500'>
              This appears as the small label above the offer banner.
            </p>
            <Input
              placeholder='combo price'
              value={data.components.home_page.offer_section_eyebrow || ''}
              onChange={(e) =>
                updateField(
                  ['components', 'home_page', 'offer_section_eyebrow'],
                  e.target.value
                )
              }
              className='h-12'
            />
          </div>
          <div
            className={cn(
              'space-y-2',
              selectedComponent === offerButtonPath &&
                'rounded-lg ring-2 ring-slate-900/25 ring-offset-2 ring-offset-white'
            )}
            data-editor-component={offerButtonPath}
          >
            <Label>Offer Button Text</Label>
            <VisibleOnBadge label='Offer Banner Button' />
            <p className='text-xs text-slate-500'>
              This appears on the offer section CTA button.
            </p>
            <Input
              placeholder='Order now'
              value={data.components.home_page.offer_section_button_label || ''}
              onChange={(e) =>
                updateField(
                  ['components', 'home_page', 'offer_section_button_label'],
                  e.target.value
                )
              }
              className='h-12'
            />
          </div>
          <div
            className={cn(
              'space-y-2 md:col-span-2',
              selectedComponent === offerBackgroundImagePath &&
                'rounded-lg ring-2 ring-slate-900/25 ring-offset-2 ring-offset-white'
            )}
            data-editor-component={offerBackgroundImagePath}
          >
            <Label>Manual Background Image URL</Label>
            <VisibleOnBadge label='Offer Banner Background' />
            <p className='text-xs text-slate-500'>
              This replaces the background image used in the offer banner.
            </p>
            <Input
              placeholder='Leave blank for dynamic combo image'
              value={data.components.home_page.offer_section_background_image || ''}
              onChange={(e) =>
                updateField(
                  ['components', 'home_page', 'offer_section_background_image'],
                  e.target.value
                )
              }
              className='h-12'
            />
          </div>
        </div>

        <div className='mt-4 grid grid-cols-1 gap-4'>
          {[
            ['Section Background', 'offer_section_background_color', '#1b1a1f'],
            ['Offer Title Color', 'offer_section_title_color', '#ffca1a'],
            ['Eyebrow Color', 'offer_section_eyebrow_color', '#fffdf8'],
            ['Price Text Color', 'offer_section_price_color', '#ffc222'],
            ['Price Circle Background', 'offer_section_price_background', '#ffffff'],
            ['Button Background', 'offer_section_button_background', '#ffffff'],
            ['Button Text Color', 'offer_section_button_text_color', '#171717'],
          ].map(([label, key, fallback]) => {
            const path = `components.home_page.${key}`
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
                <VisibleOnBadge label='Offer Banner' />
                <p className='text-xs text-slate-500'>
                  This controls the color styling used in the offer banner.
                </p>
                <ColorPreviewChip
                  color={String(data.components.home_page?.[key] || fallback)}
                  label={
                    String(label).toLowerCase().includes('button')
                      ? 'Button preview'
                      : String(label).toLowerCase().includes('text') ||
                          String(label).toLowerCase().includes('title') ||
                          String(label).toLowerCase().includes('eyebrow')
                        ? 'Text preview'
                        : 'Section preview'
                  }
                  variant={
                    String(label).toLowerCase().includes('button')
                      ? 'button'
                      : String(label).toLowerCase().includes('text') ||
                          String(label).toLowerCase().includes('title') ||
                          String(label).toLowerCase().includes('eyebrow')
                        ? 'text'
                        : 'surface'
                  }
                />
                <Input
                  type='color'
                  value={data.components.home_page?.[key] || fallback}
                  onChange={(e) =>
                    updateField(['components', 'home_page', key], e.target.value)
                  }
                  className='h-12'
                />
              </div>
            )
          })}
          <div
            className={cn(
              'space-y-2',
              selectedComponent === 'components.home_page.offer_section_overlay_opacity' &&
                'rounded-lg ring-2 ring-slate-900/25 ring-offset-2 ring-offset-white'
            )}
            data-editor-component='components.home_page.offer_section_overlay_opacity'
          >
            <Label>
              Image Dark Overlay {data.components.home_page.offer_section_overlay_opacity ?? 48}%
            </Label>
            <VisibleOnBadge label='Offer Banner Image Overlay' />
            <p className='text-xs text-slate-500'>
              This controls the strength of the dark overlay on top of the offer image.
            </p>
            <Input
              type='range'
              min={0}
              max={90}
              value={data.components.home_page.offer_section_overlay_opacity ?? 48}
              onChange={(e) =>
                updateField(
                  ['components', 'home_page', 'offer_section_overlay_opacity'],
                  Number(e.target.value)
                )
              }
            />
          </div>
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
        <div className='mt-4 grid grid-cols-1 gap-4'>
          <div className='space-y-2'>
            <Label>Title Color</Label>
            <VisibleOnBadge label='Home Hero' />
            <p className='text-xs text-slate-500'>
              This changes the color of the main hero heading.
            </p>
            <ColorPreviewChip
              color={data.components.home_page.hero_style?.titleColor || '#0f172a'}
              label='Text preview'
              variant='text'
            />
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
            <VisibleOnBadge label='Home Hero' />
            <p className='text-xs text-slate-500'>
              This changes the text color used for the hero subtitle.
            </p>
            <ColorPreviewChip
              color={data.components.home_page.hero_style?.subtitleColor || '#64748b'}
              label='Text preview'
              variant='text'
            />
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
            <Label>Hero Section Background</Label>
            <VisibleOnBadge label='Home Hero Background' />
            <p className='text-xs text-slate-500'>
              This changes the background color for the full hero banner section.
            </p>
            <ColorPreviewChip
              color={data.components.home_page.hero_style?.backgroundColor || '#151418'}
              label='Section preview'
              variant='surface'
            />
            <Input
              type='color'
              value={data.components.home_page.hero_style?.backgroundColor || '#151418'}
              onChange={(e) =>
                updateField(
                  ['components', 'home_page', 'hero_style', 'backgroundColor'],
                  e.target.value
                )
              }
              className='h-12'
            />
          </div>
          <div className='space-y-2'>
            <Label>Primary Button Color</Label>
            <VisibleOnBadge label='Home Hero Primary Button' />
            <p className='text-xs text-slate-500'>
              This changes the background color of the main hero CTA button.
            </p>
            <ColorPreviewChip
              color={data.components.home_page.hero_style?.primaryButtonColor || '#0f172a'}
              label='Button preview'
              variant='button'
            />
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
            <Label>Primary Button Text Color</Label>
            <VisibleOnBadge label='Home Hero Primary Button' />
            <p className='text-xs text-slate-500'>
              This changes the text color used on the main hero CTA button.
            </p>
            <ColorPreviewChip
              color={data.components.home_page.hero_style?.primaryButtonTextColor || '#171717'}
              label='Text preview'
              variant='text'
            />
            <Input
              type='color'
              value={
                data.components.home_page.hero_style?.primaryButtonTextColor || '#171717'
              }
              onChange={(e) =>
                updateField(
                  [
                    'components',
                    'home_page',
                    'hero_style',
                    'primaryButtonTextColor',
                  ],
                  e.target.value
                )
              }
              className='h-12'
            />
          </div>
          <div className='space-y-2'>
            <Label>Secondary Button Color</Label>
            <VisibleOnBadge label='Home Hero Secondary Button' />
            <p className='text-xs text-slate-500'>
              This changes the background color of the secondary hero button.
            </p>
            <ColorPreviewChip
              color={data.components.home_page.hero_style?.secondaryButtonColor || '#e2e8f0'}
              label='Button preview'
              variant='button'
            />
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
            <Label>Secondary Button Text Color</Label>
            <VisibleOnBadge label='Home Hero Secondary Button' />
            <p className='text-xs text-slate-500'>
              This changes the text color used on the secondary hero button.
            </p>
            <ColorPreviewChip
              color={data.components.home_page.hero_style?.secondaryButtonTextColor || '#ffffff'}
              label='Text preview'
              variant='text'
            />
            <Input
              type='color'
              value={
                data.components.home_page.hero_style?.secondaryButtonTextColor || '#ffffff'
              }
              onChange={(e) =>
                updateField(
                  [
                    'components',
                    'home_page',
                    'hero_style',
                    'secondaryButtonTextColor',
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
          <div className='space-y-2'>
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
