// ─────────────────────────────────────────────────────────────────────────────
// notFound
// Catches any request that didn't match a registered route and forwards
// a structured 404 error to the global error handler below.
// ─────────────────────────────────────────────────────────────────────────────
const notFound = (req, res, next) => {
  const error = new Error(`Route not found — ${req.method} ${req.originalUrl}`);
  res.status(404);
  next(error);
};

// ─────────────────────────────────────────────────────────────────────────────
// errorHandler
// Global error handler — must be registered LAST in server.js with 4 params.
// Normalises every type of error (Mongoose, JWT, Multer, custom) into a
// consistent JSON shape so the frontend always gets the same structure.
//
// Response shape:
// {
//   success: false,
//   message: "Human-readable error message",
//   errors: []          // only present on validation errors (array of strings)
//   stack: "..."        // only present in development mode
// }
// ─────────────────────────────────────────────────────────────────────────────
const errorHandler = (err, req, res, next) => {
  // Use the status code already set on the response (by the controller
  // that threw), or fall back to 500 if it's still 200 (uncaught throw).
  let statusCode = res.statusCode !== 200 ? res.statusCode : 500;
  let message = err.message || 'An unexpected server error occurred';
  let errors = [];

  // ── Mongoose: Document not found (CastError on ObjectId) ─────────────────
  // Happens when an invalid MongoDB ObjectId is passed (e.g. /jobs/abc123)
  if (err.name === 'CastError' && err.kind === 'ObjectId') {
    statusCode = 404;
    message = `Resource not found — invalid ID format`;
  }

  // ── Mongoose: Duplicate key violation (unique index) ──────────────────────
  // Happens when e.g. a user tries to register with an already-used email
  if (err.code === 11000) {
    statusCode = 400;
    const field = Object.keys(err.keyValue || {})[0];
    const value = Object.values(err.keyValue || {})[0];
    message = field
      ? `${capitalise(field)} '${value}' is already in use`
      : 'Duplicate field value — this record already exists';
  }

  // ── Mongoose: Schema validation errors ────────────────────────────────────
  // Happens when a document fails required/enum/min/max etc. checks
  if (err.name === 'ValidationError') {
    statusCode = 400;
    errors = Object.values(err.errors).map((e) => e.message);
    message =
      errors.length === 1
        ? errors[0]
        : `Validation failed with ${errors.length} errors`;
  }

  // ── JWT: Signature verification failed ───────────────────────────────────
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token — please log in again';
  }

  // ── JWT: Token has expired ────────────────────────────────────────────────
  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Your session has expired — please log in again';
  }

  // ── JWT: Token not yet valid (nbf claim) ─────────────────────────────────
  if (err.name === 'NotBeforeError') {
    statusCode = 401;
    message = 'Token not yet active — please try again shortly';
  }

  // ── Multer: File size exceeded ────────────────────────────────────────────
  if (err.code === 'LIMIT_FILE_SIZE') {
    statusCode = 400;
    message = 'File is too large — please upload a smaller file';
  }

  // ── Multer: Unexpected field name ─────────────────────────────────────────
  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    statusCode = 400;
    message = `Unexpected file field '${err.field}' — check the field name in your request`;
  }

  // ── Multer: Wrong file type (thrown manually in fileFilter) ───────────────
  if (err.message && err.message.startsWith('Only')) {
    statusCode = 400;
    // Re-use the message thrown in cloudinary.js fileFilter callbacks
  }

  // ── Mongoose: Strict mode violation ──────────────────────────────────────
  // Happens when a field is sent that doesn't exist in the schema
  if (err.name === 'StrictModeError') {
    statusCode = 400;
    message = `Unknown field '${err.path}' — not allowed by schema`;
  }

  // ── Syntax error in request JSON body ────────────────────────────────────
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    statusCode = 400;
    message = 'Invalid JSON in request body';
  }

  // ── Build final response ─────────────────────────────────────────────────
  const response = {
    success: false,
    message,
    ...(errors.length > 0 && { errors }),
    // Only include stack trace in development — never expose in production
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  };

  res.status(statusCode).json(response);
};

// ─────────────────────────────────────────────────────────────────────────────
// Helper — capitalise first letter of a string
// ─────────────────────────────────────────────────────────────────────────────
const capitalise = (str) =>
  str ? str.charAt(0).toUpperCase() + str.slice(1) : str;

module.exports = { notFound, errorHandler };