import { videoService } from '../services/video.service.js';
import { success, created } from '../utils/response.js';
import { asyncHandler } from '../utils/async.js';

/** Create/return a video session for an appointment. */
export const session = asyncHandler(async (req, res) => {
  const s = await videoService.getOrCreateForAppointment(req.user.id, req.body.appointmentId);
  return created(res, s, 'Video session ready');
});

export const start = asyncHandler(async (req, res) => {
  const s = await videoService.startSession(req.params.id);
  return success(res, s, 'Call started');
});

export const end = asyncHandler(async (req, res) => {
  const s = await videoService.endSession(req.params.id);
  return success(res, s, 'Call ended');
});

export const message = asyncHandler(async (req, res) => {
  const s = await videoService.sendMessage(req.params.id, 'patient', req.body.text);
  return success(res, s, 'Message sent');
});
