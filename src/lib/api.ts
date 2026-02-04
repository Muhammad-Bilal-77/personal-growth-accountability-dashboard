import { getToken } from "./auth";

const PROD_BACKEND_URL = "https://zealous-bel-evolvoria-e923b9fc.koyeb.app";
const DEFAULT_LOCAL_URL = "http://localhost:3001";

const resolveApiUrl = () => {
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl) return envUrl;
  if (typeof window !== "undefined" && window.location.hostname !== "localhost") {
    return PROD_BACKEND_URL;
  }
  return DEFAULT_LOCAL_URL;
};

export const API_URL = resolveApiUrl();

const buildHeaders = (options?: RequestInit) => ({
  "Content-Type": "application/json",
  ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
  ...(options?.headers || {}),
});

const fetchWithBase = async <T>(baseUrl: string, path: string, options?: RequestInit): Promise<T> => {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: buildHeaders(options),
    ...options,
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const message = errorBody?.error || `Request failed with ${response.status}`;
    throw new Error(message);
  }

  return response.json() as Promise<T>;
};

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  try {
    return await fetchWithBase<T>(API_URL, path, options);
  } catch (error) {
    const shouldFallback = API_URL === DEFAULT_LOCAL_URL;
    if (shouldFallback) {
      return await fetchWithBase<T>(PROD_BACKEND_URL, path, options);
    }
    throw error;
  }
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: "PATCH",
      body: body ? JSON.stringify(body) : undefined,
    }),
  delete: <T>(path: string) =>
    request<T>(path, {
      method: "DELETE",
    }),
};
