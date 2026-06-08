const express = require('express');
const router = express.Router();

const {
  getJobs,
  getMatchedJobs,
  getJob,
  createJob,
  updateJob,
  deleteJob,
  getEmployerJobs,
  reportJob,
  toggleSaveJob,
} = require('../controllers/jobController');

const {
  protect,
  authorize,
  optionalAuth,
} = require('../middleware/authMiddleware');

// ─── Public Routes ───────────────────────────────────────────────────────────

// @route   GET /api/jobs
// @desc    Get all active jobs (with search, filters, pagination)
//          optionalAuth attaches user if token present (used for match score)
router.get('/', optionalAuth, getJobs);

// ─── Private Routes — specific paths BEFORE /:id wildcard ───────────────────

// @route   GET /api/jobs/match
// @desc    Get AI-matched jobs for logged-in candidate
router.get(
  '/match',
  protect,
  authorize('candidate'),
  getMatchedJobs
);

// @route   GET /api/jobs/employer/mine
// @desc    Get all jobs posted by logged-in employer
router.get(
  '/employer/mine',
  protect,
  authorize('employer', 'admin'),
  getEmployerJobs
);

// @route   POST /api/jobs
// @desc    Create a new job listing
router.post(
  '/',
  protect,
  authorize('employer', 'admin'),
  createJob
);

// ─── Routes with :id param ───────────────────────────────────────────────────

// @route   GET /api/jobs/:id
// @desc    Get a single job by ID
//          optionalAuth attaches user if token present (used for match score + draft visibility)
router.get('/:id', optionalAuth, getJob);

// @route   PUT /api/jobs/:id
// @desc    Update a job listing (owner or admin)
router.put(
  '/:id',
  protect,
  authorize('employer', 'admin'),
  updateJob
);

// @route   DELETE /api/jobs/:id
// @desc    Delete a job listing (owner or admin)
router.delete(
  '/:id',
  protect,
  authorize('employer', 'admin'),
  deleteJob
);

// @route   POST /api/jobs/:id/report
// @desc    Report a job listing as inappropriate
router.post('/:id/report', protect, reportJob);

// @route   POST /api/jobs/:id/save
// @desc    Toggle save / unsave a job (candidate)
router.post(
  '/:id/save',
  protect,
  authorize('candidate'),
  toggleSaveJob
);

module.exports = router;