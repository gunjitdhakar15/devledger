/**
 * API Client for DevLedger Backend
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

interface ApiResponse<T> {
    data: T;
    success: boolean;
    message?: string;
}

interface ApiError {
    message: string;
    statusCode: number;
    errors?: Record<string, string[]>;
}

class ApiClient {
    private baseUrl: string;
    private token: string | null = null;

    constructor(baseUrl: string) {
        this.baseUrl = baseUrl;
        this.token = localStorage.getItem("auth_token");
    }

    setToken(token: string | null) {
        this.token = token;
        if (token) {
            localStorage.setItem("auth_token", token);
        } else {
            localStorage.removeItem("auth_token");
        }
    }

    private async request<T>(
        endpoint: string,
        options: RequestInit = {}
    ): Promise<ApiResponse<T>> {
        const url = `${this.baseUrl}${endpoint}`;

        const headers: HeadersInit = {
            "Content-Type": "application/json",
            ...options.headers,
        };

        if (this.token) {
            (headers as Record<string, string>)["Authorization"] = `Bearer ${this.token}`;
        }

        try {
            const response = await fetch(url, {
                ...options,
                headers,
            });

            const data = await response.json();

            if (!response.ok) {
                const error: ApiError = {
                    message: data.message || "An error occurred",
                    statusCode: response.status,
                    errors: data.errors,
                };
                throw error;
            }

            return { data, success: true };
        } catch (error) {
            if ((error as ApiError).statusCode) {
                throw error;
            }
            throw {
                message: "Network error occurred",
                statusCode: 0,
            } as ApiError;
        }
    }

    // GET request
    async get<T>(endpoint: string): Promise<ApiResponse<T>> {
        return this.request<T>(endpoint, { method: "GET" });
    }

    // POST request
    async post<T>(endpoint: string, body: unknown): Promise<ApiResponse<T>> {
        return this.request<T>(endpoint, {
            method: "POST",
            body: JSON.stringify(body),
        });
    }

    // PUT request
    async put<T>(endpoint: string, body: unknown): Promise<ApiResponse<T>> {
        return this.request<T>(endpoint, {
            method: "PUT",
            body: JSON.stringify(body),
        });
    }

    // PATCH request
    async patch<T>(endpoint: string, body: unknown): Promise<ApiResponse<T>> {
        return this.request<T>(endpoint, {
            method: "PATCH",
            body: JSON.stringify(body),
        });
    }

    // DELETE request
    async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
        return this.request<T>(endpoint, { method: "DELETE" });
    }
}

// Export singleton instance
export const api = new ApiClient(API_BASE_URL);

// Auth API
export const authApi = {
    login: (email: string, password: string) =>
        api.post<{ token: string; user: unknown }>("/auth/login", { email, password }),

    register: (data: { email: string; password: string; name: string }) =>
        api.post<{ token: string; user: unknown }>("/auth/register", data),

    logout: () => {
        api.setToken(null);
        return Promise.resolve();
    },

    me: () => api.get<{ user: unknown }>("/auth/me"),
};

// Projects API
export const projectsApi = {
    getAll: () => api.get<unknown[]>("/projects"),
    getById: (id: string) => api.get<unknown>(`/projects/${id}`),
    create: (data: unknown) => api.post<unknown>("/projects", data),
    update: (id: string, data: unknown) => api.put<unknown>(`/projects/${id}`, data),
    delete: (id: string) => api.delete<void>(`/projects/${id}`),
};

// Tasks API
export const tasksApi = {
    getAll: (projectId?: string) =>
        api.get<unknown[]>(projectId ? `/projects/${projectId}/tasks` : "/tasks"),
    getById: (id: string) => api.get<unknown>(`/tasks/${id}`),
    create: (data: unknown) => api.post<unknown>("/tasks", data),
    update: (id: string, data: unknown) => api.put<unknown>(`/tasks/${id}`, data),
    delete: (id: string) => api.delete<void>(`/tasks/${id}`),
};

export default api;
