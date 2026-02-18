import { Upload } from 'lucide-react'
import { ImageInput } from './ImageInput'
import { cn } from '@/lib/utils'

interface Type {
  data: any
  handleImageChange: any
  uploadingPaths: any
  selectedComponent?: string | null
}
export function BasicInfoSection({
  data,
  handleImageChange,
  uploadingPaths,
  selectedComponent,
}: Type) {
  const bannerPath = 'components.home_page.backgroundImage'
  const logoPath = 'components.logo'
  const isUploadingBanner = uploadingPaths.has(
    bannerPath
  )
  const isUploadingLogo = uploadingPaths.has(logoPath)

  return (
    <div className='grid grid-cols-1 gap-6 md:grid-cols-2'>
      <div
        className={cn(
          'rounded-xl border bg-white p-5',
          selectedComponent === bannerPath &&
            'ring-2 ring-slate-900/25 ring-offset-2 ring-offset-white'
        )}
        data-editor-component={bannerPath}
      >
        <ImageInput
          label='Banner Image'
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
        />
        {isUploadingBanner && (
          <p className='mt-1 flex items-center text-sm text-gray-600'>
            <Upload className='mr-2 h-4 w-4 animate-pulse' /> Uploading
            banner...
          </p>
        )}
      </div>

      <div
        className={cn(
          'rounded-xl border bg-white p-5',
          selectedComponent === logoPath &&
            'ring-2 ring-slate-900/25 ring-offset-2 ring-offset-white'
        )}
        data-editor-component={logoPath}
      >
        <ImageInput
          label='Company Logo'
          name='logo'
          value={data.components.logo}
          onChange={(file) => handleImageChange(['components', 'logo'], file)}
          isFileInput={true}
          dimensions='600 x 600'
        />
        {isUploadingLogo && (
          <p className='mt-1 flex items-center text-sm text-gray-600'>
            <Upload className='mr-2 h-4 w-4 animate-pulse' /> Uploading logo...
          </p>
        )}
      </div>
    </div>
  )
}
