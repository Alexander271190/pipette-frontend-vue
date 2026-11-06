import { apiRequest } from './client';

export interface ResponsibleUser {
  id?: string;
  fullName: string;
  department?: string;
  position?: string;
}

export function getResponsibles(): Promise<ResponsibleUser[]> {
  return apiRequest<ResponsibleUser[]>('/users/responsibles');
}
