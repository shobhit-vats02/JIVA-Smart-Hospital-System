import mongoose from 'mongoose';

/**
 * EmergencyCase - an active emergency routed through the Emergency Response
 * Center. Supports ambulance dispatch, hospital-wide alerts, emergency-contact
 * notification, patient location, and priority triage.
 */
const emergencyCaseSchema = new mongoose.Schema(
  {
    patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', default: null },
    patientName: { type: String, default: '' },
    phone: { type: String, default: '' },
    emergencyContactName: { type: String, default: '' },
    emergencyContactPhone: { type: String, default: '' },

    description: { type: String, default: '' },
    department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', default: null },

    severity: { type: String, enum: ['critical', 'high', 'medium', 'low'], default: 'high' },
    priority: { type: Number, default: 1 }, // lower = higher priority for triage

    status: {
      type: String,
      enum: ['new', 'dispatched', 'responding', 'at_hospital', 'treated', 'closed'],
      default: 'new',
    },

    // Ambulance dispatch.
    ambulanceDispatched: { type: Boolean, default: false },
    ambulance: {
      id: { type: String, default: '' },
      etaMinutes: { type: Number, default: 0 },
      driver: { type: String, default: '' },
      status: { type: String, enum: ['dispatched', 'enroute', 'arrived'], default: 'dispatched' },
    },

    hospitalAlerted: { type: Boolean, default: false },
    emergencyContactNotified: { type: Boolean, default: false },
    location: { lat: { type: Number }, lng: { type: Number }, address: { type: String, default: '' } },
    locationShared: { type: Boolean, default: false },

    // Event timeline.
    timeline: [
      {
        type: { type: String },
        text: { type: String },
        at: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

emergencyCaseSchema.set('toJSON', {
  transform(doc, ret) {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

emergencyCaseSchema.index({ status: 1 });
emergencyCaseSchema.index({ createdAt: -1 });

const EmergencyCase = mongoose.model('EmergencyCase', emergencyCaseSchema);
export default EmergencyCase;
