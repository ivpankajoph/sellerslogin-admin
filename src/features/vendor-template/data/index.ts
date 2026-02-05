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
    theme: {
      templateColor: string
      bannerColor: string
      fontScale: number
    }
    home_page: {
      hero_kicker?: string
      badge_text?: string
      header_text: string
      header_text_small: string
      backgroundImage:string
      button_header: string
      button_secondary?: string
      hero_style?: {
        titleColor?: string
        titleSize?: number
        subtitleColor?: string
        subtitleSize?: number
        badgeColor?: string
        badgeSize?: number
        primaryButtonColor?: string
        secondaryButtonColor?: string
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
    theme: {
      templateColor: '#0f172a',
      bannerColor: '#0f172a',
      fontScale: 1,
    },
    home_page: {
      hero_kicker: '',
      badge_text: '',
      header_text: '',
      header_text_small: '',
      backgroundImage:'',
      button_header: '',
      button_secondary: '',
      hero_style: {
        titleColor: '',
        titleSize: 0,
        subtitleColor: '',
        subtitleSize: 0,
        badgeColor: '',
        badgeSize: 0,
        primaryButtonColor: '',
        secondaryButtonColor: '',
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
      values: [{ icon: '', title: '', description: '' }],
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
