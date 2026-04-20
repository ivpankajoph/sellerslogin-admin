/* eslint-disable @typescript-eslint/no-explicit-any */
export type TemplateData = {
  custom_pages?: Array<{
    id: string
    title: string
    subtitle?: string
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
      accentColor?: string
      headerTopBackground?: string
      headerBackground?: string
      headerTextColor?: string
      footerBackground?: string
      footerBottomBackground?: string
      footerAccentColor?: string
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
      header?: {
        brandLabel?: string
        topAnnouncement?: string
        callLabel?: string
        navHomeLabel?: string
        navMenuLabel?: string
        navComboLabel?: string
        navBlogLabel?: string
        navContactLabel?: string
      }
      hero_kicker?: string
      hero_detail?: string
      hero_price?: string
      hero_old_price?: string
      hero_card_kicker?: string
      hero_card_title?: string
      hero_card_badge?: string
      hero_starting_label?: string
      hero_rating_label?: string
      hero_rating_value?: string
      hero_features?: string[]
      offer_section_eyebrow?: string
      offer_section_button_label?: string
      offer_section_background_image?: string
      offer_section_background_color?: string
      offer_section_title_color?: string
      offer_section_eyebrow_color?: string
      offer_section_price_color?: string
      offer_section_price_background?: string
      offer_section_button_background?: string
      offer_section_button_text_color?: string
      offer_section_overlay_opacity?: number
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
      recipe_section_heading?: string
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
        visualCardTitle?: string
        visualCardImage?: string
        promiseLabel?: string
        promiseText?: string
        premiumLabel?: string
        premiumImageOne?: string
        premiumImageTwo?: string
        accentColor?: string
        glowColor?: string
        cards?: Array<{
          title?: string
          description?: string
        }>
        highlights?: Array<{
          value?: string
          label?: string
        }>
      }
      heroStats?: Array<{
        value?: string
        label?: string
      }>
      industries?: {
        kicker?: string
        heading?: string
        subtitle?: string
        items?: Array<{
          title?: string
          description?: string
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
      subtitle?: string
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
      accentColor: '#ffc222',
      headerTopBackground: '#1f1d23',
      headerBackground: '#ffffff',
      headerTextColor: '#171717',
      footerBackground: '#18171c',
      footerBottomBackground: '#d94b2b',
      footerAccentColor: '#ffc222',
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
      header: {
        brandLabel: 'Oph!',
        topAnnouncement: 'Fresh combos, quick checkout, and delivery-first merchandising.',
        callLabel: 'Call and order in',
        navHomeLabel: 'Home',
        navMenuLabel: 'Menu',
        navComboLabel: 'Combo',
        navBlogLabel: 'Blog',
        navContactLabel: 'Contact',
      },
      hero_kicker: '',
      hero_detail: '',
      hero_price: '',
      hero_old_price: '',
      hero_card_kicker: '',
      hero_card_title: '',
      hero_card_badge: '',
      hero_starting_label: 'Starting at',
      hero_rating_label: 'Rating',
      hero_rating_value: '4.9/5',
      hero_features: ['30 min delivery', 'Premium toppings', 'Fresh oven baked'],
      offer_section_eyebrow: '',
      offer_section_button_label: 'Order now',
      offer_section_background_image: '',
      offer_section_background_color: '#1b1a1f',
      offer_section_title_color: '#ffca1a',
      offer_section_eyebrow_color: '#fffdf8',
      offer_section_price_color: '#ffc222',
      offer_section_price_background: '#ffffff',
      offer_section_button_background: '#ffffff',
      offer_section_button_text_color: '#171717',
      offer_section_overlay_opacity: 48,
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
      recipe_section_heading: 'Top recipes',
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
        visualCardTitle: '',
        visualCardImage: '',
        promiseLabel: '',
        promiseText: '',
        premiumLabel: '',
        premiumImageOne: '',
        premiumImageTwo: '',
        accentColor: '#d94b2b',
        glowColor: '#7d9920',
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
      heroStats: [
        { value: '', label: '' },
        { value: '', label: '' },
        { value: '', label: '' },
        { value: '', label: '' },
      ],
      industries: {
        kicker: '',
        heading: '',
        subtitle: '',
        items: [
          { title: '', description: '' },
          { title: '', description: '' },
          { title: '', description: '' },
          { title: '', description: '' },
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
    social_page: {
      product_benefits: {
        enabled: true,
        title: 'Shopping Benefits',
        items: [
          { text: 'Free shipping over Rs. 75', enabled: true },
          { text: '30-day easy returns', enabled: true },
          { text: '1-year warranty', enabled: true },
          { text: 'Fast delivery in 3-7 days', enabled: true },
        ],
      },
      footer: {
        brand_heading: 'Oph!',
        book_heading: 'Book a Table',
        book_text: 'Fresh burgers, pizzas, combos, and chef specials for your everyday cravings.',
        opening_heading: 'Opening Hours',
        newsletter_heading: 'Newsletter',
        newsletter_text: 'Subscribe for weekly offers, new combos, and latest storefront updates.',
        newsletter_placeholder: 'Your Email...',
        newsletter_button: 'SUBSCRIBE',
        orders_label: 'My Orders',
        blog_label: 'Blog',
        blog_href: '/blog',
        policy_primary_label: 'Privacy Policy',
        policy_primary_href: '/privacy',
        policy_secondary_label: 'Terms & Condition',
        policy_secondary_href: '/terms',
      },
      blogs: [],
      legal_pages: {
        privacy: {
          title: 'Privacy Policy',
          subtitle: '',
          content: '',
        },
        terms: {
          title: 'Terms & Condition',
          subtitle: '',
          content: '',
        },
        shipping: {
          title: 'Shipping & Return Policy',
          subtitle: '',
          content: '',
        },
      },
    },
    custom_pages: []
  },
}
