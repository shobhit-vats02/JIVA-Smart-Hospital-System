import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

/**
 * Signs an access token (short-lived).
 */
export function signAccessToken(payload) {
  return jwt.sign(payload, env.jwtAccessSecret, {
    expiresIn: env.jwtAccessExpires,
  });
}

/**
 * Signs a refresh token (long-lived, rotates on refresh).
 */
export function signRefreshToken(payload) {
  return jwt.sign(payload, env.jwtRefreshSecret, {
    expiresIn: env.jwtRefreshExpires,
  });
}

/**
 * Verifies an access token. Returns payload or throws.
 */
export function verifyAccessToken(token) {
  return jwt.verify(token, env.jwtAccessSecret);
}

/**
 * Verifies a refresh token. Returns payload or throws.
 */
export function verifyRefreshToken(token) {
  return jwt.verify(token, env.jwtRefreshSecret);
}

/**
 * Extracts the payload that goes inside tokens.
 * `role` is one of 'patient' | 'doctor' | 'admin'. It is passed explicitly
 * because the raw Mongoose docs do not carry a `role` field (it is only added
 * during JSON serialization).
 */
export function tokenPayloadFor(user, role) {
  return {
    sub: user._id.toString(),
    role: role || user.role || user.kind,
    email: user.email,
  };
}
