// =============================================================================
// HackET — Global Error Handler Middleware
// Catches all errors forwarded via next(err) and returns structured JSON.
// Handles AppError, Prisma errors, Joi validation errors, and Multer errors.
// =============================================================================

const AppError = require('../utils/AppError');

/**
 * Map Prisma error codes to user-friendly messages.
 */
const PRISMA_ERROR_MAP = {
  P2002: { statusCode: 409, message: 'A record with this value already exists.' },
  P2025: { statusCode: 404, message: 'Record not found.' },
  P2003: { statusCode: 400, message: 'Related record not found (foreign key constraint).' },
  P2014: { statusCode: 400, message: 'This change would violate a required relation.' },
};

/**
 * Global Express error handler.
 * Must have 4 parameters for Express to recognize it as an error handler.
 */
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  // Default values
  let statusCode = err.statusCode || 500;
  let status = err.status || 'error';
  let message = err.message || 'Internal server error';
  let details = undefined;

  // ── Operational AppError ──────────────────────────────────────────────
  if (err.isOperational) {
    // Already has statusCode and message set
  }

  // ── Prisma Known Request Errors ───────────────────────────────────────
  else if (err.constructor?.name === 'PrismaClientKnownRequestError') {
    const mapped = PRISMA_ERROR_MAP[err.code];
    if (mapped) {
      statusCode = mapped.statusCode;
      message = mapped.message;
      status = 'fail';
    }
    // Include the Prisma meta for debugging in dev
    if (process.env.NODE_ENV !== 'production' && err.meta) {
      details = err.meta;
    }
  }

  // ── Prisma Validation Errors ──────────────────────────────────────────
  else if (err.constructor?.name === 'PrismaClientValidationError') {
    statusCode = 400;
    status = 'fail';
    message = 'Invalid data provided.';
    if (process.env.NODE_ENV !== 'production') {
      details = err.message;
    }
  }

  // ── Joi Validation Errors ─────────────────────────────────────────────
  else if (err.isJoi || err.name === 'ValidationError') {
    statusCode = 400;
    status = 'fail';
    message = 'Validation failed.';
    details = err.details
      ? err.details.map((d) => ({
          field: d.path?.join('.'),
          message: d.message,
        }))
      : err.message;
  }

  // ── Multer Errors (file upload) ───────────────────────────────────────
  else if (err.constructor?.name === 'MulterError') {
    statusCode = 400;
    status = 'fail';
    message =
      err.code === 'LIMIT_FILE_SIZE'
        ? 'File is too large. Maximum size is 10 MB.'
        : `Upload error: ${err.message}`;
  }

  // ── JWT Errors ────────────────────────────────────────────────────────
  else if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    status = 'fail';
    message = 'Invalid token. Please log in again.';
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    status = 'fail';
    message = 'Token expired. Please log in again.';
  }

  // ── Unknown / Programming Errors ──────────────────────────────────────
  else {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[ERROR]', err);
    } else {
      // In production, don't leak internal error details
      message = 'Something went wrong. Please try again later.';
    }
  }

  // ── Send Response ─────────────────────────────────────────────────────
  const response = {
    success: false,
    status,
    message,
  };

  if (details) {
    response.details = details;
  }

  // Include stack trace in development only
  if (process.env.NODE_ENV !== 'production' && err.stack) {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
};

module.exports = errorHandler;
