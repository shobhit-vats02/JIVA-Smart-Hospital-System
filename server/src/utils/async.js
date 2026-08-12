import mongoose from 'mongoose';

/**
 * Validates that a string is a valid MongoDB ObjectId.
 * Returns true/false - used by controllers for param checks.
 */
export function isValidObjectId(id) {
  return mongoose.isValidObjectId(id);
}

/**
 * Throws a 400 AppError if `id` is not a valid ObjectId.
 */
export function assertObjectId(id, field = 'id') {
  if (!isValidObjectId(id)) {
    throw new AppError(`Invalid ${field}`, 400);
  }
}

/**
 * Async wrapper for Express route handlers.
 * Catches rejected promises and forwards them to the error middleware,
 * so controllers never need try/catch blocks.
 */
export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

import { AppError } from './appError.js';
