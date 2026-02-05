import { useQuery } from "@tanstack/react-query";
import { useAnalyticsContext } from "@/features/analytics-hub/hooks/use-analytics-context";
import { buildApiUrl } from "@/features/analytics-hub/lib/api";
import { StatsCard } from "@/features/analytics-hub/components/dashboard/stats-card";
import { DonutChart } from "@/features/analytics-hub/components/charts/donut-chart";
import { BarChart } from "@/features/analytics-hub/components/charts/bar-chart";
import { DataTable } from "@/features/analytics-hub/components/tables/data-table";
import { Users, UserPlus, UserCheck, Globe } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { AnalyticsSummary } from "@/features/analytics-hub/lib/types";
import { getQueryFn } from "@/features/analytics-hub/lib/query";

export default function TrafficReport() {
  const { vendorId, source, templateId } = useAnalyticsContext();
  const sourceParam = source === "all" ? undefined : source;
  const templateParam = templateId === "all" ? undefined : templateId;
  const queryFn = getQueryFn<AnalyticsSummary>();
  const { data, isLoading } = useQuery<AnalyticsSummary>({
    queryKey: [buildApiUrl("/analytics/dashboard/summary", { vendorId, source: sourceParam, template_id: templateParam })],
    queryFn,
  });
  const cardClassName =
    "border border-sky-100/80 bg-white/85 shadow-sm backdrop-blur-sm dark:border-border dark:bg-card";

  const sourceColors: Record<string, string> = {
    organic: 'var(--chart-1)',
    direct: 'var(--chart-2)',
    social: 'var(--chart-3)',
    paid: 'var(--chart-4)',
    referral: 'var(--chart-5)',
  };

  const deviceColors: Record<string, string> = {
    desktop: 'var(--chart-1)',
    mobile: 'var(--chart-2)',
    tablet: 'var(--chart-3)',
  };

  const browserColors: Record<string, string> = {
    Chrome: 'hsl(217, 91%, 60%)',
    Safari: 'hsl(220, 50%, 50%)',
    Firefox: 'hsl(30, 100%, 50%)',
    Edge: 'hsl(200, 100%, 45%)',
    Opera: 'hsl(0, 100%, 50%)',
  };

  const trafficBySource = (data?.trafficBySource || []).map(item => ({
    name: item.source.charAt(0).toUpperCase() + item.source.slice(1),
    value: item.count,
    color: sourceColors[item.source.toLowerCase()] || 'var(--muted)',
  }));

  const trafficByDevice = (data?.trafficByDevice || []).map(item => ({
    name: item.device.charAt(0).toUpperCase() + item.device.slice(1),
    value: item.count,
    color: deviceColors[item.device.toLowerCase()] || 'var(--muted)',
  }));

  const trafficByBrowser = (data?.trafficByBrowser || []).map(item => ({
    name: item.browser,
    value: item.count,
    color: browserColors[item.browser] || 'var(--chart-5)',
  }));

  const trafficByCountry = (data?.trafficByCountry || []).map(item => ({
    name: item.country || 'Unknown',
    value: item.count,
  }));



  const totalUsers = (data?.newUsers || 0) + (data?.returningUsers || 0);
  const newUsersPercent = totalUsers > 0 ? ((data?.newUsers || 0) / totalUsers) * 100 : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-page-title">Traffic Report</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Analyze your website traffic sources, demographics, and user behavior
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Users"
          value={data?.totalUsers || 0}
          description="Unique visitors"
          icon={<Users className="h-4 w-4" />}
          isLoading={isLoading}
        />
        <StatsCard
          title="New Users"
          value={data?.newUsers || 0}
          description={`${newUsersPercent.toFixed(1)}% of total`}
          trend={8.5}
          icon={<UserPlus className="h-4 w-4" />}
          isLoading={isLoading}
        />
        <StatsCard
          title="Returning Users"
          value={data?.returningUsers || 0}
          description={`${(100 - newUsersPercent).toFixed(1)}% of total`}
          trend={-2.3}
          icon={<UserCheck className="h-4 w-4" />}
          isLoading={isLoading}
        />
        <StatsCard
          title="Sessions"
          value={data?.totalSessions || 0}
          description="Total sessions"
          icon={<Globe className="h-4 w-4" />}
          isLoading={isLoading}
        />
      </div>

      <Card className={cardClassName}>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">New vs Returning Users</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-8">
            <div className="flex-1 space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-primary" />
                    New Users
                  </span>
                  <span className="text-muted-foreground">
                    {data?.newUsers?.toLocaleString() || 0} ({newUsersPercent.toFixed(1)}%)
                  </span>
                </div>
                <Progress value={newUsersPercent} className="h-2" />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: 'var(--chart-2)' }} />
                    Returning Users
                  </span>
                  <span className="text-muted-foreground">
                    {data?.returningUsers?.toLocaleString() || 0} ({(100 - newUsersPercent).toFixed(1)}%)
                  </span>
                </div>
                <Progress value={100 - newUsersPercent} className="h-2" />
              </div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold tabular-nums">{totalUsers.toLocaleString()}</div>
              <div className="text-sm text-muted-foreground">Total Users</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <DonutChart
          title="Traffic by Source"
          data={trafficBySource}
          isLoading={isLoading}
        />
        <DonutChart
          title="Traffic by Device"
          data={trafficByDevice}
          isLoading={isLoading}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <BarChart
          title="Traffic by Browser"
          data={trafficByBrowser}
          isLoading={isLoading}
          height={250}
        />
        <BarChart
          title="Traffic by Country"
          data={trafficByCountry.slice(0, 10)}
          isLoading={isLoading}
          horizontal
          height={250}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <DataTable
          title="Top Countries"
          data={trafficByCountry}
          columns={[
            { header: 'Country', accessorKey: 'name' },
            { header: 'Users', accessorKey: 'value', className: 'text-right tabular-nums' },
          ]}
          isLoading={isLoading}
          pageSize={8}
          emptyMessage="No country data available"
        />
        <DataTable
          title="Top Regions"
          data={(data?.trafficByRegion || []).map(r => ({ name: r.region || 'Unknown', value: r.count }))}
          columns={[
            { header: 'Region', accessorKey: 'name' },
            { header: 'Users', accessorKey: 'value', className: 'text-right tabular-nums' },
          ]}
          isLoading={isLoading}
          pageSize={8}
          emptyMessage="No region data available"
        />
      </div>
    </div>
  );
}

