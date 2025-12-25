import { httpClient } from '../httpClient';
import { API_V1_PREFIX } from '../../config/apiConfig';
import type { User } from '../../types/User';
import type { AuthResponse, ProfileResponse } from './types';

export interface RegisterPayload {
  login: string;
  email: string;
  name: string;
  password: string;
  phone?: string;
}

export async function login(login: string, password: string): Promise<AuthResponse> {
  const { data } = await httpClient.post<AuthResponse>(`${API_V1_PREFIX}/login`, { login, password });
  return data;
}

export async function signUp(payload: RegisterPayload): Promise<AuthResponse> {
  const { data } = await httpClient.post<AuthResponse>(`${API_V1_PREFIX}/sign_up`, {
    ...payload,
    role: 'buyer',
  });
  return data;
}

export async function logout(): Promise<void> {
  const refreshToken = localStorage.getItem('refresh_token');
  await httpClient.post(`${API_V1_PREFIX}/logout`, { refresh_token: refreshToken || '' });
}

export async function refresh(refresh_token: string): Promise<AuthResponse> {
  const { data } = await httpClient.post<AuthResponse>(`${API_V1_PREFIX}/refresh`, { refresh_token });
  return data;
}

export async function getProfile(): Promise<User> {
  const { data } = await httpClient.get<ProfileResponse>(`${API_V1_PREFIX}/users/profile`);
  if (!data?.user) throw new Error('Профиль не найден');
  return data.user;
}

export async function updateProfile(payload: { name: string; email: string; phone: string }): Promise<User> {
  const { data } = await httpClient.put<ProfileResponse>(`${API_V1_PREFIX}/users/profile`, payload);
  if (!data?.user) throw new Error('Не удалось обновить профиль');
  return data.user;
}

