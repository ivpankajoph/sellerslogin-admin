import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { 
  Eye, 
  MousePointerClick, 
  ShoppingCart, 
  CreditCard, 
  CheckCircle,
  Monitor,
  Smartphone,
  Tablet
} from "lucide-react";
import type { AnalyticsEvent } from "@/features/analytics-hub/lib/types";
import { formatDistanceToNow } from "date-fns";

interface LiveActivityFeedProps {
  events: AnalyticsEvent[];
  maxItems?: number;
}

const eventConfig = {
  pageview: { icon: Eye, color: 'bg-blue-500/10 text-blue-500', label: 'Page View' },
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
                          <span className="text-xs text-muted-foreground truncate max-w-[180px]">
                            {event.pageTitle}
                          </span>
                        )}
                        {event.productName && (
                          <span className="text-xs text-muted-foreground truncate max-w-[180px]">
                            {event.productName}
                          </span>
                        )}
                        {event.cartTotal && (
                          <Badge variant="secondary" className="text-[10px] px-1 h-4">
                            ${Number(event.cartTotal).toFixed(2)}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        {event.country && (
                          <span className="text-[10px] text-muted-foreground/70">
                            {event.city ? `${event.city}, ` : ''}{event.country}
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
