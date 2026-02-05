import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface ThemeSettingsSectionProps {
  data: any
  updateField: (path: string[], value: any) => void
}

export function ThemeSettingsSection({
  data,
  updateField,
}: ThemeSettingsSectionProps) {
  const theme = data.components.theme

  return (
    <div className='rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm'>
      <div className='space-y-4'>
        <div>
          <p className='text-xs font-semibold uppercase tracking-[0.3em] text-slate-400'>
            Theme
          </p>
          <h3 className='text-lg font-semibold text-slate-900'>
            Colors and typography
          </h3>
          <p className='text-sm text-slate-600'>
            Apply brand colors and font size across all template pages.
          </p>
        </div>

        <div className='grid gap-4 md:grid-cols-3'>
          <div className='space-y-2'>
            <Label>Template Color</Label>
            <Input
              type='color'
              value={theme.templateColor}
              onChange={(e) =>
                updateField(
                  ['components', 'theme', 'templateColor'],
                  e.target.value
                )
              }
              className='h-12 w-full cursor-pointer'
            />
          </div>
          <div className='space-y-2'>
            <Label>Banner Color</Label>
            <Input
              type='color'
              value={theme.bannerColor}
              onChange={(e) =>
                updateField(
                  ['components', 'theme', 'bannerColor'],
                  e.target.value
                )
              }
              className='h-12 w-full cursor-pointer'
            />
          </div>
          <div className='space-y-2'>
            <Label>Font Size</Label>
            <div className='flex items-center gap-3'>
              <Input
                type='range'
                min='0.85'
                max='1.4'
                step='0.05'
                value={theme.fontScale}
                onChange={(e) =>
                  updateField(
                    ['components', 'theme', 'fontScale'],
                    Number(e.target.value)
                  )
                }
              />
              <span className='text-sm font-semibold text-slate-700'>
                {Number(theme.fontScale).toFixed(2)}x
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
