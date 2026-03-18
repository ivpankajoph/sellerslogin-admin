import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";

type AnalyticsSourceValue = "all" | "ophmart" | "template";

type AnalyticsSourceOption = {
  value: AnalyticsSourceValue;
  label: string;
};

type AnalyticsSourceContextValue = {
  source: AnalyticsSourceValue;
  setSource: (value: AnalyticsSourceValue) => void;
  options: AnalyticsSourceOption[];
  websiteId: string;
  setWebsiteId: (value: string) => void;
};

const AnalyticsSourceContext = createContext<AnalyticsSourceContextValue | null>(
  null
);

const STORAGE_KEY = "analytics_source";
const WEBSITE_STORAGE_KEY = "analytics_website";
const LEGACY_TEMPLATE_STORAGE_KEY = "analytics_template";

const getStoredSource = (): AnalyticsSourceValue => {
  if (typeof window === "undefined") return "all";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === "ophmart" || stored === "template" || stored === "all") {
    return stored;
  }
  return "all";
};

const getStoredWebsite = (): string => {
  if (typeof window === "undefined") return "all";
  return (
    window.localStorage.getItem(WEBSITE_STORAGE_KEY) ||
    window.localStorage.getItem(LEGACY_TEMPLATE_STORAGE_KEY) ||
    "all"
  );
};

export function AnalyticsSourceProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = useSelector((state: any) => state.auth?.user);
  const role = user?.role || "admin";
  const [source, setSourceState] = useState<AnalyticsSourceValue>(() =>
    getStoredSource()
  );
  const [websiteId, setWebsiteIdState] = useState<string>(() =>
    getStoredWebsite()
  );

  const setSource = (value: AnalyticsSourceValue) => {
    setSourceState(value);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, value);
    }
  };

  const setWebsiteId = (value: string) => {
    setWebsiteIdState(value);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(WEBSITE_STORAGE_KEY, value);
      window.localStorage.setItem(LEGACY_TEMPLATE_STORAGE_KEY, value);
    }
  };

  useEffect(() => {
    if (role === "vendor") {
      setSource("template");
      if (!websiteId) {
        setWebsiteId("all");
      }
    }
  }, [role, websiteId]);

  const options = useMemo<AnalyticsSourceOption[]>(() => {
    if (role === "vendor") {
      return [{ value: "template", label: "Vendor Templates" }];
    }
    return [
      { value: "all", label: "All Storefronts" },
      { value: "ophmart", label: "SellersLogin Storefront" },
      { value: "template", label: "Vendor Templates" },
    ];
  }, [role]);

  return (
    <AnalyticsSourceContext.Provider
      value={{ source, setSource, options, websiteId, setWebsiteId }}
    >
      {children}
    </AnalyticsSourceContext.Provider>
  );
}

export const useAnalyticsSource = () => {
  const ctx = useContext(AnalyticsSourceContext);
  if (!ctx) {
    throw new Error("useAnalyticsSource must be used within AnalyticsSourceProvider");
  }
  return ctx;
};
