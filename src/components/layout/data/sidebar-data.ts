import {
  LayoutDashboard,
  HelpCircle,
  Users,
  ShieldCheck,
  ShoppingCart,
  Map,
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
          roles: [ROLES.ADMIN,ROLES.VENDOR], // admin only
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
      ],
    },

    {
      title: 'Category',
      roles: [ROLES.ADMIN,ROLES.VENDOR],
      items: [
        {
          title: 'All Categories',
          icon: ShieldCheck,
          roles: [ROLES.ADMIN,ROLES.VENDOR],
          items: [
            {
              title: 'Show Categories',
              url: '/category',
              roles: [ROLES.ADMIN,ROLES.VENDOR],
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
              roles: [ ROLES.VENDOR],
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
              roles: [ROLES.ADMIN,ROLES.VENDOR], // admin only
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
