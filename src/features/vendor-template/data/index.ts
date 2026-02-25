/* eslint-disable @typescript-eslint/no-explicit-any */
export type TemplateData = {
  custom_pages?: Array<{
    id: string
    title: string
    slug: string
    isPublished?: boolean
    sections: Array<{
      id: string
      type: string
      data: Record<string, unknown>
    }>
  }>

  components: {
    social_page: any
    logo: string // ImageKit URL
    vendor_profile: Record<string, string>
    theme: {
      templateColor: string
      bannerColor: string
      fontScale: number
      headingFont: string
      bodyFont: string
      textColor: string
      headingColor: string
      surfaceColor: string
      surfaceMutedColor: string
      borderColor: string
    }
    home_page: {
      hero_kicker?: string
      badge_text?: string
      header_text: string
      header_text_small: string
      backgroundImage:string
      button_header: string
      button_secondary?: string
      catalog_button_label?: string
      catalog_pdf_url?: string
      hero_style?: {
        titleColor?: string
        titleSize?: number
        subtitleColor?: string
        subtitleSize?: number
        badgeColor?: string
        badgeSize?: number
        primaryButtonColor?: string
        secondaryButtonColor?: string
        overlayColor?: string
        overlayAccentColor?: string
        overlayOpacity?: number
      }
      products_heading?: string
      products_kicker?: string
      products_subtitle?: string
      products_style?: {
        titleColor?: string
        titleSize?: number
        kickerColor?: string
        kickerSize?: number
      }
      benefits?: {
        kicker?: string
        heading?: string
        subtitle?: string
        cards?: Array<{
          title?: string
          description?: string
        }>
      }
      advantage?: {
        kicker?: string
        heading?: string
        subtitle?: string
        ctaLabel?: string
        topTag?: string
        image?: string
        badgeValue?: string
        badgeLabel?: string
        cards?: Array<{
          title?: string
          description?: string
        }>
        highlights?: Array<{
          value?: string
          label?: string
        }>
      }
      description: {
        large_text: string
        summary: string
        percent: { percent_in_number: string; percent_text: string }
        sold: { sold_number: string; sold_text: string }
      }
    }
    about_page: {
      hero: {
        backgroundImage: string // ImageKit URL
        kicker?: string
        title: string
        subtitle: string
      }
      hero_style?: {
        titleColor?: string
        titleSize?: number
        subtitleColor?: string
        subtitleSize?: number
      }
      story: {
        heading: string
        paragraphs: string[]
        image: string // ImageKit URL
      }
      vendorStories: {
        heading: string
        subtitle: string
        items: Array<{
          tag: string
          title: string
          narrative: string
        }>
      }
      values: Array<{ icon: string; title: string; description: string }>
      team: Array<{ name: string; role: string; image: string }> // ImageKit URL
      stats: Array<{ value: string; label: string }>
    }
    contact_page: {
      section_2: any
      hero: {
        backgroundImage: string // ImageKit URL
        title: string
        subtitle: string
      }
      hero_style?: {
        titleColor?: string
        titleSize?: number
        subtitleColor?: string
        subtitleSize?: number
      }
      contactInfo: Array<{ icon: string; title: string; details: string }>
      contactForm: {
        heading: string
        description: string
        fields: Array<{
          label: string
          name: string
          type: string
          placeholder: string
          required: boolean
        }>
        submitButtonText: string
      }
      visitInfo: {
        heading: string
        description: string
        mapImage: string // ImageKit URL
        reasonsHeading: string
        reasonsList: string[]
      }
      faqSection: {
        heading: string
        subheading: string
        faqs: Array<{ question: string; answer: string }>
      }
      socialMedia: {
        facebook: string
        instagram: string
        whatsapp: string
        twitter: string
      }
    }
    custom_pages?: Array<{
      id: string
      title: string
      slug: string
      isPublished?: boolean
      sections: Array<{
        id: string
        type: string
        data: Record<string, unknown>
      }>
    }>
  }
}

