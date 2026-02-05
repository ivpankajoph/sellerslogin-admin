import { type TemplateData } from '@/features/vendor-template/data'
import { type JSX } from 'react'
import { InlineEditableText } from './InlineEditableText'

interface AboutPreviewProps {
  template: TemplateData
  sectionOrder: string[]
  vendorId: string
}

export function AboutPreview({
  template,
  sectionOrder,
  vendorId,
}: AboutPreviewProps) {
  const about = template.components?.about_page
  const theme = template.components?.theme
  const accent = theme?.templateColor || '#0f172a'
  const bannerColor = theme?.bannerColor || '#0f172a'
  const heroStyle = about?.hero_style || {}

  const emitSelect = (sectionId: string) => {
    if (typeof window === 'undefined') return
    window.parent?.postMessage(
      {
        type: 'template-editor-select',
        vendorId,
        page: 'about',
        sectionId,
      },
      window.location.origin
    )
  }

  const wrapSection = (sectionId: string, content: JSX.Element) => (
    <div
      className='group cursor-pointer rounded-3xl transition hover:ring-2 hover:ring-slate-900/15'
      onClickCapture={(event) => {
        if (
          (event.target as HTMLElement | null)?.closest?.(
            '[data-inline-edit="true"]'
          )
        ) {
          return
        }
        event.preventDefault()
        event.stopPropagation()
        emitSelect(sectionId)
      }}
    >
      {content}
    </div>
  )

  if (!about) {
    return null
  }

  const sections: Record<string, JSX.Element> = {
    hero: wrapSection(
      'hero',
      (
      <section
        className='relative overflow-hidden rounded-3xl border border-white/60 bg-slate-900 text-white'
        style={{ backgroundColor: bannerColor }}
      >
        <div className='absolute inset-0 opacity-40'>
          {about.hero?.backgroundImage ? (
            <img
              src={about.hero.backgroundImage}
              alt='About hero background'
              className='h-full w-full object-cover'
            />
          ) : (
            <div
              className='h-full w-full'
              style={{ backgroundColor: bannerColor }}
            />
          )}
        </div>
        <div
          className='absolute inset-0 opacity-30'
          style={{ backgroundColor: bannerColor }}
        />
        <div className='relative z-10 space-y-4 px-8 py-16'>
          <p className='text-xs font-semibold uppercase tracking-[0.32em] text-white/70'>
            About Us
          </p>
          <InlineEditableText
            as='h1'
            value={about.hero?.title}
            fallback='We craft products with purpose.'
            path={['components', 'about_page', 'hero', 'title']}
            vendorId={vendorId}
            page='about'
            colorPath={['components', 'about_page', 'hero_style', 'titleColor']}
            sizePath={['components', 'about_page', 'hero_style', 'titleSize']}
            color={heroStyle.titleColor}
            fontSize={heroStyle.titleSize}
            className='text-3xl font-semibold sm:text-5xl'
          />
          <InlineEditableText
            as='p'
            value={about.hero?.subtitle}
            fallback='Share the story behind your brand and highlight what makes you different.'
            path={['components', 'about_page', 'hero', 'subtitle']}
            vendorId={vendorId}
            page='about'
            colorPath={[
              'components',
              'about_page',
              'hero_style',
              'subtitleColor',
            ]}
            sizePath={[
              'components',
              'about_page',
              'hero_style',
              'subtitleSize',
            ]}
            color={heroStyle.subtitleColor}
            fontSize={heroStyle.subtitleSize}
            className='max-w-2xl text-base text-white/80'
          />
        </div>
      </section>
      )
    ),
    story: wrapSection(
      'story',
      (
      <section className='grid gap-6 rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm lg:grid-cols-[1.1fr_0.9fr]'>
        <div className='space-y-4'>
          <p className='text-xs font-semibold uppercase tracking-[0.3em] text-slate-400'>
            Our Story
          </p>
          <InlineEditableText
            as='h2'
            value={about.story?.heading}
            fallback='Designed for modern marketplaces.'
            path={['components', 'about_page', 'story', 'heading']}
            vendorId={vendorId}
            page='about'
            className='text-2xl font-semibold text-slate-900'
          />
          <div className='space-y-3 text-sm text-slate-600'>
            {(about.story?.paragraphs?.length
              ? about.story.paragraphs
              : [
                  'Add your brand journey here to build trust with shoppers.',
                  'Share the milestone that inspired your storefront.',
                ]
            ).map((paragraph, idx) => (
              <InlineEditableText
                key={idx}
                as='p'
                value={paragraph}
                fallback='Add your brand journey here to build trust with shoppers.'
                path={['components', 'about_page', 'story', 'paragraphs', String(idx)]}
                vendorId={vendorId}
                page='about'
                className='text-sm text-slate-600'
              />
            ))}
          </div>
        </div>
        <div className='overflow-hidden rounded-2xl border border-slate-200 bg-slate-100'>
          {about.story?.image ? (
            <img
              src={about.story.image}
              alt='Story'
              className='h-full w-full object-cover'
            />
          ) : (
            <div className='flex h-full min-h-[260px] items-center justify-center text-xs uppercase tracking-[0.3em] text-slate-400'>
              Story Image
            </div>
          )}
        </div>
      </section>
      )
    ),
    values: wrapSection(
      'values',
      (
      <section className='space-y-4'>
        <div>
          <p className='text-xs font-semibold uppercase tracking-[0.3em] text-slate-400'>
            Values
          </p>
          <h3
            className='text-2xl font-semibold text-slate-900'
            style={{ color: 'var(--template-accent)' }}
          >
            Core principles that guide us
          </h3>
        </div>
        <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
          {(about.values?.length ? about.values : [{ icon: '', title: '', description: '' }, { icon: '', title: '', description: '' }, { icon: '', title: '', description: '' }]).map(
            (value, idx) => (
              <div
                key={`${value.title || 'value'}-${idx}`}
                className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'
              >
                <div
                  className='mb-3 inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-white'
                  style={{ backgroundColor: accent }}
                >
                  {value.icon || 'Value'}
                </div>
                <InlineEditableText
                  as='h4'
                  value={value.title}
                  fallback='Customer-first'
                  path={['components', 'about_page', 'values', String(idx), 'title']}
                  vendorId={vendorId}
                  page='about'
                  className='text-lg font-semibold text-slate-900'
                />
                <InlineEditableText
                  as='p'
                  value={value.description}
                  fallback='Explain what drives this value for your brand.'
                  path={[
                    'components',
                    'about_page',
                    'values',
                    String(idx),
                    'description',
                  ]}
                  vendorId={vendorId}
                  page='about'
                  className='mt-2 text-sm text-slate-600'
                />
              </div>
            )
          )}
        </div>
      </section>
      )
    ),
    team: wrapSection(
      'team',
      (
      <section className='space-y-4'>
        <div>
          <p className='text-xs font-semibold uppercase tracking-[0.3em] text-slate-400'>
            Team
          </p>
          <h3
            className='text-2xl font-semibold text-slate-900'
            style={{ color: 'var(--template-accent)' }}
          >
            Meet the people behind the brand
          </h3>
        </div>
        <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
          {(about.team?.length ? about.team : [{ name: '', role: '', image: '' }, { name: '', role: '', image: '' }, { name: '', role: '', image: '' }]).map((member, idx) => (
            <div
              key={`${member.name || 'member'}-${idx}`}
              className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'
            >
              <div className='mb-4 h-48 overflow-hidden rounded-xl bg-slate-100'>
                {member.image ? (
                  <img
                    src={member.image}
                    alt={member.name || 'Team member'}
                    className='h-full w-full object-cover'
                  />
                ) : (
                  <div className='flex h-full items-center justify-center text-xs uppercase tracking-[0.3em] text-slate-400'>
                    Photo
                  </div>
                )}
              </div>
              <InlineEditableText
                as='h4'
                value={member.name}
                fallback='Team Member'
                path={['components', 'about_page', 'team', String(idx), 'name']}
                vendorId={vendorId}
                page='about'
                className='text-lg font-semibold text-slate-900'
              />
              <InlineEditableText
                as='p'
                value={member.role}
                fallback='Role'
                path={['components', 'about_page', 'team', String(idx), 'role']}
                vendorId={vendorId}
                page='about'
                className='text-sm text-slate-500'
              />
            </div>
          ))}
        </div>
      </section>
      )
    ),
    stats: wrapSection(
      'stats',
      (
      <section className='grid gap-4 rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm sm:grid-cols-3'>
        {(about.stats?.length ? about.stats : [{ value: '', label: '' }, { value: '', label: '' }, { value: '', label: '' }]).map((stat, idx) => (
          <div key={`${stat.label || 'stat'}-${idx}`} className='text-center'>
            <InlineEditableText
              as='p'
              value={stat.value}
              fallback='25+'
              path={['components', 'about_page', 'stats', String(idx), 'value']}
              vendorId={vendorId}
              page='about'
              className='text-3xl font-semibold text-slate-900'
            />
            <InlineEditableText
              as='p'
              value={stat.label}
              fallback='Projects'
              path={['components', 'about_page', 'stats', String(idx), 'label']}
              vendorId={vendorId}
              page='about'
              className='text-xs font-semibold uppercase tracking-[0.3em] text-slate-400'
            />
          </div>
        ))}
      </section>
      )
    ),
  }

  const defaultOrder = ['hero', 'story', 'values', 'team', 'stats']
  const order = sectionOrder.length ? sectionOrder : defaultOrder

  return (
    <div className='space-y-10'>
      {order.map((key) => (
        <div key={key}>{sections[key] || null}</div>
      ))}
    </div>
  )
}
