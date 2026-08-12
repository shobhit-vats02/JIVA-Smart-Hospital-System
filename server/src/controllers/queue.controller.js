import { queueReadService } from '../services/queue-read.service.js';
import { appointmentService } from '../services/appointment.service.js';
import { success } from '../utils/response.js';
import { asyncHandler } from '../utils/async.js';
import { AppError } from '../utils/appError.js';

/**
 * GET /queue/status?appointmentId=...
 * Returns the live queue for the patient's appointment doctor + the patient's
 * own position. Ties to the patient's most relevant active appointment if none
 * is supplied.
 */
export const status = asyncHandler(async (req, res) => {
  let appointmentId = req.query.appointmentId;
  let appointment;

  if (appointmentId) {
    appointment = await appointmentService.getAppointmentForPatient(req.user.id, appointmentId);
  } else {
    // Find the patient's most recent active appointment.
    const list = await appointmentService.listPatientAppointments(req.user.id);
    appointment =
      list.find((a) => ['pending', 'confirmed', 'waiting', 'in_consultation'].includes(a.status)) || null;
  }

  if (!appointment) {
    return success(res, { queue: null, myInfo: null }, 'No active appointment in queue');
  }

  const date = new Date().toISOString().slice(0, 10);
  const queue = await queueReadService.getDoctorQueueSnapshot(appointment.doctor?._id, date);
  const myInfo = await queueReadService.getPatientQueueInfo(req.user.id, appointment.doctor?._id);

  return success(res, { queue, myInfo, appointment }, 'Queue status retrieved');
});
