import api from './api';

export const applicationService = {
  apply:           (data)           => api.post('/applications', data),
  getMyApps:       (params)         => api.get('/applications/mine', { params }),
  getJobApps:      (jobId, params)  => api.get(`/applications/job/${jobId}`, { params }),
  getApplication:  (id)             => api.get(`/applications/${id}`),
  updateStatus:    (id, data)       => api.put(`/applications/${id}/status`, data),
  addNotes:        (id, notes)      => api.put(`/applications/${id}/notes`, { notes }),
  withdraw:        (id)             => api.delete(`/applications/${id}`),
};