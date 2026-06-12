import { useAuthStore } from "@/store/authStore";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1";

interface RequestOptions extends RequestInit {
  headers?: Record<string, string>;
}

interface ApiResponse<T = any> {
  data: T;
  message?: string;
  [key: string]: any;
}

const request = async <T = any>(
  path: string,
  options: RequestOptions = {},
  retry: boolean = true
): Promise<ApiResponse<T> | null> => {
  const { accessToken } = useAuthStore.getState();

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...options.headers,
    },
  });

  if (res.status === 401 && retry) {
    const refreshed = await refresh();
    if (refreshed) return request<T>(path, options, false);
    useAuthStore.getState().clearAuth();
    if (typeof window !== "undefined") window.location.href = "/login";
    return null;
  }

  const json: ApiResponse<T> = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = Object.assign(new Error(json.message || "Request failed"), {
      status: res.status,
      data: json,
    }) as Error & { status: number; data: ApiResponse<T> };
    throw error;
  }
  return json;
};

const refresh = async (): Promise<boolean> => {
  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: "POST",
      credentials: "include",
    });
    if (!res.ok) return false;
    const json: ApiResponse = await res.json();
    useAuthStore.getState().setAccessToken(json.data?.accessToken);
    return true;
  } catch {
    return false;
  }
};

export const api = {
  get: <T = any>(path: string) => request<T>(path),
  post: <T = any>(path: string, body: unknown) =>
    request<T>(path, { method: "POST", body: JSON.stringify(body) }),
  patch: <T = any>(path: string, body: unknown) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
  delete: <T = any>(path: string) => request<T>(path, { method: "DELETE" }),
};
