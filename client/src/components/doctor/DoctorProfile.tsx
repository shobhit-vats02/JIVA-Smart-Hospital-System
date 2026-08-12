'use client';

import { useQuery } from '@tanstack/react-query';
import { UserRound, Mail, Phone, Stethoscope, Award, ScanFace, Clock } from 'lucide-react';
import { doctorApi } from '@/lib/doctorApi';
import { useAuth } from '@/context/AuthContext';
import { Badge } from '@/components/ui/Badge';
import { PageLoader } from '@/components/ui/Spinner';
import { initials } from '@/lib/utils';

export function DoctorProfile() {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ['doctor', 'dashboard'],
    queryFn: async () => (await doctorApi.getDashboard()).data,
  });

  if (isLoading) return <PageLoader label="Loading profile" />;

  const d = data?.doctor;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="glass glow-border flex flex-wrap items-center gap-5 p-6">
        <span className="grid h-20 w-20 place-items-center rounded-3xl bg-gradient-to-br from-primary to-royal text-3xl font-bold text-white">
          {initials(user?.name || '?')}
        </span>
        <div className="flex-1">
          <h2 className="text-2xl font-bold">{user?.name}</h2>
          <p className="text-ink-2">{d?.specialty}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge tone={data?.isAvailable ? 'success' : 'warning'} dot>
              {data?.isAvailable ? 'On duty' : 'Off duty'}
            </Badge>
            <Badge tone="primary">{d?.staffId}</Badge>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Fact icon={Mail} label="Email" value={user?.email} />
        <Fact icon={Phone} label="Phone" value={d?.phone || '—'} />
        <Fact icon={Award} label="Qualification" value={d?.qualification || '—'} />
        <Fact icon={Clock} label="Experience" value={`${d?.yearsOfExperience ?? 0} years`} />
        <Fact icon={Stethoscope} label="Department" value={d?.department && typeof d.department === 'object' ? (d.department as unknown as { name: string }).name : '—'} />
        <Fact icon={ScanFace} label="Avg consultation" value={`${d?.avgConsultationMinutes ?? 0} min`} />
      </div>
    </div>
  );
}

function Fact({ icon: Icon, label, value }: { icon: typeof Mail; label: string; value?: string }) {
  return (
    <div className="glass p-4">
      <Icon className="mb-2 h-5 w-5 text-primary" />
      <div className="text-xs text-ink-3">{label}</div>
      <div className="truncate text-sm font-medium">{value || '—'}</div>
    </div>
  );
}
