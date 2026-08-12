import mongoose from 'mongoose';

/**
 * Appointment - the central record connecting a patient, doctor and department
 * through the full care journey: booked -> confirmed -> waiting -> in_consultation
 * -> completed (or cancelled / rescheduled).
 */
const appointmentSchema = new mongoose.Schema(
  {
    patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true, index: true },
    department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },

    date: { type: String, required: true }, // YYYY-MM-DD
    startTime: { type: String, required: true }, // HH:mm (24h)
    endTime: { type: String, required: true },

    reason: { type: String, trim: true, default: '' },
    symptoms: { type: String, trim: true, default: '' },
    isEmergency: { type: Boolean, default: false },

    status: {
      type: String,
      enum: [
        'pending',
        'confirmed',
        'waiting',
        'in_consultation',
        'completed',
        'cancelled',
        'rescheduled',
        'emergency',
      ],
      default: 'pending',
      index: true,
    },

    priority: {
      type: String,
      enum: ['normal', 'senior', 'disabled', 'emergency'],
      default: 'normal',
    },

    // AI-generated priority signal (0-100). Computed by the backend at booking
    // time and persisted so it stays stable across refresh/logout/restart.
    // Category is a human-readable label for the same score.
    priorityPoints: { type: Number, min: 0, max: 100, default: 0 },
    priorityCategory: { type: String, default: 'Normal' },

    // Token / queue info maintained by the queue engine.
    tokenNumber: { type: Number, default: 0 },
    queuePosition: { type: Number, default: 0 },
    estimatedWaitMinutes: { type: Number, default: 0 },

    consultationStartedAt: { type: Date },
    consultationEndedAt: { type: Date },

    // Whether the patient accepted the AI-suggested booking or kept their pick.
    aiSuggestionAccepted: { type: Boolean },
    aiRecommendation: { type: mongoose.Schema.Types.ObjectId, ref: 'AIRecommendation' },

    cancelReason: { type: String, default: '' },
    rescheduledFrom: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment', default: null },
  },
  { timestamps: true }
);

appointmentSchema.set('toJSON', {
  transform(doc, ret) {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

appointmentSchema.index({ doctor: 1, date: 1, status: 1 });
appointmentSchema.index({ patient: 1, status: 1 });

const Appointment = mongoose.model('Appointment', appointmentSchema);
export default Appointment;
