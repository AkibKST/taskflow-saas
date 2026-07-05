import axios, {
  AxiosError,
  AxiosRequestConfig,
  InternalAxiosRequestConfig,
} from "axios";
import { useAuthStore } from "@/store/authStore";

const baseURL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1";

const axiosInstance = axios.create({
  baseURL,
  withCredentials: true, // send the httpOnly refresh-token cookie
  headers: {
    "Content-Type": "application/json",
  },
});

// The csrfToken cookie is set by the server (not httpOnly) at login/refresh.
// Echoing it in a header is the double-submit CSRF proof for cookie-auth
// endpoints (refresh/logout) — cross-site pages can't read the cookie.
const getCsrfToken = (): string | null => {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|;\s*)csrfToken=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
};

// Request interceptor – attach the in-memory access token from the store
axiosInstance.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const { accessToken } = useAuthStore.getState();
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    const csrf = getCsrfToken();
    if (csrf) {
      config.headers["X-CSRF-Token"] = csrf;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Response interceptor – refresh the access token once on 401, then replay.
// Concurrent 401s share a single refresh call via a queue.
type RetryConfig = AxiosRequestConfig & { _retry?: boolean };

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((p) => {
    if (token) p.resolve(token);
    else p.reject(error);
  });
  failedQueue = [];
};

const refreshAccessToken = async (): Promise<string> => {
  // Bare axios (not the instance) to avoid the interceptor loop.
  const { data } = await axios.post(
    `${baseURL}/auth/refresh`,
    {},
    {
      withCredentials: true,
      headers: { "X-CSRF-Token": getCsrfToken() ?? "" },
    },
  );
  const newToken: string | undefined = data?.data?.accessToken;
  if (!newToken) throw new Error("No access token in refresh response");
  useAuthStore.getState().setAccessToken(newToken);
  return newToken;
};

// 401s from these endpoints mean "bad credentials/token", not "expired access
// token" — attempting a refresh (and the redirect on its failure) would wipe
// the page state and swallow the real error, e.g. a wrong-password message.
const NO_REFRESH_PATHS = ["/auth/login", "/auth/register", "/auth/refresh"];
const isNoRefreshPath = (url?: string): boolean =>
  NO_REFRESH_PATHS.some((p) => url?.includes(p));

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetryConfig | undefined;

    if (
      error.response?.status !== 401 ||
      !originalRequest ||
      originalRequest._retry ||
      isNoRefreshPath(originalRequest.url)
    ) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise<string>((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      }).then((token) => {
        originalRequest.headers = {
          ...originalRequest.headers,
          Authorization: `Bearer ${token}`,
        };
        return axiosInstance(originalRequest);
      });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const newToken = await refreshAccessToken();
      processQueue(null, newToken);
      originalRequest.headers = {
        ...originalRequest.headers,
        Authorization: `Bearer ${newToken}`,
      };
      return axiosInstance(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError, null);
      useAuthStore.getState().clearAuth();
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);

export default axiosInstance;