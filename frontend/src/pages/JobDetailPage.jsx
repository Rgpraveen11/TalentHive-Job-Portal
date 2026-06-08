import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { jobService } from '../services/jobService';
import { applicationService } from '../services/applicationService';
import Spinner from '../components/common/Spinner';
import { formatSalary, timeAgo, matchColor } from '../utils/helpers';
import toast from 'react-hot-toast';

export default function JobDetailPage() {
  const { id } = useParams();
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [job,         setJob]         = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [hasApplied,  setHasApplied]  = useState(false);
  const [checkingApp, setCheckingApp] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await jobService.getJob(id);
        setJob(data.job);

        // Check if current candidate already applied
        if (user?.role === 'candidate') {
          setCheckingApp(true);
          try {
            const apps = await applicationService.getMyApps();
            const applied = apps.data.applications.some(
              (a) => a.job?._id === id || a.job === id
            );
            setHasApplied(applied);
          } catch {}
          setCheckingApp(false);
        }
      } catch (err) {
        toast.error('Job not found');
        navigate('/jobs');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, user]);

  if (loading) return <Spinner fullScreen />;
  if (!job)    return null;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-slate-500 mb-6">
        <Link to="/jobs" className="hover:text-slate-300 transition-colors">Jobs</Link>
        <span>/</span>
        <span className="text-slate-400">{job.title}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Header card */}
          <div className="card">
            <div className="flex items-start gap-4 mb-5">
              <div className="w-14 h-14 rounded-xl bg-slate-800 border border-slate-700
                              flex items-center justify-center text-2xl flex-shrink-0 overflow-hidden">
                {job.company?.logo
                  ? <img src={job.company.logo} alt={job.company.name} className="w-full h-full object-cover" />
                  : <span>{job.company?.name?.[0]}</span>
                }
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-xl font-bold text-slate-100 leading-tight">{job.title}</h1>
                <p className="text-brand-400 font-medium mt-0.5">{job.company?.name}</p>
                <div className="flex flex-wrap gap-2 mt-3">
                  <span className="badge-purple">{job.type}</span>
                  <span className="badge-yellow">{job.level}</span>
                  {job.isRemote && <span className="badge-green">Remote</span>}
                  <span className="badge-slate">{job.category}</span>
                </div>
              </div>
              {job.matchScore !== null && (
                <div className="text-right flex-shrink-0">
                  <p className={`text-2xl font-black ${matchColor(job.matchScore)}`}>
                    {job.matchScore}%
                  </p>
                  <p className="text-slate-500 text-xs">match</p>
                </div>
              )}
            </div>

            {/* Quick info row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-slate-800/50
                            rounded-xl text-center">
              {[
                { label: 'Salary',   value: formatSalary(job.salary) },
                { label: 'Location', value: job.location },
                { label: 'Posted',   value: timeAgo(job.createdAt) },
                { label: 'Applicants', value: `${job.applicationCount || 0}` },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-xs text-slate-500 mb-1">{label}</p>
                  <p className="text-sm font-semibold text-slate-200 truncate">{value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Description */}
          {[
            { heading: 'About the Role',      body: job.description },
            { heading: 'Requirements',         body: job.requirements },
            { heading: 'Responsibilities',     body: job.responsibilities },
          ].filter((s) => s.body).map(({ heading, body }) => (
            <div key={heading} className="card">
              <h2 className="section-title mb-4">{heading}</h2>
              <div className="text-slate-400 text-sm leading-relaxed whitespace-pre-line">
                {body}
              </div>
            </div>
          ))}

          {/* Skills */}
          {job.skills?.length > 0 && (
            <div className="card">
              <h2 className="section-title mb-4">Required Skills</h2>
              <div className="flex flex-wrap gap-2">
                {job.skills.map((s) => (
                  <span key={s} className="text-sm px-3 py-1 bg-slate-800
                                           border border-slate-700 text-slate-300 rounded-lg">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Benefits */}
          {job.benefits?.length > 0 && (
            <div className="card">
              <h2 className="section-title mb-4">Benefits</h2>
              <ul className="grid grid-cols-2 gap-2">
                {job.benefits.map((b) => (
                  <li key={b} className="flex items-center gap-2 text-sm text-slate-400">
                    <span className="text-brand-400">✓</span> {b}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Apply CTA */}
          <div className="card text-center">
            {!isAuthenticated ? (
              <>
                <p className="text-slate-400 text-sm mb-4">
                  Sign in to apply for this job
                </p>
                <Link to={`/login?next=/jobs/${id}/apply`} className="btn-primary w-full justify-center">
                  Sign In to Apply
                </Link>
                <Link to="/register" className="btn-secondary w-full justify-center mt-2">
                  Create Account
                </Link>
              </>
            ) : user?.role === 'candidate' ? (
              <>
                {checkingApp ? (
                  <div className="flex justify-center py-2"><Spinner size="sm" /></div>
                ) : hasApplied ? (
                  <div className="text-center">
                    <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20
                                    flex items-center justify-center mx-auto mb-3">
                      <span className="text-emerald-400 text-xl">✓</span>
                    </div>
                    <p className="text-emerald-400 font-semibold text-sm">Applied!</p>
                    <p className="text-slate-500 text-xs mt-1">
                      Track it in your dashboard
                    </p>
                    <Link to="/dashboard" className="btn-secondary w-full justify-center mt-3 text-xs">
                      View Dashboard
                    </Link>
                  </div>
                ) : (
                  <Link to={`/jobs/${id}/apply`} className="btn-primary w-full justify-center text-base py-3">
                    Apply Now →
                  </Link>
                )}
              </>
            ) : (
              <p className="text-slate-500 text-sm">
                {user?.role === 'employer' ? 'Switch to a candidate account to apply.' : ''}
              </p>
            )}
          </div>

          {/* Company info */}
          <div className="card">
            <h3 className="font-semibold text-slate-200 text-sm mb-3">About the Company</h3>
            <p className="font-medium text-slate-100">{job.company?.name}</p>
            {job.company?.location && (
              <p className="text-slate-500 text-xs mt-1">📍 {job.company.location}</p>
            )}
            {job.company?.website && (
              <a href={job.company.website} target="_blank" rel="noopener noreferrer"
                 className="text-brand-400 text-xs hover:underline mt-1 block">
                {job.company.website}
              </a>
            )}
          </div>

          {/* Job meta */}
          <div className="card text-sm space-y-3">
            {[
              { label: 'Job ID',    value: job._id?.slice(-8).toUpperCase() },
              { label: 'Deadline',  value: job.applicationDeadline
                                            ? new Date(job.applicationDeadline).toLocaleDateString()
                                            : 'Open' },
              { label: 'Views',     value: job.views?.toLocaleString() },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between">
                <span className="text-slate-500">{label}</span>
                <span className="text-slate-300 font-medium">{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}