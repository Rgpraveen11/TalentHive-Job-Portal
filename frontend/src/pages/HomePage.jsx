import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useJobs } from '../context/JobContext';
import JobCard from '../components/jobs/JobCard';
import Spinner from '../components/common/Spinner';
import { useFetch } from '../hooks/useFetch';
import { jobService } from '../services/jobService';

const FEATURES = [
  { icon: '🤖', title: 'AI Job Matching', desc: 'Our algorithm scores your profile against every listing and surfaces your best opportunities.' },
  { icon: '📄', title: 'Resume Parsing', desc: 'Upload your CV and we automatically extract skills, experience, and contact info.' },
  { icon: '🔗', title: 'LinkedIn Import', desc: 'One click to import your LinkedIn profile — no manual re-entry.' },
  { icon: '⚡', title: 'Instant Apply', desc: 'Apply in seconds with your saved profile. Track every application in one place.' },
];

const STATS = [
  { value: '12,400+', label: 'Open Roles' },
  { value: '3,200+',  label: 'Companies' },
  { value: '89%',     label: 'Match Accuracy' },
  { value: '48h',     label: 'Avg. Response Time' },
];

export default function HomePage() {
  const [search,   setSearch]   = useState('');
  const [location, setLocation] = useState('');
  const navigate = useNavigate();
  const { fetchJobs, updateFilter } = useJobs();

  const { data: featuredData, loading } = useFetch(
    () => jobService.getJobs({ limit: 6, sortBy: 'isFeatured', order: 'desc' })
  );

  const handleSearch = (e) => {
    e.preventDefault();
    updateFilter('search', search);
    navigate('/jobs');
  };

  return (
    <div>
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-slate-950 pt-20 pb-32">
        {/* Gradient blobs */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px]
                        bg-brand-500/10 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[300px]
                        bg-purple-500/5 blur-[100px] rounded-full pointer-events-none" />

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <div className="inline-flex items-center gap-2 bg-brand-500/10 border border-brand-500/20
                          rounded-full px-4 py-1.5 text-brand-400 text-sm font-medium mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-pulse" />
            AI-powered job matching
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black text-slate-100
                         leading-[1.05] tracking-tight mb-6">
            Find work that{' '}
            <span className="text-transparent bg-clip-text
                             bg-gradient-to-r from-brand-400 to-purple-400">
              moves you
            </span>
          </h1>

          <p className="text-slate-400 text-lg sm:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
            AI-powered matching surfaces your best opportunities based on skills,
            experience, and career trajectory. No noise — just signal.
          </p>

          {/* Search bar */}
          <form onSubmit={handleSearch}
                className="flex flex-col sm:flex-row gap-2 max-w-2xl mx-auto
                           bg-slate-900 border border-slate-700 rounded-2xl p-2">
            <div className="flex-1 flex items-center gap-2 px-3">
              <svg className="w-4 h-4 text-slate-500 flex-shrink-0" fill="none"
                   stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Job title, company, or skill…"
                className="flex-1 bg-transparent text-slate-100 placeholder-slate-500
                           outline-none text-sm py-1"
              />
            </div>
            <div className="hidden sm:block w-px bg-slate-700 my-1" />
            <div className="flex-1 flex items-center gap-2 px-3">
              <svg className="w-4 h-4 text-slate-500 flex-shrink-0" fill="none"
                   stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              </svg>
              <input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Location or Remote…"
                className="flex-1 bg-transparent text-slate-100 placeholder-slate-500
                           outline-none text-sm py-1"
              />
            </div>
            <button type="submit" className="btn-primary rounded-xl px-6">
              Search Jobs
            </button>
          </form>

          {/* Quick tags */}
          <div className="flex flex-wrap gap-2 justify-center mt-5">
            {['Remote', 'React', 'Python', 'Design', 'Marketing', 'Data Science'].map((tag) => (
              <button key={tag}
                      onClick={() => { updateFilter('search', tag); navigate('/jobs'); }}
                      className="text-xs px-3 py-1.5 bg-slate-800 hover:bg-slate-700
                                 text-slate-400 hover:text-slate-200 rounded-full
                                 border border-slate-700 transition-colors">
                {tag}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stats ─────────────────────────────────────────────────────────── */}
      <section className="border-y border-slate-800 bg-slate-900/50 py-12">
        <div className="max-w-5xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {STATS.map(({ value, label }) => (
              <div key={label} className="text-center">
                <p className="text-3xl font-black text-slate-100">{value}</p>
                <p className="text-slate-500 text-sm mt-1">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Featured Jobs ─────────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-slate-100">Featured Jobs</h2>
            <p className="text-slate-500 text-sm mt-1">Handpicked opportunities from top companies</p>
          </div>
          <Link to="/jobs" className="btn-outline text-xs">View All →</Link>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Spinner /></div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {featuredData?.jobs?.map((job) => (
              <JobCard key={job._id} job={job} />
            ))}
          </div>
        )}
      </section>

      {/* ── Features ──────────────────────────────────────────────────────── */}
      <section className="border-t border-slate-800 bg-slate-900/30 py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold text-slate-100 mb-3">
              Why TalentHive?
            </h2>
            <p className="text-slate-500 max-w-xl mx-auto text-sm">
              We built the job search experience we always wanted — fast, intelligent, and candidate-first.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {FEATURES.map(({ icon, title, desc }) => (
              <div key={title} className="card text-center hover:border-brand-500/30 transition-colors">
                <div className="text-3xl mb-3">{icon}</div>
                <h3 className="font-semibold text-slate-100 mb-2 text-sm">{title}</h3>
                <p className="text-slate-500 text-xs leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────────────────── */}
      <section className="py-20 px-4">
        <div className="max-w-3xl mx-auto text-center bg-gradient-to-r from-brand-500/10
                        to-purple-500/10 border border-brand-500/20 rounded-3xl p-12">
          <h2 className="text-3xl font-black text-slate-100 mb-4">
            Ready to find your next role?
          </h2>
          <p className="text-slate-400 mb-8 text-sm">
            Join thousands of candidates who found their dream jobs through TalentHive.
          </p>
          <div className="flex gap-3 justify-center">
            <Link to="/register" className="btn-primary px-8">Get Started Free</Link>
            <Link to="/jobs"     className="btn-secondary px-8">Browse Jobs</Link>
          </div>
        </div>
      </section>
    </div>
  );
}