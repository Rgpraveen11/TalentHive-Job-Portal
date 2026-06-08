const express = require('express');
const router = express.Router();

const {
  getStats,
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  getAdminJobs,
  approveJob,
  removeJob,
  getAdminApplications,
} = require('../controllers/adminController');

const { protect, authorize } = require('../middleware/authMiddleware');

// ─── All admin routes require a valid JWT + admin role ───────────────────────
// Applying middleware once here covers every route below
router.use(protect, authorize('admin'));

// ─── Dashboard ───────────────────────────────────────────────────────────────

// @route   GET /api/admin/stats
// @desc    Get platform-wide stats for admin dashboard
router.get('/stats', getStats);

// ─── User Management ─────────────────────────────────────────────────────────

// @route   GET /api/admin/users
// @desc    Get all users (filterable by role, status, search)
router.get('/users', getUsers);

// @route   GET /api/admin/users/:id
// @desc    Get a single user with activity summary
router.get('/users/:id', getUserById);

// @route   PUT /api/admin/users/:id
// @desc    Update user (suspend, activate, change role)
router.put('/users/:id', updateUser);

// @route   DELETE /api/admin/users/:id
// @desc    Permanently delete user and all their data
router.delete('/users/:id', deleteUser);

// ─── Job Moderation ──────────────────────────────────────────────────────────

// @route   GET /api/admin/jobs
// @desc    Get all jobs including flagged and drafts
router.get('/jobs', getAdminJobs);

// @route   PUT /api/admin/jobs/:id/approve
// @desc    Approve a flagged job (clears reports, sets to active)
router.put('/jobs/:id/approve', approveJob);

// @route   DELETE /api/admin/jobs/:id
// @desc    Permanently remove a job listing and its applications
router.delete('/jobs/:id', removeJob);

// ─── Application Oversight ───────────────────────────────────────────────────

// @route   GET /api/admin/applications
// @desc    Get all applications across the platform
router.get('/applications', getAdminApplications);

module.exports = router;