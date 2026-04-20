import axios, { type AxiosInstance } from "axios";
import { persistor, store } from "../store"; // import your Redux store
import { logout } from "@/store/slices/authSlice";


const BASE_URL =
  import.meta.env.VITE_PUBLIC_API_URL;

let isSessionRedirectInProgress = false;

const getErrorMessage = (error: any): string => {
  const raw =
    error?.response?.data?.message ??
    error?.response?.data?.error ??
    error?.message ??
    "";
  return String(raw).trim().toLowerCase();
};

const isSessionErrorMessage = (message: string): boolean =>
  [
    "invalid token",
    "jwt malformed",
    "jwt expired",
    "token expired",
    "session expired",
    "login again",
    "no token provided",
    "unauthorized: account not found",
    "account deleted because temporary password was not changed within 48 hours",
  ].some((entry) => message.includes(entry));

const shouldInvalidateSession = (error: any): boolean => {
  const status = Number(error?.response?.status || 0);
  if (status !== 401) return false;

  const requestUrl = String(error?.config?.url || "").toLowerCase();
  if (requestUrl.includes("/chat")) {
    return false;
  }

  const message = getErrorMessage(error);

  const isProfileRequest =
    requestUrl.endsWith("/profile") ||
    requestUrl.includes("/vendor/profile") ||
    requestUrl.includes("/admin/profile") ||
    requestUrl.includes("/profile/admin");

  if (!isProfileRequest) return false;

  return isSessionErrorMessage(message) || !message;
};

const handleExpiredSession = () => {
  if (isSessionRedirectInProgress) return;
  isSessionRedirectInProgress = true;

  store.dispatch(logout());
  void persistor.flush().catch(() => undefined);

  if (typeof window !== "undefined") {
    window.localStorage.removeItem("persist:root");
    window.localStorage.removeItem("token");
    window.sessionStorage.removeItem("seller_autologin_cache_v1");

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
