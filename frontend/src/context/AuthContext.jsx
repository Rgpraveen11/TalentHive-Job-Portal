import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);   // initial auth check
  const [authLoading, setAuthLoading] = useState(false); // login/register spinner

  // ── Bootstrap: load user from stored token on mount ─────────────────────
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchMe();
    } else {
      setLoading(false);
    }
  }, []);

  const fetchMe = async () => {
    try {
      const { data } = await api.get('/auth/me');
      setUser(data.user);
    } catch {
      localStorage.removeItem('token');
      delete api.defaults.headers.common['Authorization'];
    } finally {
      setLoading(false);
    }
  };

  // ── Register ─────────────────────────────────────────────────────────────
  const register = async (formData) => {
    setAuthLoading(true);
    try {
      const { data } = await api.post('/auth/register', formData);
      localStorage.setItem('token', data.token);
      api.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
      setUser(data.user);
      toast.success(`Welcome to TalentHive, ${data.user.name.split(' ')[0]}!`);
      return { success: true, user: data.user };
    } catch (err) {
      const msg = err.response?.data?.message || 'Registration failed';
      toast.error(msg);
      return { success: false, error: msg };
    } finally {
      setAuthLoading(false);
    }
  };

  // ── Login ─────────────────────────────────────────────────────────────────
  const login = async (email, password) => {
    setAuthLoading(true);
    try {
      const { data } = await api.post('/auth/login', { email, password });
      localStorage.setItem('token', data.token);
      api.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
      setUser(data.user);
      toast.success(`Welcome back, ${data.user.name.split(' ')[0]}!`);
      return { success: true, user: data.user };
    } catch (err) {
      const msg = err.response?.data?.message || 'Invalid email or password';
      toast.error(msg);
      return { success: false, error: msg };
    } finally {
      setAuthLoading(false);
    }
  };

  // ── LinkedIn OAuth ────────────────────────────────────────────────────────
  const loginWithLinkedIn = () => {
    window.location.href = `${import.meta.env.VITE_API_URL}/auth/linkedin`;
  };

  // ── Handle OAuth callback token ───────────────────────────────────────────
  const handleOAuthToken = useCallback(async (token) => {
    localStorage.setItem('token', token);
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    await fetchMe();
  }, []);

  // ── Logout ────────────────────────────────────────────────────────────────
  const logout = async () => {
    try { await api.post('/auth/logout'); } catch {}
    localStorage.removeItem('token');
    delete api.defaults.headers.common['Authorization'];
    setUser(null);
    toast.success('Logged out successfully');
  };

  // ── Update user in context (after profile edit) ───────────────────────────
  const updateUser = (updatedUser) => setUser(updatedUser);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        authLoading,
        isAuthenticated: !!user,
        register,
        login,
        logout,
        loginWithLinkedIn,
        handleOAuthToken,
        updateUser,
        fetchMe,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};