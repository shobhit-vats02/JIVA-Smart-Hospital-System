import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const adminSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Name is required'], trim: true },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    phone: { type: String, trim: true, default: '' },
    passwordHash: { type: String, required: true, select: false },
    avatar: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
    lastLoginAt: { type: Date },
    refreshToken: { type: String, select: false },
    // Higher-level permissions placeholders for future admin roles.
    permissions: { type: [String], default: ['*'] },
  },
  { timestamps: true }
);

adminSchema.set('toJSON', {
  transform(doc, ret) {
    ret.id = ret._id.toString();
    ret.role = 'admin';
    delete ret._id;
    delete ret.__v;
    delete ret.passwordHash;
    delete ret.refreshToken;
    return ret;
  },
});

adminSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.passwordHash);
};

const Admin = mongoose.model('Admin', adminSchema);
export default Admin;
