const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema(
  {
    // ── Core References ───────────────────────────────────────────────────
    job: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job',
      required: [true, 'Job reference is required'],
    },
    candidate: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Candidate reference is required'],
    },
    employer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Employer reference is required'],
    },

    // ── Application Content ───────────────────────────────────────────────
    coverLetter: {
      type: String,
      default: '',
      maxlength: [3000, 'Cover letter cannot exceed 3000 characters'],
    },
    resume: {
      url: { type: String, default: '' },
      filename: { type: String, default: '' },
    },

    // ── Status ────────────────────────────────────────────────────────────
    status: {
      type: String,
      enum: {
        values: [
          'applied',      // Just submitted
          'reviewing',    // Employer opened it
          'shortlisted',  // Marked for further review
          'interview',    // Interview scheduled
          'offered',      // Job offer extended
          'rejected',     // Not moving forward
          'withdrawn',    // Candidate withdrew
        ],
        message: '{VALUE} is not a valid application status',
      },
      default: 'applied',
    },

    // ── AI Match Score (0–100) ────────────────────────────────────────────
    matchScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },

    // ── Employer Notes (private — candidate never sees this) ──────────────
    notes: {
      type: String,
      default: '',
      maxlength: [2000, 'Notes cannot exceed 2000 characters'],
    },

    // ── Interview ─────────────────────────────────────────────────────────
    interviewDate: {
      type: Date,
      default: null,
    },
    interviewLocation: {
      type: String,
      default: '', // Can be a Zoom link or physical address
    },

    // ── Status History (full audit trail) ────────────────────────────────
    statusHistory: [
      {
        status: {
          type: String,
          required: true,
        },
        changedAt: {
          type: Date,
          default: Date.now,
        },
        changedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        note: {
          type: String,
          default: '',
        },
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
// Prevent a candidate from applying to the same job twice
applicationSchema.index({ job: 1, candidate: 1 }, { unique: true });
applicationSchema.index({ candidate: 1, createdAt: -1 });
applicationSchema.index({ employer: 1, status: 1 });
applicationSchema.index({ job: 1, status: 1 });
applicationSchema.index({ matchScore: -1 });

// ─── Virtual: Days since application submitted ───────────────────────────────
applicationSchema.virtual('daysSinceApplied').get(function () {
  const diffMs = Date.now() - new Date(this.createdAt).getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
});

// ─── Virtual: Is application still active (not rejected/withdrawn) ───────────
applicationSchema.virtual('isActive').get(function () {
  return !['rejected', 'withdrawn'].includes(this.status);
});

// ─── Middleware: Push initial 'applied' status to history on create ───────────
applicationSchema.pre('save', function (next) {
  // Only on brand new documents
  if (this.isNew && this.statusHistory.length === 0) {
    this.statusHistory.push({
      status: 'applied',
      changedAt: new Date(),
      changedBy: this.candidate,
      note: 'Application submitted',
    });
  }
  next();
});

// ─── Middleware: Append to statusHistory whenever status changes ──────────────
applicationSchema.pre('save', function (next) {
  if (!this.isNew && this.isModified('status')) {
    this.statusHistory.push({
      status: this.status,
      changedAt: new Date(),
      note: '',
    });
  }
  next();
});

module.exports = mongoose.model('Application', applicationSchema);