import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function RegisterPage() {
  const { register, loginWithLinkedIn, authLoading } = useAuth();
  const navigate = useNavigate();

  const [form, setForm]     = useState({ name: '', email: '', password: '', role: 'candidate' });
  const [showPass, setShowPass] = useState(false);
  const [errors, setErrors] = useState({});

  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  const validate = () => {
    const e = {};
    if (!form.name || form.name.length < 2)
      e.name = 'Name must be at least 2 characters';
    if (!form.email || !/^\S+@\S+\.\S+$/.test(form.email))
      e.email = 'Please enter a valid email';
    if (!form.password || form.password.length < 8)
      e.password = 'Password must be at least 8 characters';
    setErrors(e);
    return !Object.keys(e).length;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    const result = await register(form);
    if (result.success) {
      navigate(result.user.role === 'employer' ? '/employer' : '/dashboard', { replace: true });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-9 h-9 bg-brand-500 rounded-xl flex items-center justify-center">
              <span className="text-white font-black">T</span>
            </div>
            <span className="font-bold text-xl text-slate-100">
              Talent<span className="text-brand-400">Hive</span>
            </span>
          </Link>
          <h1 className="text-2xl font-bold text-slate-100">Create your account</h1>
          <p className="text-slate-500 text-sm mt-2">Free forever. No credit card needed.</p>
        </div>

        <div className="card">
          {/* Role toggle */}
          <div className="flex bg-slate-800 rounded-xl p-1 mb-5">
            {[
              { value: 'candidate', label: '👤 I\'m a Candidate' },
              { value: 'employer',  label: '🏢 I\'m an Employer' },
            ].map(({ value, label }) => (
              <button key={value} type="button"
                      onClick={() => setForm((p) => ({ ...p, role: value }))}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors
                        ${form.role === value
                          ? 'bg-brand-500 text-white'
                          : 'text-slate-400 hover:text-slate-200'
                        }`}>
                {label}
              </button>
            ))}
          </div>

          {/* LinkedIn */}
          <button onClick={loginWithLinkedIn}
                  className="w-full flex items-center justify-center gap-3 py-2.5 px-4
                             bg-[#0A66C2] hover:bg-[#0959AB] text-white font-semibold
                             rounded-xl text-sm transition-colors mb-4">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
            </svg>
            Sign up with LinkedIn
          </button>

          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-slate-800" />
            <span className="text-slate-600 text-xs">or</span>
            <div className="flex-1 h-px bg-slate-800" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Full Name</label>
              <input type="text" placeholder="RG Praveen" value={form.name}
                     onChange={set('name')}
                     className={`input ${errors.name ? 'border-red-500' : ''}`} />
              {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name}</p>}
            </div>
            <div>
              <label className="label">Email</label>
              <input type="email" placeholder="you@example.com" value={form.email}
                     onChange={set('email')}
                     className={`input ${errors.email ? 'border-red-500' : ''}`} />
              {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email}</p>}
            </div>
            <div>
              <label className="label">Password</label>
              <div className="relative">
                <input type={showPass ? 'text' : 'password'}
                       placeholder="Min. 8 characters"
                       value={form.password} onChange={set('password')}
                       className={`input pr-10 ${errors.password ? 'border-red-500' : ''}`} />
                <button type="button" onClick={() => setShowPass((p) => !p)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500
                                   hover:text-slate-300 transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d={showPass
                            ? "M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 4.411m0 0L21 21"
                            : "M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                          } />
                  </svg>
                </button>
              </div>
              {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password}</p>}
            </div>

            <button type="submit" disabled={authLoading}
                    className="btn-primary w-full justify-center py-3 text-base mt-2">
              {authLoading ? 'Creating account…' : `Create ${form.role === 'employer' ? 'Employer' : 'Candidate'} Account`}
            </button>
          </form>
        </div>

        <p className="text-center text-slate-500 text-sm mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-brand-400 hover:text-brand-300 font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}