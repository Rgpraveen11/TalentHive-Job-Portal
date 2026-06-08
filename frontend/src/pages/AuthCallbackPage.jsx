import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Spinner from '../components/common/Spinner';
import toast from 'react-hot-toast';

export default function AuthCallbackPage() {
  const [params]   = useSearchParams();
  const { handleOAuthToken } = useAuth();
  const navigate   = useNavigate();

  useEffect(() => {
    const token = params.get('token');
    const error = params.get('error');

    if (error) {
      toast.error('LinkedIn sign-in failed. Please try again.');
      navigate('/login', { replace: true });
      return;
    }

    if (token) {
      handleOAuthToken(token).then(() => {
        navigate('/dashboard', { replace: true });
      });
    } else {
      navigate('/login', { replace: true });
    }
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <Spinner size="lg" />
      <p className="text-slate-400 text-sm">Signing you in with LinkedIn…</p>
    </div>
  );
}