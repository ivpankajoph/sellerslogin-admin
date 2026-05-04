export const subscriberStatuses = [
  'subscribed',
  'unsubscribed',
  'bounced',
  'blocked',
  'complained',
  'suppressed',
]

export const subscriberSources = [
  'website_signup',
  'checkout',
  'popup',
  'admin_import',
  'lead_magnet',
  'referral',
  'manual',
]

export const segmentFieldOptions = [
  { value: 'status', label: 'Status' },
  { value: 'source', label: 'Source' },
  { value: 'sourceLocation', label: 'Source / location' },
  { value: 'tags', label: 'Tags' },
  { value: 'country', label: 'Country' },
  { value: 'state', label: 'State' },
  { value: 'city', label: 'City' },
  { value: 'totalOrders', label: 'Total orders' },
  { value: 'totalSpent', label: 'Total spent' },
  { value: 'engagementScore', label: 'Engagement score' },
  { value: 'lastOrderDate', label: 'Last order date' },
  { value: 'lastOpenAt', label: 'Last open at' },
  { value: 'lastClickAt', label: 'Last click at' },
  { value: 'lastActivityAt', label: 'Last activity at' },
  { value: 'purchasedInLastDays', label: 'Purchased in last X days' },
  { value: 'cartAbandoners', label: 'Cart abandoners placeholder' },
  { value: 'inactiveUsers', label: 'Inactive users' },
  { value: 'firstTimeBuyers', label: 'First-time buyers' },
  { value: 'repeatBuyers', label: 'Repeat buyers' },
  { value: 'highValueCustomers', label: 'High value customers' },
  { value: 'openedButDidNotClick', label: 'Opened but did not click' },
  { value: 'clickedButDidNotPurchase', label: 'Clicked but did not purchase placeholder' },
]

export const operatorOptions = {
  status: [
    { value: 'eq', label: 'is' },
    { value: 'in', label: 'is any of' },
  ],
  source: [
    { value: 'eq', label: 'is' },
    { value: 'in', label: 'is any of' },
  ],
  sourceLocation: [
    { value: 'eq', label: 'is' },
    { value: 'in', label: 'is any of' },
  ],
  tags: [
    { value: 'in', label: 'has any tag' },
    { value: 'all', label: 'has all tags' },
  ],
  country: [{ value: 'eq', label: 'is' }],
  state: [{ value: 'eq', label: 'is' }],
  city: [{ value: 'eq', label: 'is' }],
  totalOrders: [
    { value: 'gte', label: 'is at least' },
    { value: 'lte', label: 'is at most' },
    { value: 'eq', label: 'is exactly' },
  ],
  totalSpent: [
    { value: 'gte', label: 'is at least' },
    { value: 'lte', label: 'is at most' },
    { value: 'eq', label: 'is exactly' },
  ],
  engagementScore: [
    { value: 'gte', label: 'is at least' },
    { value: 'lte', label: 'is at most' },
  ],
  lastOrderDate: [
    { value: 'after', label: 'is after' },
    { value: 'before', label: 'is before' },
  ],
  lastOpenAt: [
    { value: 'after', label: 'is after' },
    { value: 'before', label: 'is before' },
  ],
  lastClickAt: [
    { value: 'after', label: 'is after' },
    { value: 'before', label: 'is before' },
  ],
  lastActivityAt: [
    { value: 'after', label: 'is after' },
    { value: 'before', label: 'is before' },
  ],
  purchasedInLastDays: [{ value: 'gte', label: 'within last days' }],
  cartAbandoners: [{ value: 'eq', label: 'matches placeholder' }],
  inactiveUsers: [{ value: 'gte', label: 'inactive for days' }],
  firstTimeBuyers: [{ value: 'eq', label: 'matches rule' }],
  repeatBuyers: [{ value: 'gte', label: 'orders at least' }],
  highValueCustomers: [{ value: 'gte', label: 'spent at least' }],
  openedButDidNotClick: [{ value: 'eq', label: 'matches rule' }],
  clickedButDidNotPurchase: [{ value: 'eq', label: 'matches placeholder' }],
}
