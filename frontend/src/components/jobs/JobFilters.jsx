import { useJobs } from '../../context/JobContext';

const TYPES      = ['Full-time', 'Part-time', 'Contract', 'Freelance', 'Internship'];
const LEVELS     = ['Entry', 'Mid', 'Senior', 'Lead', 'Executive'];
const CATEGORIES = ['Engineering', 'Design', 'Marketing', 'Sales', 'Finance',
                    'HR', 'Operations', 'Data', 'Product', 'Other'];

function CheckGroup({ label, options, selected, onToggle }) {
  return (
    <div className="mb-5">
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
        {label}
      </p>
      <div className="space-y-1.5">
        {options.map((opt) => (
          <label key={opt}
                 className="flex items-center gap-2.5 cursor-pointer group">
            <input
              type="checkbox"
              checked={selected.includes(opt)}
              onChange={() => onToggle(opt)}
              className="w-3.5 h-3.5 accent-brand-500 cursor-pointer"
            />
            <span className="text-sm text-slate-400 group-hover:text-slate-200 transition-colors">
              {opt}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}

export default function JobFilters({ onClose }) {
  const { filters, updateFilter, resetFilters, fetchJobs } = useJobs();

  const toggle = (key, value) => {
    const current = filters[key] || [];
    updateFilter(
      key,
      current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value]
    );
  };

  const handleApply = () => {
    fetchJobs({ page: 1 });
    onClose?.();
  };

  const handleReset = () => {
    resetFilters();
    fetchJobs({ page: 1 });
    onClose?.();
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-bold text-slate-100">Filters</h3>
        <button onClick={handleReset}
                className="text-xs text-brand-400 hover:text-brand-300 transition-colors">
          Reset all
        </button>
      </div>

      <div className="flex-1 overflow-y-auto pr-1 space-y-1">
        {/* Remote toggle */}
        <div className="mb-5">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Work Mode
          </p>
          <label className="flex items-center gap-2.5 cursor-pointer">
            <div
              onClick={() => updateFilter('isRemote', !filters.isRemote)}
              className={`w-9 h-5 rounded-full transition-colors cursor-pointer
                ${filters.isRemote ? 'bg-brand-500' : 'bg-slate-700'}`}
            >
              <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform mt-0.5
                ${filters.isRemote ? 'translate-x-4 ml-0.5' : 'translate-x-0 ml-0.5'}`} />
            </div>
            <span className="text-sm text-slate-400">Remote only</span>
          </label>
        </div>

        <CheckGroup
          label="Job Type" options={TYPES}
          selected={filters.type || []}
          onToggle={(v) => toggle('type', v)}
        />
        <CheckGroup
          label="Experience Level" options={LEVELS}
          selected={filters.level || []}
          onToggle={(v) => toggle('level', v)}
        />
        <CheckGroup
          label="Category" options={CATEGORIES}
          selected={filters.category || []}
          onToggle={(v) => toggle('category', v)}
        />

        {/* Salary range */}
        <div className="mb-5">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Salary (USD / year)
          </p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="label text-xs">Min</label>
              <input
                type="number"
                placeholder="0"
                value={filters.minSalary}
                onChange={(e) => updateFilter('minSalary', e.target.value)}
                className="input text-xs py-2"
              />
            </div>
            <div>
              <label className="label text-xs">Max</label>
              <input
                type="number"
                placeholder="500k"
                value={filters.maxSalary}
                onChange={(e) => updateFilter('maxSalary', e.target.value)}
                className="input text-xs py-2"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="pt-4 border-t border-slate-800 mt-4">
        <button onClick={handleApply} className="btn-primary w-full justify-center">
          Apply Filters
        </button>
      </div>
    </div>
  );
}