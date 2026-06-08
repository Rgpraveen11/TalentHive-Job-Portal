const express = require('express');
const router = express.Router();

const {
  register,
  login,
  getMe,
  logout,
  changePassword,
  forgotPassword,
  resetPassword,
  linkedinAuth,
  linkedinCallback,
} = require('../controllers/authController');

const { protect } = require('../middleware/authMiddleware');

// ─── Public Routes ───────────────────────────────────────────────────────────

// @route   POST /api/auth/register
// @desc    Register new user (candidate or employer)
router.post('/register', register);

// @route   POST /api/auth/login
// @desc    Login with email + password
router.post('/login', login);

// @route   POST /api/auth/forgot-password
// @desc    Send password reset email
router.post('/forgot-password', forgotPassword);

// @route   PUT /api/auth/reset-password/:token
// @desc    Reset password using token from email
router.put('/reset-password/:token', resetPassword);

// @route   GET /api/auth/linkedin
// @desc    Redirect to LinkedIn OAuth consent screen
router.get('/linkedin', linkedinAuth);

// @route   GET /api/auth/linkedin/callback
// @desc    LinkedIn OAuth callback — redirects to frontend with JWT
router.get('/linkedin/callback', linkedinCallback);

// ─── Protected Routes (require valid JWT) ────────────────────────────────────

// @route   GET /api/auth/me
// @desc    Get currently logged-in user
router.get('/me', protect, getMe);

// @route   POST /api/auth/logout
// @desc    Logout (client drops token; server confirms)
router.post('/logout', protect, logout);

// @route   PUT /api/auth/password
// @desc    Change password while logged in
router.put('/password', protect, changePassword);

module.exports = router;