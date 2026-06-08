const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');
const User = require('../models/User');

// ─────────────────────────────────────────────────────────────────────────────
// generateToken
// Creates a signed JWT containing the user's MongoDB _id.
// Used in authController after register / login / OAuth.
// ─────────────────────────────────────────────────────────────────────────────
const generateToken = (id) => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not defined in environment variables');
  }

  return jwt.sign(
    { id },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '30d' }
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// protect
// Verifies the Bearer JWT in the Authorization header.
// Attaches the full user document to req.user on success.
// Rejects with 401 if token is missing, invalid, or expired.
// Rejects with 403 if the account has been suspended.
// ─────────────────────────────────────────────────────────────────────────────
const protect = asyncHandler(async (req, res, next) => {
  let token;

  // Token must come in the Authorization header as:  Bearer <token>
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  }

  if (!token) {
    res.status(401);
    throw new Error('Not authorized — no token provided');
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    res.status(401);

    // Give the client a specific, actionable message
    if (err.name === 'TokenExpiredError') {
      throw new Error('Your session has expired — please log in again');
    }
    throw new Error('Not authorized — invalid token');
  }

  // Load the full user from DB so req.user always has fresh data
  const user = await User.findById(decoded.id).select('-password');

  if (!user) {
    res.status(401);
    throw new Error('Not authorized — user no longer exists');
  }

  if (!user.isActive) {
    res.status(403);
    throw new Error(
      'Your account has been suspended — please contact support'
    );
  }

  req.user = user;
  next();
});

// ─────────────────────────────────────────────────────────────────────────────
// authorize
// Role-based access control. Must be used AFTER protect so req.user is set.
// Pass one or more allowed roles:  authorize('admin')
//                                  authorize('employer', 'admin')
// ─────────────────────────────────────────────────────────────────────────────
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      res.status(401);
      throw new Error('Not authorized — please log in first');
    }

    if (!roles.includes(req.user.role)) {
      res.status(403);
      throw new Error(
        `Access denied — this route requires one of the following roles: ${roles.join(', ')}`
      );
    }

    next();
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// optionalAuth
// Attempts to attach req.user from the JWT if a valid token is present.
// If no token or token is invalid, req.user is set to null and the
// request continues without error.
// Used on public routes that behave differently when the user is logged in
// (e.g. GET /api/jobs returns match scores for candidates).
// ─────────────────────────────────────────────────────────────────────────────
const optionalAuth = asyncHandler(async (req, res, next) => {
  req.user = null; // default to unauthenticated

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(); // no token — continue as guest
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');

    if (user && user.isActive) {
      req.user = user;
    }
  } catch (err) {
    // Token is invalid or expired — silently continue as guest
    // Do NOT throw here; this middleware is intentionally non-blocking
    req.user = null;
  }

  next();
});

module.exports = {
  generateToken,
  protect,
  authorize,
  optionalAuth,
};