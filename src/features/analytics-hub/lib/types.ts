export type AnalyticsEvent = {
  id: string;
  eventType: "pageview" | "click" | "addToCart" | "checkout" | "purchase";
  sessionId: string;
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

export type RealtimeAnalytics = {
  liveUsers: number;
  activePages: { page: string; users: number }[];
  liveAddToCart: number;
  liveRevenue: number;
  recentEvents: AnalyticsEvent[];
};

export type AnalyticsSummary = {
  totalUsers: number;
  newUsers: number;
  returningUsers: number;
  totalPageViews: number;
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
  topProducts: { productId: string; name: string; revenue: number; sales: number }[];
  funnel: {
    productViews: number;
    addToCarts: number;
    checkouts: number;
    purchases: number;
  };
};
