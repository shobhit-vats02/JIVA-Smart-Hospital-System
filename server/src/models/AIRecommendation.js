import mongoose from 'mongoose';

/**
 * AIRecommendation - a structured suggestion produced by the AI engine.
 * During booking, the engine recommends a best slot and/or alternative doctor;
 * later milestones add delay & reallocation recommendations.
 */
const aiRecommendationSchema = new mongoose.Schema(
  {
    appointment: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment', default: null },
    patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },

    type: {
      type: String,
      enum: [
        'best_slot',
        'alternative_doctor',
        'expected_wait',
        'delay_warning',
        'reallocation',
      ],
      required: true,
    },

    title: { type: String, required: true },
    message: { type: String, default: '' },
    suggested: { type: mongoose.Schema.Types.Mixed, default: {} }, // suggested slot/doctor
    reason: { type: String, default: '' },
    accepted: { type: Boolean },
  },
  { timestamps: true }
);

aiRecommendationSchema.set('toJSON', {
  transform(doc, ret) {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

const AIRecommendation = mongoose.model('AIRecommendation', aiRecommendationSchema);
export default AIRecommendation;
