import { ImageIcon, Upload } from 'lucide-react'
import { ImageInput } from './ImageInput'
import { cn } from '@/lib/utils'
import { VisibleOnBadge } from './VisibleOnBadge'

interface Type {
  data: any
  handleImageChange: any
  uploadingPaths: any
  updateField?: any
  selectedComponent?: string | null
}
export function BasicInfoSection({
  data,
  handleImageChange,
  uploadingPaths,
  updateField,
  selectedComponent,
}: Type) {
  const bannerPath = 'components.home_page.backgroundImage'
  const logoPath = 'components.logo'
  const isUploadingBanner = uploadingPaths.has(
    bannerPath
  )
  const isUploadingLogo = uploadingPaths.has(logoPath)

  return (
    <div className='space-y-5'>
      <div>
        <p className='text-xs font-semibold uppercase tracking-[0.3em] text-slate-400'>
          Logo & Banner
        </p>
        <h3 className='mt-1 text-lg font-semibold text-slate-900'>
          Change website images
        </h3>
        <p className='mt-1 text-sm text-slate-500'>
          Logo appears in the top menu. Banner image is the large first image behind the home page headline.
        </p>
      </div>

      <div className='grid grid-cols-1 gap-4'>
      <div
        className={cn(
          'rounded-2xl border border-slate-200 bg-white p-5',
          selectedComponent === bannerPath &&
            'ring-2 ring-slate-900/25 ring-offset-2 ring-offset-white'
        )}
        data-editor-component={bannerPath}
      >
        <div className='mb-4 flex items-start gap-3 rounded-xl bg-amber-50 p-3 text-amber-900'>
          <ImageIcon className='mt-0.5 h-5 w-5 shrink-0' />
          <div>
            <p className='text-sm font-semibold'>Home page banner image</p>
            <p className='text-xs text-amber-800/80'>
              Use a wide food/product image. This is the big visual area visible in the preview.
            </p>
          </div>
        </div>
        <ImageInput
          label='Upload banner image'
          name='backgroundImage'
          value={data.components.home_page.backgroundImage}
          onChange={(file) =>
            handleImageChange(
              ['components', 'home_page', 'backgroundImage'],
              file
            )
          }
          isFileInput={true}
          dimensions='1920 x 1080'
          helperText='Recommended: landscape image, clear center area for text.'
        />
        {isUploadingBanner && (
          <p className='mt-1 flex items-center text-sm text-gray-600'>
            <Upload className='mr-2 h-4 w-4 animate-pulse' /> Uploading
            banner...
          </p>
        )}
        {updateField ? (
          <div className='mt-5 space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4'>
            <div className='space-y-2'>
              <label className='text-sm font-medium text-slate-700'>
                Banner image zoom {data.components.home_page.hero_style?.bannerZoom || 100}%
              </label>
              <VisibleOnBadge label='Home Hero Background' />
              <p className='text-xs text-slate-500'>
                This controls how zoomed in the hero background image appears.
              </p>
              <input
                type='range'
                min={80}
                max={160}
                value={data.components.home_page.hero_style?.bannerZoom || 100}
                onChange={(event) =>
                  updateField(
                    ['components', 'home_page', 'hero_style', 'bannerZoom'],
                    Number(event.target.value)
                  )
                }
                className='w-full'
              />
            </div>
            <div className='space-y-2'>
              <label className='text-sm font-medium text-slate-700'>
                Banner position {data.components.home_page.hero_style?.bannerPosition || 50}%
              </label>
              <VisibleOnBadge label='Home Hero Background' />
              <p className='text-xs text-slate-500'>
                This moves the hero image left or right to keep the best area in view.
              </p>
              <input
                type='range'
                min={0}
                max={100}
                value={data.components.home_page.hero_style?.bannerPosition || 50}
                onChange={(event) =>
                  updateField(
                    ['components', 'home_page', 'hero_style', 'bannerPosition'],
                    Number(event.target.value)
                  )
                }
                className='w-full'
              />
            </div>
          </div>
        ) : null}
      </div>

      <div
        className={cn(
          'rounded-2xl border border-slate-200 bg-white p-5',
          selectedComponent === logoPath &&
            'ring-2 ring-slate-900/25 ring-offset-2 ring-offset-white'
        )}
        data-editor-component={logoPath}
      >
        <div className='mb-4 flex items-start gap-3 rounded-xl bg-slate-50 p-3 text-slate-800'>
          <ImageIcon className='mt-0.5 h-5 w-5 shrink-0' />
          <div>
            <p className='text-sm font-semibold'>Website logo</p>
            <p className='text-xs text-slate-500'>
              This logo appears in the header and footer wherever the template supports it.
            </p>
          </div>
        </div>
        <ImageInput
          label='Upload logo'
          name='logo'
          value={data.components.logo}
          onChange={(file) => handleImageChange(['components', 'logo'], file)}
          isFileInput={true}
          dimensions='600 x 600'
          helperText='Recommended: square PNG/JPG with transparent or clean background.'
        />
        {isUploadingLogo && (
          <p className='mt-1 flex items-center text-sm text-gray-600'>
            <Upload className='mr-2 h-4 w-4 animate-pulse' /> Uploading logo...
          </p>
        )}
        {updateField ? (
          <div className='mt-5 space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-4'>
            <label className='text-sm font-medium text-slate-700'>
              Logo size {data.components.theme?.logoSize || 48}px
            </label>
            <VisibleOnBadge label='Header Logo' />
            <p className='text-xs text-slate-500'>
              This changes the size of the logo shown in the header.
            </p>
            <input
              type='range'
              min={32}
              max={96}
              value={data.components.theme?.logoSize || 48}
              onChange={(event) =>
                updateField(
                  ['components', 'theme', 'logoSize'],
                  Number(event.target.value)
                )
              }
              className='w-full'
            />
          </div>
        ) : null}
      </div>
      </div>
    </div>
  )
}
