/**
 * Authentication Service for Web Frontend
 */
export const authService = {
  /**
   * Logs in a user with email and password
   * @param {string} email 
   * @param {string} password 
   * @returns {Promise<{accessToken: string, user: object}>}
   */
  async login(email, password) {
    const response = await fetch('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error?.message || 'Invalid credentials');
    }

    const { accessToken, user } = result.data;
    this.setSession(accessToken, user);
    
    return result.data;
  },

  /**
   * Persists token and user to local storage
   * @param {string} token 
   * @param {object} user
   */
  setSession(token, user) {
    localStorage.setItem('auth_token', token);
    localStorage.setItem('auth_user', JSON.stringify(user));
  },

  /**
   * Removes session from local storage
   */
  logout() {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
  },

  /**
   * Gets stored user from local storage
   */
  getUser() {
    const user = localStorage.getItem('auth_user');
    return user ? JSON.parse(user) : null;
  },

  /**
   * Gets stored token from local storage
   */
  getToken() {
    return localStorage.getItem('auth_token');
  }
};
