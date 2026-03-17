export type VendorPageAccessKey =
  | 'dashboard'
  | 'customers'
  | 'storefront_analytics'
  | 'orders'
  | 'wallets'
  | 'products'
  | 'inventory_management'
  | 'my_websites'
  | 'manage_cities'
  | 'get_domain'
  | 'toolkit_store'
  | 'my_apps'
  | 'seo_manager'
  | 'customer_queries'
  | 'customer_reviews'
  | 'help_center'
  | 'sitemaps'
  | 'team_access'

export type VendorPageAccessOption = {
  key: VendorPageAccessKey
  label: string
  description: string
}

export const VENDOR_PAGE_ACCESS_OPTIONS: VendorPageAccessOption[] = [
  {
    key: 'dashboard',
    label: 'Dashboard',
    description: 'View the vendor dashboard overview.',
  },
  {
    key: 'customers',
    label: 'Customers',
    description: 'Open the customer list and customer records.',
  },
  {
    key: 'storefront_analytics',
    label: 'Storefront Analytics',
    description: 'View storefront performance and analytics pages.',
  },
  {
    key: 'orders',
    label: 'Orders',
    description: 'Manage SellersLogin and template orders.',
  },
  {
    key: 'wallets',
    label: 'Wallets',
    description: 'Access wallet and payout information.',
  },
  {
    key: 'products',
    label: 'Products',
    description: 'View and manage product listings.',
  },
  {
    key: 'inventory_management',
    label: 'Inventory Management',
    description: 'Manage inventory and stock updates.',
  },
  {
    key: 'my_websites',
    label: 'My Websites',
    description: 'Access assigned websites and website builder pages.',
  },
  {
    key: 'manage_cities',
    label: 'Manage Cities',
    description: 'Manage the cities available for the storefront.',
  },
  {
    key: 'get_domain',
    label: 'Get Domain',
    description: 'Connect and manage website domain settings.',
  },
  {
    key: 'toolkit_store',
    label: 'Toolkit Store',
    description: 'Browse and install toolkit apps.',
  },
  {
    key: 'my_apps',
    label: 'My Apps',
    description: 'Access installed toolkit app pages.',
  },
  {
    key: 'seo_manager',
    label: 'SEO Manager',
    description: 'Manage SEO rules and SEO entity pages.',
  },
  {
    key: 'customer_queries',
    label: 'Customer Queries',
    description: 'Review and respond to customer queries.',
  },
  {
    key: 'customer_reviews',
    label: 'Customer Reviews',
    description: 'Read and manage customer reviews.',
  },
  {
    key: 'help_center',
    label: 'Help Center',
    description: 'Access help-center tickets and support screens.',
  },
  {
    key: 'sitemaps',
    label: 'Sitemaps',
    description: 'View website sitemap tools.',
  },
]

type RouteMatcher = {
  key: VendorPageAccessKey
  exact?: string[]
  prefixes?: string[]
}

const ROUTE_MATCHERS: RouteMatcher[] = [
  { key: 'dashboard', exact: ['/'] },
  { key: 'team_access', exact: ['/team-access', '/team-access-analytics'] },
  { key: 'customers', exact: ['/users'] },
  { key: 'storefront_analytics', prefixes: ['/analytics'] },
  { key: 'orders', exact: ['/order', '/template-orders'] },
  { key: 'wallets', exact: ['/wallet', '/template-wallet'] },
  {
    key: 'products',
    exact: ['/products', '/products/create-products', '/products/admin-products'],
  },
  { key: 'inventory_management', exact: ['/inventory-management'] },
  {
    key: 'my_websites',
    prefixes: [
      '/template-workspace',
      '/vendor-template',
      '/vendor-template-about',
      '/vendor-template-contact',
      '/vendor-template-other',
      '/vendor-template-pages',
    ],
  },
  { key: 'manage_cities', exact: ['/cities'] },
  { key: 'get_domain', exact: ['/get-domain'] },
  { key: 'toolkit_store', exact: ['/integrations'] },
  { key: 'my_apps', prefixes: ['/integrations/', '/connect-brevo', '/borzo-report'] },
  { key: 'seo_manager', prefixes: ['/seo'] },
  { key: 'customer_queries', exact: ['/customer-queries'] },
  { key: 'customer_reviews', exact: ['/customer-reviews'] },
  { key: 'help_center', exact: ['/help-center'] },
  { key: 'sitemaps', exact: ['/sitemaps'] },
]

const FIRST_PAGE_ROUTE_BY_KEY: Partial<Record<VendorPageAccessKey, string>> = {
  dashboard: '/',
  customers: '/users',
  storefront_analytics: '/analytics',
  orders: '/order',
  wallets: '/wallet',
  products: '/products',
  inventory_management: '/inventory-management',
  my_websites: '/template-workspace',
  manage_cities: '/cities',
  get_domain: '/get-domain',
  toolkit_store: '/integrations',
  my_apps: '/integrations',
  seo_manager: '/seo',
  customer_queries: '/customer-queries',
  customer_reviews: '/customer-reviews',
  help_center: '/help-center',
  sitemaps: '/sitemaps',
  team_access: '/team-access',
}

export const normalizeVendorPageAccess = (
  value: unknown
): Set<VendorPageAccessKey> =>
  new Set(
    Array.isArray(value)
      ? value
          .map((item) => String(item || '').trim())
          .filter(Boolean) as VendorPageAccessKey[]
      : []
  )

export const resolveVendorPageAccessKey = (
  pathname: string
): VendorPageAccessKey | null => {
  const normalized = String(pathname || '').trim() || '/'
  for (const matcher of ROUTE_MATCHERS) {
    if (matcher.exact?.includes(normalized)) return matcher.key
    if (matcher.prefixes?.some((prefix) => normalized.startsWith(prefix))) {
      return matcher.key
    }
  }
  return null
}

export const getFirstAccessibleVendorRoute = (
  pageAccess: Iterable<VendorPageAccessKey>
): string => {
  for (const option of VENDOR_PAGE_ACCESS_OPTIONS) {
    if (Array.from(pageAccess).includes(option.key)) {
      return FIRST_PAGE_ROUTE_BY_KEY[option.key] || '/'
    }
  }
  return '/'
}

export const canAccessVendorPath = (
  pathname: string,
  pageAccess: Set<VendorPageAccessKey>
): boolean => {
  const key = resolveVendorPageAccessKey(pathname)
  if (!key) return true
  return pageAccess.has(key)
}
