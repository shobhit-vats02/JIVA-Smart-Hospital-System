'use client';

import { useState } from 'react';
import {
  LayoutDashboard,
  CalendarDays,
  Stethoscope,
  ScanFace,
  Bell,
  UserRound,
  Settings,
  Users,
  FileText,
  Video,
} from 'lucide-react';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { DoctorHome } from '@/components/doctor/DoctorHome';
import { TodaySchedule } from '@/components/doctor/TodaySchedule';
import { CurrentConsultation } from '@/components/doctor/CurrentConsultation';
import { PresenceVerification } from '@/components/doctor/PresenceVerification';
import { NotificationsView } from '@/components/patient/NotificationsView';
import { DoctorProfile } from '@/components/doctor/DoctorProfile';
import { DoctorSettings } from '@/components/doctor/DoctorSettings';
import { DoctorPrescriptions } from '@/components/doctor/DoctorPrescriptions';
import { DoctorVideo } from '@/components/doctor/DoctorVideo';
import { useNotifications } from '@/hooks/useNotifications';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';

const navItems = [
  { id: 'home', label: 'Home', icon: LayoutDashboard },
  { id: 'patients', label: 'Patients', icon: Users },
  { id: 'presence', label: 'Presence', icon: ScanFace },
  { id: 'prescriptions', label: 'Prescriptions', icon: FileText },
  { id: 'profile', label: 'Profile', icon: UserRound },
  { id: 'video', label: 'Video Consultation', icon: Video },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export default function DoctorDashboard() {
  const [active, setActive] = useState('home');
  const [consultId, setConsultId] = useState<string | undefined>(undefined);
  const { unread } = useNotifications();

  const openConsult = (id: string) => {
    setConsultId(id);
    setActive('patients');
  };

  const render = () => {
    switch (active) {
      case 'patients': return <TodaySchedule onOpenConsult={openConsult} />;
      case 'presence': return <PresenceVerification />;
      case 'prescriptions': return <DoctorPrescriptions />;
      case 'profile': return <DoctorProfile />;
      case 'video': return <DoctorVideo />;
      case 'notifications': return <NotificationsView />;
      case 'settings': return <DoctorSettings />;
      default: return <DoctorHome onNavigate={setActive} />;
    }
  };

  return (
    <DashboardShell
      navItems={navItems}
      userRoleLabel="Doctor Portal"
      active={active}
      onNavigate={setActive}
      unreadCount={unread}
    >
      <ErrorBoundary>{render()}</ErrorBoundary>
    </DashboardShell>
  );
}
