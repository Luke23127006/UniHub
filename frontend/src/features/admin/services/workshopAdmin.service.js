import axiosClient from '@/utils/axiosClient';

export const getWorkshops = (params) =>
  axiosClient.get('/v1/workshops', { params });

export const getWorkshopById = (id) =>
  axiosClient.get(`/v1/workshops/${id}`);

export const createWorkshop = (data) =>
  axiosClient.post('/v1/workshops', data);

export const updateWorkshop = (id, data) =>
  axiosClient.put(`/v1/workshops/${id}`, data);

export const deleteWorkshop = (id) =>
  axiosClient.delete(`/v1/workshops/${id}`);

export const uploadPdfForSummary = (file) => {
  const formData = new FormData();
  formData.append('file', file);
  return axiosClient.post('/v1/workshops/pdf-summary', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};
