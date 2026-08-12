import { authService } from '../services/auth.service.js';
import { success, created, failure } from '../utils/response.js';
import { asyncHandler } from '../utils/async.js';

/**
 * Cookie helper - configures the refresh token cookie.
 * HttpOnly refresh cookies improve security vs. localStorage.
 */
function setRefreshCookie(res, token) {
  const isProd = process.env.NODE_ENV === 'production';
  res.cookie('jiva_refresh', token, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
}

function clearRefreshCookie(res) {
  res.clearCookie('jiva_refresh', { path: '/' });
}

/**
 * POST /api/auth/login
 * Body: { role, identifier, password, remember }
 */
const login = asyncHandler(async (req, res) => {
  const { role, identifier, password } = req.body;
  const { user, accessToken, refreshToken } = await authService.login({
    role,
    identifier,
    password,
  });

  setRefreshCookie(res, refreshToken);
  return success(res, { user, accessToken }, 'Login successful');
});

/**
 * POST /api/auth/register  (patients only)
 */
const register = asyncHandler(async (req, res) => {
  const { user, accessToken, refreshToken } = await authService.registerPatient(req.body);
  setRefreshCookie(res, refreshToken);
  return created(res, { user, accessToken }, 'Account created successfully');
});

/**
 * POST /api/auth/refresh
 * Body: { role, id, refreshToken } - refresh token also read from cookie.
 */
const refresh = asyncHandler(async (req, res) => {
  // The HttpOnly cookie is the source of truth (sent automatically by the
  // browser on same-origin requests through the Next proxy). A body token is
  // only a fallback for non-browser clients.
  const token = req.cookies?.jiva_refresh || req.body.refreshToken;
  if (!token) return failure(res, 'No refresh token provided', 401);

  const role = req.body.role;
  const id = req.body.id;
  if (!role || !id) return failure(res, 'role and id are required', 400);

  const { accessToken, refreshToken, user } = await authService.refreshSession(role, id, token);
  setRefreshCookie(res, refreshToken);
  return success(res, { user, accessToken }, 'Session refreshed');
});

/**
 * POST /api/auth/logout
 * Clears the persisted refresh token and the cookie.
 */
const logout = asyncHandler(async (req, res) => {
  const role = req.body.role;
  const id = req.body.id;
  if (role && id) {
    await authService.logout(role, id);
  }
  clearRefreshCookie(res);
  return success(res, null, 'Logged out successfully');
});

/**
 * GET /api/auth/me
 * Returns the currently authenticated user (requires Bearer token).
 */
const me = asyncHandler(async (req, res) => {
  return success(res, req.user, 'Current user');
});

export const authController = { login, register, refresh, logout, me };
