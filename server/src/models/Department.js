import mongoose from 'mongoose';

const departmentSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Department name is required'], unique: true, trim: true },
    code: { type: String, required: true, unique: true, trim: true, uppercase: true },
    description: { type: String, default: '' },
    wing: { type: String, default: 'Main Campus' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

departmentSchema.set('toJSON', {
  transform(doc, ret) {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

const Department = mongoose.model('Department', departmentSchema);
export default Department;
