import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useJobs } from '../../context/JobContext';
import { formatSalary, timeAgo, matchColor } from '../../utils/helpers';

export default function JobCard({ job }) {
  const { user } = useAuth();
  const { toggleSave, isJobSaved } = useJobs();
  const saved = isJobSaved(job._id);

  return (
    <div className="card hover:border-brand-500/40 hover:shadow-lg hover:shadow-brand-500/5
                    transition-all duration-200 group flex flex-col gap-4">

      {/* Top row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          {/* Company logo / initials */}
          <div className="w-11 h-11 rounded-xl bg-slate-800 border border-slate-700
                          flex items-center justify-center text-lg flex-shrink-0 overflow-hidden">
            {job.company?.logo
              ? <img src={job.company.logo} alt={job.company.name} className="w-full h-full object-cover" />
              : <span>{job.company?.name?.[0] || '?'}</span>
            }
          </div>
          <div className="min-w-0">
            <Link to={`/jobs/${job._id}`}
                  className="font-semibold text-slate-100 group-hover:text-brand-400
                             transition-colors line-clamp-1 text-sm">
              {job.title}
            </Link>
            <p className="text-slate-500 text-xs mt-0.5 truncate">{job.company?.name}</p>
          </div>
        </div>

        {/* Save button */}
        {user?.role === 'candidate' && (
          <button onClick={() => toggleSave(job._id)}
                  className={`flex-shrink-0 p-1.5 rounded-lg transition-colors
                    ${saved
                      ? 'text-brand-400 bg-brand-500/10'
                      : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
                    }`}>
            <svg className="w-4 h-4" fill={saved ? 'currentColor' : 'none'}
                 stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
          </button>
        )}
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-1.5">
        <span className="badge-purple">{job.type}</span>
        <span className="badge-yellow">{job.level}</span>
        {job.isRemote && <span className="badge-green">Remote</span>}
        <span className="badge-slate">{job.category}</span>
      </div>

      {/* Skills */}
      {job.skills?.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {job.skills.slice(0, 4).map((s) => (
            <span key={s}
                  className="text-xs px-2 py-0.5 bg-slate-800 text-slate-400
                             rounded-md border border-slate-700">
              {s}
            </span>
          ))}
          {job.skills.length > 4 && (
            <span className="text-xs text-slate-500">+{job.skills.length - 4}</span>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-auto pt-2 border-t border-slate-800">
        <div>
          <p className="text-sm font-semibold text-slate-100">
            {formatSalary(job.salary)}
          </p>
          <p className="text-xs text-slate-500 mt-0.5">
            {job.location} · {timeAgo(job.createdAt)}
          </p>
        </div>

        {job.matchScore !== undefined && (
          <div className="text-right">
            <p className={`text-sm font-bold ${matchColor(job.matchScore)}`}>
              {job.matchScore}%
            </p>
            <p className="text-xs text-slate-500">match</p>
          </div>
        )}
      </div>
    </div>
  );
}