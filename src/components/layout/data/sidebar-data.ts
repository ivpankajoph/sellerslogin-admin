import {
  Globe,
  HelpCircle,
  KeyRound,
  LayoutDashboard,
  LayoutTemplate,
  Map,
  MapPinned,
  PlugZap,
  SearchCheck,
  ShieldCheck,
  ShoppingCart,
  Star,
  Truck,
  Users,
} from 'lucide-react'
import type { SidebarData } from '../types'

export const ROLES = {
  ADMIN: 'admin',
  VENDOR: 'vendor',
} as const

export const sidebarData: Pick<SidebarData, 'navGroups'> = {
  navGroups: [
    {
      title: 'Overview',
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
          roles: [ROLES.ADMIN],
        },
        {
          title: 'Customers',
          url: '/users',
          icon: Users,
          roles: [ROLES.VENDOR],
        },
        {
          title: 'Analytics',
          url: '/analytics',
          icon: LayoutDashboard,
          roles: [ROLES.ADMIN],
        },
        {
          title: 'Storefront Analytics',
          url: '/analytics',
          icon: LayoutDashboard,
          roles: [ROLES.VENDOR],
        },
      ],
    },
    {
      title: 'Sales',
      roles: [ROLES.ADMIN, ROLES.VENDOR],
      items: [
        {
          title: 'Orders',
          icon: ShoppingCart,
          roles: [ROLES.ADMIN, ROLES.VENDOR],
          items: [
            {
              title: 'SellersLogin Orders',
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
              title: 'SellersLogin Wallet',
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
          title: 'Delivery Tracking',
          url: '/borzo-report',
          icon: Truck,
          roles: [ROLES.ADMIN, ROLES.VENDOR],
          requiresIntegration: 'borzo',
        },
        {
          title: 'Delivery Charges',
          url: '/delivery-charges',
          icon: Truck,
          roles: [ROLES.ADMIN],
        },
      ],
    },
    {
      title: 'Catalog',
      roles: [ROLES.ADMIN, ROLES.VENDOR],
      items: [
        {
          title: 'Products',
          icon: ShieldCheck,
          roles: [ROLES.ADMIN, ROLES.VENDOR],
          items: [
            {
              title: 'Show Products',
              url: '/products',
              roles: [ROLES.VENDOR],
            },
            {
              title: 'Create Product',
              url: '/products/create-products',
              roles: [ROLES.VENDOR],
            },
            {
              title: 'All Admin Products',
              url: '/products/admin-products',
              roles: [ROLES.ADMIN],
            },
            {
              title: 'Inventory Management',
              url: '/inventory-management',
              roles: [ROLES.ADMIN, ROLES.VENDOR],
            },
          ],
        },
        {
          title: 'Categories',
          icon: ShieldCheck,
          roles: [ROLES.ADMIN],
          items: [
            {
              title: 'Show Categories',
              url: '/category',
              roles: [ROLES.ADMIN],
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
      title: 'Vendor Management',
      roles: [ROLES.ADMIN],
      items: [
        {
          title: 'Vendors',
          url: '/vendor',
          icon: Users,
          roles: [ROLES.ADMIN],
        },
      ],
    },
    {
      title: 'Storefront',
      roles: [ROLES.ADMIN, ROLES.VENDOR],
      items: [
        {
          title: 'Template Catalog',
          url: '/template-catalog',
          icon: LayoutTemplate,
          roles: [ROLES.ADMIN],
        },
        {
          title: 'Template Workspace',
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
        {
          title: 'Get Domain',
          url: '/get-domain',
          icon: Globe,
          roles: [ROLES.VENDOR],
        },
        {
          title: 'Website Pages',
          icon: LayoutTemplate,
          roles: [ROLES.VENDOR],
          items: [
            {
              title: 'Homepage',
              url: '/vendor-template',
              roles: [ROLES.VENDOR],
            },
            {
              title: 'About Page',
              url: '/vendor-template-about',
              roles: [ROLES.VENDOR],
            },
            {
              title: 'Contact Page',
              url: '/vendor-template-contact',
              roles: [ROLES.VENDOR],
            },
            {
              title: 'Social + FAQs',
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
      title: 'Toolkit & Apps',
      roles: [ROLES.ADMIN, ROLES.VENDOR],
      useToolkitInstallFilter: true,
      items: [
        {
          title: 'Toolkit Store',
          url: '/integrations',
          icon: PlugZap,
          roles: [ROLES.ADMIN, ROLES.VENDOR],
        },
        {
          title: 'My Apps',
          icon: PlugZap,
          roles: [ROLES.ADMIN, ROLES.VENDOR],
          items: [
            {
              title: 'Cash on Delivery',
              url: '/integrations/cod',
              roles: [ROLES.ADMIN, ROLES.VENDOR],
              requiresIntegration: 'cod',
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
            {
              title: 'Brevo',
              url: '/integrations/brevo',
              roles: [ROLES.VENDOR],
              requiresIntegration: 'brevo',
            },
          ],
        },
      ],
    },
    {
      title: 'Marketing & SEO',
      roles: [ROLES.ADMIN],
      items: [
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
      ],
    },
    {
      title: 'Support',
      roles: [ROLES.ADMIN, ROLES.VENDOR],
      items: [
        {
          title: 'Customer Queries',
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
