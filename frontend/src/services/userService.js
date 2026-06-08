import api from './api';

export const userService = {
  getProfile:      ()            => api.get('/users/profile'),
  updateProfile:   (data)        => api.put('/users/profile', data),
  getPublicProfile:(id)          => api.get(`/users/${id}`),
  uploadResume:    (formData)    => api.post('/users/resume', formData, {
                                      headers: { 'Content-Type': 'multipart/form-data' } }),
  uploadAvatar:    (formData)    => api.post('/users/avatar', formData, {
                                      headers: { 'Content-Type': 'multipart/form-data' } }),
  getSavedJobs:    ()            => api.get('/users/saved-jobs'),
  importLinkedIn:  (data)        => api.post('/users/linkedin/import', data),
};