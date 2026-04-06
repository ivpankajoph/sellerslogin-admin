export type AnalyticsEvent = {
  id: string;
  eventType:
    | "pageview"
    | "click"
    | "addToCart"
    | "checkout"
    | "purchase"
    | "productView"
    | "search";
  sessionId: string;
  visitorId?: string | null;
  userId?: string | null;
  device?: string | null;
  browser?: string | null;
  os?: string | null;
  ip?: string | null;
  region?: string | null;
  country?: string | null;
  city?: string | null;
  pageUrl?: string | null;
  pageTitle?: string | null;
  referrer?: string | null;
  productId?: string | null;
  productName?: string | null;
  productPrice?: number | null;
  quantity?: number | null;
  cartTotal?: number | null;
  orderId?: string | null;
  source?: string | null;
  medium?: string | null;
  campaign?: string | null;
  metadata?: Record<string, any> | null;
  timestamp: string | Date;
};

export type AnalyticsEventRecord = {
  _id: string;
  eventType: string;
  sessionId?: string | null;
  visitorId?: string | null;
  userId?: string | null;
  vendorId?: string | null;
  path?: string | null;
  fullUrl?: string | null;
  title?: string | null;
  referrer?: string | null;
  referrerHost?: string | null;
  ip?: string | null;
  device?: string | null;
  browser?: string | null;
  os?: string | null;
  source?: string | null;
  medium?: string | null;
  campaign?: string | null;
  country?: string | null;
  region?: string | null;
  city?: string | null;
  productId?: string | null;
  productName?: string | null;
  productPrice?: number | null;
  quantity?: number | null;
  cartTotal?: number | null;
  orderId?: string | null;
  metadata?: Record<string, any> | null;
  createdAt: string | Date;
  user?: {
    name?: string | null;
    email?: string | null;
    phone?: string | null;
  } | null;
};

export type AnalyticsEventsResponse = {
  success: boolean;
  page: number;
  pageSize: number;
  total: number;
  events: AnalyticsEventRecord[];
};

export type AnalyticsSession = {
  sessionId: string;
  visitorId?: string | null;
  userId?: string | null;
  ip?: string | null;
  device?: string | null;
  browser?: string | null;
  os?: string | null;
  source?: string | null;
  country?: string | null;
  region?: string | null;
  city?: string | null;
  currentPage?: string | null;
  currentStage?: string | null;
  productName?: string | null;
  productNames?: string[];
  searchTerms?: string[];
  cartItems?: {
    productId?: string | null;
    productName?: string | null;
    quantity?: number | null;
  }[];
  eventCount: number;
  startedAt?: string | Date | null;
  lastSeenAt?: string | Date | null;
};

export type RealtimeAnalytics = {
  liveUsers: number;
  activePages: { page: string; users: number }[];
  liveAddToCart: number;
  liveRevenue: number;
  recentEvents: AnalyticsEvent[];
  activeSessions: AnalyticsSession[];
  stageCounts: { stage: string; count: number }[];
};

export type AnalyticsTimelinePoint = {
  label: string;
  date: string;
  users: number;
  sessions: number;
  pageViews: number;
  productViews: number;
  searches: number;
  addToCarts: number;
  checkouts: number;
  purchases: number;
  revenue: number;
};

export type AnalyticsTopSearch = {
  term: string;
  count: number;
  results?: number;
};

export type AnalyticsSummary = {
  range?: {
    from?: string | Date;
    to?: string | Date;
  };
  totalUsers: number;
  newUsers: number;
  returningUsers: number;
  totalPageViews: number;
  totalProductViews: number;
  totalSearches: number;
  totalSessions: number;
  avgSessionDuration: number;
  bounceRate: number;
  trafficBySource: { source: string; count: number }[];
  trafficByCountry: { country: string; count: number }[];
  trafficByRegion: { region: string; count: number }[];
  trafficByCity: { city: string; count: number }[];
  trafficByDevice: { device: string; count: number }[];
  trafficByBrowser: { browser: string; count: number }[];
  topPages: { page: string; views: number; avgTime: number }[];
  dropOffPages: { page: string; exitRate: number }[];
  totalRevenue: number;
  totalOrders: number;
  conversionRate: number;
  avgOrderValue: number;
  abandonedCarts: number;
  topProducts: {
    productId: string;
    name: string;
    revenue: number;
    sales: number;
    views?: number;
    addToCarts?: number;
    checkouts?: number;
    purchases?: number;
  }[];
  topSearches: AnalyticsTopSearch[];
  timeline: AnalyticsTimelinePoint[];
  funnel: {
    productViews: number;
    addToCarts: number;
    checkouts: number;
    purchases: number;
  };
};
