const asyncHandler = require('express-async-handler');
const Application = require('../models/Application');
const Job = require('../models/Job');
const User = require('../models/User');
const { calculateMatchScore } = require('../services/jobMatcher');
const {
  sendApplicationEmail,
  sendStatusUpdateEmail,
} = require('../utils/mailer');

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Apply for a job
// @route   POST /api/applications
// @access  Private (candidate)
// ─────────────────────────────────────────────────────────────────────────────
const applyForJob = asyncHandler(async (req, res) => {
  const { jobId, coverLetter } = req.body;

  if (!jobId) {
    res.status(400);
    throw new Error('jobId is required');
  }

  const job = await Job.findById(jobId);
  if (!job) {
    res.status(404);
    throw new Error('Job not found');
  }

  if (job.status !== 'active') {
    res.status(400);
    throw new Error('This job is no longer accepting applications');
  }

  // Check deadline
  if (job.applicationDeadline && new Date() > job.applicationDeadline) {
    res.status(400);
    throw new Error('The application deadline for this job has passed');
  }

  // Check for duplicate application (also enforced by unique index in schema)
  const existing = await Application.findOne({
    job: jobId,
    candidate: req.user._id,
  });
  if (existing) {
    res.status(400);
    throw new Error('You have already applied for this job');
  }

  const candidate = await User.findById(req.user._id);

  // Calculate AI match score
  const matchScore = calculateMatchScore(candidate, job.toObject());

  const application = await Application.create({
    job: jobId,
    candidate: req.user._id,
    employer: job.employer,
    coverLetter: coverLetter || '',
    resume: {
      url: candidate.resume?.url || '',
      filename: candidate.resume?.filename || '',
    },
    matchScore,
    // statusHistory is auto-populated by the model's pre-save hook
  });

  // Increment job's application counter
  await Job.findByIdAndUpdate(jobId, { $inc: { applicationCount: 1 } });

  // Notify employer — non-blocking
  User.findById(job.employer).then((employer) => {
    if (employer) {
      sendApplicationEmail(employer, candidate, job).catch((err) =>
        console.error('Application email failed:', err.message)
      );
    }
  });

  const populated = await application.populate([
    { path: 'job', select: 'title company salary type level location isRemote' },
    { path: 'candidate', select: 'name email headline avatar skills' },
  ]);

  res.status(201).json({
    success: true,
    application: populated,
    message: 'Application submitted successfully',
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Get all applications submitted by the logged-in candidate
// @route   GET /api/applications/mine
// @access  Private (candidate)
// ─────────────────────────────────────────────────────────────────────────────
const getMyApplications = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 10 } = req.query;

  const query = { candidate: req.user._id };
  if (status) query.status = status;

  const pageNum = Math.max(1, Number(page));
  const limitNum = Math.min(50, Number(limit));
  const skip = (pageNum - 1) * limitNum;

  const [applications, total] = await Promise.all([
    Application.find(query)
      .populate(
        'job',
        'title company salary type level isRemote location status'
      )
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum),
    Application.countDocuments(query),
  ]);

  res.status(200).json({
    success: true,
    count: applications.length,
    pagination: {
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum),
    },
    applications,
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Get all applicants for a specific job (employer view)
// @route   GET /api/applications/job/:jobId
// @access  Private (employer — own job; admin — any)
// ─────────────────────────────────────────────────────────────────────────────
const getJobApplicants = asyncHandler(async (req, res) => {
  const job = await Job.findById(req.params.jobId);
  if (!job) {
    res.status(404);
    throw new Error('Job not found');
  }

  const isOwner = job.employer.toString() === req.user._id.toString();
  const isAdmin = req.user.role === 'admin';

  if (!isOwner && !isAdmin) {
    res.status(403);
    throw new Error('Not authorized to view applicants for this job');
  }

  const {
    status,
    sortBy = 'matchScore',
    order = 'desc',
    page = 1,
    limit = 20,
  } = req.query;

  const query = { job: req.params.jobId };
  if (status) query.status = status;

  const pageNum = Math.max(1, Number(page));
  const limitNum = Math.min(100, Number(limit));
  const skip = (pageNum - 1) * limitNum;
  const sortOrder = order === 'asc' ? 1 : -1;

  const [applications, total] = await Promise.all([
    Application.find(query)
      .populate(
        'candidate',
        'name email headline avatar skills location phone resume experience education'
      )
      .sort({ [sortBy]: sortOrder })
      .skip(skip)
      .limit(limitNum),
    Application.countDocuments(query),
  ]);

  res.status(200).json({
    success: true,
    count: applications.length,
    pagination: {
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum),
    },
    applications,
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Get a single application by ID
// @route   GET /api/applications/:id
// @access  Private (candidate — own; employer — own job; admin)
// ─────────────────────────────────────────────────────────────────────────────
const getApplication = asyncHandler(async (req, res) => {
  const application = await Application.findById(req.params.id)
    .populate('job', 'title company salary type level location isRemote employer')
    .populate('candidate', 'name email headline avatar skills experience education resume')
    .populate('employer', 'name email company');

  if (!application) {
    res.status(404);
    throw new Error('Application not found');
  }

  const isCandidate =
    application.candidate._id.toString() === req.user._id.toString();
  const isEmployer =
    application.employer._id.toString() === req.user._id.toString();
  const isAdmin = req.user.role === 'admin';

  if (!isCandidate && !isEmployer && !isAdmin) {
    res.status(403);
    throw new Error('Not authorized to view this application');
  }

  // Hide employer's private notes from candidate
  const response = application.toObject({ virtuals: true });
  if (isCandidate && !isAdmin) {
    delete response.notes;
  }

  res.status(200).json({
    success: true,
    application: response,
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Update application status (employer moves candidate through pipeline)
// @route   PUT /api/applications/:id/status
// @access  Private (employer — own job; admin)
// ─────────────────────────────────────────────────────────────────────────────
const updateApplicationStatus = asyncHandler(async (req, res) => {
  const { status, note, interviewDate, interviewLocation } = req.body;

  const validStatuses = [
    'reviewing',
    'shortlisted',
    'interview',
    'offered',
    'rejected',
  ];

  if (!status || !validStatuses.includes(status)) {
    res.status(400);
    throw new Error(
      `Status must be one of: ${validStatuses.join(', ')}`
    );
  }

  const application = await Application.findById(req.params.id)
    .populate('job', 'title company employer')
    .populate('candidate', 'name email');

  if (!application) {
    res.status(404);
    throw new Error('Application not found');
  }

  const isEmployer =
    application.employer.toString() === req.user._id.toString();
  const isAdmin = req.user.role === 'admin';

  if (!isEmployer && !isAdmin) {
    res.status(403);
    throw new Error('Not authorized to update this application');
  }

  if (['withdrawn', 'applied'].includes(application.status)) {
    // Can move forward from 'applied', but not from 'withdrawn'
    if (application.status === 'withdrawn') {
      res.status(400);
      throw new Error('Cannot update a withdrawn application');
    }
  }

  // Update status (pre-save hook appends to statusHistory automatically)
  application.status = status;
  if (note) {
    // Append note to the last statusHistory entry after save
  }
  if (interviewDate) application.interviewDate = new Date(interviewDate);
  if (interviewLocation) application.interviewLocation = interviewLocation;

  await application.save();

  // Add note to the status history entry that was just pushed
  if (note) {
    const lastEntry =
      application.statusHistory[application.statusHistory.length - 1];
    lastEntry.note = note;
    lastEntry.changedBy = req.user._id;
    await application.save();
  }

  // Notify candidate — non-blocking
  sendStatusUpdateEmail(
    application.candidate,
    application.job,
    status
  ).catch((err) => console.error('Status email failed:', err.message));

  res.status(200).json({
    success: true,
    application,
    message: `Application status updated to '${status}'`,
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Add or update employer's private notes on an application
// @route   PUT /api/applications/:id/notes
// @access  Private (employer — own job)
// ─────────────────────────────────────────────────────────────────────────────
const addNotes = asyncHandler(async (req, res) => {
  const { notes } = req.body;

  if (notes === undefined) {
    res.status(400);
    throw new Error('Notes field is required');
  }

  const application = await Application.findById(req.params.id);

  if (!application) {
    res.status(404);
    throw new Error('Application not found');
  }

  if (application.employer.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('Not authorized to add notes to this application');
  }

  application.notes = notes;
  await application.save();

  res.status(200).json({
    success: true,
    notes: application.notes,
    message: 'Notes saved',
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Withdraw an application (candidate)
// @route   DELETE /api/applications/:id
// @access  Private (candidate — own)
// ─────────────────────────────────────────────────────────────────────────────
const withdrawApplication = asyncHandler(async (req, res) => {
  const application = await Application.findById(req.params.id);

  if (!application) {
    res.status(404);
    throw new Error('Application not found');
  }

  if (application.candidate.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('Not authorized to withdraw this application');
  }

  if (application.status === 'withdrawn') {
    res.status(400);
    throw new Error('Application is already withdrawn');
  }

  if (application.status === 'offered') {
    res.status(400);
    throw new Error(
      'You have received an offer. Please contact the employer directly to withdraw.'
    );
  }

  application.status = 'withdrawn';
  await application.save();

  // Decrement job application count
  await Job.findByIdAndUpdate(application.job, {
    $inc: { applicationCount: -1 },
  });

  res.status(200).json({
    success: true,
    message: 'Application withdrawn successfully',
  });
});

module.exports = {
  applyForJob,
  getMyApplications,
  getJobApplicants,
  getApplication,
  updateApplicationStatus,
  addNotes,
  withdrawApplication,
};