import { appointmentService } from '../services/appointment.service.js';
import { success, created, failure } from '../utils/response.js';
import { asyncHandler } from '../utils/async.js';

export const book = asyncHandler(async (req, res) => {
  const body = req.body;
  const appointment = await appointmentService.bookAppointment({
    patientId: req.user.id,
    departmentId: body.departmentId,
    doctorId: body.doctorId,
    date: body.date,
    startTime: body.startTime,
    reason: body.reason,
    symptoms: body.symptoms,
    isEmergency: body.isEmergency,
    aiSuggestionAccepted: body.aiSuggestionAccepted,
  });
  return created(res, appointment, 'Appointment booked successfully');
});

export const preview = asyncHandler(async (req, res) => {
  const body = req.body;
  const recommendation = await appointmentService.previewRecommendation({
    patientId: req.user.id,
    departmentId: body.departmentId,
    doctorId: body.doctorId,
    date: body.date,
    startTime: body.startTime,
  });
  return success(res, recommendation, 'AI recommendation generated');
});

export const list = asyncHandler(async (req, res) => {
  const appointments = await appointmentService.listPatientAppointments(req.user.id, req.query);
  return success(res, appointments, 'Appointments retrieved');
});

export const detail = asyncHandler(async (req, res) => {
  const appointment = await appointmentService.getAppointmentForPatient(req.user.id, req.params.id);
  return success(res, appointment, 'Appointment retrieved');
});

export const cancel = asyncHandler(async (req, res) => {
  const appointment = await appointmentService.cancelAppointment(req.user.id, req.params.id, req.body.reason);
  return success(res, appointment, 'Appointment cancelled');
});
