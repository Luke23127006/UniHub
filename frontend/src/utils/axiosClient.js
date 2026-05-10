import axios from 'axios';
import { message, notification } from 'antd';

// Prefer an explicit env var so the same build can target different environments.
// Falls back to the local dev backend. The Vite proxy is NOT used here — this
// hits the backend directly, so make sure CORS is enabled on localhost:3000 in dev.
const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api';

const axiosClient = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

// ── Request interceptor ────────────────────────────────────────────────────────
// Attaches the stored JWT to every outgoing request when present.
axiosClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response interceptor ───────────────────────────────────────────────────────
// Handles systemic errors that no individual service should need to repeat.
//
//  401 — Token missing / expired / revoked.
//        Clear credentials, inform the user, then redirect to /login.
//        Individual service catch blocks never run for 401 because we navigate away.
//
//  403 — Authenticated but role is insufficient.
//        Surfaced here as a persistent notification so the user knows *why* the
//        action failed, rather than seeing a generic service-layer message.
//        The error is still re-rejected so callers can gate follow-up UI logic.
//
//  Everything else (4xx validation, 5xx, network timeouts) is intentionally left
//  to each service's own catch block, which can provide context-specific messages.

axiosClient.interceptors.response.use(
  (response) => response,

  (error) => {
    const status = error.response?.status;

    if (status === 401) {
      localStorage.removeItem('access_token');
      // Use onClose to redirect after the toast disappears — avoids an abrupt jump.
      message.error({
        content: 'Your session has expired. Redirecting to login…',
        duration: 2,
        onClose: () => {
          window.location.replace('/login');
        },
      });
      // Return a never-resolving promise so no downstream catch block fires
      // while we wait for the redirect.
      return new Promise(() => {});
    }

    if (status === 403) {
      notification.error({
        message: 'Access Denied',
        description: 'You do not have permission to perform this action.',
        placement: 'topRight',
      });
      // Re-reject so callers can disable their submit buttons / reset loading state.
      return Promise.reject(error);
    }

    return Promise.reject(error);
  }
);

export default axiosClient;
