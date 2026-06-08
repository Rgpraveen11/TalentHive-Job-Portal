import api from './api';

export const jobService = {
  getJobs:         (params)     => api.get('/jobs', { params }),
  getJob:          (id)         => api.get(`/jobs/${id}`),
  getMatchedJobs:  ()           => api.get('/jobs/match'),
  getEmployerJobs: (params)     => api.get('/jobs/employer/mine', { params }),
  createJob:       (data)       => api.post('/jobs', data),
  updateJob:       (id, data)   => api.put(`/jobs/${id}`, data),
  deleteJob:       (id)         => api.delete(`/jobs/${id}`),
  reportJob:       (id)         => api.post(`/jobs/${id}/report`),
  toggleSaveJob:   (id)         => api.post(`/jobs/${id}/save`),
};