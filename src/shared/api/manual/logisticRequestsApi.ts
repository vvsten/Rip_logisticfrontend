import { httpClient } from '../httpClient';
import { API_V1_PREFIX } from '../../config/apiConfig';
import type { LogisticRequest } from '../../types/Order';
import type { OrderResponse, OrdersListResponse } from './types';

export async function list(params?: { status?: string; date_from?: string; date_to?: string }): Promise<LogisticRequest[]> {
  const { data } = await httpClient.get<OrdersListResponse>(`${API_V1_PREFIX}/logistic-requests`, {
    params: {
      status: params?.status || undefined,
      date_from: params?.date_from || undefined,
      date_to: params?.date_to || undefined,
    },
  });
  return Array.isArray(data?.logistic_requests) ? data.logistic_requests : [];
}

export async function getById(id: number): Promise<LogisticRequest> {
  const { data } = await httpClient.get<OrderResponse>(`${API_V1_PREFIX}/logistic-requests/${id}`);
  if (!data?.logistic_request) throw new Error('Заявка не найдена');
  return data.logistic_request;
}

export async function update(id: number, payload: { from_city: string; to_city: string; weight: number; length: number; width: number; height: number }): Promise<LogisticRequest> {
  await httpClient.put(`${API_V1_PREFIX}/logistic-requests/${id}/update`, payload);
  return await getById(id);
}

export async function form(id: number, payload: { from_city: string; to_city: string; weight: number; length: number; width: number; height: number }): Promise<void> {
  await httpClient.put(`${API_V1_PREFIX}/logistic-requests/${id}/form`, payload);
}

export async function removeService(id: number, transportServiceId: number): Promise<LogisticRequest> {
  await httpClient.delete(`${API_V1_PREFIX}/logistic-requests/${id}/services/${transportServiceId}`);
  return await getById(id);
}

export async function updateService(id: number, transportServiceId: number, payload: { quantity: number; sort_order?: number; comment?: string }): Promise<LogisticRequest> {
  await httpClient.put(`${API_V1_PREFIX}/logistic-requests/${id}/services/${transportServiceId}`, {
    quantity: payload.quantity,
    sort_order: payload.sort_order ?? 0,
    comment: payload.comment ?? '',
  });
  return await getById(id);
}

// Long polling функции
export async function listLongPoll(params?: { status?: string; date_from?: string; date_to?: string; last_update?: string }): Promise<LogisticRequest[]> {
  // Фильтруем undefined значения из params
  const cleanParams: any = {};
  if (params?.status) cleanParams.status = params.status;
  if (params?.date_from) cleanParams.date_from = params.date_from;
  if (params?.date_to) cleanParams.date_to = params.date_to;
  if (params?.last_update) cleanParams.last_update = params.last_update;

  const { data } = await httpClient.get<OrdersListResponse>(`${API_V1_PREFIX}/logistic-requests/long-poll`, {
    params: cleanParams,
    timeout: 35000, // 35 секунд (больше чем таймаут на сервере 30 сек)
  });
  return Array.isArray(data?.logistic_requests) ? data.logistic_requests : [];
}

export async function getByIdLongPoll(id: number, lastUpdate?: string): Promise<LogisticRequest> {
  const cleanParams: any = {};
  if (lastUpdate) cleanParams.last_update = lastUpdate;

  const { data } = await httpClient.get<OrderResponse>(`${API_V1_PREFIX}/logistic-requests/${id}/long-poll`, {
    params: cleanParams,
    timeout: 35000, // 35 секунд
  });
  if (!data?.logistic_request) throw new Error('Заявка не найдена');
  return data.logistic_request;
}
