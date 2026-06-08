import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getInitials } from '../../utils/helpers';

export default function Navbar() {
  const { user, logout, isAuthenticated } = useAuth();
  const [menuOpen,    setMenuOpen]    = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
    setDropdownOpen(false);
  };

  const dashboardPath =
    user?.role === 'admin'    ? '/admin' :
    user?.role === 'employer' ? '/employer' : '/dashboard';

  const navLinkClass = ({ isActive }) =>
    `text-sm font-medium transition-colors ${
      isActive ? 'text-brand-400' : 'text-slate-400 hover:text-slate-100'
    }`;

  return (
    <header className="sticky top-0 z-50 bg-slate-950/90 backdrop-blur border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-black text-sm">💼</span>
            </div>
            <span className="font-bold text-slate-100 text-lg tracking-tight">
              Talent<span className="text-brand-400">Hive</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-6">
            <NavLink to="/"    end className={navLinkClass}>Home</NavLink>
            <NavLink to="/jobs"    className={navLinkClass}>Browse Jobs</NavLink>
            {isAuthenticated && (
              <NavLink to={dashboardPath} className={navLinkClass}>Dashboard</NavLink>
            )}
          </nav>

          {/* Right side */}
          <div className="hidden md:flex items-center gap-3">
            {isAuthenticated ? (
              <div className="relative">
                <button
                  onClick={() => setDropdownOpen((p) => !p)}
                  className="flex items-center gap-2.5 bg-slate-800 hover:bg-slate-700
                             border border-slate-700 rounded-xl px-3 py-2 transition-colors"
                >
                  {user?.avatar ? (
                    <img src={user.avatar} alt={user.name}
                         className="w-7 h-7 rounded-full object-cover" />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-brand-500 flex items-center
                                    justify-center text-white text-xs font-bold">
                      {getInitials(user?.name)}
                    </div>
                  )}
                  <span className="text-sm font-medium text-slate-200 max-w-[120px] truncate">
                    {user?.name}
                  </span>
                  <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {dropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setDropdownOpen(false)} />
                    <div className="absolute right-0 mt-2 w-52 bg-slate-900 border border-slate-700
                                    rounded-xl shadow-xl z-20 overflow-hidden">
                      <div className="px-4 py-3 border-b border-slate-800">
                        <p className="text-sm font-semibold text-slate-100 truncate">{user?.name}</p>
                        <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                        <span className="mt-1 inline-block badge badge-purple capitalize">
                          {user?.role}
                        </span>
                      </div>
                      <nav className="py-1">
                        {[
                          { to: dashboardPath, label: 'Dashboard' },
                          { to: '/profile',    label: 'Edit Profile' },
                        ].map(({ to, label }) => (
                          <Link key={to} to={to}
                                onClick={() => setDropdownOpen(false)}
                                className="block px-4 py-2.5 text-sm text-slate-300
                                           hover:bg-slate-800 transition-colors">
                            {label}
                          </Link>
                        ))}
                        <button onClick={handleLogout}
                                className="w-full text-left px-4 py-2.5 text-sm text-red-400
                                           hover:bg-slate-800 transition-colors border-t border-slate-800 mt-1">
                          Sign Out
                        </button>
                      </nav>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <>
                <Link to="/login"    className="btn-secondary text-xs px-4 py-2">Sign In</Link>
                <Link to="/register" className="btn-primary  text-xs px-4 py-2">Get Started</Link>
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          <button className="md:hidden p-2 rounded-lg text-slate-400 hover:text-slate-100"
                  onClick={() => setMenuOpen((p) => !p)}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {menuOpen
                ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              }
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-slate-800 bg-slate-950 px-4 py-4 space-y-3">
          {[
            { to: '/', label: 'Home' },
            { to: '/jobs', label: 'Browse Jobs' },
            ...(isAuthenticated ? [{ to: dashboardPath, label: 'Dashboard' }, { to: '/profile', label: 'Profile' }] : []),
          ].map(({ to, label }) => (
            <NavLink key={to} to={to} end={to === '/'}
                     onClick={() => setMenuOpen(false)}
                     className={({ isActive }) =>
                       `block text-sm font-medium py-2 ${isActive ? 'text-brand-400' : 'text-slate-300'}`
                     }>
              {label}
            </NavLink>
          ))}
          {isAuthenticated ? (
            <button onClick={handleLogout} className="w-full text-left text-sm text-red-400 py-2">
              Sign Out
            </button>
          ) : (
            <div className="flex gap-2 pt-2">
              <Link to="/login"    onClick={() => setMenuOpen(false)} className="btn-secondary flex-1 justify-center text-xs">Sign In</Link>
              <Link to="/register" onClick={() => setMenuOpen(false)} className="btn-primary  flex-1 justify-center text-xs">Register</Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
}