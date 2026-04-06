import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { 
  Eye, 
  MousePointerClick, 
  ShoppingCart, 
  CreditCard, 
  CheckCircle,
  Search,
  Package,
  Monitor,
  Smartphone,
  Tablet
} from "lucide-react";
import type { AnalyticsEvent } from "@/features/analytics-hub/lib/types";
import { formatDistanceToNow } from "date-fns";
import { formatINR } from "@/lib/currency";
import { resolveStorefrontHref } from "@/features/analytics-hub/lib/api";

interface LiveActivityFeedProps {
  events: AnalyticsEvent[];
  maxItems?: number;
}

const eventConfig = {
  pageview: { icon: Eye, color: 'bg-blue-500/10 text-blue-500', label: 'Page View' },
  productView: { icon: Package, color: 'bg-indigo-500/10 text-indigo-500', label: 'Product View' },
  search: { icon: Search, color: 'bg-violet-500/10 text-violet-500', label: 'Search' },
  click: { icon: MousePointerClick, color: 'bg-purple-500/10 text-purple-500', label: 'Click' },
  addToCart: { icon: ShoppingCart, color: 'bg-orange-500/10 text-orange-500', label: 'Add to Cart' },
  checkout: { icon: CreditCard, color: 'bg-yellow-500/10 text-yellow-500', label: 'Checkout' },
  purchase: { icon: CheckCircle, color: 'bg-green-500/10 text-green-500', label: 'Purchase' },
};

const deviceIcons = {
  desktop: Monitor,
  mobile: Smartphone,
  tablet: Tablet,
};

export function LiveActivityFeed({ events, maxItems = 20 }: LiveActivityFeedProps) {
  const displayEvents = events.slice(0, maxItems);

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">Live Activity</CardTitle>
          <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
            <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse mr-1.5" />
            Real-time
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[400px]">
          <div className="space-y-1 p-4 pt-0">
            {displayEvents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Eye className="h-8 w-8 text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground">No events yet</p>
                <p className="text-xs text-muted-foreground/70">Events will appear here in real-time</p>
              </div>
            ) : (
              displayEvents.map((event, index) => {
                const config = eventConfig[event.eventType as keyof typeof eventConfig] || eventConfig.pageview;
                const Icon = config.icon;
                const DeviceIcon = deviceIcons[event.device as keyof typeof deviceIcons] || Monitor;
                const pageHref = resolveStorefrontHref(event.pageUrl || undefined);
                const referrerHref = event.referrer && /^https?:\/\//i.test(event.referrer) ? event.referrer : "";
                
                return (
                  <div
                    key={event.id || index}
                    className="flex items-start gap-3 p-2 rounded-lg hover-elevate transition-colors"
                    data-testid={`activity-event-${index}`}
                  >
                    <div className={`p-1.5 rounded-md ${config.color}`}>
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium truncate">
                          {config.label}
                        </span>
                        <DeviceIcon className="h-3 w-3 text-muted-foreground" />
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        {event.pageTitle && (
                          pageHref ? (
                            <a
                              href={pageHref}
                              target="_blank"
                              rel="noreferrer"
                              className="max-w-[180px] truncate text-xs text-blue-600 underline-offset-2 hover:text-blue-700 hover:underline"
                              title={pageHref}
                            >
                              {event.pageTitle}
                            </a>
                          ) : (
                            <span className="text-xs text-muted-foreground truncate max-w-[180px]">
                              {event.pageTitle}
                            </span>
                          )
                        )}
                        {event.productName && (
                          <span className="text-xs text-muted-foreground truncate max-w-[180px]">
                            {event.productName}
                          </span>
                        )}
                        {event.metadata?.search_term && (
                          <span className="text-xs text-muted-foreground truncate max-w-[180px]">
                            Search: {String(event.metadata.search_term)}
                          </span>
                        )}
                        {event.cartTotal && (
                          <Badge variant="secondary" className="text-[10px] px-1 h-4">
                            {formatINR(event.cartTotal, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        {event.source && (
                          <Badge variant="outline" className="h-4 px-1 text-[10px] capitalize">
                            {event.source}
                          </Badge>
                        )}
                        {referrerHref ? (
                          <a
                            href={referrerHref}
                            target="_blank"
                            rel="noreferrer"
                            className="max-w-[150px] truncate text-[10px] text-blue-600 underline-offset-2 hover:text-blue-700 hover:underline"
                            title={event.referrer || undefined}
                          >
                            {event.referrer}
                          </a>
                        ) : null}
                        {event.country && (
                          <span className="text-[10px] text-muted-foreground/70">
                            {event.city ? `${event.city}, ` : ''}{event.country}
                          </span>
                        )}
                        {event.ip && (
                          <span className="text-[10px] text-muted-foreground/50">
                            {event.ip}
                          </span>
                        )}
                        <span className="text-[10px] text-muted-foreground/50">
                          {event.timestamp ? formatDistanceToNow(new Date(event.timestamp), { addSuffix: true }) : 'just now'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
