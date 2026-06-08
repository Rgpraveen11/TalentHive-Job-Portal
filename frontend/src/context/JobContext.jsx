import { createContext, useContext, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import api from '../services/api';

const JobContext = createContext(null);

const DEFAULT_FILTERS = {
  search:    '',
  type:      [],
  level:     [],
  category:  [],
  isRemote:  false,
  minSalary: '',
  maxSalary: '',
  sortBy:    'createdAt',
  order:     'desc',
};

export function JobProvider({ children }) {
  const [jobs,       setJobs]       = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1 });
  const [filters,    setFilters]    = useState(DEFAULT_FILTERS);
  const [loading,    setLoading]    = useState(false);
  const [savedJobs,  setSavedJobs]  = useState([]);

  // ── Fetch jobs list with current filters ─────────────────────────────────
  const fetchJobs = useCallback(async (overrides = {}) => {
    setLoading(true);
    try {
      const params = { ...filters, ...overrides };

      // Serialise arrays to comma-separated strings
      if (params.type?.length)     params.type     = params.type.join(',');
      if (params.level?.length)    params.level    = params.level.join(',');
      if (params.category?.length) params.category = params.category.join(',');
      if (!params.isRemote)        delete params.isRemote;
      if (!params.minSalary)       delete params.minSalary;
      if (!params.maxSalary)       delete params.maxSalary;
      if (!params.search)          delete params.search;

      const { data } = await api.get('/jobs', { params });
      setJobs(data.jobs);
      setPagination(data.pagination);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load jobs');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // ── Update a single filter key ────────────────────────────────────────────
  const updateFilter = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  // ── Reset all filters ─────────────────────────────────────────────────────
  const resetFilters = () => setFilters(DEFAULT_FILTERS);

  // ── Toggle save job ───────────────────────────────────────────────────────
  const toggleSave = async (jobId) => {
    try {
      const { data } = await api.post(`/jobs/${jobId}/save`);
      setSavedJobs((prev) =>
        data.saved
          ? [...prev, jobId]
          : prev.filter((id) => id !== jobId)
      );
      toast.success(data.message);
      return data.saved;
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save job');
    }
  };

  const isJobSaved = (jobId) => savedJobs.includes(jobId);

  return (
    <JobContext.Provider
      value={{
        jobs,
        pagination,
        filters,
        loading,
        savedJobs,
        fetchJobs,
        updateFilter,
        resetFilters,
        toggleSave,
        isJobSaved,
        setJobs,
      }}
    >
      {children}
    </JobContext.Provider>
  );
}

export const useJobs = () => {
  const ctx = useContext(JobContext);
  if (!ctx) throw new Error('useJobs must be used within JobProvider');
  return ctx;
};