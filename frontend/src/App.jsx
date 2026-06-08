import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

import Navbar from './components/common/Navbar';
import Footer from './components/common/Footer';
import ProtectedRoute from './components/common/ProtectedRoute';

import HomePage        from './pages/HomePage';
import LoginPage       from './pages/LoginPage';
import RegisterPage    from './pages/RegisterPage';
import JobsPage        from './pages/JobPage';
import JobDetailPage   from './pages/JobDetailPage';
import ApplyPage       from './pages/ApplyPage';
import ProfilePage     from './pages/ProfilePage';
import AdminDashboard  from './pages/AdminDashboard';
import EmployerDashboard from './pages/EmployerDashboard';
import CandidateDashboard from './pages/CandidateDashboard';
import AuthCallbackPage from './pages/AuthCallbackPage';
import NotFoundPage    from './pages/NotFoundPage';

export default function App() {
  const { user } = useAuth();

  return (
    <div className="page-wrapper flex flex-col">
      <Navbar />

      <main className="flex-1 fade-in">
        <Routes>
          {/* Public */}
          <Route path="/"               element={<HomePage />} />
          <Route path="/jobs"           element={<JobsPage />} />
          <Route path="/jobs/:id"       element={<JobDetailPage />} />
          <Route path="/auth/callback"  element={<AuthCallbackPage />} />

          {/* Guest only */}
          <Route
            path="/login"
            element={user ? <Navigate to="/dashboard" replace /> : <LoginPage />}
          />
          <Route
            path="/register"
            element={user ? <Navigate to="/dashboard" replace /> : <RegisterPage />}
          />

          {/* Protected — any role */}
          <Route element={<ProtectedRoute />}>
            <Route path="/profile"   element={<ProfilePage />} />
            <Route path="/jobs/:id/apply" element={<ApplyPage />} />
          </Route>

          {/* Protected — candidate */}
          <Route element={<ProtectedRoute allowedRoles={['candidate']} />}>
            <Route path="/dashboard" element={<CandidateDashboard />} />
          </Route>

          {/* Protected — employer */}
          <Route element={<ProtectedRoute allowedRoles={['employer']} />}>
            <Route path="/employer" element={<EmployerDashboard />} />
          </Route>

          {/* Protected — admin */}
          <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
            <Route path="/admin" element={<AdminDashboard />} />
          </Route>

          {/* Redirect /dashboard to the right place */}
          <Route
            path="/dashboard"
            element={
              user?.role === 'employer' ? <Navigate to="/employer" replace /> :
              user?.role === 'admin'    ? <Navigate to="/admin" replace /> :
              <CandidateDashboard />
            }
          />

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>

      <Footer />
    </div>
  );
}