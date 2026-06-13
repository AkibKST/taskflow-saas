import axiosInstance from "@/lib/axios";
import { AxiosError } from "axios";

interface ApiResponse<T = unknown> {
  data: T;
  message?: string;
  [key: string]: unknown;
}

// Normalize axios errors into a plain Error carrying status + payload,
// matching what callers previously relied on.
const toApiError = (
  err: unknown,
): Error & { status?: number; data?: unknown } => {
  if (err instanceof AxiosError) {
    const data = err.response?.data as ApiResponse | undefined;
    return Object.assign(
      new Error(data?.message || err.message || "Request failed"),
      { status: err.response?.status, data },
    );
  }
  return err as Error;
};

const unwrap = async <T>(promise: Promise<{ data: ApiResponse<T> }>) => {
  try {
    const res = await promise;
    return res.data;
  } catch (err) {
    throw toApiError(err);
  }
};

export const api = {
  get: <T = unknown>(path: string) =>
    unwrap<T>(axiosInstance.get<ApiResponse<T>>(path)),
  post: <T = unknown>(path: string, body?: unknown) =>
    unwrap<T>(axiosInstance.post<ApiResponse<T>>(path, body)),
  patch: <T = unknown>(path: string, body?: unknown) =>
    unwrap<T>(axiosInstance.patch<ApiResponse<T>>(path, body)),
  delete: <T = unknown>(path: string) =>
    unwrap<T>(axiosInstance.delete<ApiResponse<T>>(path)),
};