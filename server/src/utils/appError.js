/**
 * AppError - an error carrying an HTTP status so the global error handler
 * knows what to return. All thrown application errors should use this.
 */
export class AppError extends Error {
  constructor(message, status = 400, errors = undefined) {
    super(message);
    this.status = status;
    this.errors = errors;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}
