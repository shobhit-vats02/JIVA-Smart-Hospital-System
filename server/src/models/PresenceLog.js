import mongoose from 'mongoose';

/**
 * PresenceLog - records every verification attempt & result during a doctor's
 * presence verification (face, RFID, Bluetooth, WiFi, GPS) plus the final AI
 * confidence engine decision.
 */
const presenceLogSchema = new mongoose.Schema(
  {
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true, index: true },

    face: {
      attempted: { type: Boolean, default: false },
      verified: { type: Boolean, default: false },
      score: { type: Number, min: 0, max: 1, default: 0 },
      note: { type: String, default: '' },
      at: { type: Date },
    },
    rfid: {
      attempted: { type: Boolean, default: false },
      verified: { type: Boolean, default: false },
      cardId: { type: String, default: '' },
      note: { type: String, default: '' },
      at: { type: Date },
    },
    bluetooth: {
      attempted: { type: Boolean, default: false },
      verified: { type: Boolean, default: false },
      device: { type: String, default: '' },
      rssi: { type: Number, default: 0 },
      note: { type: String, default: '' },
      at: { type: Date },
    },
    wifi: {
      attempted: { type: Boolean, default: false },
      verified: { type: Boolean, default: false },
      network: { type: String, default: '' },
      note: { type: String, default: '' },
      at: { type: Date },
    },
    gps: {
      attempted: { type: Boolean, default: false },
      verified: { type: Boolean, default: false },
      insideGeofence: { type: Boolean, default: false },
      note: { type: String, default: '' },
      at: { type: Date },
    },

    // AI presence confidence engine result.
    aiConfidence: { type: Number, min: 0, max: 100, default: 0 },
    activated: { type: Boolean, default: false },
    decision: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    summary: { type: String, default: '' },

    // Allow a doctor to mark themselves as present without full verification
    // (admin override or manual fallback).
    override: { type: Boolean, default: false },
  },
  { timestamps: true }
);

presenceLogSchema.set('toJSON', {
  transform(doc, ret) {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

presenceLogSchema.index({ doctor: 1, createdAt: -1 });

const PresenceLog = mongoose.model('PresenceLog', presenceLogSchema);
export default PresenceLog;
