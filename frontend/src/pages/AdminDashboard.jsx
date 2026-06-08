import { useEffect, useState } from 'react';
import { adminService } from '../services/adminService';
import ApplicationStatusBadge from '../components/jobs/ApplicationStatusBadge';
import Spinner from '../components/common/Spinner';
import EmptyState from '../components/common/EmptyState';
import toast from 'react-hot-toast';
import { timeAgo, formatSalary } from '../utils/helpers';

export default function AdminDashboard() {
  const [tab,    setTab]    = useState('overview');
  const [stats,  setStats]  = useState(null);
  const [users,  setUsers]  = useState([]);
  const [jobs,   setJobs]   = useState([]);
  const [apps,   setApps]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');

  useEffect(() => {
    const init = async () => {
      try {
        const [s, u, j, a] = await Promise.all([
          adminService.getStats(),
          adminService.getUsers({ limit: 50 }),
          adminService.getJobs({ limit: 50 }),
          adminService.getApplications({ limit: 50 }),
        ]);
        setStats(s.data.stats);
        setUsers(u.data.users);
        setJobs(j.data.jobs);
        setApps(a.data.applications);
      } catch { toast.error('Failed to load admin data'); }
      finally { setLoading(false); }
    };
    init();
  }, []);

  const suspendUser = async (id, isActive) => {
    try {
      await adminService.updateUser(id, { isActive: !isActive });
      setUsers((p) => p.map((u) => u._id === id ? { ...u, isActive: !isActive } : u));
      toast.success(isActive ? 'User suspended' : 'User activated');
    } catch { toast.error('Failed to update user'); }
  };

  const deleteUser = async (id) => {
    if (!confirm('Permanently delete this user and all their data?')) return;
    try {
      await adminService.deleteUser(id);
      setUsers((p) => p.filter((u) => u._id !== id));
      toast.success('User deleted');
    } catch { toast.error('Failed to delete user'); }
  };

  const approveJob = async (id) => {
    try {
      await adminService.approveJob(id);
      setJobs((p) => p.map((j) => j._id === id ? { ...j, status: 'active', reportedBy: [] } : j));
      toast.success('Job approved');
    } catch { toast.error('Failed to approve job'); }
  };

  const removeJob = async (id) => {
    if (!confirm('Permanently delete this job?')) return;
    try {
      await adminService.removeJob(id);
      setJobs((p) => p.filter((j) => j._id !== id));
      toast.success('Job removed');
    } catch { toast.error('Failed to remove job'); }
  };

  if (loading) return <Spinner fullScreen />;

  const filteredUsers = users.filter((u) =>
    u.name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  const STAT_CARDS = [
    { label: 'Total Users',    value: stats?.users?.total,        sub: `+${stats?.users?.newThisWeek} this week`,    color: 'text-brand-400' },
    { label: 'Active Jobs',    value: stats?.jobs?.active,        sub: `${stats?.jobs?.flagged} flagged`,             color: 'text-amber-400' },
    { label: 'Applications',   value: stats?.applications?.total, sub: `${stats?.applications?.pending} pending`,     color: 'text-emerald-400' },
    { label: 'Employers',      value: stats?.users?.employers,    sub: `${stats?.users?.candidates} candidates`,      color: 'text-purple-400' },
  ];

  const TABS = [
    { id: 'overview',  label: 'Overview'  },
    { id: 'users',     label: `Users (${users.length})` },
    { id: 'jobs',      label: `Jobs (${jobs.length})` },
    { id: 'apps',      label: `Applications (${apps.length})` },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-100">Admin Dashboard</h1>
        <p className="text-slate-500 text-sm mt-1">Platform overview and moderation</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {STAT_CARDS.map(({ label, value, sub, color }) => (
          <div key={label} className="card">
            <p className={`text-3xl font-black ${color}`}>{value ?? '—'}</p>
            <p className="text-slate-400 text-sm font-medium mt-1">{label}</p>
            <p className="text-slate-600 text-xs mt-0.5">{sub}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 mb-6 gap-1 overflow-x-auto">
        {TABS.map(({ id, label }) => (
          <button key={id} onClick={() => setTab(id)}
                  className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap
                    ${tab === id
                      ? 'border-brand-500 text-brand-400'
                      : 'border-transparent text-slate-500 hover:text-slate-300'
                    }`}>
            {label}
          </button>
        ))}
      </div>

      {/* Overview */}
      {tab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top companies */}
          <div className="card">
            <h3 className="section-title mb-4">Top Hiring Companies</h3>
            {stats?.topCompanies?.length > 0 ? (
              <div className="space-y-3">
                {stats.topCompanies.map(({ company, jobCount }, i) => (
                  <div key={company} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-slate-600 text-sm w-5">{i + 1}.</span>
                      <span className="text-slate-200 text-sm font-medium">{company}</span>
                    </div>
                    <span className="badge-purple">{jobCount} jobs</span>
                  </div>
                ))}
              </div>
            ) : <p className="text-slate-600 text-sm">No data</p>}
          </div>

          {/* Applications by status */}
          <div className="card">
            <h3 className="section-title mb-4">Applications by Status</h3>
            {stats?.applications?.byStatus?.length > 0 ? (
              <div className="space-y-3">
                {stats.applications.byStatus.map(({ status, count }) => (
                  <div key={status} className="flex items-center justify-between">
                    <ApplicationStatusBadge status={status} />
                    <span className="text-slate-200 text-sm font-semibold">{count}</span>
                  </div>
                ))}
              </div>
            ) : <p className="text-slate-600 text-sm">No data</p>}
          </div>

          {/* Flagged jobs */}
          {jobs.filter((j) => j.status === 'flagged').length > 0 && (
            <div className="card lg:col-span-2">
              <h3 className="section-title mb-4 text-red-400">
                ⚠ Flagged Jobs ({jobs.filter((j) => j.status === 'flagged').length})
              </h3>
              <div className="space-y-3">
                {jobs.filter((j) => j.status === 'flagged').map((job) => (
                  <div key={job._id}
                       className="flex items-center justify-between p-4 bg-red-500/5
                                  border border-red-500/20 rounded-xl">
                    <div>
                      <p className="font-medium text-slate-200">{job.title}</p>
                      <p className="text-slate-500 text-sm">
                        {job.company?.name} · {job.reportedBy?.length || 0} reports
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => approveJob(job._id)} className="btn-success text-xs">
                        Approve
                      </button>
                      <button onClick={() => removeJob(job._id)} className="btn-danger text-xs">
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Users */}
      {tab === 'users' && (
        <>
          <div className="mb-4">
            <input value={search} onChange={(e) => setSearch(e.target.value)}
                   placeholder="Search users by name or email…"
                   className="input max-w-sm" />
          </div>
          {filteredUsers.length === 0 ? (
            <EmptyState icon="👤" title="No users found" />
          ) : (
            <div className="card overflow-hidden p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-900/50">
                      {['Name', 'Email', 'Role', 'Joined', 'Status', 'Actions'].map((h) => (
                        <th key={h} className="text-left px-5 py-3.5 text-xs font-semibold
                                               text-slate-400 uppercase tracking-wider whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {filteredUsers.map((u) => (
                      <tr key={u._id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="px-5 py-4 font-medium text-slate-200 text-sm">{u.name}</td>
                        <td className="px-5 py-4 text-slate-500 text-sm">{u.email}</td>
                        <td className="px-5 py-4">
                          <span className="badge-purple capitalize">{u.role}</span>
                        </td>
                        <td className="px-5 py-4 text-slate-500 text-sm whitespace-nowrap">
                          {timeAgo(u.createdAt)}
                        </td>
                        <td className="px-5 py-4">
                          <span className={u.isActive ? 'badge-green' : 'badge-red'}>
                            {u.isActive ? 'Active' : 'Suspended'}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <button onClick={() => suspendUser(u._id, u.isActive)}
                                    className={`text-xs transition-colors
                                      ${u.isActive
                                        ? 'text-amber-500 hover:text-amber-400'
                                        : 'text-emerald-500 hover:text-emerald-400'
                                      }`}>
                              {u.isActive ? 'Suspend' : 'Activate'}
                            </button>
                            <button onClick={() => deleteUser(u._id)}
                                    className="text-xs text-red-500 hover:text-red-400 transition-colors">
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Jobs */}
      {tab === 'jobs' && (
        jobs.length === 0 ? <EmptyState icon="💼" title="No jobs" /> : (
          <div className="card overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/50">
                    {['Title', 'Company', 'Salary', 'Applications', 'Reports', 'Status', 'Actions'].map((h) => (
                      <th key={h} className="text-left px-5 py-3.5 text-xs font-semibold
                                             text-slate-400 uppercase tracking-wider whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {jobs.map((job) => (
                    <tr key={job._id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-5 py-4 font-medium text-slate-200 text-sm max-w-[200px] truncate">
                        {job.title}
                      </td>
                      <td className="px-5 py-4 text-slate-500 text-sm">{job.company?.name}</td>
                      <td className="px-5 py-4 text-slate-400 text-sm whitespace-nowrap">
                        {formatSalary(job.salary)}
                      </td>
                      <td className="px-5 py-4 text-slate-400 text-sm">
                        {job.applicationCount || 0}
                      </td>
                      <td className="px-5 py-4">
                        {job.reportedBy?.length > 0
                          ? <span className="badge-red">⚠ {job.reportedBy.length}</span>
                          : <span className="text-slate-600 text-sm">—</span>
                        }
                      </td>
                      <td className="px-5 py-4">
                        <ApplicationStatusBadge status={job.status} />
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          {job.status === 'flagged' && (
                            <button onClick={() => approveJob(job._id)}
                                    className="text-xs text-emerald-500 hover:text-emerald-400 transition-colors">
                              Approve
                            </button>
                          )}
                          <button onClick={() => removeJob(job._id)}
                                  className="text-xs text-red-500 hover:text-red-400 transition-colors">
                            Remove
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}

      {/* Applications */}
      {tab === 'apps' && (
        apps.length === 0 ? <EmptyState icon="📋" title="No applications" /> : (
          <div className="card overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/50">
                    {['Candidate', 'Job', 'Company', 'Match', 'Status', 'Applied'].map((h) => (
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
                      <td className="px-5 py-4 font-medium text-slate-200 text-sm">
                        {app.candidate?.name}
                      </td>
                      <td className="px-5 py-4 text-slate-400 text-sm max-w-[180px] truncate">
                        {app.job?.title}
                      </td>
                      <td className="px-5 py-4 text-slate-500 text-sm">
                        {app.job?.company?.name}
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
                      <td className="px-5 py-4 text-slate-500 text-sm whitespace-nowrap">
                        {timeAgo(app.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}
    </div>
  );
}