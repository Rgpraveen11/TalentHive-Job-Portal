const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Job title is required'],
      trim: true,
      maxlength: [150, 'Title cannot exceed 150 characters'],
    },
    description: {
      type: String,
      required: [true, 'Job description is required'],
      maxlength: [10000, 'Description cannot exceed 10000 characters'],
    },
    requirements: {
      type: String,
      default: '',
      maxlength: [5000, 'Requirements cannot exceed 5000 characters'],
    },
    responsibilities: {
      type: String,
      default: '',
      maxlength: [5000, 'Responsibilities cannot exceed 5000 characters'],
    },

    // ── Employer Reference ────────────────────────────────────────────────
    employer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Employer reference is required'],
    },

    // ── Company Snapshot (denormalized for performance) ───────────────────
    company: {
      name: { type: String, required: [true, 'Company name is required'] },
      logo: { type: String, default: '' },
      website: { type: String, default: '' },
      location: { type: String, default: '' },
    },

    // ── Location ──────────────────────────────────────────────────────────
    location: {
      type: String,
      required: [true, 'Location is required'],
    },
    isRemote: {
      type: Boolean,
      default: false,
    },

    // ── Job Classification ────────────────────────────────────────────────
    type: {
      type: String,
      required: [true, 'Job type is required'],
      enum: {
        values: ['Full-time', 'Part-time', 'Contract', 'Freelance', 'Internship'],
        message: '{VALUE} is not a valid job type',
      },
    },
    level: {
      type: String,
      required: [true, 'Experience level is required'],
      enum: {
        values: ['Entry', 'Mid', 'Senior', 'Lead', 'Executive'],
        message: '{VALUE} is not a valid experience level',
      },
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: {
        values: [
          'Engineering',
          'Design',
          'Marketing',
          'Sales',
          'Finance',
          'HR',
          'Operations',
          'Data',
          'Product',
          'Other',
        ],
        message: '{VALUE} is not a valid category',
      },
    },

    // ── Skills ────────────────────────────────────────────────────────────
    skills: [
      {
        type: String,
        trim: true,
      },
    ],

    // ── Salary ────────────────────────────────────────────────────────────
    salary: {
      min: { type: Number, default: 0, min: 0 },
      max: { type: Number, default: 0, min: 0 },
      currency: { type: String, default: 'USD', maxlength: 5 },
      period: {
        type: String,
        enum: ['hourly', 'monthly', 'yearly'],
        default: 'yearly',
      },
      isPublic: {
        type: Boolean,
        default: true, // false = show "Competitive" instead
      },
    },

    // ── Benefits ──────────────────────────────────────────────────────────
    benefits: [
      {
        type: String,
        trim: true,
      },
    ],

    // ── Tracking ──────────────────────────────────────────────────────────
    applicationCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    views: {
      type: Number,
      default: 0,
      min: 0,
    },

    // ── Lifecycle ─────────────────────────────────────────────────────────
    status: {
      type: String,
      enum: {
        values: ['active', 'closed', 'draft', 'flagged'],
        message: '{VALUE} is not a valid status',
      },
      default: 'active',
    },
    applicationDeadline: {
      type: Date,
      default: null,
    },
    expiresAt: {
      type: Date,
      // Default: 30 days from creation
      default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },

    // ── Moderation ────────────────────────────────────────────────────────
    reportedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ─── Indexes ────────────────────────────────────────────────────────────────
// Full-text search across title, description, and company name
jobSchema.index({ title: 'text', description: 'text', 'company.name': 'text' });
jobSchema.index({ status: 1, createdAt: -1 });
jobSchema.index({ employer: 1 });
jobSchema.index({ category: 1 });
jobSchema.index({ type: 1, level: 1 });
jobSchema.index({ isRemote: 1 });
jobSchema.index({ 'salary.min': 1, 'salary.max': 1 });

// ─── Virtual: Human-readable salary display string ───────────────────────────
jobSchema.virtual('salaryDisplay').get(function () {
  if (!this.salary.isPublic) return 'Competitive';

  const fmt = (n) => {
    if (n >= 1000) return `${Math.round(n / 1000)}k`;
    return String(n);
  };

  const symbol = this.salary.currency === 'USD' ? '$'
    : this.salary.currency === 'EUR' ? '€'
    : this.salary.currency === 'GBP' ? '£'
    : `${this.salary.currency} `;

  if (!this.salary.min && !this.salary.max) return 'Not specified';
  if (!this.salary.max) return `${symbol}${fmt(this.salary.min)}+`;
  return `${symbol}${fmt(this.salary.min)}–${symbol}${fmt(this.salary.max)}`;
});

// ─── Virtual: Report count ───────────────────────────────────────────────────
jobSchema.virtual('reportCount').get(function () {
  return this.reportedBy?.length || 0;
});

// ─── Virtual: Is expired ─────────────────────────────────────────────────────
jobSchema.virtual('isExpired').get(function () {
  return this.expiresAt ? new Date() > this.expiresAt : false;
});

// ─── Middleware: Auto-flag if reports reach threshold ────────────────────────
jobSchema.pre('save', function (next) {
  if (this.isModified('reportedBy') && this.reportedBy.length >= 3) {
    this.status = 'flagged';
  }
  next();
});

module.exports = mongoose.model('Job', jobSchema);