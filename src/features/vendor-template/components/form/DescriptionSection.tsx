import { Shield } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

interface Type {
  data: any
  updateField: any
  selectedComponent?: string | null
}
export function DescriptionSection({ data, updateField, selectedComponent }: Type) {
  const desc = data.components.home_page.description
  const largeTextPath = 'components.home_page.description.large_text'
  const summaryPath = 'components.home_page.description.summary'
  const percentNumberPath = 'components.home_page.description.percent.percent_in_number'
  const percentTextPath = 'components.home_page.description.percent.percent_text'
  const soldNumberPath = 'components.home_page.description.sold.sold_number'
  const soldTextPath = 'components.home_page.description.sold.sold_text'

  return (
    <div className='rounded-xl border bg-white p-5 shadow-sm'>
      <h2 className='mb-4 flex items-center border-b pb-2 text-xl font-semibold text-gray-800'>
        <div className='mr-3 rounded-lg bg-purple-100 p-2'>
          <Shield className='h-5 w-5 text-purple-600' />
        </div>
        Description Section
      </h2>

      <div className='space-y-4'>
        <div
          className={cn(
            'space-y-2',
            selectedComponent === largeTextPath &&
              'rounded-lg ring-2 ring-slate-900/25 ring-offset-2 ring-offset-white'
          )}
          data-editor-component={largeTextPath}
        >
          <label className='text-sm font-medium text-gray-700'>
            Large Description
          </label>
          <Textarea
            placeholder='Enter detailed description'
            value={desc.large_text}
            onChange={(e) =>
              updateField(
                ['components', 'home_page', 'description', 'large_text'],
                e.target.value
              )
            }
            className='min-h-[120px]'
          />
        </div>

        <div
          className={cn(
            'space-y-2',
            selectedComponent === summaryPath &&
              'rounded-lg ring-2 ring-slate-900/25 ring-offset-2 ring-offset-white'
          )}
          data-editor-component={summaryPath}
        >
          <label className='text-sm font-medium text-gray-700'>Summary</label>
          <Textarea
            placeholder='Enter summary'
            value={desc.summary}
            onChange={(e) =>
              updateField(
                ['components', 'home_page', 'description', 'summary'],
                e.target.value
              )
            }
            className='min-h-[100px]'
          />
        </div>

        <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
          <div
            className={cn(
              'space-y-2',
              selectedComponent === percentNumberPath &&
                'rounded-lg ring-2 ring-slate-900/25 ring-offset-2 ring-offset-white'
            )}
            data-editor-component={percentNumberPath}
          >
            <label className='text-sm font-medium text-gray-700'>Percent</label>
            <Input
              placeholder='e.g. 90'
              value={desc.percent.percent_in_number}
              onChange={(e) =>
                updateField(
                  [
                    'components',
                    'home_page',
                    'description',
                    'percent',
                    'percent_in_number',
                  ],
                  e.target.value
                )
              }
              className='h-12'
            />
          </div>

          <div
            className={cn(
              'space-y-2',
              selectedComponent === percentTextPath &&
                'rounded-lg ring-2 ring-slate-900/25 ring-offset-2 ring-offset-white'
            )}
            data-editor-component={percentTextPath}
          >
            <label className='text-sm font-medium text-gray-700'>
              Percent Label
            </label>
            <Input
              placeholder='Percent text'
              value={desc.percent.percent_text}
              onChange={(e) =>
                updateField(
                  [
                    'components',
                    'home_page',
                    'description',
                    'percent',
                    'percent_text',
                  ],
                  e.target.value
                )
              }
              className='h-12'
            />
          </div>
        </div>

        <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
          <div
            className={cn(
              'space-y-2',
              selectedComponent === soldNumberPath &&
                'rounded-lg ring-2 ring-slate-900/25 ring-offset-2 ring-offset-white'
            )}
            data-editor-component={soldNumberPath}
          >
            <label className='text-sm font-medium text-gray-700'>
              Sold Number
            </label>
            <Input
              placeholder='Sold number'
              value={desc.sold.sold_number}
              onChange={(e) =>
                updateField(
                  [
                    'components',
                    'home_page',
                    'description',
                    'sold',
                    'sold_number',
                  ],
                  e.target.value
                )
              }
              className='h-12'
            />
          </div>

          <div
            className={cn(
              'space-y-2',
              selectedComponent === soldTextPath &&
                'rounded-lg ring-2 ring-slate-900/25 ring-offset-2 ring-offset-white'
            )}
            data-editor-component={soldTextPath}
          >
            <label className='text-sm font-medium text-gray-700'>
              Sold Label
            </label>
            <Input
              placeholder='Sold text'
              value={desc.sold.sold_text}
              onChange={(e) =>
                updateField(
                  [
                    'components',
                    'home_page',
                    'description',
                    'sold',
                    'sold_text',
                  ],
                  e.target.value
                )
              }
              className='h-12'
            />
          </div>
        </div>
      </div>
    </div>
  )
}