export const initialData: TemplateData = {


  components: {
    logo: '',
    vendor_profile: {},
    theme: {
      templateColor: '#0f172a',
      bannerColor: '#0f172a',
      fontScale: 1,
      headingFont: 'Poppins',
      bodyFont: 'Poppins',
      textColor: '#1f2937',
      headingColor: '#0f172a',
      surfaceColor: '#ffffff',
      surfaceMutedColor: '#f8fafc',
      borderColor: '#e2e8f0',
    },
    home_page: {
      hero_kicker: '',
      badge_text: '',
      header_text: '',
      header_text_small: '',
      backgroundImage:'',
      button_header: '',
      button_secondary: '',
      catalog_button_label: 'Download Catalog',
      catalog_pdf_url: '',
      hero_style: {
        titleColor: '',
        titleSize: 0,
        subtitleColor: '',
        subtitleSize: 0,
        badgeColor: '',
        badgeSize: 0,
        primaryButtonColor: '',
        secondaryButtonColor: '',
        overlayColor: '',
        overlayAccentColor: '',
        overlayOpacity: 0,
      },
      products_heading: '',
      products_kicker: '',
      products_subtitle: '',
      products_style: {
        titleColor: '',
        titleSize: 0,
        kickerColor: '',
        kickerSize: 0,
      },
      benefits: {
        kicker: '',
        heading: '',
        subtitle: '',
        cards: [
          { title: '', description: '' },
          { title: '', description: '' },
          { title: '', description: '' },
        ],
      },
      advantage: {
        kicker: '',
        heading: '',
        subtitle: '',
        ctaLabel: '',
        topTag: '',
        image: '',
        badgeValue: '',
        badgeLabel: '',
        cards: [
          { title: '', description: '' },
          { title: '', description: '' },
          { title: '', description: '' },
        ],
        highlights: [
          { value: '', label: '' },
          { value: '', label: '' },
        ],
      },
      description: {
        large_text: '',
        summary: '',
        percent: { percent_in_number: '', percent_text: '' },
        sold: { sold_number: '', sold_text: '' },
      },
    },
    about_page: {
      hero: {
        backgroundImage: '',
        kicker: '',
        title: '',
        subtitle: '',
      },
      hero_style: {
        titleColor: '',
        titleSize: 0,
        subtitleColor: '',
        subtitleSize: 0,
      },
      story: {
        heading: '',
        paragraphs: [''],
        image: '',
      },
      vendorStories: {
        heading: 'Vendor Stories',
        subtitle: "Short highlights that tell this vendor's journey.",
        items: [
          {
            tag: 'Since 2025',
            title: 'How It Started',
            narrative: '',
          },
          {
            tag: 'Catalog',
            title: 'What We Focus On',
            narrative: '',
          },
          {
            tag: 'Service',
            title: 'How We Serve',
            narrative: '',
          },
          {
            tag: 'Scale',
            title: 'Team & Growth',
            narrative: '',
          },
        ],
      },
      values: [
        {
          icon: 'award',
          title: 'Integrity',
          description: 'We maintain honesty in all our dealings.',
        },
        {
          icon: 'heart',
          title: 'Innovation',
          description: 'We constantly evolve to meet customer needs.',
        },
        {
          icon: 'users',
          title: 'Customer Focus',
          description: 'We prioritize practical solutions for every client.',
        },
      ],
      team: [{ name: '', role: '', image: '' }],
      stats: [{ value: '', label: '' }],
    },
    contact_page: {
      hero: {
        backgroundImage: '',
        title: '',
        subtitle: '',
      },
      hero_style: {
        titleColor: '',
        titleSize: 0,
        subtitleColor: '',
        subtitleSize: 0,
      },
      contactInfo: [
        { icon: 'map-pin', title: 'Visit Us', details: '' },
        { icon: 'phone', title: 'Call Us', details: '' },
        { icon: 'mail', title: 'Email', details: '' },
      ],
      contactForm: {
        heading: '',
        description: '',
        fields: [
          {
            label: 'Full Name',
            name: 'fullName',
            type: 'text',
            placeholder: 'Enter your name',
            required: true,
          },
          {
            label: 'Email Address',
            name: 'email',
            type: 'email',
            placeholder: 'Enter your email',
            required: true,
          },
          {
            label: 'Message',
            name: 'message',
            type: 'textarea',
            placeholder: 'Write your message here',
            required: true,
          },
        ],
        submitButtonText: '',
      },
      visitInfo: {
        heading: '',
        description: '',
        mapImage: '',
        reasonsHeading: '',
        reasonsList: [''],
      },
      faqSection: {
        heading: '',
        subheading: '',
        faqs: [{ question: '', answer: '' }],
      },
      socialMedia: {
        facebook: 'string',
        instagram: 'string',
        whatsapp: 'string',
        twitter: 'string',
      },
      section_2: {
        hero_title: '',
        hero_subtitle: '',
        hero_title2: '',
        hero_subtitle2: '',
        lat: '',
        long: '',
      },
    },
    social_page: undefined
    ,
    custom_pages: []
  },
}
