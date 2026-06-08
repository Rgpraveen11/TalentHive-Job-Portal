import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Spinner from './Spinner';

export default function ProtectedRoute({ allowedRoles }) {
  const { user, loading, isAuthenticated } = useAuth();
  const location = useLocation();

  if (loading) return <Spinner fullScreen />;

  if (!isAuthenticated) {
    return <Navigate to={`/login?next=${location.pathname}`} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    const redirect =
      user?.role === 'admin'    ? '/admin' :
      user?.role === 'employer' ? '/employer' : '/dashboard';
    return <Navigate to={redirect} replace />;
  }

  return <Outlet />;
}