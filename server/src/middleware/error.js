import { AppError } from '../utils/appError.js';
import { env } from '../config/env.js';

/**
 * 404 handler for unmatched routes.
 */
export function notFound(req, res, next) {
  next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404));
}

/**
 * Global error handler. Converts known error types to consistent responses.
 */
export function errorHandler(err, req, res, next) {
  let status = err.status || 500;
  let message = err.message || 'Internal Server Error';
  let errors = err.errors;

  // Mongoose validation errors.
  if (err.name === 'ValidationError') {
    status = 400;
    message = 'Validation failed';
    errors = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
  }

  // Mongoose duplicate key.
  if (err.code === 11000) {
    status = 409;
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    message = `Duplicate value for ${field}. Please use a unique ${field}.`;
  }

  // Cast errors (invalid ObjectId).
  if (err.name === 'CastError') {
    status = 400;
    message = `Invalid ${err.path}: ${err.value}`;
  }

  // JWT errors.
  if (err.name === 'JsonWebTokenError') {
    status = 401;
    message = 'Invalid token. Please log in again.';
  }
  if (err.name === 'TokenExpiredError') {
    status = 401;
    message = 'Session expired. Please log in again.';
  }

  if (!err.isOperational) {
    console.error('[ERROR]', err);
  }

  const body = { success: false, message };
  if (errors) body.errors = errors;
  if (env.isProduction === false && status >= 500) {
    body.stack = err.stack;
  }

  return res.status(status).json(body);
}
