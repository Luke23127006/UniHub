import api from '@/utils/api';

export const getWorkshops = (params) =>
  api.get('/v1/workshops', { params });

export const getWorkshopById = (id) =>
  api.get(`/v1/workshops/${id}`);

export const createWorkshop = (data) =>
  api.post('/v1/workshops', data);

export const updateWorkshop = (id, data) =>
  api.put(`/v1/workshops/${id}`, data);

export const deleteWorkshop = (id) =>
  api.delete(`/v1/workshops/${id}`);

export const uploadPdfForSummary = (file) => {
  const formData = new FormData();
  formData.append('file', file);
  return api.post('/v1/workshops/pdf-summary', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};
