import type { User } from '../../types/User';
import type { LogisticRequest } from '../../types/Order';
import type { TransportServiceRaw } from '../../types/TransportService';

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  expires_at: string;
  user: User;
}

export interface ProfileResponse {
  status: string;
  user: User;
}

export interface OrdersListResponse {
  status: string;
  logistic_requests: LogisticRequest[];
}

export interface OrderResponse {
  status: string;
  logistic_request: LogisticRequest;
}

export interface TransportServicesResponse {
  status?: string;
  transport_services?: TransportServiceRaw[];
  services?: TransportServiceRaw[];
}

