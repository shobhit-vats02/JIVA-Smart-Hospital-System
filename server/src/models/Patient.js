import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const patientSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Name is required'], trim: true },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    phone: { type: String, required: [true, 'Phone is required'], trim: true },
    passwordHash: { type: String, required: true, select: false },
    gender: {
      type: String,
      enum: ['male', 'female', 'other'],
      default: 'other',
    },
    age: { type: Number, min: 0, max: 150 },
    bloodGroup: {
      type: String,
      enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', ''],
      default: '',
    },
    address: { type: String, trim: true, default: '' },
    emergencyContact: {
      name: { type: String, trim: true, default: '' },
      phone: { type: String, trim: true, default: '' },
      relation: { type: String, trim: true, default: '' },
    },
    medicalHistory: { type: [String], default: [] },
    healthProfile: {
      allergies: { type: [String], default: [] },
      conditions: { type: [String], default: [] },
      vaccinations: { type: [String], default: [] },
      emergencyContact: {
        name: { type: String, default: '' },
        phone: { type: String, default: '' },
        relation: { type: String, default: '' },
      },
    },
    avatar: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
    lastLoginAt: { type: Date },
    refreshToken: { type: String, select: false },
  },
  { timestamps: true }
);

// Hide sensitive fields in JSON output by default.
patientSchema.set('toJSON', {
  transform(doc, ret) {
    ret.id = ret._id.toString();
    ret.role = 'patient';
    delete ret._id;
    delete ret.__v;
    delete ret.passwordHash;
    delete ret.refreshToken;
    return ret;
  },
});

patientSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.passwordHash);
};

patientSchema.index({ name: 1 });

const Patient = mongoose.model('Patient', patientSchema);
export default Patient;
