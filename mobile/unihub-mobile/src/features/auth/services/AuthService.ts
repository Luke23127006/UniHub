import { apiClient } from '@/shared/api/api-client';
import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'unihub_auth_token';

export interface LoginResponse {
  accessToken: string;
  user: {
    id: string;
    email: string;
    full_name: string;
    role: string;
  };
}

export class AuthService {
  /**
   * Authenticats user and returns session data
   */
  static async login(email: string, password: string) {
    const result = await apiClient.post('/v1/auth/login', { email, password });
    
    if (!result.ok) {
      throw new Error(result.error?.message || 'Login failed');
    }

    const data = result.data as LoginResponse;
    // Save token immediately upon successful login
    await this.saveToken(data.accessToken);
    
    return data;
  }

  /**
   * Securely saves the access token
   */
  static async saveToken(token: string) {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  }

  /**
   * Retrieves the access token from secure storage
   */
  static async getToken() {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  }

  /**
   * Removes token from secure storage (Logout)
   */
  static async logout() {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  }
}
