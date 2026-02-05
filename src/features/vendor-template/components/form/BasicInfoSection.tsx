import { Upload } from 'lucide-react'
import { ImageInput } from './ImageInput'

interface Type {
  data: any
  handleImageChange: any
  uploadingPaths: any
}
export function BasicInfoSection({
  data,
  handleImageChange,
  uploadingPaths,
}: Type) {
  const isUploadingBanner = uploadingPaths.has(
    'components.home_page.backgroundImage'
  )
  const isUploadingLogo = uploadingPaths.has('components.logo')

  return (
    <div className='grid grid-cols-1 gap-6 md:grid-cols-2'>
      <div className='rounded-xl border bg-white p-5'>
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

      <div className='rounded-xl border bg-white p-5'>
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
