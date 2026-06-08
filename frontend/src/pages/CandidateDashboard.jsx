import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { applicationService } from '../services/applicationService';
import { jobService } from '../services/jobService';
import JobCard from '../components/jobs/JobCard';
import ApplicationStatusBadge from '../components/jobs/ApplicationStatusBadge';
import Spinner from '../components/common/Spinner';
import EmptyState from '../components/common/EmptyState';
import { timeAgo } from '../utils/helpers';

export default function CandidateDashboard() {
  const { user } = useAuth();
  const [tab,       setTab]       = useState('applications');
  const [apps,      setApps]      = useState([]);
  const [matched,   setMatched]   = useState([]);
  const [appsLoading,    setAppsLoading]    = useState(true);
  const [matchedLoading, setMatchedLoading] = useState(true);

  useEffect(() => {
    applicationService.getMyApps({ limit: 20 })
      .then(({ data }) => setApps(data.applications))
      .catch(() => {})
      .finally(() => setAppsLoading(false));

    jobService.getMatchedJobs()
      .then(({ data }) => setMatched(data.jobs))
      .catch(() => {})
      .finally(() => setMatchedLoading(false));
  }, []);

  const statusCounts = apps.reduce((acc, a) => {
    acc[a.status] = (acc[a.status] || 0) + 1; return acc;
  }, {});

  const STATS = [
    { label: 'Total Applied',  value: apps.length,                    color: 'text-brand-400' },
    { label: 'In Progress',    value: (statusCounts.reviewing  || 0) +
                                       (statusCounts.shortlisted || 0) +
                                       (statusCounts.interview  || 0), color: 'text-amber-400' },
    { label: 'Interviews',     value: statusCounts.interview  || 0,   color: 'text-emerald-400' },
    { label: 'Offers',         value: statusCounts.offered    || 0,   color: 'text-emerald-400' },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">
            Hi, {user?.name?.split(' ')[0]} 👋
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Here's what's happening with your job search.
          </p>
        </div>
        <Link to="/jobs" className="btn-primary">Browse Jobs</Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {STATS.map(({ label, value, color }) => (
          <div key={label} className="card text-center">
            <p className={`text-3xl font-black ${color}`}>{value}</p>
            <p className="text-slate-500 text-xs mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Profile strength */}
      {user?.profileStrength !== undefined && (
        <div className="card mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-300">Profile Strength</span>
            <span className="text-sm font-bold text-brand-400">{user.profileStrength}%</span>
          </div>
          <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-brand-500 to-purple-500 rounded-full transition-all"
              style={{ width: `${user.profileStrength}%` }}
            />
          </div>
          {user.profileStrength < 80 && (
            <p className="text-slate-600 text-xs mt-2">
              Complete your profile to improve visibility to employers.{' '}
              <Link to="/profile" className="text-brand-400 hover:underline">Update →</Link>
            </p>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-800 mb-6 gap-1">
        {[
          { id: 'applications', label: `Applications (${apps.length})` },
          { id: 'matched',      label: 'Matched Jobs' },
        ].map(({ id, label }) => (
          <button key={id} onClick={() => setTab(id)}
                  className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors
                    ${tab === id
                      ? 'border-brand-500 text-brand-400'
                      : 'border-transparent text-slate-500 hover:text-slate-300'
                    }`}>
            {label}
          </button>
        ))}
      </div>

      {/* Applications */}
      {tab === 'applications' && (
        appsLoading ? <div className="flex justify-center py-12"><Spinner /></div> :
        apps.length === 0 ? (
          <EmptyState icon="📋" title="No applications yet"
                      description="Start applying to jobs to track them here."
                      action={<Link to="/jobs" className="btn-primary">Browse Jobs</Link>} />
        ) : (
          <div className="card overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/50">
                    {['Position', 'Company', 'Applied', 'Match', 'Status', ''].map((h) => (
                      <th key={h} className="text-left px-5 py-3.5 text-xs font-semibold
                                             text-slate-400 uppercase tracking-wider whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {apps.map((app) => (
                    <tr key={app._id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-5 py-4">
                        <Link to={`/jobs/${app.job?._id}`}
                              className="font-medium text-slate-200 hover:text-brand-400
                                         transition-colors text-sm">
                          {app.job?.title}
                        </Link>
                      </td>
                      <td className="px-5 py-4 text-slate-500 text-sm">
                        {app.job?.company?.name}
                      </td>
                      <td className="px-5 py-4 text-slate-500 text-sm whitespace-nowrap">
                        {timeAgo(app.createdAt)}
                      </td>
                      <td className="px-5 py-4">
                        <span className={`text-sm font-bold
                          ${app.matchScore >= 80 ? 'text-emerald-400' :
                            app.matchScore >= 60 ? 'text-amber-400' : 'text-red-400'}`}>
                          {app.matchScore}%
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <ApplicationStatusBadge status={app.status} />
                      </td>
                      <td className="px-5 py-4">
                        <Link to={`/jobs/${app.job?._id}`}
                              className="text-xs text-slate-500 hover:text-slate-300 transition-colors">
                          View →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}

      {/* Matched jobs */}
      {tab === 'matched' && (
        matchedLoading ? <div className="flex justify-center py-12"><Spinner /></div> :
        matched.length === 0 ? (
          <EmptyState icon="🤖" title="No matches yet"
                      description="Complete your profile and upload your resume to get AI-matched jobs."
                      action={<Link to="/profile" className="btn-primary">Complete Profile</Link>} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {matched.map((job) => <JobCard key={job._id} job={job} />)}
          </div>
        )
      )}
    </div>
  );
}