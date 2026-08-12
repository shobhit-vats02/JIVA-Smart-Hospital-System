export type Role = 'patient' | 'doctor' | 'admin';

export interface User {
  id: string;
  role: Role;
  email: string;
  name: string;
  avatar?: string;
  phone?: string;
  [key: string]: unknown;
}

export interface AuthSession {
  user: User;
  accessToken: string;
}

export interface ApiEnvelope<T = unknown> {
  success: boolean;
  data: T;
  message?: string;
  errors?: { field: string; message: string }[];
}

export interface Department {
  id: string;
  name: string;
  code: string;
  description?: string;
  wing?: string;
}

export interface DoctorSummary {
  id: string;
  name: string;
  staffId: string;
  specialty: string;
  department?: { id: string; name: string } | string;
  rating: number;
  yearsOfExperience: number;
  avgConsultationMinutes: number;
  avatar?: string;
  isAvailable: boolean;
  isPresent: boolean;
  phone?: string;
  qualification?: string;
}

export type AppointmentStatus =
  | 'pending'
  | 'confirmed'
  | 'waiting'
  | 'in_consultation'
  | 'completed'
  | 'cancelled'
  | 'rescheduled'
  | 'emergency';

export interface Appointment {
  id: string;
  patient: string;
  doctor: { id: string; name: string; specialty?: string; avatar?: string } | string;
  department: { id: string; name: string } | string;
  date: string;
  startTime: string;
  endTime: string;
  reason?: string;
  symptoms?: string;
  isEmergency: boolean;
  status: AppointmentStatus;
  priority?: string;
  priorityPoints?: number;
  priorityCategory?: string;
  tokenNumber?: number;
  queuePosition?: number;
  estimatedWaitMinutes?: number;
  aiSuggestionAccepted?: boolean;
  aiRecommendation?: string;
  consultationStartedAt?: string;
  consultationEndedAt?: string;
  createdAt: string;
}

export interface NotificationItem {
  id: string;
  recipientRole: Role;
  recipient: string;
  type: string;
  title: string;
  message?: string;
  read: boolean;
  data?: Record<string, unknown>;
  createdAt: string;
}

export interface QueueSnapshot {
  doctor: DoctorSummary | null;
  date: string;
  next: { position: number; patientName: string; token: string; appointmentId: string } | null;
  current: { position: number; patientName: string; token: string; appointmentId: string } | null;
  waiting: { position: number; patientName: string; token: string; estimatedWaitMinutes: number; appointmentId: string }[];
  totalWaiting: number;
  avgConsultationMinutes: number;
}

export interface PatientQueueInfo {
  position: number;
  token: string;
  status: string;
  patientsAhead: number;
  estimatedWaitMinutes: number;
  isCurrent: boolean;
}

export interface AIBookingRecommendation {
  id: string;
  type: string;
  title: string;
  message: string;
  suggested: {
    slot: string;
    waitMinutes: number;
    doctorId: string;
    alternativeDoctor: {
      id: string;
      name: string;
      staffId: string;
      specialty: string;
      avgConsultationMinutes: number;
    } | null;
  };
  reason: string;
  load?: number;
}

export interface PatientProfile {
  profile: {
    id: string;
    name: string;
    email: string;
    phone: string;
    age?: number;
    gender?: string;
    bloodGroup?: string;
    address?: string;
    avatar?: string;
    medicalHistory?: string[];
    emergencyContact?: { name: string; phone: string; relation: string };
    createdAt: string;
  };
  stats: { upcoming: number; completed: number; cancelled: number; total: number };
}

export interface HealthPassData {
  profile: {
    id: string;
    name: string;
    email: string;
    phone: string;
    gender?: string;
    age?: number;
    bloodGroup?: string;
    address?: string;
    avatar?: string;
  };
  healthProfile: {
    allergies: string[];
    conditions: string[];
    vaccinations: string[];
    emergencyContact?: { name: string; phone: string; relation: string };
  };
  emergencyContact?: { name: string; phone: string; relation: string };
  latestPrescription?: unknown;
  verified: boolean;
}

export interface PrescriptionRecord {
  id: string;
  issuedAt: string;
  doctor: { id: string; name: string; staffId: string; specialty: string } | string;
  patient?: { id: string; name: string } | string;
  appointment?: { id: string; date: string; startTime: string } | string;
  medicines: MedicineItem[];
  notes?: string;
  doctorNotes?: string;
}

export interface VideoSession {
  id: string;
  appointment: string;
  patient: string;
  doctor: { id: string; name: string } | string;
  status: 'scheduled' | 'waiting' | 'active' | 'ended';
  startedAt?: string;
  endedAt?: string;
  durationSeconds: number;
  messages: { from: 'patient' | 'doctor' | 'system'; text: string; at: string }[];
  doctorNotes?: string;
  prescription?: unknown;
}

