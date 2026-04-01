
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

type WebsiteOption = {
  id: string;
  label: string;
  source: "ophmart" | "template";
  isMainWebsite?: boolean;
};

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

function WebsiteSelect({
  value,
  onValueChange,
  options,
  placeholder,
}: {
  value: string;
  onValueChange: (value: string) => void;
  options: WebsiteOption[];
  placeholder: string;
}) {
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
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className="h-8 w-56">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          <div className="p-2">
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search websites..."
              className="h-8"
            />
          </div>
          <SelectItem value="all">{placeholder}</SelectItem>
          {filteredOptions.length === 0 ? (
            <div className="px-3 py-2 text-sm text-muted-foreground">
              No matches found
            </div>
          ) : (
            filteredOptions.map((option) => (
              <SelectItem key={option.id} value={option.id}>
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
  const { source, setSource, websiteId, setWebsiteId } = useAnalyticsSource();
  const [websiteOptions, setWebsiteOptions] = useState<WebsiteOption[]>([]);
  const style: CSSProperties = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  } as CSSProperties;
  const isAdmin = role === "admin" || role === "superadmin";
  const shouldShowWebsiteSelect = role === "vendor" || isAdmin;

  const handleWebsiteChange = (value: string) => {
    if (value === "all") {
      setWebsiteId("all");
      if (role !== "vendor") {
        setSource("all");
      }
      return;
    }

    const selectedOption = websiteOptions.find((option) => option.id === value);
    setWebsiteId(value);

    if (selectedOption && role !== "vendor") {
      setSource(selectedOption.source);
    }
  };

  useEffect(() => {
    if (!shouldShowWebsiteSelect || !token) {
      setWebsiteOptions([]);
      return;
    }

    if (role === "vendor" && !vendorId) {
      setWebsiteOptions([]);
      return;
    }

    const fetchWebsites = async () => {
      try {
        const res = await axios.get(`${import.meta.env.VITE_PUBLIC_API_URL}/v1/templates/by-vendor`, {
          params: {
            ...(role === "vendor" ? { vendor_id: vendorId } : {}),
            ...(role !== "vendor" ? { include_main_website: "true" } : {}),
          },
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        const rows = res.data?.data || [];
        const options = rows
          .map((website: any) => {
            const isMainWebsite = Boolean(website?.is_main_website);
            const websiteName = String(
              (isMainWebsite ? website?.name || "Main Website" : "") ||
                website?.name ||
                website?.business_name ||
                website?.website_slug ||
                website?.template_name ||
                website?.template_key ||
                "Website"
            ).trim();
            const vendorName = String(
              website?.vendor_name ||
                website?.vendor_business_name ||
                website?.vendor_email ||
                ""
            ).trim();
            const templateName = String(website?.template_name || "").trim();
            const secondaryLabel = isMainWebsite
              ? vendorName
              : role === "vendor"
                ? templateName && templateName !== websiteName
                  ? templateName
                  : ""
                : vendorName ||
                  (templateName && templateName !== websiteName ? templateName : "");

            return {
              id: String(website?._id || website?.id || ""),
              label: secondaryLabel
                ? `${websiteName} - ${secondaryLabel}`
                : websiteName,
              source: isMainWebsite ? "ophmart" : "template",
              isMainWebsite,
            };
          })
          .filter((option: WebsiteOption) => option.id);

        options.unshift({
          id: "tukka-tech-landing",
          label: "Tukka.tech (Marketing)",
          source: "template",
          isMainWebsite: false,
        });
        setWebsiteOptions(options);

        if (options.length === 1 && websiteId === "all") {
          setWebsiteId(options[0].id);
          if (role !== "vendor") {
            setSource(options[0].source);
          }
          return;
        }

        if (
          websiteId !== "all" &&
          !options.some((option: WebsiteOption) => option.id === websiteId)
        ) {
          setWebsiteId("all");
        }
      } catch {
        setWebsiteOptions([]);
      }
    };

    fetchWebsites();
  }, [role, vendorId, token, shouldShowWebsiteSelect, websiteId, setSource, setWebsiteId]);

  useEffect(() => {
    if (role === "vendor") return;
    if (!websiteOptions.length) return;
    if (websiteId === "all") return;

    const selectedOption = websiteOptions.find((option) => option.id === websiteId);
    if (!selectedOption) return;

    if (source === "ophmart" && selectedOption.source !== "ophmart") {
      setWebsiteId("all");
      return;
    }

    if (source === "template" && selectedOption.source !== "template") {
      setWebsiteId("all");
    }
  }, [role, source, websiteId, websiteOptions, setWebsiteId]);

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
              {shouldShowWebsiteSelect && (
                <WebsiteSelect
                  value={websiteId}
                  onValueChange={handleWebsiteChange}
                  options={websiteOptions}
                  placeholder={role === "vendor" ? "All websites" : "All storefronts"}
                />
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
