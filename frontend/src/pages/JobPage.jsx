import { useEffect, useState } from 'react';
import { useJobs } from '../context/JobContext';
import JobCard from '../components/jobs/JobCard';
import JobFilters from '../components/jobs/JobFilters';
import Spinner from '../components/common/Spinner';
import EmptyState from '../components/common/EmptyState';
import { Link } from 'react-router-dom';
import { useDebounce } from '../hooks/useDebounce';

export default function JobsPage() {
  const { jobs, pagination, filters, loading, fetchJobs, updateFilter } = useJobs();
  const [showFilters, setShowFilters] = useState(false);
  const [localSearch, setLocalSearch] = useState(filters.search || '');
  const debouncedSearch = useDebounce(localSearch, 400);

  // Initial load
  useEffect(() => { fetchJobs(); }, []);

  // Re-fetch when debounced search changes
  useEffect(() => {
    updateFilter('search', debouncedSearch);
    fetchJobs({ search: debouncedSearch, page: 1 });
  }, [debouncedSearch]);

  const goToPage = (p) => fetchJobs({ page: p });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-100">Browse Jobs</h1>
        <p className="text-slate-500 text-sm mt-1">
          {pagination.total.toLocaleString()} opportunities available
        </p>
      </div>

      {/* Search + Sort bar */}
      <div className="flex gap-3 mb-6">
        <div className="flex-1 relative">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500"
               fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder="Search jobs, companies, skills…"
            className="input pl-10"
          />
        </div>
        <select
          value={`${filters.sortBy}-${filters.order}`}
          onChange={(e) => {
            const [s, o] = e.target.value.split('-');
            updateFilter('sortBy', s);
            updateFilter('order', o);
            fetchJobs({ sortBy: s, order: o, page: 1 });
          }}
          className="input w-auto cursor-pointer"
        >
          <option value="createdAt-desc">Newest first</option>
          <option value="createdAt-asc">Oldest first</option>
          <option value="salary.max-desc">Salary: High → Low</option>
          <option value="salary.min-asc">Salary: Low → High</option>
        </select>
        <button
          onClick={() => setShowFilters((p) => !p)}
          className={`btn-secondary gap-2 ${showFilters ? 'border-brand-500 text-brand-400' : ''}`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
          </svg>
          Filters
        </button>
      </div>

      <div className="flex gap-6">
        {/* Sidebar filters (desktop) */}
        <aside className={`hidden lg:block w-64 flex-shrink-0 ${showFilters ? '' : ''}`}>
          <div className="card sticky top-20 h-[calc(100vh-6rem)] overflow-hidden">
            <JobFilters />
          </div>
        </aside>

        {/* Mobile filter overlay */}
        {showFilters && (
          <div className="lg:hidden fixed inset-0 z-40 flex">
            <div className="absolute inset-0 bg-black/60" onClick={() => setShowFilters(false)} />
            <div className="relative ml-auto w-72 bg-slate-900 border-l border-slate-800
                            h-full p-6 overflow-y-auto">
              <JobFilters onClose={() => setShowFilters(false)} />
            </div>
          </div>
        )}

        {/* Jobs grid */}
        <div className="flex-1 min-w-0">
          {loading ? (
            <div className="flex justify-center py-16"><Spinner /></div>
          ) : jobs.length === 0 ? (
            <EmptyState
              icon="🔭"
              title="No jobs found"
              description="Try adjusting your search or filters to find more opportunities."
              action={
                <button onClick={() => {
                          updateFilter('search', '');
                          setLocalSearch('');
                          fetchJobs({ search: '', page: 1 });
                        }}
                        className="btn-outline">
                  Clear filters
                </button>
              }
            />
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {jobs.map((job) => <JobCard key={job._id} job={job} />)}
              </div>

              {/* Pagination */}
              {pagination.pages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-8">
                  <button
                    disabled={pagination.page <= 1}
                    onClick={() => goToPage(pagination.page - 1)}
                    className="btn-secondary px-3 py-2 disabled:opacity-40"
                  >
                    ← Prev
                  </button>
                  {Array.from({ length: Math.min(pagination.pages, 5) }, (_, i) => {
                    const p = i + 1;
                    return (
                      <button key={p} onClick={() => goToPage(p)}
                              className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors
                                ${pagination.page === p
                                  ? 'bg-brand-500 text-white'
                                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                                }`}>
                        {p}
                      </button>
                    );
                  })}
                  <button
                    disabled={pagination.page >= pagination.pages}
                    onClick={() => goToPage(pagination.page + 1)}
                    className="btn-secondary px-3 py-2 disabled:opacity-40"
                  >
                    Next →
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}