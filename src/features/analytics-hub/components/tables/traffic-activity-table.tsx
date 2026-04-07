import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAnalyticsContext } from "@/features/analytics-hub/hooks/use-analytics-context";
import { buildAnalyticsDateParams, buildApiUrl, resolveStorefrontHref } from "@/features/analytics-hub/lib/api";
import { getQueryFn } from "@/features/analytics-hub/lib/query";
import type {
  AnalyticsEventRecord,
  AnalyticsEventsResponse,
  AnalyticsSummary,
} from "@/features/analytics-hub/lib/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const PAGE_SIZE = 20;
const TABLE_MIN_WIDTH = 1280;

const titleCase = (value: string) =>
  value
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1).toLowerCase())
    .join(" ");

const formatEventType = (eventType?: string | null) => {
  const value = String(eventType || "").trim();
  if (!value) return "Activity";
  return titleCase(value.replace(/_/g, " "));
};

const getBrowserFamily = (browser?: string | null) =>
  String(browser || "").trim().split(/\s+/)[0] || "Unknown";

const getSourceLabel = (event: AnalyticsEventRecord) => {
  const rawSource = String(event.source || "").trim();
  const referrer = String(event.referrer || "").toLowerCase();
  const fullUrl = String(event.fullUrl || "").toLowerCase();
  const path = String(event.path || "").toLowerCase();
  const metadataSource = String(
    event.metadata?.utmSource ||
      event.metadata?.source ||
      event.metadata?.utm_source ||
      ""
  ).trim();

  if (/instagram/.test(rawSource) || /instagram/.test(metadataSource) || /instagram/.test(referrer)) {
    return "Instagram";
  }
  if (
    /facebook|fb/.test(rawSource) ||
    /facebook|fb/.test(metadataSource) ||
    /facebook|fb/.test(referrer)
  ) {
    return "Facebook";
  }
  if (/google/.test(rawSource) || /google/.test(metadataSource) || /google/.test(referrer)) {
    return "Google";
  }
  if (
    /^template$/i.test(rawSource) ||
    /^template$/i.test(metadataSource) ||
    path.startsWith("/template/") ||
    fullUrl.includes("/template/") ||
    event.metadata?.template_id ||
    event.metadata?.templateId
  ) {
    return "Template";
  }
  if (rawSource) return titleCase(rawSource);
  return "Direct";
};

const getDeviceLabel = (event: AnalyticsEventRecord) => {
  const device = String(event.device || "Unknown").trim();
  const os = String(event.os || "").trim();
  if (!os || /^unknown$/i.test(os)) return titleCase(device);
  return `${titleCase(device)} / ${os}`;
};

const compressText = (value?: string | null, start = 8, end = 6) => {
  const normalized = String(value || "").trim();
  if (!normalized) return "";
  if (normalized.length <= start + end + 3) return normalized;
  return `${normalized.slice(0, start)}...${normalized.slice(-end)}`;
};

const getUserPrimary = (event: AnalyticsEventRecord) => {
  const user = event.user;
  if (user?.name) return user.name;
  if (user?.email) return user.email;
  if (user?.phone) return user.phone;
  return compressText(event.userId || event.visitorId || event.sessionId || "Guest User");
};

const getUserSecondary = (event: AnalyticsEventRecord) => {
  const user = event.user;
  if (user?.name) {
    if (user?.email) return user.email;
    if (user?.phone) return user.phone;
  }
  if (user?.email && user.email !== getUserPrimary(event)) return user.email;
  if (user?.phone && user.phone !== getUserPrimary(event)) return user.phone;
  return formatEventType(event.eventType);
};

const getPageLabel = (event: AnalyticsEventRecord) => {
  const rawValue = String(event.path || event.fullUrl || "/").trim() || "/";
  return compressText(rawValue, 22, 14);
};

const dateFormatter = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const timeFormatter = new Intl.DateTimeFormat("en-IN", {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: true,
});

type TrafficActivityTableProps = {
  summary?: AnalyticsSummary;
};

