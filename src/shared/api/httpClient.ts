import axios from 'axios';
import { API_BASE_URL, API_V1_PREFIX } from '../config/apiConfig';


export const httpClient = axios.create({
  baseURL: API_BASE_URL || '',
  withCredentials: true,
});

httpClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers = config.headers ?? {};
    (config.headers as any).Authorization = `Bearer ${token}`;
  }
  return config;
});

const refreshClient = axios.create({
  baseURL: API_BASE_URL || '',
  withCredentials: true,
});

httpClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error?.config as any;
    const status = error?.response?.status;

    // Не зацикливаемся
    if (status !== 401 || originalRequest?._retry) {
      return Promise.reject(error);
    }
    if (typeof originalRequest?.url === 'string' && originalRequest.url.includes('/refresh')) {
      return Promise.reject(error);
    }
    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      const res = await refreshClient.post(`${API_V1_PREFIX}/refresh`, { refresh_token: refreshToken });
      const newAccessToken = res?.data?.access_token;
      const newRefreshToken = res?.data?.refresh_token;
      const expiresAt = res?.data?.expires_at;
      const user = res?.data?.user;

      if (newAccessToken) localStorage.setItem('access_token', newAccessToken);
      if (newRefreshToken) localStorage.setItem('refresh_token', newRefreshToken);
      if (expiresAt) localStorage.setItem('expires_at', expiresAt);
      if (user) localStorage.setItem('user', JSON.stringify(user));

      originalRequest.headers = originalRequest.headers ?? {};
      originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

      return httpClient(originalRequest);
    } catch (refreshErr) {
      return Promise.reject(refreshErr);
    }
  },
);
