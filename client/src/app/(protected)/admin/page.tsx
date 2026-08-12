'use client';

import { useState } from 'react';
import {
  LayoutDashboard,
  Stethoscope,
  Users,
  CalendarDays,
  Siren,
  BarChart3,
  Settings,
  Bell,
  Building2,
} from 'lucide-react';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { AdminHome } from '@/components/admin/AdminHome';
import { DoctorsAdmin } from '@/components/admin/DoctorsAdmin';
import { PatientsAdmin } from '@/components/admin/PatientsAdmin';
import { AppointmentsAdmin } from '@/components/admin/AppointmentsAdmin';
import { EmergencyCenter } from '@/components/admin/EmergencyCenter';
import { AnalyticsView } from '@/components/admin/AnalyticsView';
import { AdminSettings } from '@/components/admin/AdminSettings';
import { DigitalTwin } from '@/components/admin/DigitalTwin';
import { NotificationsView } from '@/components/patient/NotificationsView';
import { useNotifications } from '@/hooks/useNotifications';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';

const navItems = [
  { id: 'home', label: 'Operations', icon: LayoutDashboard },
  { id: 'digital-twin', label: 'Digital Twin', icon: Building2 },
  { id: 'doctors', label: 'Doctor Management', icon: Stethoscope },
  { id: 'patients', label: 'Patients', icon: Users },
  { id: 'appointments', label: 'Appointments', icon: CalendarDays },
  { id: 'emergency', label: 'Emergency Command', icon: Siren },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export default function AdminDashboard() {
  const [active, setActive] = useState('home');
  const { unread } = useNotifications();

  const render = () => {
    switch (active) {
      case 'digital-twin': return <DigitalTwin />;
      case 'doctors': return <DoctorsAdmin />;
      case 'patients': return <PatientsAdmin />;
      case 'appointments': return <AppointmentsAdmin />;
      case 'emergency': return <EmergencyCenter />;
      case 'analytics': return <AnalyticsView />;
      case 'notifications': return <NotificationsView />;
      case 'settings': return <AdminSettings />;
      default: return <AdminHome onNavigate={setActive} />;
    }
  };

  return (
    <DashboardShell
      navItems={navItems}
      userRoleLabel="Admin Console"
      active={active}
      onNavigate={setActive}
      unreadCount={unread}
    >
      <ErrorBoundary>{render()}</ErrorBoundary>
    </DashboardShell>
  );
}
