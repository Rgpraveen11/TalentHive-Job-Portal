import api from './api';

export const authService = {
  register:       (data)            => api.post('/auth/register', data),
  login:          (email, password) => api.post('/auth/login', { email, password }),
  getMe:          ()                => api.get('/auth/me'),
  logout:         ()                => api.post('/auth/logout'),
  changePassword: (data)            => api.put('/auth/password', data),
  forgotPassword: (email)           => api.post('/auth/forgot-password', { email }),
  resetPassword:  (token, password) => api.put(`/auth/reset-password/${token}`, { password }),
};