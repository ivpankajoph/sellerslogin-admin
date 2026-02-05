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
  templateId: string;
  setTemplateId: (value: string) => void;
};

const AnalyticsSourceContext = createContext<AnalyticsSourceContextValue | null>(
  null
);

const STORAGE_KEY = "analytics_source";
const TEMPLATE_STORAGE_KEY = "analytics_template";

const getStoredSource = (): AnalyticsSourceValue => {
  if (typeof window === "undefined") return "all";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === "ophmart" || stored === "template" || stored === "all") {
    return stored;
  }
  return "all";
};

const getStoredTemplate = (): string => {
  if (typeof window === "undefined") return "all";
  return window.localStorage.getItem(TEMPLATE_STORAGE_KEY) || "all";
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
  const [templateId, setTemplateIdState] = useState<string>(() =>
    getStoredTemplate()
  );

  const setSource = (value: AnalyticsSourceValue) => {
    setSourceState(value);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, value);
    }
  };

  const setTemplateId = (value: string) => {
    setTemplateIdState(value);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(TEMPLATE_STORAGE_KEY, value);
    }
  };

  useEffect(() => {
    if (role === "vendor") {
      setSource("template");
      if (templateId === "all") {
        setTemplateId("all");
      }
    }
  }, [role, templateId]);

  const options = useMemo<AnalyticsSourceOption[]>(() => {
    if (role === "vendor") {
      return [{ value: "template", label: "Vendor Templates" }];
    }
    return [
      { value: "all", label: "All Storefronts" },
      { value: "ophmart", label: "Ophmate Storefront" },
      { value: "template", label: "Vendor Templates" },
    ];
  }, [role]);

  return (
    <AnalyticsSourceContext.Provider
      value={{ source, setSource, options, templateId, setTemplateId }}
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
