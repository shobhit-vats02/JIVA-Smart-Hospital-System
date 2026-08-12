import mongoose from 'mongoose';

/**
 * QueueEntry - a snapshot/event of a patient's position in a doctor's queue.
 * Used to drive the realtime queue and to keep history.
 */
const queueEntrySchema = new mongoose.Schema(
  {
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true, index: true },
    patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
    appointment: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment', required: true },

    token: { type: String, required: true }, // e.g. "T-047"
    position: { type: Number, required: true },
    status: {
      type: String,
      enum: ['waiting', 'current', 'in_consultation', 'completed', 'skipped', 'cancelled'],
      default: 'waiting',
    },
    estimatedWaitMinutes: { type: Number, default: 0 },
    consultedAt: { type: Date },
  },
  { timestamps: true }
);

queueEntrySchema.set('toJSON', {
  transform(doc, ret) {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

queueEntrySchema.index({ doctor: 1, status: 1 });

const QueueEntry = mongoose.model('QueueEntry', queueEntrySchema);
export default QueueEntry;
