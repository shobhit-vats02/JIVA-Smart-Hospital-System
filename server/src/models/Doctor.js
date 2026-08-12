import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const doctorSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Name is required'], trim: true },
    // Doctors log in with their staff/hospital ID (e.g. DOC1001).
    staffId: {
      type: String,
      required: [true, 'Staff ID is required'],
      unique: true,
      trim: true,
      uppercase: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    phone: { type: String, trim: true, default: '' },
    passwordHash: { type: String, required: true, select: false },
    department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
    specialty: { type: String, trim: true, default: '' },
    qualification: { type: String, trim: true, default: '' },
    yearsOfExperience: { type: Number, default: 0 },
    rating: { type: Number, min: 0, max: 5, default: 0 },
    // Average consultation time in minutes (used by queue engine).
    avgConsultationMinutes: { type: Number, default: 12 },
    avatar: { type: String, default: '' },

    // Presence / availability state (consumed by Milestone 3 + AI engine).
    isActive: { type: Boolean, default: true },
    isPresent: { type: Boolean, default: false },
    isAvailable: { type: Boolean, default: false },
    presenceConfidence: { type: Number, min: 0, max: 100, default: 0 },
    currentPatient: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment', default: null },
    currentQueue: { type: Number, default: 0 },

    // RFID card id used during presence verification simulation.
    rfidTag: { type: String, trim: true, default: '' },
    lastPresentAt: { type: Date },

    refreshToken: { type: String, select: false },
  },
  { timestamps: true }
);

doctorSchema.set('toJSON', {
  transform(doc, ret) {
    ret.id = ret._id.toString();
    ret.role = 'doctor';
    delete ret._id;
    delete ret.__v;
    delete ret.passwordHash;
    delete ret.refreshToken;
    return ret;
  },
});

doctorSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.passwordHash);
};

doctorSchema.index({ department: 1 });
doctorSchema.index({ isAvailable: 1 });

const Doctor = mongoose.model('Doctor', doctorSchema);
export default Doctor;
