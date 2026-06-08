import api from './api';

export const adminService = {
  getStats:       ()            => api.get('/admin/stats'),
  getUsers:       (params)      => api.get('/admin/users', { params }),
  getUserById:    (id)          => api.get(`/admin/users/${id}`),
  updateUser:     (id, data)    => api.put(`/admin/users/${id}`, data),
  deleteUser:     (id)          => api.delete(`/admin/users/${id}`),
  getJobs:        (params)      => api.get('/admin/jobs', { params }),
  approveJob:     (id)          => api.put(`/admin/jobs/${id}/approve`),
  removeJob:      (id)          => api.delete(`/admin/jobs/${id}`),
  getApplications:(params)      => api.get('/admin/applications', { params }),
};