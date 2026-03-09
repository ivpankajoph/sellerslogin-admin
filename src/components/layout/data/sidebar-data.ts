import {
  LayoutDashboard,
  HelpCircle,
  Users,
  ShieldCheck,
  LayoutTemplate,
  ShoppingCart,
  Map,
  CreditCard,
  Truck,
  PlugZap,
  SearchCheck,
  Info,
  KeyRound,
  MapPinned,
  Star,
  Globe,
} from 'lucide-react'

export const ROLES = {
  ADMIN: 'admin',
  VENDOR: 'vendor',
} as const

export const sidebarData: any = {
  navGroups: [
    {
      title: 'General',
      roles: [ROLES.ADMIN, ROLES.VENDOR],
      items: [
        {
          title: 'Dashboard',
          url: '/',
          icon: LayoutDashboard,
          roles: [ROLES.ADMIN, ROLES.VENDOR],
        },
        {
          title: 'Users',
          url: '/users',
          icon: Users,
          roles: [ROLES.ADMIN, ROLES.VENDOR], // admin only
        },
        {
          title: 'User Queries',
          url: '/customer-queries',
          icon: HelpCircle,
          roles: [ROLES.ADMIN, ROLES.VENDOR],
        },
        {
          title: 'Customer Reviews',
          url: '/customer-reviews',
          icon: Star,
          roles: [ROLES.ADMIN, ROLES.VENDOR],
        },
        {
          title: 'Analytics',
          url: '/analytics',
          icon: LayoutDashboard,
          roles: [ROLES.ADMIN],
        },
        {
          title: 'Orders',
          icon: ShoppingCart,
          roles: [ROLES.ADMIN, ROLES.VENDOR],
          items: [
            {
              title: 'Ophmate Orders',
              url: '/order',
              roles: [ROLES.ADMIN, ROLES.VENDOR],
            },
            {
              title: 'Template Orders',
              url: '/template-orders',
              roles: [ROLES.ADMIN, ROLES.VENDOR],
            },
          ],
        },
        {
          title: 'Wallets',
          icon: LayoutDashboard,
          roles: [ROLES.ADMIN, ROLES.VENDOR],
          items: [
            {
              title: 'Ophmate Wallet',
              url: '/wallet',
              roles: [ROLES.ADMIN, ROLES.VENDOR],
            },
            {
              title: 'Template Wallet',
              url: '/template-wallet',
              roles: [ROLES.ADMIN, ROLES.VENDOR],
            },
          ],
        },
        {
          title: 'Payments',
          url: '/payments',
          icon: CreditCard,
          roles: [ROLES.ADMIN, ROLES.VENDOR],
        },
        {
          title: 'Delivery Charges',
          url: '/delivery-charges',
          icon: Truck,
          roles: [ROLES.ADMIN],
        },
        {
          title: 'SEO Manager',
          icon: SearchCheck,
          roles: [ROLES.ADMIN],
          items: [
            {
              title: 'SEO Rules',
              url: '/seo',
              roles: [ROLES.ADMIN],
            },
            {
              title: 'Entity SEO',
              url: '/seo/entities',
              roles: [ROLES.ADMIN],
            },
          ],
        },
        {
          title: 'Integrations',
          icon: PlugZap,
          roles: [ROLES.ADMIN, ROLES.VENDOR],
          items: [
            {
              title: 'App Integrations',
              url: '/integrations',
              roles: [ROLES.ADMIN, ROLES.VENDOR],
            },
            {
              title: 'Razorpay',
              url: '/integrations/razorpay',
              roles: [ROLES.ADMIN, ROLES.VENDOR],
              requiresIntegration: 'razorpay',
            },
            {
              title: 'Cashfree',
              url: '/integrations/cashfree',
              roles: [ROLES.ADMIN, ROLES.VENDOR],
              requiresIntegration: 'cashfree',
            },
            {
              title: 'Borzo',
              url: '/integrations/borzo',
              roles: [ROLES.ADMIN, ROLES.VENDOR],
              requiresIntegration: 'borzo',
            },
            {
              title: 'Delhivery',
              url: '/integrations/delhivery',
              roles: [ROLES.ADMIN, ROLES.VENDOR],
              requiresIntegration: 'delhivery',
            },
          ],
        },
        {
          title: 'Storefront Analytics',
          url: '/analytics',
          icon: LayoutDashboard,
          roles: [ROLES.VENDOR],
        },
        {
          title: 'Profile',
          url: '/profile',
          icon: Users,
          roles: [ROLES.ADMIN, ROLES.VENDOR],
        },
        {
          title: 'About',
          url: '/vendor-about',
          icon: Info,
          roles: [ROLES.VENDOR],
        },
        {
          title: 'Get Domain',
          url: '/get-domain',
          icon: Globe,
          roles: [ROLES.VENDOR],
        },
        {
          title: 'Connect with Brevo',
          url: '/connect-brevo',
          icon: KeyRound,
          roles: [ROLES.VENDOR],
        },
        {
          title: 'Delivery Tracking',
          url: '/borzo-report',
          icon: Truck,
          roles: [ROLES.ADMIN, ROLES.VENDOR],
          requiresIntegration: 'borzo',
        },
      ],
    },

    {
      title: 'Category',
      roles: [ROLES.ADMIN, ROLES.VENDOR],
      items: [
        {
          title: 'All Categories',
          icon: ShieldCheck,
          roles: [ROLES.ADMIN, ROLES.VENDOR],
          items: [
            {
              title: 'Show Categories',
              url: '/category',
              roles: [ROLES.ADMIN, ROLES.VENDOR],
            },
            {
              title: 'Specification Keys',
              url: '/specification-keys',
              icon: KeyRound,
              roles: [ROLES.ADMIN],
            },
            {
              title: 'Commission Rules',
              url: '/commission',
              roles: [ROLES.ADMIN],
            },
          ],
        },
      ],
    },

    {
      title: 'Products',
      roles: [ROLES.ADMIN, ROLES.VENDOR],
      items: [
        {
          title: 'All Products',
          icon: ShieldCheck,
          roles: [ROLES.ADMIN, ROLES.VENDOR],
          items: [
            {
              title: 'Show Products',
              url: '/products',
              roles: [ROLES.VENDOR],
            },
            {
              title: 'Create Products',
              url: '/products/create-products',
              roles: [ROLES.VENDOR], // admin only
            },
            {
              title: 'All Admin Products',
              url: '/products/admin-products',
              roles: [ROLES.ADMIN], // admin only
            },
            {
              title: 'Inventory Management',
              url: '/inventory-management',
              roles: [ROLES.ADMIN, ROLES.VENDOR], // admin only
            },
          ],
        },
      ],
    },

    {
      title: 'Vendors',
      roles: [ROLES.ADMIN],
      items: [
        {
          title: 'All Vendors',
          icon: ShieldCheck,
          roles: [ROLES.ADMIN],
          items: [
            {
              title: 'Show Vendors',
              url: '/vendor',
              roles: [ROLES.ADMIN],
            },
          ],
        },
      ],
    },

    {
      title: 'Template Admin',
      roles: [ROLES.ADMIN, ROLES.VENDOR],
      items: [
        {
          title: 'All Templates',
          url: '/template-catalog',
          icon: LayoutTemplate,
          roles: [ROLES.ADMIN],
        },
        {
          title: 'All Work Dashboard',
          url: '/template-workspace',
          icon: LayoutTemplate,
          roles: [ROLES.ADMIN, ROLES.VENDOR],
        },
        {
          title: 'Manage Cities',
          url: '/cities',
          icon: MapPinned,
          roles: [ROLES.ADMIN, ROLES.VENDOR],
        },
      ],
    },

    {
      title: 'Template',
      roles: [ROLES.VENDOR],
      items: [
        {
          title: 'Create Template',
          icon: ShieldCheck,
          roles: [ROLES.VENDOR],
          items: [
            {
              title: 'Create Your Template',
              url: '/vendor-template',
              roles: [ROLES.VENDOR],
            },
            {
              title: 'Edit About Page',
              url: '/vendor-template-about',
              roles: [ROLES.VENDOR],
            },
            {
              title: 'Edit Contact Page',
              url: '/vendor-template-contact',
              roles: [ROLES.VENDOR],
            },
            {
              title: 'Edit Social + FAQs',
              url: '/vendor-template-other',
              roles: [ROLES.VENDOR],
            },
            {
              title: 'Custom Pages',
              url: '/vendor-template-pages',
              roles: [ROLES.VENDOR],
            },

          ],
        },
      ],
    },

    {
      title: 'Other',
      roles: [ROLES.ADMIN, ROLES.VENDOR],
      items: [
        {
          title: 'Help Center',
          url: '/help-center',
          icon: HelpCircle,
          roles: [ROLES.ADMIN, ROLES.VENDOR],
        },
        {
          title: 'Sitemaps',
          url: '/sitemaps',
          icon: Map,
          roles: [ROLES.ADMIN, ROLES.VENDOR],
        },
      ],
    },
  ],
}
