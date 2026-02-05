import { VITE_PUBLIC_API_URL } from "@/config";

const apiBase =
  VITE_PUBLIC_API_URL && VITE_PUBLIC_API_URL.endsWith("/v1")
    ? VITE_PUBLIC_API_URL
    : `${VITE_PUBLIC_API_URL}/v1`;

const normalizeBase = (value: string) => value.replace(/\/+$/, "");

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
