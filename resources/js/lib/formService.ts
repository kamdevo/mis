import axios from 'axios';
import { CreateFormData, DynamicForm, FormRecord, DocumentType } from '../components/forms-module/types/types';

interface RecordsResponse {
  data?: FormRecord[];
  records?: FormRecord[];
}

interface ApiErrorResponse {
  message?: string;
  errors?: Record<string, string[]>;
}

type GetRecordsResponse = FormRecord[] | RecordsResponse;

const getApiErrorMessage = (data: ApiErrorResponse | undefined, fallback: string): string => {
  const firstFieldError = data?.errors ? Object.values(data.errors).flat()[0] : null;
  return firstFieldError || data?.message || fallback;
};

class FormsService {
  async getAllForms(): Promise<DynamicForm[]> {
    const response = await axios.get('/api/forms');
    return response.data.data || response.data;
  }

  async getDocumentTypes(): Promise<DocumentType[]> {
      const response = await axios.get('/api/document-types');
      return response.data;
  }

  async getFormById(id: number): Promise<DynamicForm> {
    const response = await axios.get(`/api/forms/${id}`);
    return response.data;
  }

  async createForm(data: CreateFormData): Promise<DynamicForm> {
    const response = await axios.post('/api/forms', data, {
      validateStatus: (status) => status < 500,
    });

    if (response.status >= 400) {
      throw new Error(getApiErrorMessage(response.data, 'Error al crear el documento'));
    }

    return response.data;
  }

  async updateForm(id: number, data: Partial<CreateFormData>): Promise<DynamicForm> {
    const response = await axios.put(`/api/forms/${id}`, data);
    return response.data;
  }

  async deleteForm(id: number): Promise<void> {
    await axios.delete(`/api/forms/${id}`);
  }

  async getFormRecords(formId: number): Promise<GetRecordsResponse> {
    const response = await axios.get(`/api/forms/${formId}/records`);
    return response.data;
  }

  normalizeRecordsResponse(response: GetRecordsResponse): FormRecord[] {
    if (Array.isArray(response)) {
      return response;
    } else if (response.data && Array.isArray(response.data)) {
      return response.data;
    } else if (response.records && Array.isArray(response.records)) {
      return response.records;
    }
    return [];
  }

  async createFormRecord(formId: number, data: Record<string, any>): Promise<FormRecord> {
    const response = await axios.post(`/api/forms/${formId}/records`, data);
    return response.data.record || response.data;
  }

  async updateFormRecord(formId: number, recordId: number, data: Record<string, any>): Promise<FormRecord> {
    const response = await axios.put(`/api/forms/${formId}/records/${recordId}`, data);
    return response.data.record || response.data;
  }

  async deleteFormRecord(formId: number, recordId: number): Promise<void> {
    await axios.delete(`/api/forms/${formId}/records/${recordId}`);
  }

  async reviewRecord(formId: number, recordId: number, status: 'approved' | 'returned', comments?: string): Promise<void> {
      await axios.put(`/api/forms/${formId}/records/${recordId}/review`, { status, comments });
  }

  generateSlug(name: string): string {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }
}

export const formsService = new FormsService();
export type { DynamicForm, CreateFormData, FormRecord, GetRecordsResponse };
