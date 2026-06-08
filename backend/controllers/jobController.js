const asyncHandler = require('express-async-handler');
const Job = require('../models/Job');
const User = require('../models/User');
const Application = require('../models/Application');
const { calculateMatchScore } = require('../services/jobMatcher');

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Get all jobs with filters, search, and pagination
// @route   GET /api/jobs
// @access  Public
// ─────────────────────────────────────────────────────────────────────────────
const getJobs = asyncHandler(async (req, res) => {
  const {
    search,
    type,
    level,
    category,
    isRemote,
    minSalary,
    maxSalary,
    location,
    skills,
    page = 1,
    limit = 12,
    sortBy = 'createdAt',
    order = 'desc',
  } = req.query;

  const query = { status: 'active' };

  // Full-text search (uses the text index on title + description + company.name)
  if (search) {
    query.$text = { $search: search };
  }

  // Multi-value filters — e.g. ?type=Full-time,Contract
  if (type) query.type = { $in: type.split(',') };
  if (level) query.level = { $in: level.split(',') };
  if (category) query.category = { $in: category.split(',') };
  if (skills) query.skills = { $in: skills.split(',') };

  if (isRemote === 'true') query.isRemote = true;

  if (location) {
    query.location = { $regex: location, $options: 'i' };
  }

  if (minSalary) query['salary.min'] = { $gte: Number(minSalary) };
  if (maxSalary) query['salary.max'] = { $lte: Number(maxSalary) };

  const pageNum = Math.max(1, Number(page));
  const limitNum = Math.min(50, Math.max(1, Number(limit)));
  const skip = (pageNum - 1) * limitNum;

  const sortOrder = order === 'asc' ? 1 : -1;
  const sortObj = search
    ? { score: { $meta: 'textScore' }, [sortBy]: sortOrder }
    : { isFeatured: -1, [sortBy]: sortOrder };

  const [jobs, total] = await Promise.all([
    Job.find(query, search ? { score: { $meta: 'textScore' } } : {})
      .populate('employer', 'name company.name company.logo')
      .sort(sortObj)
      .skip(skip)
      .limit(limitNum)
      .lean(),
    Job.countDocuments(query),
  ]);

  res.status(200).json({
    success: true,
    count: jobs.length,
    pagination: {
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum),
      limit: limitNum,
    },
    jobs,
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Get AI-matched jobs for the logged-in candidate
// @route   GET /api/jobs/match
// @access  Private (candidate)
// ─────────────────────────────────────────────────────────────────────────────
const getMatchedJobs = asyncHandler(async (req, res) => {
  const candidate = await User.findById(req.user._id);

  // Get IDs of jobs candidate already applied to (exclude them)
  const appliedApplications = await Application.find(
    { candidate: req.user._id },
    'job'
  ).lean();
  const appliedJobIds = appliedApplications.map((a) => a.job.toString());

  const jobs = await Job.find({
    status: 'active',
    _id: { $nin: appliedJobIds },
  })
    .populate('employer', 'name company.name company.logo')
    .lean();

  // Score every job against the candidate's profile
  const scoredJobs = jobs
    .map((job) => ({
      ...job,
      matchScore: calculateMatchScore(candidate, job),
    }))
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, 20); // Return top 20

  res.status(200).json({
    success: true,
    count: scoredJobs.length,
    jobs: scoredJobs,
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Get a single job by ID
// @route   GET /api/jobs/:id
// @access  Public
// ─────────────────────────────────────────────────────────────────────────────
const getJob = asyncHandler(async (req, res) => {
  const job = await Job.findById(req.params.id).populate(
    'employer',
    'name email avatar company'
  );

  if (!job) {
    res.status(404);
    throw new Error('Job not found');
  }

  if (job.status === 'draft' || job.status === 'flagged') {
    // Only the owner or admin can view non-active jobs
    const isOwner =
      req.user && job.employer._id.toString() === req.user._id.toString();
    const isAdmin = req.user && req.user.role === 'admin';
    if (!isOwner && !isAdmin) {
      res.status(404);
      throw new Error('Job not found');
    }
  }

  // Increment view count asynchronously (don't await)
  Job.findByIdAndUpdate(req.params.id, { $inc: { views: 1 } }).exec();

  // If candidate is logged in, attach their match score
  let matchScore = null;
  if (req.user && req.user.role === 'candidate') {
    const candidate = await User.findById(req.user._id);
    matchScore = calculateMatchScore(candidate, job.toObject());
  }

  res.status(200).json({
    success: true,
    job,
    matchScore,
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Create a new job listing
// @route   POST /api/jobs
// @access  Private (employer)
// ─────────────────────────────────────────────────────────────────────────────
const createJob = asyncHandler(async (req, res) => {
  const {
    title,
    description,
    requirements,
    responsibilities,
    location,
    isRemote,
    type,
    level,
    category,
    skills,
    salary,
    benefits,
    applicationDeadline,
    status,
  } = req.body;

  if (!title || !description || !location || !type || !level || !category) {
    res.status(400);
    throw new Error(
      'Please provide title, description, location, type, level, and category'
    );
  }

  // Pull company info from the employer's profile
  const employer = await User.findById(req.user._id);

  const job = await Job.create({
    title,
    description,
    requirements: requirements || '',
    responsibilities: responsibilities || '',
    employer: req.user._id,
    company: {
      name: employer.company?.name || employer.name,
      logo: employer.company?.logo || '',
      website: employer.company?.website || '',
      location: employer.company?.location || location,
    },
    location,
    isRemote: isRemote || false,
    type,
    level,
    category,
    skills: skills || [],
    salary: salary || { min: 0, max: 0, currency: 'USD', period: 'yearly', isPublic: true },
    benefits: benefits || [],
    applicationDeadline: applicationDeadline || null,
    status: status === 'draft' ? 'draft' : 'active',
  });

  res.status(201).json({
    success: true,
    job,
    message: 'Job listing created successfully',
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Update a job listing
// @route   PUT /api/jobs/:id
// @access  Private (employer — own job only; admin — any job)
// ─────────────────────────────────────────────────────────────────────────────
const updateJob = asyncHandler(async (req, res) => {
  const job = await Job.findById(req.params.id);

  if (!job) {
    res.status(404);
    throw new Error('Job not found');
  }

  const isOwner = job.employer.toString() === req.user._id.toString();
  const isAdmin = req.user.role === 'admin';

  if (!isOwner && !isAdmin) {
    res.status(403);
    throw new Error('You are not authorized to update this job');
  }

  // Prevent re-activating a flagged job without admin
  if (req.body.status === 'active' && job.status === 'flagged' && !isAdmin) {
    res.status(403);
    throw new Error('Flagged jobs can only be re-activated by an admin');
  }

  const updatableFields = [
    'title', 'description', 'requirements', 'responsibilities',
    'location', 'isRemote', 'type', 'level', 'category',
    'skills', 'salary', 'benefits', 'applicationDeadline',
    'status', 'isFeatured', 'expiresAt',
  ];

  const updates = {};
  updatableFields.forEach((field) => {
    if (req.body[field] !== undefined) updates[field] = req.body[field];
  });

  const updatedJob = await Job.findByIdAndUpdate(
    req.params.id,
    { $set: updates },
    { new: true, runValidators: true }
  ).populate('employer', 'name company');

  res.status(200).json({
    success: true,
    job: updatedJob,
    message: 'Job updated successfully',
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Delete a job listing
// @route   DELETE /api/jobs/:id
// @access  Private (employer — own job; admin — any)
// ─────────────────────────────────────────────────────────────────────────────
const deleteJob = asyncHandler(async (req, res) => {
  const job = await Job.findById(req.params.id);

  if (!job) {
    res.status(404);
    throw new Error('Job not found');
  }

  const isOwner = job.employer.toString() === req.user._id.toString();
  const isAdmin = req.user.role === 'admin';

  if (!isOwner && !isAdmin) {
    res.status(403);
    throw new Error('You are not authorized to delete this job');
  }

  await job.deleteOne();

  // Clean up all applications for this job
  await Application.deleteMany({ job: req.params.id });

  res.status(200).json({
    success: true,
    message: 'Job and all associated applications deleted successfully',
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Get all jobs posted by the logged-in employer
// @route   GET /api/jobs/employer/mine
// @access  Private (employer)
// ─────────────────────────────────────────────────────────────────────────────
const getEmployerJobs = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 10 } = req.query;

  const query = { employer: req.user._id };
  if (status) query.status = status;

  const pageNum = Math.max(1, Number(page));
  const limitNum = Math.min(50, Number(limit));
  const skip = (pageNum - 1) * limitNum;

  const [jobs, total] = await Promise.all([
    Job.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean(),
    Job.countDocuments(query),
  ]);

  res.status(200).json({
    success: true,
    count: jobs.length,
    pagination: {
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum),
    },
    jobs,
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Report a job listing as inappropriate
// @route   POST /api/jobs/:id/report
// @access  Private
// ─────────────────────────────────────────────────────────────────────────────
const reportJob = asyncHandler(async (req, res) => {
  const job = await Job.findById(req.params.id);

  if (!job) {
    res.status(404);
    throw new Error('Job not found');
  }

  const alreadyReported = job.reportedBy.some(
    (userId) => userId.toString() === req.user._id.toString()
  );

  if (alreadyReported) {
    res.status(400);
    throw new Error('You have already reported this job');
  }

  job.reportedBy.push(req.user._id);

  // Auto-flag if 3+ reports (also handled in model pre-save hook)
  if (job.reportedBy.length >= 3) {
    job.status = 'flagged';
  }

  await job.save();

  res.status(200).json({
    success: true,
    message: 'Job reported. Our moderation team will review it shortly.',
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Toggle save / unsave a job (candidate)
// @route   POST /api/jobs/:id/save
// @access  Private (candidate)
// ─────────────────────────────────────────────────────────────────────────────
const toggleSaveJob = asyncHandler(async (req, res) => {
  const job = await Job.findById(req.params.id);
  if (!job) {
    res.status(404);
    throw new Error('Job not found');
  }

  const user = await User.findById(req.user._id);

  const isSaved = user.savedJobs.some(
    (id) => id.toString() === req.params.id
  );

  if (isSaved) {
    user.savedJobs = user.savedJobs.filter(
      (id) => id.toString() !== req.params.id
    );
  } else {
    user.savedJobs.push(req.params.id);
  }

  await user.save();

  res.status(200).json({
    success: true,
    saved: !isSaved,
    message: isSaved ? 'Job removed from saved list' : 'Job saved successfully',
  });
});

module.exports = {
  getJobs,
  getMatchedJobs,
  getJob,
  createJob,
  updateJob,
  deleteJob,
  getEmployerJobs,
  reportJob,
  toggleSaveJob,
};