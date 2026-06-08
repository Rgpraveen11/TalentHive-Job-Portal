const express = require('express');
const router = express.Router();

const {
  applyForJob,
  getMyApplications,
  getJobApplicants,
  getApplication,
  updateApplicationStatus,
  addNotes,
  withdrawApplication,
} = require('../controllers/applicationController');

const { protect, authorize } = require('../middleware/authMiddleware');

// ─── Candidate Routes ────────────────────────────────────────────────────────

// @route   POST /api/applications
// @desc    Submit a new job application
router.post(
  '/',
  protect,
  authorize('candidate'),
  applyForJob
);

// @route   GET /api/applications/mine
// @desc    Get all applications submitted by logged-in candidate
router.get(
  '/mine',
  protect,
  authorize('candidate'),
  getMyApplications
);

// @route   DELETE /api/applications/:id
// @desc    Withdraw an application (candidate)
router.delete(
  '/:id',
  protect,
  authorize('candidate'),
  withdrawApplication
);

// ─── Employer Routes ─────────────────────────────────────────────────────────

// @route   GET /api/applications/job/:jobId
// @desc    Get all applicants for a specific job (employer)
router.get(
  '/job/:jobId',
  protect,
  authorize('employer', 'admin'),
  getJobApplicants
);

// @route   PUT /api/applications/:id/status
// @desc    Update application status (move through hiring pipeline)
router.put(
  '/:id/status',
  protect,
  authorize('employer', 'admin'),
  updateApplicationStatus
);

// @route   PUT /api/applications/:id/notes
// @desc    Add or update private employer notes on an application
router.put(
  '/:id/notes',
  protect,
  authorize('employer', 'admin'),
  addNotes
);

// ─── Shared Routes (candidate sees own, employer sees their job's) ────────────

// @route   GET /api/applications/:id
// @desc    Get a single application by ID
router.get(
  '/:id',
  protect,
  getApplication
);

module.exports = router;