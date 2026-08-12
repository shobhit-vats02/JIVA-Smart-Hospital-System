import mongoose from 'mongoose';

/**
 * Notification - realtime alerts delivered to patients, doctors and admins.
 * Each recipient role has its own notifications. `recipientRole` identifies the
 * collection the `recipient` ObjectId lives in.
 */
const notificationSchema = new mongoose.Schema(
  {
    recipientRole: {
      type: String,
      enum: ['patient', 'doctor', 'admin'],
      required: true,
      index: true,
    },
    recipient: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },

    type: {
      type: String,
      enum: [
        'appointment_confirmed',
        'appointment_rescheduled',
        'appointment_cancelled',
        'doctor_arrived',
        'doctor_delayed',
        'queue_updated',
        'video_ready',
        'prescription_available',
        'emergency_alert',
        'system',
      ],
      default: 'system',
    },

    title: { type: String, required: true },
    message: { type: String, default: '' },
    read: { type: Boolean, default: false },

    // Optional structured payload (e.g. appointmentId, doctorId, queue info).
    data: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

notificationSchema.set('toJSON', {
  transform(doc, ret) {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

const Notification = mongoose.model('Notification', notificationSchema);
export default Notification;
