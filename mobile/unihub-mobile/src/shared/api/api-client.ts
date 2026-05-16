import Constants from 'expo-constants';
import { AuthService } from '@/features/auth/services/AuthService';

// For physical devices or simulators, we dynamically get the host IP running Expo
const debuggerHost = Constants.expoConfig?.hostUri;
const host = debuggerHost ? debuggerHost.split(':')[0] : 'localhost';

export const API_BASE_URL = `http://${host}:3000`;

export const apiClient = {
  /**
   * Generic fetch wrapper with base URL and default headers
   */
  async request(endpoint: string, options: any = {}) {
    let url = `${API_BASE_URL}/api${endpoint}`;
    
    // Append query params if they exist
    if (options.params) {
      const queryParams = new URLSearchParams();
      Object.entries(options.params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, String(value));
        }
      });
      const queryString = queryParams.toString();
      if (queryString) {
        url += (url.includes('?') ? '&' : '?') + queryString;
      }
    }

    const token = await AuthService.getToken();
    
    const defaultHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (token) {
      defaultHeaders['Authorization'] = `Bearer ${token}`;
    }

    const config = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        return {
          ok: false,
          status: response.status,
          error: data.error || { message: 'Something went wrong' },
        };
      }

      return {
        ok: true,
        status: response.status,
        // If the response body itself is the data (like an array), use it directly.
        // Otherwise, look for a .data property (common for paginated results).
        data: (data && typeof data === 'object' && 'data' in data) ? data.data : data,
      };
    } catch (error) {
      return {
        ok: false,
        status: 500,
        error: { message: 'Network error or server unreachable' },
      };
    }
  },

  get(endpoint: string, options: RequestInit = {}) {
    return this.request(endpoint, { ...options, method: 'GET' });
  },

  post(endpoint: string, body: any, options: RequestInit = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'POST',
      body: JSON.stringify(body),
    });
  },
};
