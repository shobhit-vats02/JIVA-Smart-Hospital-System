import mongoose from 'mongoose';

/**
 * WaitingPrediction - time-series record of the AI's predicted waiting times,
 * used to feed queue dashboards and to train/verify the delay model.
 */
const waitingPredictionSchema = new mongoose.Schema(
  {
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true, index: true },
    department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },

    predictedWaitMinutes: { type: Number, required: true },
    patientsAhead: { type: Number, default: 0 },
    hospitalLoad: { type: Number, min: 0, max: 100, default: 0 }, // 0-100 congestion
    confidence: { type: Number, min: 0, max: 1, default: 0.5 },

    basedOn: { type: String, enum: ['queue', 'delay', 'realtime'], default: 'queue' },
  },
  { timestamps: true }
);

waitingPredictionSchema.set('toJSON', {
  transform(doc, ret) {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

waitingPredictionSchema.index({ doctor: 1, createdAt: -1 });

const WaitingPrediction = mongoose.model('WaitingPrediction', waitingPredictionSchema);
export default WaitingPrediction;
