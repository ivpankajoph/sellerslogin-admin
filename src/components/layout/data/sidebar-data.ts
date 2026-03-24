import {
  Activity,
  HelpCircle,
  KeyRound,
  LayoutDashboard,
  LayoutTemplate,
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
          pageKey: 'dashboard',
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
          pageKey: 'customers',
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
          pageKey: 'storefront_analytics',
        },
      ],
    },
    {
      title: 'Customer Inquiry',
      roles: [ROLES.ADMIN, ROLES.VENDOR],
      items: [
        {
          title: 'Customer Inquiry',
          url: '/customer-queries',
          icon: HelpCircle,
          roles: [ROLES.ADMIN, ROLES.VENDOR],
          pageKey: 'customer_queries',
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
              roles: [ROLES.ADMIN],
              pageKey: 'orders',
            },
            {
              title: 'Website Orders',
              url: '/template-orders',
              roles: [ROLES.ADMIN, ROLES.VENDOR],
              pageKey: 'orders',
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
              roles: [ROLES.ADMIN],
              pageKey: 'wallets',
            },
            {
              title: 'Website Wallet',
              url: '/template-wallet',
              roles: [ROLES.ADMIN, ROLES.VENDOR],
              pageKey: 'wallets',
            },
          ],
        },
        {
          title: 'Delivery Tracking',
          url: '/borzo-report',
          icon: Truck,
          roles: [ROLES.ADMIN, ROLES.VENDOR],
        },
        {
          title: 'Delivery Charges',
          url: '/delivery-charges',
          icon: Truck,
          roles: [ROLES.ADMIN, ROLES.VENDOR],
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
              title: 'Create Product',
              url: '/products/create-products',
              roles: [ROLES.VENDOR],
              pageKey: 'products',
            },
            {
              title: 'Show Products',
              url: '/products',
              roles: [ROLES.VENDOR],
              pageKey: 'products',
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
              pageKey: 'inventory_management',
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
          title: 'Show Websites',
          url: '/template-workspace',
          icon: LayoutTemplate,
          roles: [ROLES.ADMIN],
        },
        {
          title: 'My Websites',
          url: '/template-workspace',
          icon: LayoutTemplate,
          roles: [ROLES.VENDOR],
          pageKey: 'my_websites',
        },
        {
          title: 'Location Workspace',
          url: '/location-workspace',
          icon: MapPinned,
          roles: [ROLES.VENDOR],
          pageKey: 'location_workspace',
        },
        {
          title: 'Manage Locations',
          url: '/cities',
          icon: MapPinned,
          roles: [ROLES.ADMIN, ROLES.VENDOR],
          pageKey: 'manage_cities',
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
          pageKey: 'toolkit_store',
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
              pageKey: 'my_apps',
            },
            {
              title: 'Razorpay',
              url: '/integrations/razorpay',
              roles: [ROLES.ADMIN, ROLES.VENDOR],
              requiresIntegration: 'razorpay',
              pageKey: 'my_apps',
            },
            {
              title: 'Cashfree',
              url: '/integrations/cashfree',
              roles: [ROLES.ADMIN, ROLES.VENDOR],
              requiresIntegration: 'cashfree',
              pageKey: 'my_apps',
            },
            {
              title: 'Borzo',
              url: '/integrations/borzo',
              roles: [ROLES.ADMIN, ROLES.VENDOR],
              requiresIntegration: 'borzo',
              pageKey: 'my_apps',
            },
            {
              title: 'Delhivery',
              url: '/integrations/delhivery',
              roles: [ROLES.ADMIN, ROLES.VENDOR],
              requiresIntegration: 'delhivery',
              pageKey: 'my_apps',
            },
            {
              title: 'Brevo',
              url: '/integrations/brevo',
              roles: [ROLES.VENDOR],
              requiresIntegration: 'brevo',
              pageKey: 'my_apps',
            },
          ],
        },
      ],
    },
    {
      title: 'Marketing & SEO',
      roles: [ROLES.ADMIN, ROLES.VENDOR],
      items: [
        {
          title: 'SEO Manager',
          icon: SearchCheck,
          roles: [ROLES.ADMIN, ROLES.VENDOR],
          items: [
            {
              title: 'SEO Rules',
              url: '/seo',
              roles: [ROLES.ADMIN, ROLES.VENDOR],
              pageKey: 'seo_manager',
            },
            {
              title: 'Entity SEO',
              url: '/seo/entities',
              roles: [ROLES.ADMIN, ROLES.VENDOR],
              pageKey: 'seo_manager',
            },
            {
              title: 'Sitemap',
              url: '/seo/sitemaps',
              roles: [ROLES.ADMIN, ROLES.VENDOR],
              pageKey: 'seo_manager',
            },
          ],
        },
        {
          title: 'Meta Pixel',
          url: '/meta-pixel',
          icon: Activity,
          roles: [ROLES.VENDOR],
          pageKey: 'my_websites',
        },
      ],
    },
    {
      title: 'Reviews',
      roles: [ROLES.ADMIN, ROLES.VENDOR],
      items: [
        {
          title: 'Customer Reviews',
          url: '/customer-reviews',
          icon: Star,
          roles: [ROLES.ADMIN, ROLES.VENDOR],
          pageKey: 'customer_reviews',
        },
      ],
    },
    {
      title: 'Support',
      roles: [ROLES.ADMIN, ROLES.VENDOR],
      items: [
        {
          title: 'Help Center',
          url: '/help-center',
          icon: HelpCircle,
          roles: [ROLES.ADMIN, ROLES.VENDOR],
          pageKey: 'help_center',
        },
      ],
    },
    {
      title: 'User Management',
      roles: [ROLES.VENDOR],
      items: [
        {
          title: 'User Access',
          url: '/team-access',
          icon: Users,
          roles: [ROLES.VENDOR],
          pageKey: 'team_access',
        },
        {
          title: 'Analytics',
          url: '/team-access-analytics',
          icon: Activity,
          roles: [ROLES.VENDOR],
          pageKey: 'team_access',
        },
      ],
    },
  ],
}