// ===== Doctor module =====
export interface DoctorDashboardData {
  doctor: DoctorSummary & { department?: { id: string; name: string } | string };
  todayCount: number;
  completedCount: number;
  currentPatient: Appointment | null;
  waitingCount: number;
  nextPatient: Appointment | null;
  emergencyCount: number;
  emergencies: Appointment[];
  isAvailable: boolean;
  isPresent: boolean;
  presenceConfidence: number;
  currentQueue: number;
  avgConsultationMinutes: number;
}

export interface PresenceState {
  isPresent: boolean;
  isAvailable: boolean;
  presenceConfidence: number;
  currentQueue: number;
  lastPresentAt?: string;
  lastLog?: unknown;
  hospital?: { wifiSSID: string; bluetoothDevice: string };
}

export interface PresenceMethodResult {
  method: string;
  verified: boolean;
  score?: number;
  log?: unknown;
}

export interface ConfidenceResult {
  confidence: number;
  completed: number;
  activated: boolean;
  log?: unknown;
}

export interface PresenceLog {
  id: string;
  face: { attempted: boolean; verified: boolean; score: number };
  rfid: { attempted: boolean; verified: boolean; cardId: string };
  bluetooth: { attempted: boolean; verified: boolean; device: string };
  wifi: { attempted: boolean; verified: boolean; network: string };
  gps: { attempted: boolean; verified: boolean; insideGeofence: boolean };
  aiConfidence: number;
  activated: boolean;
  decision: string;
  summary: string;
  createdAt: string;
}

export interface PatientHistoryResult {
  patient: PatientProfile['profile'] | null;
  history: Appointment[];
}

export interface MedicineItem {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
}
export interface Prescription {
  medicines: MedicineItem[];
  notes: string;
  issuedAt?: string;
}

// ===== Admin module =====
export interface AdminMetrics {
  doctorsOnline: number;
  doctorsBusy: number;
  doctorsOffline: number;
  totalDoctors: number;
  patientsWaiting: number;
  appointmentsToday: number;
  completedToday: number;
  emergenciesToday: number;
  activeEmergencies: number;
  efficiency: number;
}

export interface AdminDashboardData {
  metrics: AdminMetrics;
  recentEmergencies: EmergencyCase[];
  recentAppointments: Appointment[];
}

export interface DoctorAdmin {
  id: string;
  name: string;
  staffId: string;
  email: string;
  phone?: string;
  specialty?: string;
  qualification?: string;
  yearsOfExperience?: number;
  avgConsultationMinutes?: number;
  department?: { id: string; name: string } | string;
  isActive: boolean;
  isPresent: boolean;
  isAvailable: boolean;
  presenceConfidence?: number;
  rfidTag?: string;
  createdAt?: string;
}

export interface PatientAdmin {
  id: string;
  name: string;
  email: string;
  phone: string;
  age?: number;
  gender?: string;
  bloodGroup?: string;
  address?: string;
  isActive: boolean;
  createdAt?: string;
}

export type EmergencySeverity = 'critical' | 'high' | 'medium' | 'low';
export type EmergencyStatus = 'new' | 'dispatched' | 'responding' | 'at_hospital' | 'treated' | 'closed';

export interface EmergencyCase {
  id: string;
  patient?: string;
  patientName: string;
  phone?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  description?: string;
  department?: { id: string; name: string } | string;
  severity: EmergencySeverity;
  priority: number;
  status: EmergencyStatus;
  ambulanceDispatched: boolean;
  ambulance?: { id: string; etaMinutes: number; driver: string; status: string };
  hospitalAlerted: boolean;
  emergencyContactNotified: boolean;
  locationShared: boolean;
  location?: { lat?: number; lng?: number; address?: string };
  timeline: { type: string; text: string; at: string }[];
  createdAt: string;
}

export interface CommandCenterData {
  activeCases: number;
  active: EmergencyCase[];
  onlineDoctors: number;
  departments: string[];
  ambulances: { id: string; driver: string; etaMinutes: number }[];
}

export interface AnalyticsData {
  daily: {
    date: string;
    appointments: number;
    completed: number;
    emergencies: number;
    avgWaitMinutes: number;
    efficiency: number;
    hospitalLoad: number;
    patientsWaiting: number;
    doctorsOnline: number;
  }[];
  departmentDistribution: { name: string; count: number }[];
  hourly: { hour: number; appointments: number; hospitalLoad: number }[];
}
