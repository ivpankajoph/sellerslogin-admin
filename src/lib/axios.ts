import axios, { type AxiosInstance } from "axios";
import { store } from "../store"; // import your Redux store
import { logout } from "@/store/slices/authSlice";


const BASE_URL =
  import.meta.env.VITE_PUBLIC_API_URL;

let isSessionRedirectInProgress = false;

const decodeJwtPayload = (token: string): { exp?: number } | null => {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;

    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(
      normalized.length + ((4 - (normalized.length % 4)) % 4),
      "="
    );

    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
};

const isJwtExpired = (token: string): boolean => {
  const payload = decodeJwtPayload(token);
  if (!payload?.exp) return false;
  return payload.exp * 1000 <= Date.now() + 1000;
};

const getErrorMessage = (error: any): string => {
  const raw =
    error?.response?.data?.message ??
    error?.response?.data?.error ??
    error?.message ??
    "";
  return String(raw).trim().toLowerCase();
};

const shouldInvalidateSession = (error: any): boolean => {
  const status = Number(error?.response?.status || 0);
  if (![401, 403, 404].includes(status)) return false;

  if (status === 401) return true;

  const role = String(store.getState()?.auth?.user?.role || "").toLowerCase();
  const message = getErrorMessage(error);
  const requestUrl = String(error?.config?.url || "").toLowerCase();

  const isProfileRequest =
    requestUrl.endsWith("/profile") ||
    requestUrl.includes("/vendor/profile") ||
    requestUrl.includes("/admin/profile") ||
    requestUrl.includes("/profile/admin");

  if (
    isProfileRequest &&
    (message.includes("not found") ||
      message.includes("unauthorized") ||
      message.includes("invalid token"))
  ) {
    return true;
  }

  if (
    role === "vendor" &&
    (message.includes("vendor not found") ||
      message.includes("unauthorized: vendor not found"))
  ) {
    return true;
  }

  if (
    (role === "admin" || role === "superadmin") &&
    message.includes("admin not found")
  ) {
    return true;
  }

  if (message.includes("account not found")) {
    return true;
  }

  return false;
};

const handleExpiredSession = () => {
  if (isSessionRedirectInProgress) return;
  isSessionRedirectInProgress = true;

  store.dispatch(logout());

  if (typeof window !== "undefined") {
    if (!window.location.pathname.startsWith("/sign-in")) {
      const redirectPath =
        `${window.location.pathname}${window.location.search}${window.location.hash}` ||
        "/";
      window.location.replace(
        `/sign-in?redirect=${encodeURIComponent(redirectPath)}`
      );
      return;
    }
  }

  isSessionRedirectInProgress = false;
};


const api: AxiosInstance = axios.create({
  baseURL: `${BASE_URL}/v1`,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000,
});

api.interceptors.request.use(
  (config) => {
    const state = store.getState();
    const token = state.auth?.token;
    const role = String(state.auth?.user?.role || "").toLowerCase();

    if (token && isJwtExpired(token)) {
      handleExpiredSession();
      return Promise.reject(new axios.Cancel("Session expired"));
    }

    if (config.url && !config.url.startsWith("/auth") && !config.url.startsWith("/chat") && !config.url.includes("/login") && !config.url.includes("/support/queries") && !config.url.endsWith("/users/getall")) {
      const prefix = role === "vendor" ? "/vendor" : "/admin";
      if (!config.url.startsWith(prefix)) {
        config.url = `${prefix}${config.url}`;
      }
    }

    // 🔐 Attach token
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// 🚦 Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const token = store.getState()?.auth?.token;
    if (token && shouldInvalidateSession(error)) {
      handleExpiredSession();
    }
    return Promise.reject(error);
  }
);

export default api;
