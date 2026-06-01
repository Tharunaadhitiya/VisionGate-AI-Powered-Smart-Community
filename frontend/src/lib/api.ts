const getBaseUrl = () => {
  if (typeof window !== 'undefined') {
    return `http://${window.location.hostname}:5000/api`;
  }
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
};

interface ApiOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
  params?: Record<string, string>;
}

class ApiClient {
  private token: string | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('vg_token');
    }
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) localStorage.setItem('vg_token', token);
    else localStorage.removeItem('vg_token');
  }

  getToken() { return this.token; }

  async request<T = any>(endpoint: string, options: ApiOptions = {}): Promise<T> {
    const { method = 'GET', body, headers = {}, params } = options;

    const url = new URL(`${getBaseUrl()}${endpoint}`);
    if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

    const config: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
        ...headers,
      },
    };

    if (body) config.body = JSON.stringify(body);

    const response = await fetch(url.toString(), config);
    const data = await response.json();

    if (!response.ok) {
      if (response.status === 401 && typeof window !== 'undefined') {
        this.setToken(null);
        if (!window.location.pathname.startsWith('/login')) {
          window.location.href = '/login';
        }
      }
      throw new Error(data.message || `Request failed: ${response.status}`);
    }

    return data;
  }

  get<T = any>(endpoint: string, params?: Record<string, string>) { return this.request<T>(endpoint, { params }); }
  post<T = any>(endpoint: string, body?: unknown) { return this.request<T>(endpoint, { method: 'POST', body }); }
  put<T = any>(endpoint: string, body?: unknown) { return this.request<T>(endpoint, { method: 'PUT', body }); }
  delete<T = any>(endpoint: string) { return this.request<T>(endpoint, { method: 'DELETE' }); }
}

export const api = new ApiClient();
export default api;
