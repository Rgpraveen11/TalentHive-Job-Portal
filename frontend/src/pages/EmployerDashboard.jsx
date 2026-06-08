import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { jobService } from '../services/jobService';
import { applicationService } from '../services/applicationService';
import Modal from '../components/common/Modal';
import ApplicationStatusBadge from '../components/jobs/ApplicationStatusBadge';
import Spinner from '../components/common/Spinner';
import EmptyState from '../components/common/EmptyState';
import toast from 'react-hot-toast';
import { timeAgo, formatSalary } from '../utils/helpers';

const BLANK_JOB = {
  title:'', description:'', requirements:'', responsibilities:'',
  location:'', isRemote:false, type:'Full-time', level:'Mid',
  category:'Engineering', skills:'', salaryMin:'', salaryMax:'',
  benefits:'', status:'active',
};

export default function EmployerDashboard() {
  const { user } = useAuth();
  const [tab,      setTab]      = useState('jobs');
  const [jobs,     setJobs]     = useState([]);
  const [apps,     setApps]     = useState([]);
  const [selJob,   setSelJob]   = useState(null); // job to view applicants
  const [loading,  setLoading]  = useState(true);
  const [showPost, setShowPost] = useState(false);
  const [editJob,  setEditJob]  = useState(null);
  const [form,     setForm]     = useState(BLANK_JOB);
  const [saving,   setSaving]   = useState(false);

  useEffect(() => {
    jobService.getEmployerJobs()
      .then(({ data }) => setJobs(data.jobs))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const loadApplicants = async (job) => {
    setSelJob(job);
    setTab('applicants');
    try {
      const { data } = await applicationService.getJobApps(job._id);
      setApps(data.applications);
    } catch { toast.error('Failed to load applicants'); }
  };

  const openPost = () => { setForm(BLANK_JOB); setEditJob(null); setShowPost(true); };

  const openEdit = (job) => {
    setForm({
      title: job.title, description: job.description,
      requirements: job.requirements || '', responsibilities: job.responsibilities || '',
      location: job.location, isRemote: job.isRemote, type: job.type,
      level: job.level, category: job.category,
      skills: (job.skills || []).join(', '),
      salaryMin: job.salary?.min || '', salaryMax: job.salary?.max || '',
      benefits: (job.benefits || []).join(', '),
      status: job.status,
    });
    setEditJob(job);
    setShowPost(true);
  };

  const saveJob = async (e) => {
    e.preventDefault();
    if (!form.title || !form.description) {
      toast.error('Title and description are required'); return;
    }
    setSaving(true);
    const payload = {
      ...form,
      skills:   form.skills.split(',').map((s) => s.trim()).filter(Boolean),
      benefits: form.benefits.split(',').map((s) => s.trim()).filter(Boolean),
      salary: {
        min: Number(form.salaryMin) || 0,
        max: Number(form.salaryMax) || 0,
        currency: 'USD', period: 'yearly', isPublic: true,
      },
    };
    try {
      if (editJob) {
        const { data } = await jobService.updateJob(editJob._id, payload);
        setJobs((p) => p.map((j) => j._id === editJob._id ? data.job : j));
        toast.success('Job updated!');
      } else {
        const { data } = await jobService.createJob(payload);
        setJobs((p) => [data.job, ...p]);
        toast.success('Job posted!');
      }
      setShowPost(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save job');
    } finally {
      setSaving(false);
    }
  };

  const deleteJob = async (jobId) => {
    if (!confirm('Delete this job and all its applications?')) return;
    try {
      await jobService.deleteJob(jobId);
      setJobs((p) => p.filter((j) => j._id !== jobId));
      toast.success('Job deleted');
    } catch { toast.error('Failed to delete'); }
  };

  const updateStatus = async (appId, status) => {
    try {
      await applicationService.updateStatus(appId, { status });
      setApps((p) => p.map((a) => a._id === appId ? { ...a, status } : a));
      toast.success(`Status updated to ${status}`);
    } catch { toast.error('Failed to update status'); }
  };

  const set = (k) => (e) => setForm((p) => ({
    ...p, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value,
  }));

  const STATS = [
    { label: 'Active Jobs',    value: jobs.filter((j) => j.status === 'active').length,   color: 'text-brand-400' },
    { label: 'Total Applicants', value: jobs.reduce((s, j) => s + (j.applicationCount || 0), 0), color: 'text-amber-400' },
    { label: 'Total Views',    value: jobs.reduce((s, j) => s + (j.views || 0), 0),        color: 'text-emerald-400' },
    { label: 'Flagged',        value: jobs.filter((j) => j.status === 'flagged').length,   color: 'text-red-400' },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Employer Dashboard</h1>
          <p className="text-slate-500 text-sm mt-1">{user?.company?.name || user?.name}</p>
        </div>
        <button onClick={openPost} className="btn-primary">+ Post a Job</button>
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

      {/* Tabs */}
      <div className="flex border-b border-slate-800 mb-6 gap-1">
        {[
          { id: 'jobs',       label: `My Jobs (${jobs.length})` },
          { id: 'applicants', label: selJob ? `Applicants — ${selJob.title}` : 'Applicants' },
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

      {/* Jobs list */}
      {tab === 'jobs' && (
        loading ? <div className="flex justify-center py-12"><Spinner /></div> :
        jobs.length === 0 ? (
          <EmptyState icon="💼" title="No jobs posted yet"
                      description="Post your first job to start receiving applications."
                      action={<button onClick={openPost} className="btn-primary">Post a Job</button>} />
        ) : (
          <div className="card overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/50">
                    {['Title', 'Type', 'Salary', 'Applicants', 'Status', 'Posted', 'Actions'].map((h) => (
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
                      <td className="px-5 py-4">
                        <Link to={`/jobs/${job._id}`}
                              className="font-medium text-slate-200 hover:text-brand-400 text-sm transition-colors">
                          {job.title}
                        </Link>
                      </td>
                      <td className="px-5 py-4 text-slate-500 text-sm">{job.type}</td>
                      <td className="px-5 py-4 text-slate-400 text-sm whitespace-nowrap">
                        {formatSalary(job.salary)}
                      </td>
                      <td className="px-5 py-4">
                        <button onClick={() => loadApplicants(job)}
                                className="text-brand-400 font-semibold text-sm hover:underline">
                          {job.applicationCount || 0}
                        </button>
                      </td>
                      <td className="px-5 py-4">
                        <ApplicationStatusBadge status={job.status} />
                      </td>
                      <td className="px-5 py-4 text-slate-500 text-sm whitespace-nowrap">
                        {timeAgo(job.createdAt)}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <button onClick={() => openEdit(job)}
                                  className="text-xs text-slate-400 hover:text-slate-200 transition-colors">
                            Edit
                          </button>
                          <button onClick={() => deleteJob(job._id)}
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
        )
      )}

      {/* Applicants */}
      {tab === 'applicants' && (
        !selJob ? (
          <EmptyState icon="👥" title="Select a job"
                      description="Click on an applicant count in your jobs list to view applicants." />
        ) : apps.length === 0 ? (
          <EmptyState icon="📭" title="No applicants yet"
                      description="Share your job listing to start receiving applications." />
        ) : (
          <div className="space-y-4">
            {apps.map((app) => (
              <div key={app._id} className="card flex items-start gap-4">
                {/* Avatar */}
                <div className="w-11 h-11 rounded-xl bg-brand-500 flex items-center
                                justify-center text-white font-bold flex-shrink-0 overflow-hidden">
                  {app.candidate?.avatar
                    ? <img src={app.candidate.avatar} alt="" className="w-full h-full object-cover" />
                    : (app.candidate?.name?.[0] || '?')
                  }
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <p className="font-semibold text-slate-100">{app.candidate?.name}</p>
                      <p className="text-slate-500 text-sm">{app.candidate?.headline}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-sm font-bold
                        ${app.matchScore >= 80 ? 'text-emerald-400' :
                          app.matchScore >= 60 ? 'text-amber-400' : 'text-red-400'}`}>
                        {app.matchScore}% match
                      </span>
                      <ApplicationStatusBadge status={app.status} />
                    </div>
                  </div>

                  {app.candidate?.skills?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {app.candidate.skills.slice(0, 5).map((s) => (
                        <span key={s} className="badge-slate">{s}</span>
                      ))}
                    </div>
                  )}

                  {app.coverLetter && (
                    <p className="text-slate-500 text-sm mt-2 line-clamp-2">
                      "{app.coverLetter}"
                    </p>
                  )}

                  {/* Status actions */}
                  <div className="flex flex-wrap gap-2 mt-3">
                    {['reviewing', 'shortlisted', 'interview', 'offered', 'rejected'].map((s) => (
                      <button key={s} onClick={() => updateStatus(app._id, s)}
                              disabled={app.status === s}
                              className={`text-xs px-2.5 py-1 rounded-lg border transition-colors
                                ${app.status === s
                                  ? 'bg-brand-500/20 text-brand-400 border-brand-500/40'
                                  : 'bg-slate-800 text-slate-500 border-slate-700 hover:text-slate-300'
                                }`}>
                        {s.charAt(0).toUpperCase() + s.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                {app.resume?.url && (
                  <a href={app.resume.url} target="_blank" rel="noopener noreferrer"
                     className="btn-outline text-xs flex-shrink-0">📄 CV</a>
                )}
              </div>
            ))}
          </div>
        )
      )}

      {/* Post / Edit Job Modal */}
      <Modal isOpen={showPost} onClose={() => setShowPost(false)}
             title={editJob ? 'Edit Job' : 'Post a New Job'} size="lg">
        <form onSubmit={saveJob} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="label">Job Title *</label>
              <input className="input" placeholder="e.g. Senior React Developer"
                     value={form.title} onChange={set('title')} required />
            </div>
            <div>
              <label className="label">Type</label>
              <select className="input" value={form.type} onChange={set('type')}>
                {['Full-time','Part-time','Contract','Freelance','Internship'].map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Level</label>
              <select className="input" value={form.level} onChange={set('level')}>
                {['Entry','Mid','Senior','Lead','Executive'].map((l) => (
                  <option key={l}>{l}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Category</label>
              <select className="input" value={form.category} onChange={set('category')}>
                {['Engineering','Design','Marketing','Sales','Finance',
                  'HR','Operations','Data','Product','Other'].map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Location</label>
              <input className="input" placeholder="San Francisco, CA or Remote"
                     value={form.location} onChange={set('location')} />
            </div>
            <div>
              <label className="label">Min Salary (USD/year)</label>
              <input className="input" type="number" placeholder="80000"
                     value={form.salaryMin} onChange={set('salaryMin')} />
            </div>
            <div>
              <label className="label">Max Salary (USD/year)</label>
              <input className="input" type="number" placeholder="120000"
                     value={form.salaryMax} onChange={set('salaryMax')} />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Skills (comma-separated)</label>
              <input className="input" placeholder="React, TypeScript, Node.js"
                     value={form.skills} onChange={set('skills')} />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Description *</label>
              <textarea className="input resize-none" rows={4}
                        placeholder="Describe the role and company…"
                        value={form.description} onChange={set('description')} required />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Requirements</label>
              <textarea className="input resize-none" rows={3}
                        placeholder="Required qualifications…"
                        value={form.requirements} onChange={set('requirements')} />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Benefits (comma-separated)</label>
              <input className="input" placeholder="Health insurance, Equity, Remote work"
                     value={form.benefits} onChange={set('benefits')} />
            </div>
            <div className="flex items-center gap-3">
              <input type="checkbox" id="isRemote" checked={form.isRemote}
                     onChange={set('isRemote')} className="w-4 h-4 accent-brand-500" />
              <label htmlFor="isRemote" className="text-sm text-slate-400 cursor-pointer">
                Remote position
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-slate-800">
            <button type="button" onClick={() => setShowPost(false)} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Saving…' : editJob ? 'Update Job' : 'Post Job'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}