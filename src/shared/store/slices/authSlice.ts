import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { User } from '../../types/User';
import type { AuthResponse } from '../../api/manual/types';

/**
 * AuthState хранит **состояние интерфейса после авторизации**.
 *
 * Для защиты (контрольные вопросы):
 * - reducer: описывает, как меняется state (ниже в createSlice)
 * - store: подключает reducer'ы (см. shared/store/store.ts)
 * - middleware: в этом проекте мы **не используем thunk**; асинхронные запросы делаем в компонентах через axios
 * - localStorage: persist токена/пользователя между перезагрузками
 */
interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  expiresAt: string | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  isAuthenticated: false,
  user: null,
  accessToken: null,
  refreshToken: null,
  expiresAt: null,
  isLoading: false,
  error: null,
};

function persistAuth(payload: { access_token?: string; refresh_token?: string; expires_at?: string; user?: User }) {
  if (payload.access_token) localStorage.setItem('access_token', payload.access_token);
  if (payload.refresh_token) localStorage.setItem('refresh_token', payload.refresh_token);
  if (payload.expires_at) localStorage.setItem('expires_at', payload.expires_at);
  if (payload.user) localStorage.setItem('user', JSON.stringify(payload.user));
}

function clearPersistedAuth() {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('expires_at');
  localStorage.removeItem('user');
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError(state) {
      state.error = null;
    },
    setLoading(state, action: PayloadAction<boolean>) {
      state.isLoading = action.payload;
    },
    setError(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
    },
    loginSuccess(state, action: PayloadAction<AuthResponse>) {
      state.isAuthenticated = true;
      state.accessToken = action.payload.access_token ?? null;
      state.refreshToken = action.payload.refresh_token ?? null;
      state.expiresAt = action.payload.expires_at ?? null;
      state.user = (action.payload.user as unknown as User) ?? null;
      persistAuth({
        access_token: action.payload.access_token,
        refresh_token: action.payload.refresh_token,
        expires_at: action.payload.expires_at,
        user: (action.payload.user as unknown as User) ?? undefined,
      });
    },
    setUser(state, action: PayloadAction<User | null>) {
      state.user = action.payload;
      if (action.payload) localStorage.setItem('user', JSON.stringify(action.payload));
    },
    restoreFromStorage(state) {
      const accessToken = localStorage.getItem('access_token');
      if (!accessToken) return;
      const refreshToken = localStorage.getItem('refresh_token');
      const expiresAt = localStorage.getItem('expires_at');
      const rawUser = localStorage.getItem('user');
      let user: User | null = null;
      if (rawUser) {
        try {
          user = JSON.parse(rawUser) as User;
        } catch {
          user = null;
        }
      }
      state.isAuthenticated = true;
      state.accessToken = accessToken;
      state.refreshToken = refreshToken;
      state.expiresAt = expiresAt;
      state.user = user;
    },
    logoutSuccess(state) {
      clearPersistedAuth();
      state.isAuthenticated = false;
      state.user = null;
      state.accessToken = null;
      state.refreshToken = null;
      state.expiresAt = null;
      state.isLoading = false;
      state.error = null;
    },
    hardLogout(state) {
      clearPersistedAuth();
      state.isAuthenticated = false;
      state.user = null;
      state.accessToken = null;
      state.refreshToken = null;
      state.expiresAt = null;
      state.isLoading = false;
      state.error = null;
    },
  },
});

export const { clearError, setLoading, setError, loginSuccess, restoreFromStorage, setUser, logoutSuccess, hardLogout } =
  authSlice.actions;
export default authSlice.reducer;

