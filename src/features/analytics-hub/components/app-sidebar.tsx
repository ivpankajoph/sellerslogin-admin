import { Link, useLocation } from "@tanstack/react-router";
import {
  ArrowLeft,
  BarChart3,
  Users,
  MousePointerClick,
  ShoppingCart,
  TrendingUp,
  Activity,
  Globe,
  Store,
  FileText,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";

import { useSelector } from "react-redux";

const dashboardItems = [
  { title: "Real-Time", url: "/analytics", icon: Activity, badge: "Live" },
  { title: "Traffic Report", url: "/analytics/traffic", icon: Globe },
  { title: "Behavior Analytics", url: "/analytics/behavior", icon: MousePointerClick },
  { title: "E-commerce", url: "/analytics/ecommerce", icon: ShoppingCart },
];

const reportItems = [
  { title: "Summary Report", url: "/analytics/reports", icon: FileText },
  { title: "Funnel Analysis", url: "/analytics/funnel", icon: TrendingUp },
];

export function AnalyticsAppSidebar() {
  const location = useLocation({ select: (loc) => loc.pathname });
  const storefrontUrl = import.meta.env.VITE_PUBLIC_STOREFRONT_URL || "";
  const templateStorefrontUrl = import.meta.env.VITE_PUBLIC_API_URL_TEMPLATE_FRONTEND || "";
  const role = useSelector((state: any) => state.auth?.user?.role);

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <BarChart3 className="h-4 w-4" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold">Analytics Hub</span>
              <span className="text-xs text-muted-foreground">E-commerce Insights</span>
            </div>
          </div>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                className="bg-amber-400 text-slate-900 hover:bg-amber-300"
              >
                <Link to="/">
                  <ArrowLeft className="h-4 w-4" />
                  <span>Back to Dashboard</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Dashboard</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {dashboardItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={location === item.url}>
                    <Link to={item.url} data-testid={`link-nav-${item.title.toLowerCase().replace(/\s+/g, '-')}`}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                      {item.badge ? (
                        <Badge className="ml-auto h-4 bg-green-500 px-1.5 py-0 text-[10px] hover:bg-green-500">
                          {item.badge}
                        </Badge>
                      ) : null}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Reports</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {reportItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={location === item.url}>
                    <Link to={item.url} data-testid={`link-nav-${item.title.toLowerCase().replace(/\s+/g, '-')}`}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {role !== "vendor" && (
          <SidebarGroup>
            <SidebarGroupLabel>Storefront</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={false}>
                    {storefrontUrl ? (
                      <a
                        href={storefrontUrl}
                        target="_blank"
                        rel="noreferrer"
                        data-testid="link-nav-storefront"
                      >
                        <Store className="h-4 w-4" />
                        <span>Ophmate Storefront</span>
                      </a>
                    ) : (
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <Store className="h-4 w-4" />
                        <span>Storefront URL missing</span>
                      </span>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={false}>
                    {templateStorefrontUrl ? (
                      <a
                        href={templateStorefrontUrl}
                        target="_blank"
                        rel="noreferrer"
                        data-testid="link-nav-template-storefront"
                      >
                        <Store className="h-4 w-4" />
                        <span>Vendor Templates</span>
                      </a>
                    ) : (
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <Store className="h-4 w-4" />
                        <span>Template URL missing</span>
                      </span>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="p-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Users className="h-3 w-3" />
          <span>Tracking active</span>
          <span className="ml-auto h-2 w-2 animate-pulse rounded-full bg-green-500" />
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
