import { AppError } from '../utils/appError.js';
import { verifyAccessToken } from '../utils/jwt.js';
import { authService } from '../services/auth.service.js';

/**
 * `protect` verifies the Bearer access token, loads the matching user into
 * `req.user`, and rejects the request if the token is invalid/expired.
 */
export async function protect(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) {
      throw new AppError('Authentication required', 401);
    }

    const payload = verifyAccessToken(token);
    const user = await authService.findUserByIdentity(payload.role, payload.sub);
    if (!user || user.isActive === false) {
      throw new AppError('Account not found or disabled', 401);
    }

    req.user = {
      id: user._id.toString(),
      role: payload.role,
      email: user.email,
      name: user.name,
      _doc: user,
    };
    return next();
  } catch (error) {
    return next(error);
  }
}

/**
 * `restrictTo(...roles)` must run AFTER `protect`.
 * Rejects the request if the authenticated user's role is not allowed.
 */
export function restrictTo(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }
    if (!roles.includes(req.user.role)) {
      return next(new AppError('You do not have permission to perform this action', 403));
    }
    return next();
  };
}
