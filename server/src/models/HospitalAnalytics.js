import mongoose from 'mongoose';

/**
 * HospitalAnalytics - daily/hourly snapshots of hospital operational metrics,
 * updated by the analytics service. Feeds the admin dashboard and charts.
 */
const hospitalAnalyticsSchema = new mongoose.Schema(
  {
    date: { type: String, required: true, index: true }, // YYYY-MM-DD
    hour: { type: Number, default: -1 }, // -1 = daily aggregate, 0-23 = hourly

    appointments: { type: Number, default: 0 },
    completed: { type: Number, default: 0 },
    cancelled: { type: Number, default: 0 },
    emergencies: { type: Number, default: 0 },

    patientsWaiting: { type: Number, default: 0 },
    doctorsOnline: { type: Number, default: 0 },
    doctorsBusy: { type: Number, default: 0 },
    doctorsOffline: { type: Number, default: 0 },

    avgWaitMinutes: { type: Number, default: 0 },
    avgConsultationMinutes: { type: Number, default: 0 },
    efficiency: { type: Number, default: 0 }, // 0-100

    hospitalLoad: { type: Number, default: 0 }, // 0-100
  },
  { timestamps: true }
);

hospitalAnalyticsSchema.set('toJSON', {
  transform(doc, ret) {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

const HospitalAnalytics = mongoose.model('HospitalAnalytics', hospitalAnalyticsSchema);
export default HospitalAnalytics;
