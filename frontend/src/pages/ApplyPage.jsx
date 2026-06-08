import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { jobService } from '../services/jobService';
import { applicationService } from '../services/applicationService';
import Spinner from '../components/common/Spinner';
import toast from 'react-hot-toast';
import { formatSalary } from '../utils/helpers';

export default function ApplyPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [job,         setJob]         = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [submitting,  setSubmitting]  = useState(false);
  const [coverLetter, setCoverLetter] = useState('');
  const [step,        setStep]        = useState(1); // 1 = review, 2 = cover letter, 3 = success

  useEffect(() => {
    jobService.getJob(id)
      .then(({ data }) => setJob(data.job))
      .catch(() => { toast.error('Job not found'); navigate('/jobs'); })
      .finally(() => setLoading(false));
  }, [id]);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await applicationService.apply({ jobId: id, coverLetter });
      setStep(3);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit application');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Spinner fullScreen />;
  if (!job)    return null;

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <Link to={`/jobs/${id}`}
            className="inline-flex items-center gap-1.5 text-slate-500 hover:text-slate-300
                       text-sm mb-6 transition-colors">
        ← Back to job
      </Link>

      {/* Progress steps */}
      {step < 3 && (
        <div className="flex items-center gap-2 mb-8">
          {['Review Profile', 'Cover Letter', 'Confirm'].map((label, i) => (
            <div key={label} className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs
                              font-bold transition-colors
                              ${step > i + 1 ? 'bg-brand-500 text-white' :
                                step === i + 1 ? 'bg-brand-500 text-white' :
                                'bg-slate-800 text-slate-500'}`}>
                {step > i + 1 ? '✓' : i + 1}
              </div>
              <span className={`text-xs font-medium ${step === i + 1 ? 'text-slate-200' : 'text-slate-500'}`}>
                {label}
              </span>
              {i < 2 && <div className="flex-1 h-px bg-slate-800 w-8" />}
            </div>
          ))}
        </div>
      )}

      {/* Job summary */}
      <div className="card mb-6 flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700
                        flex items-center justify-center text-xl flex-shrink-0">
          {job.company?.name?.[0]}
        </div>
        <div>
          <p className="font-semibold text-slate-100">{job.title}</p>
          <p className="text-slate-500 text-sm">
            {job.company?.name} · {formatSalary(job.salary)} · {job.location}
          </p>
        </div>
      </div>

      {/* Step 1 — Review profile */}
      {step === 1 && (
        <div className="card space-y-5">
          <h2 className="section-title">Review Your Profile</h2>
          <p className="text-slate-500 text-sm">
            This information will be shared with the employer.
          </p>

          {[
            { label: 'Name',     value: user?.name },
            { label: 'Email',    value: user?.email },
            { label: 'Headline', value: user?.headline || '—' },
            { label: 'Location', value: user?.location || '—' },
          ].map(({ label, value }) => (
            <div key={label} className="flex justify-between py-2 border-b border-slate-800">
              <span className="text-slate-500 text-sm">{label}</span>
              <span className="text-slate-200 text-sm font-medium">{value}</span>
            </div>
          ))}

          {user?.skills?.length > 0 && (
            <div>
              <p className="text-slate-500 text-sm mb-2">Skills</p>
              <div className="flex flex-wrap gap-1.5">
                {user.skills.map((s) => (
                  <span key={s} className="badge-slate">{s}</span>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-between pt-2">
            <Link to="/profile" className="btn-secondary text-xs">
              Update Profile
            </Link>
            <button onClick={() => setStep(2)} className="btn-primary">
              Continue →
            </button>
          </div>
        </div>
      )}

      {/* Step 2 — Cover letter */}
      {step === 2 && (
        <div className="card space-y-4">
          <h2 className="section-title">Cover Letter</h2>
          <p className="text-slate-500 text-sm">
            Optional but recommended. Explain why you're a great fit.
          </p>

          <textarea
            rows={10}
            value={coverLetter}
            onChange={(e) => setCoverLetter(e.target.value)}
            placeholder={`Hi ${job.company?.name} team,\n\nI'm excited to apply for the ${job.title} role because…`}
            className="input resize-none"
            maxLength={3000}
          />
          <p className="text-slate-600 text-xs text-right">{coverLetter.length} / 3000</p>

          {/* Resume */}
          <div className="flex items-center justify-between p-4 bg-slate-800 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-slate-700 rounded-lg flex items-center justify-center text-lg">
                📄
              </div>
              <div>
                <p className="text-sm font-medium text-slate-200">
                  {user?.resume?.filename || 'No resume uploaded'}
                </p>
                <p className="text-xs text-slate-500">
                  {user?.resume?.url ? 'Will be shared with employer' : 'Upload a resume to improve your chances'}
                </p>
              </div>
            </div>
            {!user?.resume?.url && (
              <Link to="/profile" className="btn-outline text-xs">Upload</Link>
            )}
          </div>

          <div className="flex justify-between pt-2">
            <button onClick={() => setStep(1)} className="btn-secondary">← Back</button>
            <button onClick={handleSubmit} disabled={submitting} className="btn-primary">
              {submitting ? 'Submitting…' : 'Submit Application ✓'}
            </button>
          </div>
        </div>
      )}

      {/* Step 3 — Success */}
      {step === 3 && (
        <div className="card text-center py-12">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20
                          flex items-center justify-center mx-auto mb-5">
            <span className="text-3xl">🎉</span>
          </div>
          <h2 className="text-xl font-bold text-slate-100 mb-2">
            Application Submitted!
          </h2>
          <p className="text-slate-500 text-sm max-w-sm mx-auto mb-8">
            Your application for <strong className="text-slate-300">{job.title}</strong> at{' '}
            <strong className="text-slate-300">{job.company?.name}</strong> has been sent.
            We'll notify you when there's an update.
          </p>
          <div className="flex gap-3 justify-center">
            <Link to="/dashboard" className="btn-primary">View Applications</Link>
            <Link to="/jobs"      className="btn-secondary">Browse More Jobs</Link>
          </div>
        </div>
      )}
    </div>
  );
}