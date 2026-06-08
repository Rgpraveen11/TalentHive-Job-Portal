import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center">
      <p className="text-8xl font-black text-slate-800 mb-4">404</p>
      <h1 className="text-2xl font-bold text-slate-100 mb-3">Page not found</h1>
      <p className="text-slate-500 text-sm max-w-sm mb-8">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <div className="flex gap-3">
        <Link to="/"    className="btn-primary">Go Home</Link>
        <Link to="/jobs" className="btn-secondary">Browse Jobs</Link>
      </div>
    </div>
  );
}