import { Mail, MapPin, Phone } from 'lucide-react'
import { type TemplateData } from '@/features/vendor-template/data'
import { type JSX } from 'react'
import { InlineEditableText } from './InlineEditableText'


interface ContactPreviewProps {
  template: TemplateData
  sectionOrder: string[]
  vendorId: string
  products: Array<{
    _id?: string
    productName?: string
    productCategory?: {
      _id?: string
      name?: string
      title?: string
      categoryName?: string
    } | any
    productCategoryName?: string
  }>
  categoryMap?: Record<string, string>
}

const getMapEmbedUrl = (lat: string, lng: string) => {
  const latNum = parseFloat(lat)
  const lngNum = parseFloat(lng)
  if (!latNum || !lngNum) return null

  const delta = 0.02
  const left = lngNum - delta
  const right = lngNum + delta
  const top = latNum + delta
  const bottom = latNum - delta
  return `https://www.openstreetmap.org/export/embed.html?bbox=${left}%2C${bottom}%2C${right}%2C${top}&layer=mapnik&marker=${latNum}%2C${lngNum}`
}

export function ContactPreview({
  template,
  sectionOrder,
  vendorId,

}: ContactPreviewProps) {
  const contact = template.components.contact_page
  const theme = template.components.theme
  const accent = theme?.templateColor || '#0f172a'
  const bannerColor = theme?.bannerColor || '#0f172a'
  const heroStyle = contact.hero_style || {}
  const section2 = contact.section_2 || {
    hero_title: '',
    hero_subtitle: '',
    hero_title2: '',
    hero_subtitle2: '',
    lat: '',
    long: '',
  }

  const emitSelect = (sectionId: string) => {
    if (typeof window === 'undefined') return
    window.parent?.postMessage(
      {
        type: 'template-editor-select',
        vendorId,
        page: 'contact',
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

  const mapUrl = getMapEmbedUrl(section2.lat, section2.long)





  const sections: Record<string, JSX.Element> = {
    hero: wrapSection(
      'hero',
      (
      <section
        className='relative overflow-hidden rounded-3xl border border-white/60 bg-slate-900 text-white'
        style={{ backgroundColor: bannerColor }}
      >
        <div className='absolute inset-0 opacity-40'>
          {contact.hero.backgroundImage ? (
            <img
              src={contact.hero.backgroundImage}
              alt='Contact hero background'
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
            Contact
          </p>
          <InlineEditableText
            as='h1'
            value={contact.hero.title}
            fallback='Reach out to our team.'
            path={['components', 'contact_page', 'hero', 'title']}
            vendorId={vendorId}
            page='contact'
            colorPath={['components', 'contact_page', 'hero_style', 'titleColor']}
            sizePath={['components', 'contact_page', 'hero_style', 'titleSize']}
            color={heroStyle.titleColor}
            fontSize={heroStyle.titleSize}
            className='text-3xl font-semibold sm:text-5xl'
          />
          <InlineEditableText
            as='p'
            value={contact.hero.subtitle}
            fallback='Let customers know the best way to get in touch.'
            path={['components', 'contact_page', 'hero', 'subtitle']}
            vendorId={vendorId}
            page='contact'
            colorPath={[
              'components',
              'contact_page',
              'hero_style',
              'subtitleColor',
            ]}
            sizePath={[
              'components',
              'contact_page',
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
    details: wrapSection(
      'details',
      (
      <section className='grid gap-6 rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm lg:grid-cols-[1.1fr_0.9fr]'>
        <div className='space-y-4'>
          <p className='text-xs font-semibold uppercase tracking-[0.3em] text-slate-400'>
            Visit
          </p>
          <InlineEditableText
            as='h2'
            value={section2.hero_title}
            fallback='Come visit our storefront.'
            path={['components', 'contact_page', 'section_2', 'hero_title']}
            vendorId={vendorId}
            page='contact'
            className='text-2xl font-semibold text-slate-900'
          />
          <InlineEditableText
            as='p'
            value={section2.hero_subtitle}
            fallback='Add your address and directions so customers can find you quickly.'
            path={['components', 'contact_page', 'section_2', 'hero_subtitle']}
            vendorId={vendorId}
            page='contact'
            className='text-sm text-slate-600'
          />
          <div className='space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600'>
            <div className='flex items-center gap-2'>
              <MapPin className='h-4 w-4 text-slate-500' />
              <InlineEditableText
                value={section2.hero_title2}
                fallback='Main store location'
                path={['components', 'contact_page', 'section_2', 'hero_title2']}
                vendorId={vendorId}
                page='contact'
                className='text-sm text-slate-600'
              />
            </div>
            <div className='flex items-center gap-2'>
              <Phone className='h-4 w-4 text-slate-500' />
              <InlineEditableText
                value={section2.hero_subtitle2}
                fallback='+91 00000 00000'
                path={[
                  'components',
                  'contact_page',
                  'section_2',
                  'hero_subtitle2',
                ]}
                vendorId={vendorId}
                page='contact'
                className='text-sm text-slate-600'
              />
            </div>
          </div>
        </div>
        <div className='space-y-3'>
          <p className='text-xs font-semibold uppercase tracking-[0.3em] text-slate-400'>
            Contact Info
          </p>
          <div className='grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600'>
            {(contact.contactInfo?.length
              ? contact.contactInfo
              : [
                  { icon: 'map-pin', title: 'Visit Us', details: '' },
                  { icon: 'phone', title: 'Call Us', details: '' },
                  { icon: 'mail', title: 'Email', details: '' },
                ]
            ).map((item, idx) => (
              <div key={`${item.title}-${idx}`} className='flex items-start gap-3'>
                <div
                  className='mt-1 flex h-8 w-8 items-center justify-center rounded-full text-xs text-white'
                  style={{ backgroundColor: accent }}
                >
                  {item.icon?.toString().slice(0, 2).toUpperCase() || 'IN'}
                </div>
                <div>
                  <InlineEditableText
                    as='p'
                    value={item.title}
                    fallback='Info'
                    path={[
                      'components',
                      'contact_page',
                      'contactInfo',
                      String(idx),
                      'title',
                    ]}
                    vendorId={vendorId}
                    page='contact'
                    className='text-xs font-semibold uppercase tracking-[0.3em] text-slate-400'
                  />
                  <InlineEditableText
                    as='p'
                    value={item.details}
                    fallback='Add details in the contact form.'
                    path={[
                      'components',
                      'contact_page',
                      'contactInfo',
                      String(idx),
                      'details',
                    ]}
                    vendorId={vendorId}
                    page='contact'
                    className='text-sm text-slate-600'
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      )
    ),
    map: wrapSection(
      'map',
      (
      <section className='grid gap-6 rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm lg:grid-cols-[1.2fr_0.8fr]'>
        <div className='overflow-hidden rounded-2xl border border-slate-200 bg-slate-100'>
          {mapUrl ? (
            <iframe
              title='Map preview'
              src={mapUrl}
              className='h-[360px] w-full border-0'
            />
          ) : (
            <div className='flex h-[360px] items-center justify-center text-xs uppercase tracking-[0.3em] text-slate-400'>
              Map preview
            </div>
          )}
        </div>
        <div className='space-y-4'>
          <p className='text-xs font-semibold uppercase tracking-[0.3em] text-slate-400'>
            Coordinates
          </p>
          <div className='rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600'>
            <p>Latitude: {section2.lat || '0.0000'}</p>
            <p>Longitude: {section2.long || '0.0000'}</p>
          </div>
          <div className='rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600'>
            <p className='mb-2 text-xs font-semibold uppercase tracking-[0.3em] text-slate-400'>
              Send a message
            </p>
            <div className='space-y-2'>
              {(contact.contactForm?.fields?.length
                ? contact.contactForm.fields
                : [
                    { label: 'Full Name' },
                    { label: 'Email Address' },
                    { label: 'Message' },
                  ]
              ).map((field, idx) => (
                <div key={`${field.label}-${idx}`} className='rounded-lg border border-slate-200 bg-slate-50 px-3 py-2'>
                  {field.label}
                </div>
              ))}
              <div
                className='flex items-center gap-2 text-xs text-slate-500'
                style={{ color: 'var(--template-accent)' }}
              >
                <Mail className='h-4 w-4' />
                <InlineEditableText
                  value={contact.contactForm?.submitButtonText}
                  fallback='Send Message'
                  path={[
                    'components',
                    'contact_page',
                    'contactForm',
                    'submitButtonText',
                  ]}
                  vendorId={vendorId}
                  page='contact'
                  className='text-xs text-slate-500'
                />
              </div>
            </div>
          </div>
        </div>
      </section>
      )
    ),
  }

  const defaultOrder = ['hero', 'details', 'map']
  const order = sectionOrder.length ? sectionOrder : defaultOrder

  return (
    <div className='space-y-10'>
      {order.map((key) => (
        <div key={key}>{sections[key] || null}</div>
      ))}
    </div>
  )
}
