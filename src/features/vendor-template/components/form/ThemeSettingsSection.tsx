import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ColorPreviewChip } from './ColorPreviewChip'
import { VisibleOnBadge } from './VisibleOnBadge'

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

        <div className='grid gap-4 xl:grid-cols-3'>
          <div className='space-y-2'>
            <Label>Template Color</Label>
            <VisibleOnBadge label='Multiple Sections' />
            <p className='text-xs text-slate-500'>
              This is the shared accent color used across the template.
            </p>
            <ColorPreviewChip
              color={colorOr(theme.templateColor, '#0f172a')}
              label='Accent preview'
              variant='accent'
            />
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
            <VisibleOnBadge label='Global Banner Surfaces' />
            <p className='text-xs text-slate-500'>
              This affects the shared color used on banner and highlight surfaces.
            </p>
            <ColorPreviewChip
              color={colorOr(theme.bannerColor, '#0f172a')}
              label='Section preview'
              variant='surface'
            />
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
            <VisibleOnBadge label='Entire Website' />
            <p className='text-xs text-slate-500'>
              This changes the overall text scale used across the website.
            </p>
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

        <div className='grid gap-4 xl:grid-cols-2'>
          <div className='space-y-2'>
            <Label>Heading Font</Label>
            <VisibleOnBadge label='All Headings' />
            <p className='text-xs text-slate-500'>
              This font is used for the main headings and section titles.
            </p>
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
            <VisibleOnBadge label='All Paragraphs' />
            <p className='text-xs text-slate-500'>
              This font is used for paragraphs, descriptions, and body text.
            </p>
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

        <div className='grid gap-4 xl:grid-cols-2 2xl:grid-cols-4'>
          <div className='space-y-2'>
            <Label>Body Text Color</Label>
            <VisibleOnBadge label='All Paragraphs' />
            <p className='text-xs text-slate-500'>
              This is the default color for paragraph and description text.
            </p>
            <ColorPreviewChip
              color={colorOr(theme.textColor, '#1f2937')}
              label='Text preview'
              variant='text'
            />
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
            <VisibleOnBadge label='All Headings' />
            <p className='text-xs text-slate-500'>
              This is the default color used for headings and titles.
            </p>
            <ColorPreviewChip
              color={colorOr(theme.headingColor, '#0f172a')}
              label='Text preview'
              variant='text'
            />
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
            <VisibleOnBadge label='Cards and Content Boxes' />
            <p className='text-xs text-slate-500'>
              This is the default background color for cards and content boxes.
            </p>
            <ColorPreviewChip
              color={colorOr(theme.surfaceColor, '#ffffff')}
              label='Section preview'
              variant='surface'
            />
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
            <VisibleOnBadge label='Soft Background Sections' />
            <p className='text-xs text-slate-500'>
              This is used for softer alternate section backgrounds and muted cards.
            </p>
            <ColorPreviewChip
              color={colorOr(theme.surfaceMutedColor, '#f8fafc')}
              label='Section preview'
              variant='surface'
            />
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

        <div className='grid gap-4 xl:grid-cols-2'>
          <div className='space-y-2'>
            <Label>Border Color</Label>
            <VisibleOnBadge label='Cards and Inputs' />
            <p className='text-xs text-slate-500'>
              This controls the border color used for cards, inputs, and section outlines.
            </p>
            <ColorPreviewChip
              color={colorOr(theme.borderColor, '#e2e8f0')}
              label='Accent preview'
              variant='accent'
            />
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
