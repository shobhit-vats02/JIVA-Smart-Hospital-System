import mongoose from 'mongoose';

/**
 * VideoConsultation - one video-call session between a patient and doctor.
 * Stores chat messages, doctor notes and a generated prescription.
 */
const videoConsultationSchema = new mongoose.Schema(
  {
    // Optional: a prescription may be created standalone (doctor selects a
    // patient directly) without an existing appointment/consultation.
    appointment: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment', default: null },
    patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true, index: true },

    status: {
      type: String,
      enum: ['scheduled', 'waiting', 'active', 'ended'],
      default: 'scheduled',
    },

    startedAt: { type: Date },
    endedAt: { type: Date },
    durationSeconds: { type: Number, default: 0 },

    messages: [
      {
        from: { type: String, enum: ['patient', 'doctor', 'system'] },
        text: { type: String },
        at: { type: Date, default: Date.now },
      },
    ],

    doctorNotes: { type: String, default: '' },
    prescription: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { timestamps: true }
);

videoConsultationSchema.set('toJSON', {
  transform(doc, ret) {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

const VideoConsultation = mongoose.model('VideoConsultation', videoConsultationSchema);
export default VideoConsultation;
