const express = require('express');
const router = express.Router();

const {
  getProfile,
  updateProfile,
  uploadResume,
  uploadAvatar,
  getPublicProfile,
  importLinkedIn,
  saveJob,
  getSavedJobs,
} = require('../controllers/userController');

const { protect, authorize } = require('../middleware/authMiddleware');
const { uploadResume: resumeUpload, uploadAvatar: avatarUpload } = require('../config/cloudinary');

// ─── Protected Routes — any authenticated user ───────────────────────────────

// @route   GET /api/users/profile
// @desc    Get full profile of logged-in user
router.get('/profile', protect, getProfile);

// @route   PUT /api/users/profile
// @desc    Update logged-in user's profile fields
router.put('/profile', protect, updateProfile);

// @route   POST /api/users/avatar
// @desc    Upload profile avatar image
router.post(
  '/avatar',
  protect,
  avatarUpload.single('avatar'),
  uploadAvatar
);

// @route   POST /api/users/linkedin/import
// @desc    Import LinkedIn profile data into user profile
router.post('/linkedin/import', protect, importLinkedIn);

// ─── Protected Routes — candidate only ──────────────────────────────────────

// @route   POST /api/users/resume
// @desc    Upload and parse resume (PDF or DOCX)
router.post(
  '/resume',
  protect,
  authorize('candidate'),
  resumeUpload.single('resume'),
  uploadResume
);

// @route   GET /api/users/saved-jobs
// @desc    Get all saved jobs for logged-in candidate
router.get(
  '/saved-jobs',
  protect,
  authorize('candidate'),
  getSavedJobs
);

// @route   POST /api/users/saved-jobs/:jobId
// @desc    Toggle save / unsave a job
router.post(
  '/saved-jobs/:jobId',
  protect,
  authorize('candidate'),
  saveJob
);

// ─── Public Routes ───────────────────────────────────────────────────────────

// @route   GET /api/users/:id
// @desc    Get any user's public profile by ID
// NOTE: Keep this LAST — the /:id wildcard would catch /profile etc. if placed first
router.get('/:id', getPublicProfile);

module.exports = router;