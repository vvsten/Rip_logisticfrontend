import { httpClient } from '../httpClient';
import { API_V1_PREFIX } from '../../config/apiConfig';

export interface DraftInfo {
  request_id: number;
  count: number;
}

/** Guest draft (без авторизации) */
export async function getGuestDraft(): Promise<{ draft_id: number | null; count: number }> {
  const { data } = await httpClient.get(`${API_V1_PREFIX}/logistic-requests/draft`);
  const count = typeof data?.count === 'number' ? data.count : Number(data?.count ?? 0);
  const draftId = Number(data?.draft_logistic_request?.id ?? 0) || null;
  return { draft_id: draftId, count: Number.isFinite(count) ? count : 0 };
}

export async function getGuestDraftCount(): Promise<number> {
  const { data } = await httpClient.get(`${API_V1_PREFIX}/logistic-requests/draft/count`);
  const count = typeof data?.count === 'number' ? data.count : Number(data?.count ?? 0);
  return Number.isFinite(count) ? count : 0;
}

export async function addServiceToGuestDraft(serviceId: number): Promise<void> {
  await httpClient.post(`${API_V1_PREFIX}/logistic-requests/draft/services/${serviceId}`);
}

/** User draft (требует авторизации) */
export async function getUserDraftIcon(): Promise<DraftInfo> {
  const { data } = await httpClient.get(`${API_V1_PREFIX}/logistic-requests/user-draft/icon`);
  return {
    request_id: Number(data?.request_id ?? 0),
    count: Number(data?.count ?? 0),
  };
}

export async function addServiceToUserDraft(serviceId: number): Promise<DraftInfo> {
  const { data } = await httpClient.post(`${API_V1_PREFIX}/logistic-requests/user-draft/services/${serviceId}`);
  return {
    request_id: Number(data?.request_id ?? 0),
    count: Number(data?.count ?? 0),
  };
}

export async function clearUserDraft(): Promise<void> {
  await httpClient.delete(`${API_V1_PREFIX}/logistic-requests/user-draft`);
}

