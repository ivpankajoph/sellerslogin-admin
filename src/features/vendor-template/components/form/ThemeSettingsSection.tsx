import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface ThemeSettingsSectionProps {
  data: any
  updateField: (path: string[], value: any) => void
}

const FONT_OPTIONS = [
  { value: 'Poppins', label: 'Poppins' },
  { value: 'DM Sans', label: 'DM Sans' },
  { value: 'Space Grotesk', label: 'Space Grotesk' },
  { value: 'Inter', label: 'Inter' },
  { value: 'Manrope', label: 'Manrope' },
  { value: 'Playfair Display', label: 'Playfair Display' },
  { value: 'Merriweather', label: 'Merriweather' },
]

export function ThemeSettingsSection({
  data,
  updateField,
}: ThemeSettingsSectionProps) {
  const theme = data?.components?.theme || {}
  const fontScale =
    typeof theme.fontScale === 'number' && Number.isFinite(theme.fontScale)
      ? theme.fontScale
      : 1

  const colorOr = (value: unknown, fallback: string) =>
    typeof value === 'string' && value.trim() ? value : fallback

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
            Apply global colors and typography across all template pages.
          </p>
        </div>

        <div className='grid gap-4 md:grid-cols-3'>
          <div className='space-y-2'>
            <Label>Template Color</Label>
            <Input
              type='color'
              value={colorOr(theme.templateColor, '#0f172a')}
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
              value={colorOr(theme.bannerColor, '#0f172a')}
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
                min='0.8'
                max='1.4'
                step='0.05'
                value={fontScale}
                onChange={(e) =>
                  updateField(
                    ['components', 'theme', 'fontScale'],
                    Number(e.target.value)
                  )
                }
              />
              <span className='text-sm font-semibold text-slate-700'>
                {Number(fontScale).toFixed(2)}x
              </span>
            </div>
          </div>
        </div>

        <div className='grid gap-4 md:grid-cols-2'>
          <div className='space-y-2'>
            <Label>Heading Font</Label>
            <select
              value={theme.headingFont || 'Poppins'}
              onChange={(e) =>
                updateField(['components', 'theme', 'headingFont'], e.target.value)
              }
              className='h-12 w-full rounded-md border border-slate-200 px-3 text-sm text-slate-800'
            >
              {FONT_OPTIONS.map((font) => (
                <option key={font.value} value={font.value}>
                  {font.label}
                </option>
              ))}
            </select>
          </div>
          <div className='space-y-2'>
            <Label>Body Font</Label>
            <select
              value={theme.bodyFont || 'Poppins'}
              onChange={(e) =>
                updateField(['components', 'theme', 'bodyFont'], e.target.value)
              }
              className='h-12 w-full rounded-md border border-slate-200 px-3 text-sm text-slate-800'
            >
              {FONT_OPTIONS.map((font) => (
                <option key={font.value} value={font.value}>
                  {font.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className='grid gap-4 md:grid-cols-4'>
          <div className='space-y-2'>
            <Label>Body Text Color</Label>
            <Input
              type='color'
              value={colorOr(theme.textColor, '#1f2937')}
              onChange={(e) =>
                updateField(['components', 'theme', 'textColor'], e.target.value)
              }
              className='h-12 w-full cursor-pointer'
            />
          </div>
          <div className='space-y-2'>
            <Label>Heading Color</Label>
            <Input
              type='color'
              value={colorOr(theme.headingColor, '#0f172a')}
              onChange={(e) =>
                updateField(['components', 'theme', 'headingColor'], e.target.value)
              }
              className='h-12 w-full cursor-pointer'
            />
          </div>
          <div className='space-y-2'>
            <Label>Surface Color</Label>
            <Input
              type='color'
              value={colorOr(theme.surfaceColor, '#ffffff')}
              onChange={(e) =>
                updateField(['components', 'theme', 'surfaceColor'], e.target.value)
              }
              className='h-12 w-full cursor-pointer'
            />
          </div>
          <div className='space-y-2'>
            <Label>Muted Surface Color</Label>
            <Input
              type='color'
              value={colorOr(theme.surfaceMutedColor, '#f8fafc')}
              onChange={(e) =>
                updateField(
                  ['components', 'theme', 'surfaceMutedColor'],
                  e.target.value
                )
              }
              className='h-12 w-full cursor-pointer'
            />
          </div>
        </div>

        <div className='grid gap-4 md:grid-cols-2'>
          <div className='space-y-2'>
            <Label>Border Color</Label>
            <Input
              type='color'
              value={colorOr(theme.borderColor, '#e2e8f0')}
              onChange={(e) =>
                updateField(['components', 'theme', 'borderColor'], e.target.value)
              }
              className='h-12 w-full cursor-pointer'
            />
          </div>
        </div>
      </div>
    </div>
  )
}