export function TrafficActivityTable({ summary }: TrafficActivityTableProps) {
  const { role, vendorId, source, websiteId, range, fromDate, toDate } = useAnalyticsContext();
  const [page, setPage] = useState(1);
  const [selectedTrafficSource, setSelectedTrafficSource] = useState("all");
  const [selectedDevice, setSelectedDevice] = useState("all");
  const [selectedBrowser, setSelectedBrowser] = useState("all");

  const sourceParam = source === "all" ? undefined : source;
  const websiteParam =
    role === "vendor" || source === "template"
      ? websiteId === "all"
        ? undefined
        : websiteId
      : undefined;
  const dateParams = buildAnalyticsDateParams({ range, fromDate, toDate });
  const queryFn = getQueryFn<AnalyticsEventsResponse>();

  const { data, isLoading, isFetching } = useQuery<AnalyticsEventsResponse>({
    queryKey: [
      buildApiUrl("/analytics/events", {
        vendorId,
        source: sourceParam,
        website_id: websiteParam,
        includeUser: 1,
        page,
        pageSize: PAGE_SIZE,
        traffic_source: selectedTrafficSource === "all" ? undefined : selectedTrafficSource,
        device_type: selectedDevice === "all" ? undefined : selectedDevice,
        browser_family: selectedBrowser === "all" ? undefined : selectedBrowser,
        ...dateParams,
      }),
    ],
    queryFn,
    refetchInterval: 15000,
  });

  const events = data?.events || [];
  const total = Number(data?.total || 0);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const sourceOptions = useMemo(() => {
    const values = new Map<string, string>();

    (summary?.trafficBySource || []).forEach((item) => {
      const rawValue = String(item.source || "").trim();
      if (!rawValue) return;
      values.set(rawValue.toLowerCase(), rawValue);
    });

    events.forEach((event) => {
      const label = getSourceLabel(event);
      values.set(label.toLowerCase(), label.toLowerCase());
    });

    return Array.from(values.values())
      .map((value) => ({ value, label: titleCase(value) }))
      .sort((left, right) => left.label.localeCompare(right.label));
  }, [events, summary]);

  const deviceOptions = useMemo(() => {
    const values = new Map<string, string>();

    (summary?.trafficByDevice || []).forEach((item) => {
      const rawValue = String(item.device || "").trim();
      if (!rawValue) return;
      values.set(rawValue.toLowerCase(), rawValue);
    });

    events.forEach((event) => {
      const rawValue = String(event.device || "").trim();
      if (!rawValue) return;
      values.set(rawValue.toLowerCase(), rawValue);
    });

    return Array.from(values.values())
      .map((value) => ({ value, label: titleCase(value) }))
      .sort((left, right) => left.label.localeCompare(right.label));
  }, [events, summary]);

  const browserOptions = useMemo(() => {
    const values = new Map<string, string>();

    (summary?.trafficByBrowser || []).forEach((item) => {
      const family = getBrowserFamily(item.browser);
      if (!family) return;
      values.set(family.toLowerCase(), family);
    });

    events.forEach((event) => {
      const family = getBrowserFamily(event.browser);
      if (!family) return;
      values.set(family.toLowerCase(), family);
    });

    return Array.from(values.values())
      .map((value) => ({ value, label: value }))
      .sort((left, right) => left.label.localeCompare(right.label));
  }, [events, summary]);

  const resetFilters = () => {
    setSelectedTrafficSource("all");
    setSelectedDevice("all");
    setSelectedBrowser("all");
    setPage(1);
  };

  const handleTrafficSourceChange = (value: string) => {
    setSelectedTrafficSource(value);
    setPage(1);
  };

  const handleDeviceChange = (value: string) => {
    setSelectedDevice(value);
    setPage(1);
  };

  const handleBrowserChange = (value: string) => {
    setSelectedBrowser(value);
    setPage(1);
  };

  return (
    <Card className="overflow-hidden border border-sky-100/80 bg-white/90 shadow-sm backdrop-blur-sm dark:border-border dark:bg-card">
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <CardTitle>User Traffic Activity</CardTitle>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{total} records</Badge>
            {isFetching && !isLoading ? <Badge variant="secondary">Refreshing</Badge> : null}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Select value={selectedTrafficSource} onValueChange={handleTrafficSourceChange}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Filter by source" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All sources</SelectItem>
              {sourceOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedDevice} onValueChange={handleDeviceChange}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Filter by device" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All devices</SelectItem>
              {deviceOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedBrowser} onValueChange={handleBrowserChange}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Filter by browser" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All browsers</SelectItem>
              {browserOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            type="button"
            size="sm"
            onClick={resetFilters}
            className="h-9 w-full min-w-[140px] border-rose-200 bg-rose-500 px-4 text-white shadow-sm hover:border-rose-300 hover:bg-rose-600 active:bg-rose-700 sm:w-auto"
          >
            Reset Filters
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="min-w-0 overflow-hidden rounded-md border border-sky-100/80 dark:border-border">
          <Table className="min-w-full" style={{ minWidth: TABLE_MIN_WIDTH }}>
            <TableHeader className="bg-slate-50/90 dark:bg-muted/40">
              <TableRow>
                <TableHead>Traffic Source</TableHead>
                <TableHead>Traffic by Device</TableHead>
                <TableHead>Traffic by Browser</TableHead>
                <TableHead>Page&apos;s View</TableHead>
                <TableHead>User</TableHead>
                <TableHead>User IP</TableHead>
                <TableHead>City</TableHead>
                <TableHead>State</TableHead>
                <TableHead>Country</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 6 }).map((_, index) => (
                  <TableRow key={`loading-${index}`}>
                    <TableCell colSpan={11} className="py-4">
                      <div className="bg-muted h-10 animate-pulse rounded-md" />
                    </TableCell>
                  </TableRow>
                ))
              ) : events.length ? (
                events.map((event) => {
                  const eventDate = new Date(event.createdAt);
                  const pageHref = resolveStorefrontHref(event.fullUrl || event.path || "");
                  const pageTitle = event.title || event.path || event.fullUrl || "/";

                  return (
                    <TableRow key={event._id}>
                      <TableCell>
                        <Badge variant="outline">{getSourceLabel(event)}</Badge>
                      </TableCell>
                      <TableCell className="max-w-[220px] whitespace-normal">
                        {getDeviceLabel(event)}
                      </TableCell>
                      <TableCell>{event.browser || "Unknown"}</TableCell>
                      <TableCell className="max-w-[260px] whitespace-normal">
                        {pageHref ? (
                          <a
                            href={pageHref}
                            target="_blank"
                            rel="noreferrer"
                            className="block max-w-[240px] truncate font-medium text-blue-600 underline-offset-2 hover:text-blue-700 hover:underline"
                            title={pageTitle}
                          >
                            {getPageLabel(event)}
                          </a>
                        ) : (
                          <span className="block max-w-[240px] truncate font-medium" title={pageTitle}>
                            {getPageLabel(event)}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="max-w-[220px] whitespace-normal">
                        <div className="font-medium">{getUserPrimary(event)}</div>
                        <div className="text-muted-foreground text-xs">
                          {compressText(getUserSecondary(event), 20, 10)}
                        </div>
                      </TableCell>
                      <TableCell>{compressText(event.ip || "-", 9, 4) || "-"}</TableCell>
                      <TableCell>{event.city || "-"}</TableCell>
                      <TableCell>{event.region || "-"}</TableCell>
                      <TableCell>{event.country || "-"}</TableCell>
                      <TableCell>{dateFormatter.format(eventDate)}</TableCell>
                      <TableCell>{timeFormatter.format(eventDate)}</TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={11} className="text-muted-foreground py-8 text-center">
                    No activity found for the selected filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-muted-foreground text-sm">
            Showing page {page} of {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((currentPage) => Math.max(currentPage - 1, 1))}
              disabled={page <= 1 || isLoading}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((currentPage) => Math.min(currentPage + 1, totalPages))}
              disabled={page >= totalPages || isLoading}
            >
              Next
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
