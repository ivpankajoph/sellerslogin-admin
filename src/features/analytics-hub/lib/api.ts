
import { STOREFRONT_URL } from "@/lib/storefront-url";


const apiBase =
  import.meta.env.VITE_PUBLIC_API_URL && import.meta.env.VITE_PUBLIC_API_URL.endsWith("/v1")
    ? import.meta.env.VITE_PUBLIC_API_URL
    : `${import.meta.env.VITE_PUBLIC_API_URL}/v1`;

const normalizeBase = (value: string) => value.replace(/\/+$/, "");

const storefrontBaseUrl = normalizeBase(
  String(STOREFRONT_URL || "").trim()
);

const normalizeTemplatePreviewPath = (pathname: string) => {
  const match = pathname.match(/^\/template\/([^/]+)\/preview\/([^/]+)(\/.*)?$/i);
  if (!match) return pathname;

  const vendorId = match[1];
  const rest = match[3] || "";
  return `/template/${vendorId}${rest}`;
};

const sanitizePreviewUrl = (url: URL) => {
  url.pathname = normalizeTemplatePreviewPath(url.pathname);
  url.searchParams.delete("previewDraft");
  url.searchParams.delete("previewSessionId");
  return url;
};

export const buildApiUrl = (
  path: string,
  params?: Record<string, string | number | undefined>
) => {
  if (!apiBase) return path;
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = `${normalizeBase(apiBase)}${normalizedPath}`;

  if (!params) return url;
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    search.set(key, String(value));
  });
  const query = search.toString();
  return query ? `${url}?${query}` : url;
};

export const buildAnalyticsDateParams = ({
  range,
  fromDate,
  toDate,
}: {
  range?: string;
  fromDate?: string;
  toDate?: string;
}) => {
  if (range === "custom") {
    return {
      from: fromDate || undefined,
      to: toDate || undefined,
    };
  }

  if (range === "today") {
    return { range: "1d" };
  }

  if (range === "yesterday") {
    const date = new Date();
    date.setDate(date.getDate() - 1);
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    return {
      from: start.toISOString(),
      to: end.toISOString(),
    };
  }

  if (range === "7d" || range === "30d") {
    return { range };
  }

  return { range: "7d" };
};

export const resolveStorefrontHref = (value?: string) => {
  const rawValue = String(value || "").trim();
  if (!rawValue) return "";

  if (/^https?:\/\//i.test(rawValue)) {
    try {
      return sanitizePreviewUrl(new URL(rawValue)).toString();
    } catch {
      return rawValue;
    }
  }

  const normalizedPath = rawValue.startsWith("/") ? rawValue : `/${rawValue}`;
  if (!storefrontBaseUrl) return normalizedPath;

  try {
    return sanitizePreviewUrl(new URL(normalizedPath, `${storefrontBaseUrl}/`)).toString();
  } catch {
    return `${storefrontBaseUrl}${normalizedPath}`;
  }
};
