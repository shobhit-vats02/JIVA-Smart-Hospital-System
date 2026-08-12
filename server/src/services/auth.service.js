import bcrypt from 'bcryptjs';
import { AppError } from '../utils/appError.js';
import { signAccessToken, signRefreshToken, tokenPayloadFor } from '../utils/jwt.js';
import { env } from '../config/env.js';
import Patient from '../models/Patient.js';
import Doctor from '../models/Doctor.js';
import Admin from '../models/Admin.js';

/**
 * Registry mapping a role string to its Mongoose model.
 * Central place so the rest of the app never switches on models manually.
 */
const MODEL_BY_ROLE = {
  patient: Patient,
  doctor: Doctor,
  admin: Admin,
};

const ROLE_LABELS = {
  patient: 'patient',
  doctor: 'doctor',
  admin: 'admin',
};

/**
 * Returns the model for a role, throwing if unknown.
 */
export function modelForRole(role) {
  const model = MODEL_BY_ROLE[role];
  if (!model) throw new AppError('Unknown role', 400);
  return model;
}

/**
 * Returns the model + the query field used to identify that role at login.
 * - Patients log in with email.
 * - Doctors log in with their staffId.
 * - Admins log in with email.
 */
function loginLookup(role) {
  if (role === 'doctor') {
    return { model: Doctor, field: 'staffId', normalize: (v) => String(v).trim().toUpperCase() };
  }
  const model = MODEL_BY_ROLE[role];
  if (!model) throw new AppError('Unknown role', 400);
  return {
    model,
    field: 'email',
    normalize: (v) => String(v).trim().toLowerCase(),
  };
}

/**
 * Fetches a user across a specific role/collection by its ObjectId.
 */
async function findUserByIdentity(role, id) {
  const model = MODEL_BY_ROLE[role];
  if (!model) return null;
  return model.findById(id).exec();
}

/**
 * Fetches a user for login, including its passwordHash (select:false fields).
 */
async function findForLogin(role, identifier) {
  const { model, field, normalize } = loginLookup(role);
  const value = normalize(identifier);
  const query = {};
  query[field] = value;
  return model.findOne(query).select('+passwordHash +refreshToken').exec();
}

/**
 * Performs login for a role and issues access + refresh tokens.
 * Tokens are returned AND the refresh token is persisted on the user.
 */
async function login({ role, identifier, password }) {
  const user = await findForLogin(role, identifier);
  if (!user) {
    throw new AppError(`${ROLE_LABELS[role] === 'doctor' ? 'Staff ID' : 'Email'} or password is incorrect`, 401);
  }
  if (user.isActive === false) {
    throw new AppError('This account is disabled. Contact hospital administration.', 403);
  }

  const passwordOk = await user.comparePassword(password);
  if (!passwordOk) {
    throw new AppError('Email or password is incorrect', 401);
  }

  const payload = tokenPayloadFor(user, role);
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  user.refreshToken = await bcrypt.hash(refreshToken, 10);
  user.lastLoginAt = new Date();
  await user.save({ validateBeforeSave: false });

  return { user, accessToken, refreshToken };
}

/**
 * Registers a new Patient (patients self-register; doctors/admins do not).
 */
async function registerPatient(payload) {
  const exists = await Patient.findOne({ email: payload.email.toLowerCase() }).exec();
  if (exists) {
    throw new AppError('An account with this email already exists', 409);
  }

  const passwordHash = await bcrypt.hash(payload.password, 12);
  const patient = await Patient.create({
    name: payload.name,
    email: payload.email.toLowerCase(),
    phone: payload.phone,
    passwordHash,
    gender: payload.gender,
    age: payload.age,
    address: payload.address || '',
    emergencyContact: payload.emergencyContact || {},
    bloodGroup: payload.bloodGroup || '',
  });

  const accessToken = signAccessToken(tokenPayloadFor(patient, "patient"));
  const refreshToken = signRefreshToken(tokenPayloadFor(patient, "patient"));
  patient.refreshToken = await bcrypt.hash(refreshToken, 10);
  await patient.save({ validateBeforeSave: false });

  return { user: patient, accessToken, refreshToken };
}

/**
 * Refreshes a session using a previously-issued refresh token.
 * The refresh token is compared against the stored hash, rotated, and a new
 * access token is returned.
 */
async function refreshSession(role, id, refreshToken) {
  const user = await findUserByIdentity(role, id);
  if (!user) throw new AppError('Account not found', 401);

  const userWithToken = await (async () => {
    const model = MODEL_BY_ROLE[role];
    return model.findById(id).select('+refreshToken').exec();
  })();

  if (!userWithToken || !userWithToken.refreshToken) {
    throw new AppError('Invalid refresh token', 401);
  }

  const matches = await bcrypt.compare(refreshToken, userWithToken.refreshToken);
  if (!matches) throw new AppError('Invalid refresh token', 401);

  const payload = tokenPayloadFor(user, role);
  const accessToken = signAccessToken(payload);
  const newRefreshToken = signRefreshToken(payload);

  userWithToken.refreshToken = await bcrypt.hash(newRefreshToken, 10);
  await userWithToken.save({ validateBeforeSave: false });

  return { accessToken, refreshToken: newRefreshToken, user };
}

/**
 * Invalidates the persisted refresh token on logout.
 */
async function logout(role, id) {
  const model = MODEL_BY_ROLE[role];
  if (!model) return;
  await model.updateOne({ _id: id }, { $unset: { refreshToken: 1 } }).exec();
}

export const authService = {
  login,
  registerPatient,
  refreshSession,
  logout,
  findUserByIdentity,
  modelForRole,
};
