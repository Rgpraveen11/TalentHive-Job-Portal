import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="border-t border-slate-800 bg-slate-950 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
          <div className="col-span-2 md:col-span-1">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 bg-brand-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-black text-xs">T</span>
              </div>
              <span className="font-bold text-slate-100">
                Talent<span className="text-brand-400">Hive</span>
              </span>
            </Link>
            <p className="text-slate-500 text-sm leading-relaxed">
              AI-powered job portal connecting great talent with great companies.
            </p>
          </div>

          {[
            { heading: 'For Candidates', links: [
              { to: '/jobs',     label: 'Browse Jobs' },
              { to: '/register', label: 'Create Account' },
              { to: '/dashboard',label: 'My Applications' },
            ]},
            { heading: 'For Employers', links: [
              { to: '/register', label: 'Post a Job' },
              { to: '/employer', label: 'Employer Dashboard' },
            ]},
            { heading: 'Company', links: [
              { to: '/', label: 'About' },
              { to: '/', label: 'Privacy Policy' },
              { to: '/', label: 'Terms of Service' },
            ]},
          ].map(({ heading, links }) => (
            <div key={heading}>
              <h4 className="text-sm font-semibold text-slate-300 mb-3">{heading}</h4>
              <ul className="space-y-2">
                {links.map(({ to, label }) => (
                  <li key={label}>
                    <Link to={to}
                          className="text-sm text-slate-500 hover:text-slate-300 transition-colors">
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-slate-800 pt-6 flex flex-col sm:flex-row
                        items-center justify-between gap-4">
       <p className="text-slate-600 text-xs">
  TalentHive © 2026
</p>

<p className="text-slate-600 text-xs">
  Developed by R.G. Praveen
</p>
        </div>
      </div>
    </footer>
  );
}