import { getAuthToken, setAuthToken, setDemoMode } from "./session";

const API_BASE_URL = (import.meta.env.VITE_API_URL || "http://localhost:3000/api/v1").replace(/\/$/, "");

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  message?: string;
  meta?: Record<string, unknown>;
  error?: {
    message?: string;
    details?: unknown;
  };
}

export interface ApiError {
  message: string;
  statusCode: number;
  details?: unknown;
}

type QueryValue = string | number | boolean | undefined | null;

class ApiClient {
  private baseUrl: string;
  private token: string | null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
    this.token = getAuthToken();
  }

  setToken(token: string | null) {
    this.token = token;
    setAuthToken(token);
  }

  private buildUrl(endpoint: string, query?: Record<string, QueryValue>) {
    const url = new URL(`${this.baseUrl}${endpoint}`);

    Object.entries(query ?? {}).forEach(([key, value]) => {
      if (value === undefined || value === null || value === "") {
        return;
      }

      url.searchParams.set(key, String(value));
    });

    return url.toString();
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    query?: Record<string, QueryValue>
  ): Promise<T> {
    const headers = new Headers(options.headers ?? {});

    if (!headers.has("Content-Type") && options.body) {
      headers.set("Content-Type", "application/json");
    }

    if (this.token) {
      headers.set("Authorization", `Bearer ${this.token}`);
    }

    let response: Response;

    try {
      response = await fetch(this.buildUrl(endpoint, query), {
        ...options,
        headers,
      });
    } catch {
      throw {
        message: "Network error occurred",
        statusCode: 0,
      } satisfies ApiError;
    }

    const rawText = await response.text();
    const payload = rawText ? (JSON.parse(rawText) as ApiEnvelope<T> | T) : null;

    if (!response.ok) {
      const errorPayload = payload as ApiEnvelope<T> | null;

      throw {
        message:
          errorPayload && typeof errorPayload === "object" && "error" in errorPayload
            ? errorPayload.error?.message ?? "Request failed"
            : "Request failed",
        statusCode: response.status,
        details:
          errorPayload && typeof errorPayload === "object" && "error" in errorPayload
            ? errorPayload.error?.details
            : undefined,
      } satisfies ApiError;
    }

    if (payload && typeof payload === "object" && "success" in payload) {
      return (payload as ApiEnvelope<T>).data;
    }

    return payload as T;
  }

  async get<T>(endpoint: string, query?: Record<string, QueryValue>) {
    return this.request<T>(endpoint, { method: "GET" }, query);
  }

  async post<T>(endpoint: string, body?: unknown) {
    return this.request<T>(endpoint, {
      method: "POST",
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  }

  async put<T>(endpoint: string, body: unknown) {
    return this.request<T>(endpoint, {
      method: "PUT",
      body: JSON.stringify(body),
    });
  }

  async patch<T>(endpoint: string, body: unknown) {
    return this.request<T>(endpoint, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
  }

  async delete<T>(endpoint: string) {
    return this.request<T>(endpoint, { method: "DELETE" });
  }
}

export const api = new ApiClient(API_BASE_URL);

export const authApi = {
  async login(email: string, password: string) {
    const result = await api.post<{
      accessToken: string;
      expiresIn: number;
      user: Record<string, unknown>;
    }>("/auth/login", { email, password });

    api.setToken(result.accessToken);
    setDemoMode(false);

    return result;
  },

  async logout() {
    try {
      await api.post("/auth/logout");
    } finally {
      api.setToken(null);
    }
  },
};

export const usersApi = {
  me: () => api.get<unknown>("/users/me"),
};

export const projectsApi = {
  getAll: (query?: Record<string, QueryValue>) => api.get<unknown[]>("/projects", query),
  getStats: () => api.get<unknown>("/projects/stats"),
  getById: (id: string) => api.get<unknown>(`/projects/${id}`),
  create: (data: unknown) => api.post<unknown>("/projects", data),
  update: (id: string, data: unknown) => api.put<unknown>(`/projects/${id}`, data),
  delete: (id: string) => api.delete<void>(`/projects/${id}`),
};

export const tasksApi = {
  getAll: (query?: Record<string, QueryValue>) => api.get<unknown[]>("/tasks", query),
  getStats: () => api.get<unknown>("/tasks/stats"),
  getById: (id: string) => api.get<unknown>(`/tasks/${id}`),
  create: (data: unknown) => api.post<unknown>("/tasks", data),
  update: (id: string, data: unknown) => api.put<unknown>(`/tasks/${id}`, data),
  delete: (id: string) => api.delete<void>(`/tasks/${id}`),
};

export default api;
