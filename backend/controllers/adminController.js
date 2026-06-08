const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const Job = require('../models/Job');
const Application = require('../models/Application');

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Get admin dashboard stats
// @route   GET /api/admin/stats
// @access  Private (admin)
// ─────────────────────────────────────────────────────────────────────────────
const getStats = asyncHandler(async (req, res) => {
  const [
    totalUsers,
    totalCandidates,
    totalEmployers,
    totalJobs,
    activeJobs,
    flaggedJobs,
    draftJobs,
    totalApplications,
    pendingApplications,
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ role: 'candidate' }),
    User.countDocuments({ role: 'employer' }),
    Job.countDocuments(),
    Job.countDocuments({ status: 'active' }),
    Job.countDocuments({ status: 'flagged' }),
    Job.countDocuments({ status: 'draft' }),
    Application.countDocuments(),
    Application.countDocuments({ status: 'applied' }),
  ]);

  // New users in last 7 days
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const newUsersThisWeek = await User.countDocuments({
    createdAt: { $gte: sevenDaysAgo },
  });

  // New jobs in last 7 days
  const newJobsThisWeek = await Job.countDocuments({
    createdAt: { $gte: sevenDaysAgo },
  });

  // Applications in last 7 days
  const newApplicationsThisWeek = await Application.countDocuments({
    createdAt: { $gte: sevenDaysAgo },
  });

  // Top hiring companies (by job count)
  const topCompanies = await Job.aggregate([
    { $match: { status: 'active' } },
    { $group: { _id: '$company.name', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 5 },
    { $project: { _id: 0, company: '$_id', jobCount: '$count' } },
  ]);

  // Applications by status breakdown
  const applicationsByStatus = await Application.aggregate([
    { $group: { _id: '$status', count: { $sum: 1 } } },
    { $project: { _id: 0, status: '$_id', count: 1 } },
  ]);

  res.status(200).json({
    success: true,
    stats: {
      users: {
        total: totalUsers,
        candidates: totalCandidates,
        employers: totalEmployers,
        newThisWeek: newUsersThisWeek,
      },
      jobs: {
        total: totalJobs,
        active: activeJobs,
        flagged: flaggedJobs,
        draft: draftJobs,
        newThisWeek: newJobsThisWeek,
      },
      applications: {
        total: totalApplications,
        pending: pendingApplications,
        newThisWeek: newApplicationsThisWeek,
        byStatus: applicationsByStatus,
      },
      topCompanies,
    },
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Get all users with filters and pagination
// @route   GET /api/admin/users
// @access  Private (admin)
// ─────────────────────────────────────────────────────────────────────────────
const getUsers = asyncHandler(async (req, res) => {
  const {
    role,
    isActive,
    search,
    page = 1,
    limit = 20,
    sortBy = 'createdAt',
    order = 'desc',
  } = req.query;

  const query = {};

  if (role && ['candidate', 'employer', 'admin'].includes(role)) {
    query.role = role;
  }

  if (isActive !== undefined) {
    query.isActive = isActive === 'true';
  }

  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];
  }

  const pageNum = Math.max(1, Number(page));
  const limitNum = Math.min(100, Number(limit));
  const skip = (pageNum - 1) * limitNum;
  const sortOrder = order === 'asc' ? 1 : -1;

  const [users, total] = await Promise.all([
    User.find(query)
      .sort({ [sortBy]: sortOrder })
      .skip(skip)
      .limit(limitNum)
      .lean(),
    User.countDocuments(query),
  ]);

  res.status(200).json({
    success: true,
    count: users.length,
    pagination: {
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum),
    },
    users,
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Get a single user by ID (admin)
// @route   GET /api/admin/users/:id
// @access  Private (admin)
// ─────────────────────────────────────────────────────────────────────────────
const getUserById = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  // Get user's activity summary
  const [jobCount, applicationCount] = await Promise.all([
    user.role === 'employer'
      ? Job.countDocuments({ employer: user._id })
      : 0,
    user.role === 'candidate'
      ? Application.countDocuments({ candidate: user._id })
      : 0,
  ]);

  res.status(200).json({
    success: true,
    user: user.toPublicJSON(),
    activity: { jobCount, applicationCount },
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Update a user (suspend, activate, change role)
// @route   PUT /api/admin/users/:id
// @access  Private (admin)
// ─────────────────────────────────────────────────────────────────────────────
const updateUser = asyncHandler(async (req, res) => {
  // Prevent admin from modifying their own account via this endpoint
  if (req.params.id === req.user._id.toString()) {
    res.status(400);
    throw new Error(
      'You cannot modify your own admin account through this endpoint'
    );
  }

  const user = await User.findById(req.params.id);
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  const allowedUpdates = ['isActive', 'role', 'isEmailVerified'];
  const updates = {};

  allowedUpdates.forEach((field) => {
    if (req.body[field] !== undefined) updates[field] = req.body[field];
  });

  if (Object.keys(updates).length === 0) {
    res.status(400);
    throw new Error('No valid fields to update');
  }

  // Validate role
  if (updates.role && !['candidate', 'employer', 'admin'].includes(updates.role)) {
    res.status(400);
    throw new Error('Invalid role. Must be candidate, employer, or admin');
  }

  const updatedUser = await User.findByIdAndUpdate(
    req.params.id,
    { $set: updates },
    { new: true, runValidators: true }
  );

  res.status(200).json({
    success: true,
    user: updatedUser.toPublicJSON(),
    message: 'User updated successfully',
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Delete a user and all their associated data
// @route   DELETE /api/admin/users/:id
// @access  Private (admin)
// ─────────────────────────────────────────────────────────────────────────────
const deleteUser = asyncHandler(async (req, res) => {
  if (req.params.id === req.user._id.toString()) {
    res.status(400);
    throw new Error('You cannot delete your own admin account');
  }

  const user = await User.findById(req.params.id);
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  // Cascade delete all related data
  await Promise.all([
    user.deleteOne(),
    Job.deleteMany({ employer: req.params.id }),
    Application.deleteMany({
      $or: [{ candidate: req.params.id }, { employer: req.params.id }],
    }),
  ]);

  res.status(200).json({
    success: true,
    message: `User '${user.name}' and all associated data permanently deleted`,
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Get all jobs (admin view — includes drafts and flagged)
// @route   GET /api/admin/jobs
// @access  Private (admin)
// ─────────────────────────────────────────────────────────────────────────────
const getAdminJobs = asyncHandler(async (req, res) => {
  const {
    status,
    search,
    page = 1,
    limit = 20,
    sortBy = 'createdAt',
    order = 'desc',
  } = req.query;

  const query = {};

  if (status && ['active', 'closed', 'draft', 'flagged'].includes(status)) {
    query.status = status;
  }

  if (search) {
    query.$or = [
      { title: { $regex: search, $options: 'i' } },
      { 'company.name': { $regex: search, $options: 'i' } },
    ];
  }

  const pageNum = Math.max(1, Number(page));
  const limitNum = Math.min(100, Number(limit));
  const skip = (pageNum - 1) * limitNum;
  const sortOrder = order === 'asc' ? 1 : -1;

  const [jobs, total] = await Promise.all([
    Job.find(query)
      .populate('employer', 'name email company.name')
      .sort({ reportedBy: -1, [sortBy]: sortOrder }) // flagged/reported first
      .skip(skip)
      .limit(limitNum),
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
// @desc    Approve a flagged job (clear reports, set back to active)
// @route   PUT /api/admin/jobs/:id/approve
// @access  Private (admin)
// ─────────────────────────────────────────────────────────────────────────────
const approveJob = asyncHandler(async (req, res) => {
  const job = await Job.findById(req.params.id);

  if (!job) {
    res.status(404);
    throw new Error('Job not found');
  }

  if (job.status !== 'flagged') {
    res.status(400);
    throw new Error('Only flagged jobs can be approved');
  }

  job.status = 'active';
  job.reportedBy = []; // Clear all reports
  await job.save();

  res.status(200).json({
    success: true,
    job,
    message: 'Job approved and set to active',
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Permanently remove a job listing (admin)
// @route   DELETE /api/admin/jobs/:id
// @access  Private (admin)
// ─────────────────────────────────────────────────────────────────────────────
const removeJob = asyncHandler(async (req, res) => {
  const job = await Job.findById(req.params.id);

  if (!job) {
    res.status(404);
    throw new Error('Job not found');
  }

  await Promise.all([
    job.deleteOne(),
    Application.deleteMany({ job: req.params.id }),
  ]);

  res.status(200).json({
    success: true,
    message: `Job '${job.title}' and all associated applications permanently removed`,
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Get all applications (admin oversight)
// @route   GET /api/admin/applications
// @access  Private (admin)
// ─────────────────────────────────────────────────────────────────────────────
const getAdminApplications = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;

  const query = {};
  if (status) query.status = status;

  const pageNum = Math.max(1, Number(page));
  const limitNum = Math.min(100, Number(limit));
  const skip = (pageNum - 1) * limitNum;

  const [applications, total] = await Promise.all([
    Application.find(query)
      .populate('job', 'title company.name')
      .populate('candidate', 'name email')
      .populate('employer', 'name email')
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

module.exports = {
  getStats,
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  getAdminJobs,
  approveJob,
  removeJob,
  getAdminApplications,
};