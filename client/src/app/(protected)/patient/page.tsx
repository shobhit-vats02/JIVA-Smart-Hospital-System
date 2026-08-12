'use client';

import { useState } from 'react';
import {
  LayoutDashboard,
  CalendarPlus,
  CalendarDays,
  Video,
  ListOrdered,
  Bell,
  UserRound,
  Settings,
  Stethoscope,
  CreditCard,
  FileText,
  Siren,
} from 'lucide-react';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { PatientHome } from '@/components/patient/PatientHome';
import { FindDoctors } from '@/components/patient/FindDoctors';
import { BookAppointment } from '@/components/patient/BookAppointment';
import { MyAppointments } from '@/components/patient/MyAppointments';
import { VideoConsultation } from '@/components/patient/VideoConsultation';
import { QueueStatus } from '@/components/patient/QueueStatus';
import { NotificationsView } from '@/components/patient/NotificationsView';
import { ProfileView } from '@/components/patient/ProfileView';
import { SettingsView } from '@/components/patient/SettingsView';
import { HealthPass } from '@/components/patient/HealthPass';
import { PrescriptionsView } from '@/components/patient/PrescriptionsView';
import { PatientEmergency } from '@/components/patient/PatientEmergency';
import { usePatientRealtime } from '@/hooks/usePatientRealtime';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';

const navItems = [
  { id: 'home', label: 'Home', icon: LayoutDashboard },
  { id: 'find-doctors', label: 'Find Doctors', icon: Stethoscope },
  { id: 'book', label: 'Book Appointment', icon: CalendarPlus },
  { id: 'appointments', label: 'Appointments', icon: CalendarDays },
  { id: 'queue', label: 'Queue Tracker', icon: ListOrdered },
  { id: 'health-pass', label: 'Health Pass', icon: CreditCard },
  { id: 'prescriptions', label: 'Prescriptions', icon: FileText },
  { id: 'video', label: 'Video Consultation', icon: Video },
  { id: 'emergency', label: 'Emergency', icon: Siren },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'profile', label: 'Profile', icon: UserRound },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export default function PatientDashboard() {
  const [active, setActive] = useState('home');
  const { unread } = usePatientRealtime();

  const render = () => {
    switch (active) {
      case 'find-doctors': return <FindDoctors />;
      case 'book': return <BookAppointment />;
      case 'appointments': return <MyAppointments />;
      case 'video': return <VideoConsultation />;
      case 'queue': return <QueueStatus />;
      case 'health-pass': return <HealthPass />;
      case 'prescriptions': return <PrescriptionsView />;
      case 'emergency': return <PatientEmergency />;
      case 'notifications': return <NotificationsView />;
      case 'profile': return <ProfileView />;
      case 'settings': return <SettingsView />;
      default: return <PatientHome onNavigate={setActive} />;
    }
  };

  return (
    <DashboardShell
      navItems={navItems}
      userRoleLabel="Patient Portal"
      active={active}
      onNavigate={setActive}
      unreadCount={unread}
    >
      <ErrorBoundary>{render()}</ErrorBoundary>
    </DashboardShell>
  );
}
