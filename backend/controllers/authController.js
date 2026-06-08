const asyncHandler = require('express-async-handler');
const passport = require('passport');
const crypto = require('crypto');
const User = require('../models/User');
const { generateToken } = require('../middleware/authMiddleware');
const { sendWelcomeEmail } = require('../utils/mailer');

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
// ─────────────────────────────────────────────────────────────────────────────
const register = asyncHandler(async (req, res) => {
  const { name, email, password, role } = req.body;

  if (!name || !email || !password) {
    res.status(400);
    throw new Error('Please provide name, email, and password');
  }

  if (password.length < 8) {
    res.status(400);
    throw new Error('Password must be at least 8 characters');
  }

  const userExists = await User.findOne({ email: email.toLowerCase() });
  if (userExists) {
    res.status(400);
    throw new Error('An account with this email already exists');
  }

  // Only allow candidate or employer roles on register
  const allowedRoles = ['candidate', 'employer'];
  const userRole = allowedRoles.includes(role) ? role : 'candidate';

  const user = await User.create({
    name,
    email,
    password,
    role: userRole,
  });

  // Send welcome email — non-blocking, failure won't break registration
  sendWelcomeEmail(user).catch((err) =>
    console.error('Welcome email failed:', err.message)
  );

  res.status(201).json({
    success: true,
    token: generateToken(user._id),
    user: user.toPublicJSON(),
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
// ─────────────────────────────────────────────────────────────────────────────
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400);
    throw new Error('Please provide email and password');
  }

  // Explicitly select password since it has select: false in schema
  const user = await User.findOne({ email: email.toLowerCase() }).select(
    '+password'
  );

  if (!user) {
    res.status(401);
    throw new Error('Invalid email or password');
  }

  const isMatch = await user.matchPassword(password);
  if (!isMatch) {
    res.status(401);
    throw new Error('Invalid email or password');
  }

  if (!user.isActive) {
    res.status(403);
    throw new Error('Your account has been suspended. Please contact support.');
  }

  res.status(200).json({
    success: true,
    token: generateToken(user._id),
    user: user.toPublicJSON(),
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Get currently logged-in user
// @route   GET /api/auth/me
// @access  Private
// ─────────────────────────────────────────────────────────────────────────────
const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).populate(
    'savedJobs',
    'title company.name salary type level isRemote location status'
  );

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  res.status(200).json({
    success: true,
    user: user.toPublicJSON(),
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Logout user (client drops token; endpoint confirms)
// @route   POST /api/auth/logout
// @access  Private
// ─────────────────────────────────────────────────────────────────────────────
const logout = asyncHandler(async (req, res) => {
  // JWT is stateless — actual logout is handled client-side by deleting the token.
  // This endpoint exists so clients have a clean API to call and for future
  // token-blacklist / refresh-token revocation logic.
  res.status(200).json({
    success: true,
    message: 'Logged out successfully',
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Change password (when logged in)
// @route   PUT /api/auth/password
// @access  Private
// ─────────────────────────────────────────────────────────────────────────────
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    res.status(400);
    throw new Error('Please provide current and new password');
  }

  if (newPassword.length < 8) {
    res.status(400);
    throw new Error('New password must be at least 8 characters');
  }

  if (currentPassword === newPassword) {
    res.status(400);
    throw new Error('New password must be different from current password');
  }

  const user = await User.findById(req.user._id).select('+password');

  const isMatch = await user.matchPassword(currentPassword);
  if (!isMatch) {
    res.status(400);
    throw new Error('Current password is incorrect');
  }

  user.password = newPassword;
  await user.save(); // triggers bcrypt pre-save hook

  res.status(200).json({
    success: true,
    message: 'Password changed successfully',
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Forgot password — generate reset token
// @route   POST /api/auth/forgot-password
// @access  Public
// ─────────────────────────────────────────────────────────────────────────────
const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    res.status(400);
    throw new Error('Please provide your email address');
  }

  const user = await User.findOne({ email: email.toLowerCase() });

  // Always return 200 even if email not found — prevents email enumeration
  if (!user) {
    return res.status(200).json({
      success: true,
      message: 'If that email exists, a reset link has been sent.',
    });
  }

  // Generate a plain random token
  const resetToken = crypto.randomBytes(32).toString('hex');

  // Store hashed version in DB (never store plain tokens)
  user.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
  user.passwordResetExpires = Date.now() + 30 * 60 * 1000; // 30 minutes

  await user.save({ validateBeforeSave: false });

  const resetURL = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;

  try {
    // sendPasswordResetEmail is optional — add to mailer.js if needed
    // await sendPasswordResetEmail(user, resetURL);
    console.log(`Password reset URL (dev): ${resetURL}`);
  } catch (err) {
    // If email fails, clear the tokens so user can try again
    user.passwordResetToken = null;
    user.passwordResetExpires = null;
    await user.save({ validateBeforeSave: false });

    res.status(500);
    throw new Error('Email could not be sent. Please try again later.');
  }

  res.status(200).json({
    success: true,
    message: 'If that email exists, a reset link has been sent.',
    // Only expose resetURL in development for easy testing
    ...(process.env.NODE_ENV === 'development' && { resetURL }),
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Reset password using token from email
// @route   PUT /api/auth/reset-password/:token
// @access  Public
// ─────────────────────────────────────────────────────────────────────────────
const resetPassword = asyncHandler(async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;

  if (!password) {
    res.status(400);
    throw new Error('Please provide a new password');
  }

  if (password.length < 8) {
    res.status(400);
    throw new Error('Password must be at least 8 characters');
  }

  // Hash incoming token and compare with stored hash
  const hashedToken = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() }, // token not expired
  });

  if (!user) {
    res.status(400);
    throw new Error('Password reset token is invalid or has expired');
  }

  user.password = password;
  user.passwordResetToken = null;
  user.passwordResetExpires = null;
  await user.save();

  res.status(200).json({
    success: true,
    token: generateToken(user._id),
    message: 'Password reset successful',
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Initiate LinkedIn OAuth
// @route   GET /api/auth/linkedin
// @access  Public
// ─────────────────────────────────────────────────────────────────────────────
const linkedinAuth = passport.authenticate('linkedin', {
  scope: ['openid', 'profile', 'email'],
  state: true,
});

// ─────────────────────────────────────────────────────────────────────────────
// @desc    LinkedIn OAuth callback
// @route   GET /api/auth/linkedin/callback
// @access  Public
// ─────────────────────────────────────────────────────────────────────────────
const linkedinCallback = (req, res, next) => {
  passport.authenticate('linkedin', { session: false }, (err, user) => {
    if (err || !user) {
      console.error('LinkedIn OAuth error:', err?.message);
      return res.redirect(
        `${process.env.CLIENT_URL}/login?error=linkedin_failed`
      );
    }

    const token = generateToken(user._id);

    // Redirect to frontend with token in query string
    // Frontend reads it, stores in localStorage, then removes from URL
    return res.redirect(
      `${process.env.CLIENT_URL}/auth/callback?token=${token}`
    );
  })(req, res, next);
};

module.exports = {
  register,
  login,
  getMe,
  logout,
  changePassword,
  forgotPassword,
  resetPassword,
  linkedinAuth,
  linkedinCallback,
};