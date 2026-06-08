import { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { userService } from '../services/userService';
import toast from 'react-hot-toast';
import { getInitials } from '../utils/helpers';

export default function ProfilePage() {
  const { user, updateUser, loginWithLinkedIn } = useAuth();
  const [tab,     setTab]     = useState('profile');
  const [saving,  setSaving]  = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef();
  const avatarRef    = useRef();

  const [form, setForm] = useState({
    name:      user?.name     || '',
    headline:  user?.headline || '',
    bio:       user?.bio      || '',
    location:  user?.location || '',
    phone:     user?.phone    || '',
    website:   user?.website  || '',
    skills:    (user?.skills  || []).join(', '),
    // Employer fields
    companyName:     user?.company?.name        || '',
    companyWebsite:  user?.company?.website     || '',
    companyIndustry: user?.company?.industry    || '',
    companySize:     user?.company?.size        || '',
    companyDesc:     user?.company?.description || '',
    companyLocation: user?.company?.location    || '',
  });

  const [pwForm, setPwForm] = useState({
    currentPassword: '', newPassword: '', confirmPassword: ''
  });

  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  // ── Save profile ──────────────────────────────────────────────────────────
  const saveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name:     form.name,
        headline: form.headline,
        bio:      form.bio,
        location: form.location,
        phone:    form.phone,
        website:  form.website,
        skills:   form.skills.split(',').map((s) => s.trim()).filter(Boolean),
        ...(user?.role === 'employer' && {
          company: {
            name:        form.companyName,
            website:     form.companyWebsite,
            industry:    form.companyIndustry,
            size:        form.companySize,
            description: form.companyDesc,
            location:    form.companyLocation,
          },
        }),
      };
      const { data } = await userService.updateProfile(payload);
      updateUser(data.user);
      toast.success('Profile saved!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  // ── Upload resume ─────────────────────────────────────────────────────────
  const handleResumeUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('resume', file);
    setUploading(true);
    try {
      const { data } = await userService.uploadResume(fd);
      updateUser({ ...user, resume: data.resume, skills: data.parsed?.skills?.length ? data.parsed.skills : user.skills });
      toast.success(`Resume uploaded! Detected ${data.parsed?.skills?.length || 0} skills.`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  // ── Upload avatar ─────────────────────────────────────────────────────────
  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('avatar', file);
    setUploading(true);
    try {
      const { data } = await userService.uploadAvatar(fd);
      updateUser({ ...user, avatar: data.avatar });
      toast.success('Avatar updated!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  // ── Change password ───────────────────────────────────────────────────────
  const changePassword = async (e) => {
    e.preventDefault();
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      toast.error('Passwords do not match'); return;
    }
    setSaving(true);
    try {
      const api = (await import('../services/api')).default;
      await api.put('/auth/password', {
        currentPassword: pwForm.currentPassword,
        newPassword: pwForm.newPassword,
      });
      toast.success('Password changed!');
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change password');
    } finally {
      setSaving(false);
    }
  };

  const TABS = [
    { id: 'profile',  label: 'Profile' },
    ...(user?.role === 'candidate' ? [{ id: 'resume', label: 'Resume' }] : []),
    ...(user?.role === 'employer'  ? [{ id: 'company', label: 'Company' }] : []),
    { id: 'security', label: 'Security' },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
      <h1 className="text-2xl font-bold text-slate-100 mb-1">Account Settings</h1>
      <p className="text-slate-500 text-sm mb-8">Manage your profile and preferences</p>

      {/* Profile header */}
      <div className="card mb-6 flex items-center gap-5">
        <div className="relative">
          <div className="w-16 h-16 rounded-2xl bg-brand-500 flex items-center justify-center
                          text-white font-black text-xl overflow-hidden">
            {user?.avatar
              ? <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
              : getInitials(user?.name)
            }
          </div>
          <button onClick={() => avatarRef.current?.click()}
                  className="absolute -bottom-1 -right-1 w-6 h-6 bg-brand-500 rounded-full
                             flex items-center justify-center text-white text-xs hover:bg-brand-600">
            ✎
          </button>
          <input ref={avatarRef} type="file" accept="image/*"
                 className="hidden" onChange={handleAvatarUpload} />
        </div>
        <div>
          <p className="font-bold text-slate-100">{user?.name}</p>
          <p className="text-slate-500 text-sm">{user?.email}</p>
          <span className="badge badge-purple capitalize mt-1">{user?.role}</span>
        </div>
        {user?.linkedinId ? (
          <div className="ml-auto text-xs text-emerald-400 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            LinkedIn Connected
          </div>
        ) : (
          <button onClick={loginWithLinkedIn}
                  className="ml-auto flex items-center gap-2 text-xs px-3 py-2
                             bg-[#0A66C2]/10 hover:bg-[#0A66C2]/20 text-[#0A66C2]
                             rounded-lg border border-[#0A66C2]/30 transition-colors">
            🔗 Connect LinkedIn
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 mb-6 gap-1">
        {TABS.map(({ id, label }) => (
          <button key={id} onClick={() => setTab(id)}
                  className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px
                    ${tab === id
                      ? 'border-brand-500 text-brand-400'
                      : 'border-transparent text-slate-500 hover:text-slate-300'
                    }`}>
            {label}
          </button>
        ))}
      </div>

      {/* ── Profile Tab ──────────────────────────────────────────────────── */}
      {tab === 'profile' && (
        <form onSubmit={saveProfile} className="card space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Full Name</label>
              <input className="input" value={form.name} onChange={set('name')} />
            </div>
            <div>
              <label className="label">Headline</label>
              <input className="input" placeholder="e.g. Senior React Developer"
                     value={form.headline} onChange={set('headline')} />
            </div>
            <div>
              <label className="label">Location</label>
              <input className="input" placeholder="San Francisco, CA"
                     value={form.location} onChange={set('location')} />
            </div>
            <div>
              <label className="label">Phone</label>
              <input className="input" placeholder="+1 555 000 0000"
                     value={form.phone} onChange={set('phone')} />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Website / Portfolio</label>
              <input className="input" placeholder="https://yoursite.com"
                     value={form.website} onChange={set('website')} />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Bio</label>
              <textarea className="input resize-none" rows={4}
                        placeholder="Tell employers a bit about yourself…"
                        value={form.bio} onChange={set('bio')} />
            </div>
            {user?.role === 'candidate' && (
              <div className="sm:col-span-2">
                <label className="label">Skills (comma-separated)</label>
                <input className="input" placeholder="React, TypeScript, Node.js"
                       value={form.skills} onChange={set('skills')} />
              </div>
            )}
          </div>
          <div className="flex justify-end pt-2">
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      )}

      {/* ── Resume Tab ───────────────────────────────────────────────────── */}
      {tab === 'resume' && (
        <div className="card space-y-6">
          <div>
            <h3 className="section-title mb-1">Resume / CV</h3>
            <p className="text-slate-500 text-sm">PDF or Word document, max 5 MB.</p>
          </div>

          {user?.resume?.url ? (
            <div className="flex items-center gap-4 p-4 bg-slate-800 rounded-xl">
              <div className="text-3xl">📄</div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-200 truncate">{user.resume.filename}</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Uploaded {user.resume.uploadedAt
                    ? new Date(user.resume.uploadedAt).toLocaleDateString()
                    : ''}
                </p>
              </div>
              <a href={user.resume.url} target="_blank" rel="noopener noreferrer"
                 className="btn-outline text-xs">View</a>
            </div>
          ) : (
            <div className="border-2 border-dashed border-slate-700 rounded-xl p-10 text-center">
              <p className="text-4xl mb-3">📤</p>
              <p className="text-slate-400 font-medium text-sm mb-1">No resume uploaded yet</p>
              <p className="text-slate-600 text-xs">PDF or Word (.doc, .docx)</p>
            </div>
          )}

          <div>
            <button disabled={uploading} onClick={() => fileInputRef.current?.click()}
                    className="btn-primary">
              {uploading ? 'Uploading…' : user?.resume?.url ? 'Replace Resume' : 'Upload Resume'}
            </button>
            <input ref={fileInputRef} type="file"
                   accept=".pdf,.doc,.docx,application/pdf,application/msword,
                            application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                   className="hidden" onChange={handleResumeUpload} />
          </div>

          {user?.skills?.length > 0 && (
            <div>
              <p className="text-sm font-medium text-slate-300 mb-3">
                Detected Skills ({user.skills.length})
              </p>
              <div className="flex flex-wrap gap-2">
                {user.skills.map((s) => (
                  <span key={s} className="badge-purple">{s}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Company Tab (employer) ───────────────────────────────────────── */}
      {tab === 'company' && (
        <form onSubmit={saveProfile} className="card space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Company Name</label>
              <input className="input" value={form.companyName} onChange={set('companyName')} />
            </div>
            <div>
              <label className="label">Industry</label>
              <input className="input" placeholder="e.g. Fintech"
                     value={form.companyIndustry} onChange={set('companyIndustry')} />
            </div>
            <div>
              <label className="label">Company Size</label>
              <select className="input" value={form.companySize} onChange={set('companySize')}>
                {['', '1-10', '11-50', '51-200', '201-500', '501-1000', '1000-5000', '5000+']
                  .map((s) => <option key={s} value={s}>{s || 'Select size'}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Location</label>
              <input className="input" placeholder="San Francisco, CA"
                     value={form.companyLocation} onChange={set('companyLocation')} />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Website</label>
              <input className="input" placeholder="https://company.com"
                     value={form.companyWebsite} onChange={set('companyWebsite')} />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Description</label>
              <textarea className="input resize-none" rows={4}
                        placeholder="Tell candidates about your company…"
                        value={form.companyDesc} onChange={set('companyDesc')} />
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Saving…' : 'Save Company Info'}
            </button>
          </div>
        </form>
      )}

      {/* ── Security Tab ─────────────────────────────────────────────────── */}
      {tab === 'security' && (
        <form onSubmit={changePassword} className="card space-y-4 max-w-md">
          <h3 className="section-title">Change Password</h3>
          {[
            { label: 'Current Password', key: 'currentPassword' },
            { label: 'New Password',     key: 'newPassword'     },
            { label: 'Confirm New',      key: 'confirmPassword' },
          ].map(({ label, key }) => (
            <div key={key}>
              <label className="label">{label}</label>
              <input type="password" className="input" placeholder="••••••••"
                     value={pwForm[key]}
                     onChange={(e) => setPwForm((p) => ({ ...p, [key]: e.target.value }))} />
            </div>
          ))}
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? 'Changing…' : 'Change Password'}
          </button>
        </form>
      )}
    </div>
  );
}