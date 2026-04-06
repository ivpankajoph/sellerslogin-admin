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
  range: string;
  setRange: (value: string) => void;
  fromDate: string;
  setFromDate: (value: string) => void;
  toDate: string;
  setToDate: (value: string) => void;
};

const AnalyticsSourceContext = createContext<AnalyticsSourceContextValue | null>(
  null
);

const STORAGE_KEY = "analytics_source";
const WEBSITE_STORAGE_KEY = "analytics_website";
const LEGACY_TEMPLATE_STORAGE_KEY = "analytics_template";
const RANGE_STORAGE_KEY = "analytics_range";
const FROM_STORAGE_KEY = "analytics_from";
const TO_STORAGE_KEY = "analytics_to";

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

const getTodayDate = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getStoredRange = () => {
  if (typeof window === "undefined") return "today";
  return window.localStorage.getItem(RANGE_STORAGE_KEY) || "today";
};

const getStoredDateValue = (key: string) => {
  if (typeof window === "undefined") return getTodayDate();
  return window.localStorage.getItem(key) || getTodayDate();
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
  const [range, setRangeState] = useState<string>(() => getStoredRange());
  const [fromDate, setFromDateState] = useState<string>(() =>
    getStoredDateValue(FROM_STORAGE_KEY)
  );
  const [toDate, setToDateState] = useState<string>(() =>
    getStoredDateValue(TO_STORAGE_KEY)
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

  const setRange = (value: string) => {
    setRangeState(value);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(RANGE_STORAGE_KEY, value);
    }
  };

  const setFromDate = (value: string) => {
    setFromDateState(value);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(FROM_STORAGE_KEY, value);
    }
  };

  const setToDate = (value: string) => {
    setToDateState(value);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(TO_STORAGE_KEY, value);
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
      value={{
        source,
        setSource,
        options,
        websiteId,
        setWebsiteId,
        range,
        setRange,
        fromDate,
        setFromDate,
        toDate,
        setToDate,
      }}
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
