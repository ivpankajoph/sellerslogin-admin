
import { Outlet } from "@tanstack/react-router";
import { Store } from "lucide-react";

import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AnalyticsAppSidebar } from "@/features/analytics-hub/components/app-sidebar";
import { AnalyticsSourceProvider, useAnalyticsSource } from "@/features/analytics-hub/context/analytics-source-context";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import type { CSSProperties } from "react";
import { useMemo, useState, useEffect } from "react";
import { useSelector } from "react-redux";
import axios from "axios";
import { VITE_PUBLIC_API_URL } from "@/config";

function StorefrontSelect() {
  const { source, setSource, options } = useAnalyticsSource();
  const [query, setQuery] = useState("");

  const filteredOptions = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return options;
    return options.filter((option) =>
      option.label.toLowerCase().includes(normalized)
    );
  }, [options, query]);

  return (
    <div className="flex items-center gap-2">
      <Store className="h-4 w-4 text-muted-foreground" />
      <Select value={source} onValueChange={(value) => setSource(value as any)}>
        <SelectTrigger className="h-8 w-44">
          <SelectValue placeholder="Select storefront" />
        </SelectTrigger>
        <SelectContent>
          <div className="p-2">
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search storefronts..."
              className="h-8"
            />
          </div>
          {filteredOptions.length === 0 ? (
            <div className="px-3 py-2 text-sm text-muted-foreground">
              No matches found
            </div>
          ) : (
            filteredOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>
    </div>
  );
}

function AnalyticsHubShell() {
  const role = useSelector((state: any) => state.auth?.user?.role);
  const authUser = useSelector((state: any) => state.auth?.user);
  const vendorId = authUser?._id || authUser?.id || "";
  const token = useSelector((state: any) => state.auth?.token);
  const { templateId, setTemplateId } = useAnalyticsSource();
  const [templateOptions, setTemplateOptions] = useState<
    { id: string; label: string; key?: string }[]
  >([]);
  const style: CSSProperties = {
  "--sidebar-width": "16rem",
  "--sidebar-width-icon": "3rem",
} as CSSProperties;

  useEffect(() => {
    if (role !== "vendor" || !vendorId) return;
    const fetchTemplates = async () => {
      try {
        const res = await axios.get(`${VITE_PUBLIC_API_URL}/v1/templates/by-vendor`, {
          params: { vendor_id: vendorId },
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        const rows = res.data?.data || [];
        const options = rows.map((template: any) => ({
          id: String(template?._id || template?.id || ""),
          label:
            template?.template_name ||
            template?.name ||
            template?.business_name ||
            template?.template_key ||
            "Template",
          key: String(template?.template_key || ""),
        }));
        setTemplateOptions(options);
        if (templateId === "all" && options.length === 1) {
          setTemplateId(options[0].id);
        }
      } catch {
        setTemplateOptions([]);
      }
    };
    fetchTemplates();
  }, [role, vendorId, token, templateId, setTemplateId]);

  return (
    <SidebarProvider style={style}>
      <div className="flex h-screen w-full">
        <AnalyticsAppSidebar />
        <SidebarInset className="flex flex-1 flex-col">
          <header className="sticky top-0 z-40 flex h-14 items-center justify-between gap-2 border-b border-border bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex items-center gap-2">
              <SidebarTrigger data-testid="button-sidebar-toggle" />
              <span className="text-sm text-muted-foreground">E-commerce Analytics Platform</span>
            </div>
            <div className="flex items-center gap-2">
              {role !== "vendor" && <StorefrontSelect />}
              {role === "vendor" && (
                <Select
                  value={templateId}
                  onValueChange={(value) => setTemplateId(value)}
                >
                  <SelectTrigger className="h-8 w-48">
                    <SelectValue placeholder="All templates" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All templates</SelectItem>
                    {templateOptions.map((option) => (
                      <SelectItem key={option.id} value={option.id}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </header>
          <main className="flex-1 overflow-auto bg-[radial-gradient(60%_60%_at_10%_0%,rgba(254,243,199,0.7)_0%,rgba(255,255,255,0)_60%),radial-gradient(45%_45%_at_100%_0%,rgba(219,234,254,0.7)_0%,rgba(255,255,255,0)_55%),radial-gradient(50%_50%_at_0%_100%,rgba(220,252,231,0.6)_0%,rgba(255,255,255,0)_60%)] p-6 dark:bg-background">
            <Outlet />
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}

export function AnalyticsHubLayout() {
  return (
    <AnalyticsSourceProvider>
      <AnalyticsHubShell />
    </AnalyticsSourceProvider>
  );
}
