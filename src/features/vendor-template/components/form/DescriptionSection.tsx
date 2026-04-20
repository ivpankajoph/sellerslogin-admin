import { Shield, Upload } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { ImageInput } from './ImageInput'

interface Type {
  data: any
  updateField: any
  handleImageChange: any
  uploadingPaths: any
  selectedComponent?: string | null
}
export function DescriptionSection({
  data,
  updateField,
  handleImageChange,
  uploadingPaths,
  selectedComponent,
}: Type) {
  const desc = data.components.home_page.description
  const benefits = data.components.home_page.benefits || {}
  const advantage = data.components.home_page.advantage || {}
  const largeTextPath = 'components.home_page.description.large_text'
  const summaryPath = 'components.home_page.description.summary'
  const percentNumberPath = 'components.home_page.description.percent.percent_in_number'
  const percentTextPath = 'components.home_page.description.percent.percent_text'
  const soldNumberPath = 'components.home_page.description.sold.sold_number'
  const soldTextPath = 'components.home_page.description.sold.sold_text'
  const benefitKickerPath = 'components.home_page.benefits.kicker'
  const benefitHeadingPath = 'components.home_page.benefits.heading'
  const benefitSubtitlePath = 'components.home_page.benefits.subtitle'
  const advantageKickerPath = 'components.home_page.advantage.kicker'
  const advantageHeadingPath = 'components.home_page.advantage.heading'
  const advantageSubtitlePath = 'components.home_page.advantage.subtitle'
  const advantageCtaPath = 'components.home_page.advantage.ctaLabel'
  const advantageTopTagPath = 'components.home_page.advantage.topTag'
  const advantageImagePath = 'components.home_page.advantage.image'
  const advantageBadgeValuePath = 'components.home_page.advantage.badgeValue'
  const advantageBadgeLabelPath = 'components.home_page.advantage.badgeLabel'
  const advantageVisualCardTitlePath = 'components.home_page.advantage.visualCardTitle'
  const advantageVisualCardImagePath = 'components.home_page.advantage.visualCardImage'
  const advantagePromiseLabelPath = 'components.home_page.advantage.promiseLabel'
  const advantagePromiseTextPath = 'components.home_page.advantage.promiseText'
  const advantagePremiumLabelPath = 'components.home_page.advantage.premiumLabel'
  const advantagePremiumImageOnePath = 'components.home_page.advantage.premiumImageOne'
  const advantagePremiumImageTwoPath = 'components.home_page.advantage.premiumImageTwo'
  const advantageAccentColorPath = 'components.home_page.advantage.accentColor'
  const advantageGlowColorPath = 'components.home_page.advantage.glowColor'
  const industryKickerPath = 'components.home_page.industries.kicker'
  const industryHeadingPath = 'components.home_page.industries.heading'
  const industrySubtitlePath = 'components.home_page.industries.subtitle'
  const isUploadingAdvantageImage = uploadingPaths.has(advantageImagePath)
  const isUploadingAdvantageVisualCardImage = uploadingPaths.has(advantageVisualCardImagePath)
  const isUploadingAdvantagePremiumImageOne = uploadingPaths.has(advantagePremiumImageOnePath)
  const isUploadingAdvantagePremiumImageTwo = uploadingPaths.has(advantagePremiumImageTwoPath)
  const heroStats = Array.from({ length: 4 }, (_, index) => {
    const stats = Array.isArray(data.components.home_page.heroStats)
      ? data.components.home_page.heroStats
      : []
    const current = stats[index] || {}
    return {
      value: current?.value || '',
      label: current?.label || '',
    }
  })
  const industries = data.components.home_page.industries || {}
  const industryItems = Array.from({ length: 4 }, (_, index) => {
    const items = Array.isArray(industries.items) ? industries.items : []
    const current = items[index] || {}
    return {
      title: current?.title || '',
      description: current?.description || '',
    }
  })

  const benefitCards = Array.from({ length: 4 }, (_, index) => {
    const cards = Array.isArray(benefits.cards) ? benefits.cards : []
    const current = cards[index] || {}

    return {
      title: current?.title || '',
      description: current?.description || '',
    }
  })

  const advantageCards = Array.from({ length: 3 }, (_, index) => {
    const cards = Array.isArray(advantage.cards) ? advantage.cards : []
    const current = cards[index] || {}
    return {
      title: current?.title || '',
      description: current?.description || '',
    }
  })

  const advantageHighlights = Array.from({ length: 2 }, (_, index) => {
    const highlights = Array.isArray(advantage.highlights)
      ? advantage.highlights
      : []
    const current = highlights[index] || {}
    return {
      value: current?.value || '',
      label: current?.label || '',
    }
  })

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

      <div className='mt-8 rounded-2xl border border-slate-200 bg-slate-50/70 p-4'>
        <h3 className='text-base font-semibold text-slate-900'>
          Hero Stats (Poupqz Home)
        </h3>
        <p className='mt-1 text-xs text-slate-500'>
          Controls the four stat cards shown below the hero banner.
        </p>

        <div className='mt-4 grid gap-4 lg:grid-cols-2'>
          {heroStats.map((stat, index) => {
            const valuePath = `components.home_page.heroStats.${index}.value`
            const labelPath = `components.home_page.heroStats.${index}.label`
            return (
              <div
                key={`hero-stat-${index}`}
                className='rounded-xl border border-slate-200 bg-white p-3'
              >
                <p className='text-xs font-semibold uppercase tracking-[0.2em] text-slate-500'>
                  Stat {index + 1}
                </p>
                <div
                  className={cn(
                    'mt-2 space-y-2',
                    selectedComponent === valuePath &&
                      'rounded-lg ring-2 ring-slate-900/25 ring-offset-2 ring-offset-white'
                  )}
                  data-editor-component={valuePath}
                >
                  <label className='text-sm font-medium text-gray-700'>Value</label>
                  <Input
                    placeholder='500+'
                    value={stat.value}
                    onChange={(e) =>
                      updateField(
                        ['components', 'home_page', 'heroStats', `${index}`, 'value'],
                        e.target.value
                      )
                    }
                    className='h-11'
                  />
                </div>
                <div
                  className={cn(
                    'mt-3 space-y-2',
                    selectedComponent === labelPath &&
                      'rounded-lg ring-2 ring-slate-900/25 ring-offset-2 ring-offset-white'
                  )}
                  data-editor-component={labelPath}
                >
                  <label className='text-sm font-medium text-gray-700'>Label</label>
                  <Input
                    placeholder='Project Delivered'
                    value={stat.label}
                    onChange={(e) =>
                      updateField(
                        ['components', 'home_page', 'heroStats', `${index}`, 'label'],
                        e.target.value
                      )
                    }
                    className='h-11'
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className='mt-8 rounded-2xl border border-slate-200 bg-slate-50/70 p-4'>
        <h3 className='text-base font-semibold text-slate-900'>
          Services Section (Home)
        </h3>
        <p className='mt-1 text-xs text-slate-500'>
          Controls the services/why choose us block on the live home page.
        </p>

        <div className='mt-4 grid gap-4 md:grid-cols-2'>
          <div
            className={cn(
              'space-y-2',
              selectedComponent === benefitKickerPath &&
                'rounded-lg ring-2 ring-slate-900/25 ring-offset-2 ring-offset-white'
            )}
            data-editor-component={benefitKickerPath}
          >
            <label className='text-sm font-medium text-gray-700'>
              Services Kicker
            </label>
            <Input
              placeholder='Benefits'
              value={benefits?.kicker || ''}
              onChange={(e) =>
                updateField(
                  ['components', 'home_page', 'benefits', 'kicker'],
                  e.target.value
                )
              }
              className='h-12'
            />
          </div>

          <div
            className={cn(
              'space-y-2',
              selectedComponent === benefitHeadingPath &&
                'rounded-lg ring-2 ring-slate-900/25 ring-offset-2 ring-offset-white'
            )}
            data-editor-component={benefitHeadingPath}
          >
            <label className='text-sm font-medium text-gray-700'>
              Services Heading
            </label>
            <Input
              placeholder='Why Our Storage Solutions Stand Apart'
              value={benefits?.heading || ''}
              onChange={(e) =>
                updateField(
                  ['components', 'home_page', 'benefits', 'heading'],
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
            selectedComponent === benefitSubtitlePath &&
              'rounded-lg ring-2 ring-slate-900/25 ring-offset-2 ring-offset-white'
          )}
          data-editor-component={benefitSubtitlePath}
        >
          <label className='text-sm font-medium text-gray-700'>
            Services Subtitle
          </label>
          <Textarea
            placeholder='Trusted advantages that enhance your storage management and operational efficiency'
            value={benefits?.subtitle || ''}
            onChange={(e) =>
              updateField(
                ['components', 'home_page', 'benefits', 'subtitle'],
                e.target.value
              )
            }
            className='min-h-[96px]'
          />
        </div>

        <div className='mt-4 grid gap-4 lg:grid-cols-3'>
          {benefitCards.map((card, index) => {
            const titlePath = `components.home_page.benefits.cards.${index}.title`
            const descriptionPath = `components.home_page.benefits.cards.${index}.description`
            return (
              <div
                key={`benefit-card-${index}`}
                className='rounded-xl border border-slate-200 bg-white p-3'
              >
                <p className='text-xs font-semibold uppercase tracking-[0.2em] text-slate-500'>
                  Card {index + 1}
                </p>
                <div
                  className={cn(
                    'mt-2 space-y-2',
                    selectedComponent === titlePath &&
                      'rounded-lg ring-2 ring-slate-900/25 ring-offset-2 ring-offset-white'
                  )}
                  data-editor-component={titlePath}
                >
                  <label className='text-sm font-medium text-gray-700'>Title</label>
                  <Input
                    placeholder='Card title'
                    value={card.title}
                    onChange={(e) =>
                      updateField(
                        ['components', 'home_page', 'benefits', 'cards', `${index}`, 'title'],
                        e.target.value
                      )
                    }
                    className='h-11'
                  />
                </div>
                <div
                  className={cn(
                    'mt-3 space-y-2',
                    selectedComponent === descriptionPath &&
                      'rounded-lg ring-2 ring-slate-900/25 ring-offset-2 ring-offset-white'
                  )}
                  data-editor-component={descriptionPath}
                >
                  <label className='text-sm font-medium text-gray-700'>
                    Description
                  </label>
                  <Textarea
                    placeholder='Card description'
                    value={card.description}
                    onChange={(e) =>
                      updateField(
                        [
                          'components',
                          'home_page',
                          'benefits',
                          'cards',
                          `${index}`,
                          'description',
                        ],
                        e.target.value
                      )
                    }
                    className='min-h-[90px]'
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className='mt-8 rounded-2xl border border-slate-200 bg-slate-50/70 p-4'>
        <h3 className='text-base font-semibold text-slate-900'>
          Industries Section (Poupqz Home)
        </h3>
        <p className='mt-1 text-xs text-slate-500'>
          Controls the "Strategic Sectors" heading and the 4 industry cards.
        </p>

        <div className='mt-4 grid gap-4 md:grid-cols-2'>
          <div
            className={cn(
              'space-y-2',
              selectedComponent === industryKickerPath &&
                'rounded-lg ring-2 ring-slate-900/25 ring-offset-2 ring-offset-white'
            )}
            data-editor-component={industryKickerPath}
          >
            <label className='text-sm font-medium text-gray-700'>
              Industries Kicker
            </label>
            <Input
              placeholder='Strategic Sectors'
              value={industries?.kicker || ''}
              onChange={(e) =>
                updateField(
                  ['components', 'home_page', 'industries', 'kicker'],
                  e.target.value
                )
              }
              className='h-12'
            />
          </div>
          <div
            className={cn(
              'space-y-2',
              selectedComponent === industryHeadingPath &&
                'rounded-lg ring-2 ring-slate-900/25 ring-offset-2 ring-offset-white'
            )}
            data-editor-component={industryHeadingPath}
          >
            <label className='text-sm font-medium text-gray-700'>
              Industries Heading
            </label>
            <Input
              placeholder='Industries We Deal With'
              value={industries?.heading || ''}
              onChange={(e) =>
                updateField(
                  ['components', 'home_page', 'industries', 'heading'],
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
            selectedComponent === industrySubtitlePath &&
              'rounded-lg ring-2 ring-slate-900/25 ring-offset-2 ring-offset-white'
          )}
          data-editor-component={industrySubtitlePath}
        >
          <label className='text-sm font-medium text-gray-700'>
            Industries Subtitle
          </label>
          <Textarea
            placeholder='Our advanced and reliable storage solutions are designed to meet the needs of industries across India.'
            value={industries?.subtitle || ''}
            onChange={(e) =>
              updateField(
                ['components', 'home_page', 'industries', 'subtitle'],
                e.target.value
              )
            }
            className='min-h-[92px]'
          />
        </div>

        <div className='mt-4 grid gap-4 lg:grid-cols-2'>
          {industryItems.map((item, index) => {
            const titlePath = `components.home_page.industries.items.${index}.title`
            const descriptionPath = `components.home_page.industries.items.${index}.description`
            return (
              <div
                key={`industry-item-${index}`}
                className='rounded-xl border border-slate-200 bg-white p-3'
              >
                <p className='text-xs font-semibold uppercase tracking-[0.2em] text-slate-500'>
                  Industry {index + 1}
                </p>
                <div
                  className={cn(
                    'mt-2 space-y-2',
                    selectedComponent === titlePath &&
                      'rounded-lg ring-2 ring-slate-900/25 ring-offset-2 ring-offset-white'
                  )}
                  data-editor-component={titlePath}
                >
                  <label className='text-sm font-medium text-gray-700'>Title</label>
                  <Input
                    placeholder='Warehousing'
                    value={item.title}
                    onChange={(e) =>
                      updateField(
                        ['components', 'home_page', 'industries', 'items', `${index}`, 'title'],
                        e.target.value
                      )
                    }
                    className='h-11'
                  />
                </div>
                <div
                  className={cn(
                    'mt-3 space-y-2',
                    selectedComponent === descriptionPath &&
                      'rounded-lg ring-2 ring-slate-900/25 ring-offset-2 ring-offset-white'
                  )}
                  data-editor-component={descriptionPath}
                >
                  <label className='text-sm font-medium text-gray-700'>
                    Description
                  </label>
                  <Textarea
                    placeholder='Describe this industry use case'
                    value={item.description}
                    onChange={(e) =>
                      updateField(
                        [
                          'components',
                          'home_page',
                          'industries',
                          'items',
                          `${index}`,
                          'description',
                        ],
                        e.target.value
                      )
                    }
                    className='min-h-[90px]'
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className='mt-8 rounded-2xl border border-slate-200 bg-slate-50/70 p-4'>
        <h3 className='text-base font-semibold text-slate-900'>
          Advantage Section (Home)
        </h3>
        <p className='mt-1 text-xs text-slate-500'>
          Controls the "Why Choose Us" block including image, list items, stats,
          and button text.
        </p>

        <div className='mt-4 grid gap-4 md:grid-cols-2'>
          <div
            className={cn(
              'space-y-2',
              selectedComponent === advantageKickerPath &&
                'rounded-lg ring-2 ring-slate-900/25 ring-offset-2 ring-offset-white'
            )}
            data-editor-component={advantageKickerPath}
          >
            <label className='text-sm font-medium text-gray-700'>
              Advantage Kicker
            </label>
            <Input
              placeholder='Why Choose Us'
              value={advantage?.kicker || ''}
              onChange={(e) =>
                updateField(
                  ['components', 'home_page', 'advantage', 'kicker'],
                  e.target.value
                )
              }
              className='h-12'
            />
          </div>

          <div
            className={cn(
              'space-y-2',
              selectedComponent === advantageHeadingPath &&
                'rounded-lg ring-2 ring-slate-900/25 ring-offset-2 ring-offset-white'
            )}
            data-editor-component={advantageHeadingPath}
          >
            <label className='text-sm font-medium text-gray-700'>
              Advantage Heading
            </label>
            <Input
              placeholder='The Pankaj Advantage'
              value={advantage?.heading || ''}
              onChange={(e) =>
                updateField(
                  ['components', 'home_page', 'advantage', 'heading'],
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
            selectedComponent === advantageSubtitlePath &&
              'rounded-lg ring-2 ring-slate-900/25 ring-offset-2 ring-offset-white'
          )}
          data-editor-component={advantageSubtitlePath}
        >
          <label className='text-sm font-medium text-gray-700'>
            Advantage Subtitle
          </label>
          <Textarea
            placeholder='Tell visitors why your service stands out.'
            value={advantage?.subtitle || ''}
            onChange={(e) =>
              updateField(
                ['components', 'home_page', 'advantage', 'subtitle'],
                e.target.value
              )
            }
            className='min-h-[92px]'
          />
        </div>

        <div className='mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
          <div
            className={cn(
              'space-y-2',
              selectedComponent === advantageCtaPath &&
                'rounded-lg ring-2 ring-slate-900/25 ring-offset-2 ring-offset-white'
            )}
            data-editor-component={advantageCtaPath}
          >
            <label className='text-sm font-medium text-gray-700'>
              CTA Button Text
            </label>
            <Input
              placeholder='Schedule Consultation'
              value={advantage?.ctaLabel || ''}
              onChange={(e) =>
                updateField(
                  ['components', 'home_page', 'advantage', 'ctaLabel'],
                  e.target.value
                )
              }
              className='h-12'
            />
          </div>

          <div
            className={cn(
              'space-y-2',
              selectedComponent === advantageTopTagPath &&
                'rounded-lg ring-2 ring-slate-900/25 ring-offset-2 ring-offset-white'
            )}
            data-editor-component={advantageTopTagPath}
          >
            <label className='text-sm font-medium text-gray-700'>
              Top Tag Text
            </label>
            <Input
              placeholder='Premium Service'
              value={advantage?.topTag || ''}
              onChange={(e) =>
                updateField(
                  ['components', 'home_page', 'advantage', 'topTag'],
                  e.target.value
                )
              }
              className='h-12'
            />
          </div>

          <div className='rounded-xl border border-slate-200 bg-white p-3'>
            <div
              className={cn(
                'space-y-2',
                selectedComponent === advantageImagePath &&
                  'rounded-lg ring-2 ring-slate-900/25 ring-offset-2 ring-offset-white'
              )}
              data-editor-component={advantageImagePath}
            >
              <ImageInput
                label='Advantage Image'
                name='advantageImage'
                value={advantage?.image || ''}
                onChange={(file) =>
                  handleImageChange(
                    ['components', 'home_page', 'advantage', 'image'],
                    file
                  )
                }
                isFileInput={true}
                dimensions='1200 x 1400'
              />
              {isUploadingAdvantageImage ? (
                <p className='mt-1 flex items-center text-sm text-gray-600'>
                  <Upload className='mr-2 h-4 w-4 animate-pulse' />
                  Uploading advantage image...
                </p>
              ) : null}
            </div>
          </div>
        </div>

        <div className='mt-4 grid gap-4 md:grid-cols-2'>
          <div
            className={cn(
              'space-y-2',
              selectedComponent === advantageBadgeValuePath &&
                'rounded-lg ring-2 ring-slate-900/25 ring-offset-2 ring-offset-white'
            )}
            data-editor-component={advantageBadgeValuePath}
          >
            <label className='text-sm font-medium text-gray-700'>
              Image Badge Value
            </label>
            <Input
              placeholder='1+'
              value={advantage?.badgeValue || ''}
              onChange={(e) =>
                updateField(
                  ['components', 'home_page', 'advantage', 'badgeValue'],
                  e.target.value
                )
              }
              className='h-12'
            />
          </div>
          <div
            className={cn(
              'space-y-2',
              selectedComponent === advantageBadgeLabelPath &&
                'rounded-lg ring-2 ring-slate-900/25 ring-offset-2 ring-offset-white'
            )}
            data-editor-component={advantageBadgeLabelPath}
          >
            <label className='text-sm font-medium text-gray-700'>
              Image Badge Label
            </label>
            <Input
              placeholder='Years of Excellence'
              value={advantage?.badgeLabel || ''}
              onChange={(e) =>
                updateField(
                  ['components', 'home_page', 'advantage', 'badgeLabel'],
                  e.target.value
                )
              }
              className='h-12'
            />
          </div>
        </div>

        <div className='mt-4 rounded-xl border border-slate-200 bg-white p-4'>
          <p className='text-xs font-semibold uppercase tracking-[0.2em] text-slate-500'>
            Visual Cards
          </p>
          <div className='mt-4 grid gap-4 md:grid-cols-2'>
            <div
              className={cn(
                'space-y-2',
                selectedComponent === advantageVisualCardTitlePath &&
                  'rounded-lg ring-2 ring-slate-900/25 ring-offset-2 ring-offset-white'
              )}
              data-editor-component={advantageVisualCardTitlePath}
            >
              <label className='text-sm font-medium text-gray-700'>
                Top White Card Title
              </label>
              <Input
                placeholder='Daily quality meals'
                value={advantage?.visualCardTitle || ''}
                onChange={(e) =>
                  updateField(
                    ['components', 'home_page', 'advantage', 'visualCardTitle'],
                    e.target.value
                  )
                }
                className='h-12'
              />
            </div>
            <div
              className={cn(
                'space-y-2',
                selectedComponent === advantagePromiseLabelPath &&
                  'rounded-lg ring-2 ring-slate-900/25 ring-offset-2 ring-offset-white'
              )}
              data-editor-component={advantagePromiseLabelPath}
            >
              <label className='text-sm font-medium text-gray-700'>
                Promise Label
              </label>
              <Input
                placeholder='Healthy Promise'
                value={advantage?.promiseLabel || ''}
                onChange={(e) =>
                  updateField(
                    ['components', 'home_page', 'advantage', 'promiseLabel'],
                    e.target.value
                  )
                }
                className='h-12'
              />
            </div>
            <div
              className={cn(
                'space-y-2 md:col-span-2',
                selectedComponent === advantagePromiseTextPath &&
                  'rounded-lg ring-2 ring-slate-900/25 ring-offset-2 ring-offset-white'
              )}
              data-editor-component={advantagePromiseTextPath}
            >
              <label className='text-sm font-medium text-gray-700'>
                Promise Text
              </label>
              <Textarea
                placeholder={'Crisp ingredients.\nBetter taste.'}
                value={advantage?.promiseText || ''}
                onChange={(e) =>
                  updateField(
                    ['components', 'home_page', 'advantage', 'promiseText'],
                    e.target.value
                  )
                }
                className='min-h-[86px]'
              />
            </div>
            <div
              className={cn(
                'space-y-2',
                selectedComponent === advantagePremiumLabelPath &&
                  'rounded-lg ring-2 ring-slate-900/25 ring-offset-2 ring-offset-white'
              )}
              data-editor-component={advantagePremiumLabelPath}
            >
              <label className='text-sm font-medium text-gray-700'>
                Premium Picks Label
              </label>
              <Input
                placeholder='Premium Picks'
                value={advantage?.premiumLabel || ''}
                onChange={(e) =>
                  updateField(
                    ['components', 'home_page', 'advantage', 'premiumLabel'],
                    e.target.value
                  )
                }
                className='h-12'
              />
            </div>
            <div
              className={cn(
                'space-y-2',
                selectedComponent === advantageAccentColorPath &&
                  'rounded-lg ring-2 ring-slate-900/25 ring-offset-2 ring-offset-white'
              )}
              data-editor-component={advantageAccentColorPath}
            >
              <label className='text-sm font-medium text-gray-700'>
                Accent Color
              </label>
              <Input
                type='color'
                value={advantage?.accentColor || '#d94b2b'}
                onChange={(e) =>
                  updateField(
                    ['components', 'home_page', 'advantage', 'accentColor'],
                    e.target.value
                  )
                }
                className='h-12'
              />
            </div>
            <div
              className={cn(
                'space-y-2',
                selectedComponent === advantageGlowColorPath &&
                  'rounded-lg ring-2 ring-slate-900/25 ring-offset-2 ring-offset-white'
              )}
              data-editor-component={advantageGlowColorPath}
            >
              <label className='text-sm font-medium text-gray-700'>
                Background Glow Color
              </label>
              <Input
                type='color'
                value={advantage?.glowColor || '#7d9920'}
                onChange={(e) =>
                  updateField(
                    ['components', 'home_page', 'advantage', 'glowColor'],
                    e.target.value
                  )
                }
                className='h-12'
              />
            </div>
          </div>

          <div className='mt-4 grid gap-4 md:grid-cols-3'>
            {[
              ['Top Card Image', advantageVisualCardImagePath, 'visualCardImage', isUploadingAdvantageVisualCardImage],
              ['Premium Image 1', advantagePremiumImageOnePath, 'premiumImageOne', isUploadingAdvantagePremiumImageOne],
              ['Premium Image 2', advantagePremiumImageTwoPath, 'premiumImageTwo', isUploadingAdvantagePremiumImageTwo],
            ].map(([label, path, key, isUploading]) => (
              <div
                key={String(key)}
                className={cn(
                  'rounded-xl border border-slate-200 bg-slate-50 p-3',
                  selectedComponent === path &&
                    'ring-2 ring-slate-900/25 ring-offset-2 ring-offset-white'
                )}
                data-editor-component={String(path)}
              >
                <ImageInput
                  label={String(label)}
                  name={String(key)}
                  value={advantage?.[String(key)] || ''}
                  onChange={(file) =>
                    handleImageChange(
                      ['components', 'home_page', 'advantage', String(key)],
                      file
                    )
                  }
                  isFileInput={true}
                  dimensions='600 x 600'
                />
                {isUploading ? (
                  <p className='mt-1 flex items-center text-sm text-gray-600'>
                    <Upload className='mr-2 h-4 w-4 animate-pulse' />
                    Uploading image...
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        </div>

        <div className='mt-4 grid gap-4 lg:grid-cols-3'>
          {advantageCards.map((card, index) => {
            const titlePath = `components.home_page.advantage.cards.${index}.title`
            const descriptionPath = `components.home_page.advantage.cards.${index}.description`
            return (
              <div
                key={`advantage-card-${index}`}
                className='rounded-xl border border-slate-200 bg-white p-3'
              >
                <p className='text-xs font-semibold uppercase tracking-[0.2em] text-slate-500'>
                  Point {index + 1}
                </p>
                <div
                  className={cn(
                    'mt-2 space-y-2',
                    selectedComponent === titlePath &&
                      'rounded-lg ring-2 ring-slate-900/25 ring-offset-2 ring-offset-white'
                  )}
                  data-editor-component={titlePath}
                >
                  <label className='text-sm font-medium text-gray-700'>Title</label>
                  <Input
                    placeholder='Point title'
                    value={card.title}
                    onChange={(e) =>
                      updateField(
                        ['components', 'home_page', 'advantage', 'cards', `${index}`, 'title'],
                        e.target.value
                      )
                    }
                    className='h-11'
                  />
                </div>
                <div
                  className={cn(
                    'mt-3 space-y-2',
                    selectedComponent === descriptionPath &&
                      'rounded-lg ring-2 ring-slate-900/25 ring-offset-2 ring-offset-white'
                  )}
                  data-editor-component={descriptionPath}
                >
                  <label className='text-sm font-medium text-gray-700'>
                    Description
                  </label>
                  <Textarea
                    placeholder='Point description'
                    value={card.description}
                    onChange={(e) =>
                      updateField(
                        [
                          'components',
                          'home_page',
                          'advantage',
                          'cards',
                          `${index}`,
                          'description',
                        ],
                        e.target.value
                      )
                    }
                    className='min-h-[90px]'
                  />
                </div>
              </div>
            )
          })}
        </div>

        <div className='mt-4 grid gap-4 md:grid-cols-2'>
          {advantageHighlights.map((item, index) => {
            const valuePath = `components.home_page.advantage.highlights.${index}.value`
            const labelPath = `components.home_page.advantage.highlights.${index}.label`

            return (
              <div
                key={`advantage-highlight-${index}`}
                className='rounded-xl border border-slate-200 bg-white p-3'
              >
                <p className='text-xs font-semibold uppercase tracking-[0.2em] text-slate-500'>
                  Highlight {index + 1}
                </p>
                <div
                  className={cn(
                    'mt-2 space-y-2',
                    selectedComponent === valuePath &&
                      'rounded-lg ring-2 ring-slate-900/25 ring-offset-2 ring-offset-white'
                  )}
                  data-editor-component={valuePath}
                >
                  <label className='text-sm font-medium text-gray-700'>Value</label>
                  <Input
                    placeholder='48h'
                    value={item.value}
                    onChange={(e) =>
                      updateField(
                        [
                          'components',
                          'home_page',
                          'advantage',
                          'highlights',
                          `${index}`,
                          'value',
                        ],
                        e.target.value
                      )
                    }
                    className='h-11'
                  />
                </div>
                <div
                  className={cn(
                    'mt-3 space-y-2',
                    selectedComponent === labelPath &&
                      'rounded-lg ring-2 ring-slate-900/25 ring-offset-2 ring-offset-white'
                  )}
                  data-editor-component={labelPath}
                >
                  <label className='text-sm font-medium text-gray-700'>Label</label>
                  <Input
                    placeholder='Quick Response'
                    value={item.label}
                    onChange={(e) =>
                      updateField(
                        [
                          'components',
                          'home_page',
                          'advantage',
                          'highlights',
                          `${index}`,
                          'label',
                        ],
                        e.target.value
                      )
                    }
                    className='h-11'
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
