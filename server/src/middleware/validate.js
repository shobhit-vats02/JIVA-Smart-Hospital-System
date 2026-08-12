import { AppError } from '../utils/appError.js';

/**
 * Zod schema validation middleware.
 * Validates req.body (or a chosen part) against the provided schema.
 * Attaches the parsed/coerced values back to `req[key]`.
 */
export const validate =
  (schema, source = 'body') =>
  (req, res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const errors = result.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));
      return next(new AppError('Validation failed', 422, errors));
    }
    req[source] = result.data;
    return next();
  };
