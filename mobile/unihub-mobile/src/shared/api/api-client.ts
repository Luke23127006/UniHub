import { Platform } from 'react-native';
import Constants from 'expo-constants';

// For physical devices or simulators, we dynamically get the host IP running Expo
const debuggerHost = Constants.expoConfig?.hostUri;
const host = debuggerHost ? debuggerHost.split(':')[0] : 'localhost';

export const API_BASE_URL = `http://${host}:3000`;

export const apiClient = {
  /**
   * Generic fetch wrapper with base URL and default headers
   */
  async request(endpoint: string, options: RequestInit = {}) {
    const url = `${API_BASE_URL}/api${endpoint}`;
    
    const defaultHeaders = {
      'Content-Type': 'application/json',
    };

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
        data: data.data,
      };
    } catch (error) {
      console.error('API Request Error:', error);
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
