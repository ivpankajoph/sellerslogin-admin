import { Zap } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface Type {
  data: any
  updateField: any
  selectedComponent?: string | null
}
export function HeroSection({ data, updateField }: Type) {
  return (
    <div className='rounded-xl border bg-white p-5 shadow-sm'>
      <h2 className='mb-4 flex items-center border-b pb-2 text-xl font-semibold text-gray-800'>
        <div className='mr-3 rounded-lg bg-indigo-100 p-2'>
          <Zap className='h-5 w-5 text-indigo-600' />
        </div>
        Hero Section
      </h2>

      <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
        <div className='space-y-2'>
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

        <div className='space-y-2'>
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

        <div className='space-y-2'>
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
        <div className='space-y-2'>
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
        <div className='space-y-2'>
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
        <div className='space-y-2'>
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
      </div>

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
