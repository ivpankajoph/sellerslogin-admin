import {
  Activity,
  HelpCircle,
  KeyRound,
  LayoutDashboard,
  LayoutTemplate,
  ListPlus,
  MapPinned,
  Mail,
  ReceiptText,
  Send,
  PlugZap,
  SearchCheck,
  ShieldCheck,
  ShoppingCart,
  Store,
  Tags,
  Truck,
  UtensilsCrossed,
  Users,
  AlignVerticalJustifyStart,
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
          title: 'Customers',
          icon: Users,
          roles: [ROLES.ADMIN],
          items: [
            {
              title: 'Customer List',
              url: '/users',
              roles: [ROLES.ADMIN],
              pageKey: 'customers',
            },
            {
              title: 'Customer Queries',
              url: '/customer-queries',
              roles: [ROLES.ADMIN],
              pageKey: 'customer_queries',
            },
            {
              title: 'Customer Reviews',
              url: '/customer-reviews',
              roles: [ROLES.ADMIN],
              pageKey: 'customer_reviews',
            },
          ],
        },
        {
          title: 'Customers',
          icon: Users,
          roles: [ROLES.VENDOR],
          items: [
            {
              title: 'Customer List',
              url: '/users',
              roles: [ROLES.VENDOR],
              pageKey: 'customers',
            },
            {
              title: 'Customer Inquiries',
              url: '/customer-queries',
              roles: [ROLES.VENDOR],
              pageKey: 'customer_queries',
            },
            {
              title: 'Customer Reviews',
              url: '/customer-reviews',
              roles: [ROLES.VENDOR],
              pageKey: 'customer_reviews',
            },
          ],
        },
        {
          title: 'Analytics',
          url: '/analytics',
          icon: LayoutDashboard,
          roles: [ROLES.ADMIN],
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
      ],
    },
    {
      title: 'Courier',
      roles: [ROLES.ADMIN, ROLES.VENDOR],
      items: [
        {
          title: 'Sellerslogin Delivery System',
          url: '/delivery-system',
          icon: Truck,
          roles: [ROLES.ADMIN, ROLES.VENDOR],
          pageKey: 'orders',
        },
        {
          title: 'Delivery Markup',
          url: '/delivery-markup',
          icon: ReceiptText,
          roles: [ROLES.ADMIN],
        },
      ],
    },
    {
      title: 'Product Management',
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
              title: 'All Products',
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
      title: 'Food Menu Manager',
      roles: [ROLES.VENDOR],
      items: [
        {
          title: 'Food Hub',
          icon: UtensilsCrossed,
          roles: [ROLES.VENDOR],
          pageKey: 'products',
          items: [
            {
              title: 'Restaurant / Food Setup',
              url: '/food#restaurant-setup',
              icon: Store,
              roles: [ROLES.VENDOR],
              pageKey: 'products',
            },
            {
              title: 'Food Items',
              url: '/food#food-items',
              icon: ListPlus,
              roles: [ROLES.VENDOR],
              pageKey: 'products',
            },
            {
              title: 'All Items',
              url: '/food#all-items',
              icon: ListPlus,
              roles: [ROLES.VENDOR],
              pageKey: 'products',
            },
            {
              title: 'Create Offer / Combo',
              url: '/food#offer-form',
              icon: Tags,
              roles: [ROLES.VENDOR],
              pageKey: 'products',
            },
            {
              title: 'All Offers',
              url: '/food#all-offers',
              icon: Tags,
              roles: [ROLES.VENDOR],
              pageKey: 'products',
            },
            {
              title: 'Orders',
              url: '/food#orders',
              icon: ReceiptText,
              roles: [ROLES.VENDOR],
              pageKey: 'products',
            },
          ],
        },
      ],
    },
    {
      title: 'Restaurant POS / Inventory',
      roles: [ROLES.VENDOR],
      items: [
        {
          title: 'Dashboard',
          url: '/food/dashboard',
          icon: LayoutDashboard,
          roles: [ROLES.VENDOR],
          pageKey: 'products',
        },
        {
          title: 'Store Admin',
          icon: ShieldCheck,
          roles: [ROLES.VENDOR],
          pageKey: 'products',
          items: [
            {
              title: 'Menu Items',
              url: '/food/menu-items',
              icon: ListPlus,
              roles: [ROLES.VENDOR],
              pageKey: 'products',
            },
            {
              title: 'Waiter List',
              url: '/food/waiters',
              icon: Users,
              roles: [ROLES.VENDOR],
              pageKey: 'products',
            },
            {
              title: 'Table List',
              url: '/food/tables',
              icon: Store,
              roles: [ROLES.VENDOR],
              pageKey: 'products',
            },
            {
              title: 'Customer List',
              url: '/food/customers',
              icon: Users,
              roles: [ROLES.VENDOR],
              pageKey: 'products',
            },
            {
              title: 'Cashier List',
              url: '/food/cashiers',
              icon: ShieldCheck,
              roles: [ROLES.VENDOR],
              pageKey: 'products',
            },
          ],
        },
        {
          title: 'Operations',
          icon: ReceiptText,
          roles: [ROLES.VENDOR],
          pageKey: 'products',
          items: [
            {
              title: 'POS Billing',
              url: '/food/pos',
              icon: ShoppingCart,
              roles: [ROLES.VENDOR],
              pageKey: 'products',
            },
            {
              title: 'Bill Status',
              url: '/food/bill-status',
              icon: ReceiptText,
              roles: [ROLES.VENDOR],
              pageKey: 'products',
            },
            {
              title: 'Table Reservations',
              url: '/food/table-reservations',
              icon: Store,
              roles: [ROLES.VENDOR],
              pageKey: 'products',
            },
            {
              title: 'All Orders',
              url: '/food/online-orders',
              icon: ReceiptText,
              roles: [ROLES.VENDOR],
              pageKey: 'products',
            },
            {
              title: 'Menu Share History',
              url: '/food/menu-shares',
              icon: Send,
              roles: [ROLES.VENDOR],
              pageKey: 'products',
            },
          ],
        },
        {
          title: 'Inventory',
          url: '/food/inventory',
          icon: ShieldCheck,
          roles: [ROLES.VENDOR],
          pageKey: 'products',
        },
        {
          title: 'Reports',
          icon: Activity,
          roles: [ROLES.VENDOR],
          pageKey: 'products',
          items: [
            {
              title: 'Sales Report',
              url: '/food/reports?tab=sales',
              icon: Activity,
              roles: [ROLES.VENDOR],
              pageKey: 'products',
            },
            {
              title: 'Hot Products',
              url: '/food/reports?tab=hot-products',
              icon: Tags,
              roles: [ROLES.VENDOR],
              pageKey: 'products',
            },
            {
              title: 'CRM / Repeat Customers',
              url: '/food/reports?tab=repeat-customers',
              icon: Users,
              roles: [ROLES.VENDOR],
              pageKey: 'products',
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
        {
          title: 'Tukka Registrations',
          url: '/tukka-submissions',
          icon: Activity,
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
        // Location Workspace is temporarily hidden from the sidebar.
        // {
        //   title: 'Location Workspace',
        //   url: '/location-workspace',
        //   icon: MapPinned,
        //   roles: [ROLES.VENDOR],
        //   pageKey: 'location_workspace',
        // },
        {
          title: 'Manage Locations',
          url: '/cities',
          icon: MapPinned,
          roles: [ROLES.VENDOR],
          pageKey: 'manage_cities',
        },
      ],
    },
    {
      title: 'Sellerslogin Apps',
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
              title: 'Delhivery',
              url: '/integrations/delhivery',
              roles: [ROLES.ADMIN, ROLES.VENDOR],
              requiresIntegration: 'delhivery',
              pageKey: 'my_apps',
            },
            {
              title: 'Google Merchant',
              url: '/integrations/google_merchant',
              roles: [ROLES.ADMIN, ROLES.VENDOR],
              requiresIntegration: 'google_merchant',
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
          title: 'Email Marketing',
          url: '/email-marketing',
          icon: Mail,
          roles: [ROLES.ADMIN, ROLES.VENDOR],
        },
        {
          title: 'SEO Manager',
          icon: SearchCheck,
          roles: [ROLES.ADMIN, ROLES.VENDOR],
          items: [
            {
              title: 'Store Management Analytics',
              icon: AlignVerticalJustifyStart,
              url: '/analytics',
              roles: [ROLES.VENDOR],
              pageKey: 'storefront_analytics',
            },
            {
              title: 'Sitemap',
              url: '/seo/sitemaps',
              roles: [ROLES.ADMIN, ROLES.VENDOR],
              pageKey: 'seo_manager',
            },
            {
              title: 'SEO Edit Page',
              url: '/seo/meta-tags',
              roles: [ROLES.ADMIN, ROLES.VENDOR],
              pageKey: 'seo_manager',
            },
          ],
        },
        {
          title: 'Meta Pixel',
          icon: Activity,
          roles: [ROLES.VENDOR],
          items: [
            {
              title: 'Connect With Meta Pixel',
              url: '/meta-pixel/connect',
              roles: [ROLES.VENDOR],
              pageKey: 'my_websites',
            },
            {
              title: 'Pixel Analytics',
              url: '/meta-pixel/analytics',
              roles: [ROLES.VENDOR],
              pageKey: 'my_websites',
            },
          ],
        },
      ],
    },
    {
      title: 'User Management',
      roles: [ROLES.VENDOR],
      items: [
        {
          title: 'User Management',
          icon: Users,
          roles: [ROLES.VENDOR],
          items: [
            {
              title: 'User Access',
              url: '/team-access',
              roles: [ROLES.VENDOR],
              pageKey: 'team_access',
            },
            {
              title: 'User Analytics',
              url: '/team-access-analytics',
              roles: [ROLES.VENDOR],
              pageKey: 'team_access',
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
          title: 'Help Center',
          url: '/help-center',
          icon: HelpCircle,
          roles: [ROLES.ADMIN, ROLES.VENDOR],
          pageKey: 'help_center',
        },
        {
          title: 'Live Chat',
          url: '/live-chat',
          icon: HelpCircle,
          roles: [ROLES.ADMIN, ROLES.VENDOR],
          pageKey: 'live_chat',
        },
      ],
    },
  ],
}
