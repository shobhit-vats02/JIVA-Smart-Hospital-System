'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { UserRound, Phone, Mail, MapPin, Droplets, HeartPulse, Save } from 'lucide-react';
import { patientApi } from '@/lib/patientApi';
import { useToast } from '@/components/ui/Toast';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { PageLoader } from '@/components/ui/Spinner';
import { initials } from '@/lib/utils';

const schema = z.object({
  name: z.string().min(2),
  phone: z.string().min(7),
  age: z.coerce.number().int().min(0).max(150).optional(),
  bloodGroup: z.string().optional(),
  address: z.string().optional(),
  gender: z.string().optional(),
  emergencyName: z.string().optional(),
  emergencyPhone: z.string().optional(),
  emergencyRelation: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export function ProfileView() {
  const toast = useToast();
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['patient', 'profile'],
    queryFn: async () => (await patientApi.getProfile()).data,
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    values: data?.profile
      ? {
          name: data.profile.name,
          phone: data.profile.phone,
          age: data.profile.age,
          bloodGroup: data.profile.bloodGroup,
          address: data.profile.address,
          gender: data.profile.gender,
          emergencyName: data.profile.emergencyContact?.name,
          emergencyPhone: data.profile.emergencyContact?.phone,
          emergencyRelation: data.profile.emergencyContact?.relation,
        }
      : undefined,
  });

  const onSubmit = handleSubmit(async (values) => {
    setSaving(true);
    try {
      await patientApi.updateProfile({
        name: values.name,
        phone: values.phone,
        age: values.age,
        bloodGroup: values.bloodGroup,
        address: values.address,
        gender: values.gender,
        emergencyContact: {
          name: values.emergencyName || '',
          phone: values.emergencyPhone || '',
          relation: values.emergencyRelation || '',
        },
      });
      toast('success', 'Profile updated');
      qc.invalidateQueries({ queryKey: ['patient', 'profile'] });
    } catch (e) {
      toast('error', 'Update failed', e instanceof Error ? e.message : 'Try again.');
    } finally {
      setSaving(false);
    }
  });

  if (isLoading) return <PageLoader label="Loading profile" />;

  const profile = data?.profile;
  const stats = data?.stats;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header card */}
      <div className="glass glow-border flex flex-wrap items-center gap-5 p-6">
        <span className="grid h-20 w-20 place-items-center rounded-3xl bg-gradient-to-br from-primary to-royal text-3xl font-bold text-white">
          {initials(profile?.name || '?')}
        </span>
        <div className="flex-1">
          <h2 className="text-2xl font-bold">{profile?.name}</h2>
          <p className="text-ink-2">{profile?.email}</p>
        </div>
        <div className="flex gap-4 text-center">
          <MiniStat label="Upcoming" value={stats?.upcoming ?? 0} />
          <MiniStat label="Completed" value={stats?.completed ?? 0} />
          <MiniStat label="Total" value={stats?.total ?? 0} />
        </div>
      </div>

      {/* Read-only quick facts */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Fact icon={Phone} label="Phone" value={profile?.phone} />
        <Fact icon={Mail} label="Email" value={profile?.email} />
        <Fact icon={MapPin} label="Address" value={profile?.address || '—'} />
        <Fact icon={Droplets} label="Blood group" value={profile?.bloodGroup || '—'} />
      </div>

      {/* Edit form */}
      <form onSubmit={onSubmit} className="glass space-y-4 p-6">
        <p className="flex items-center gap-2 font-semibold">
          <HeartPulse className="h-5 w-5 text-primary" /> Personal details
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Full name" icon={<UserRound className="h-4 w-4" />} error={errors.name?.message} {...register('name')} />
          <Input label="Phone" type="tel" icon={<Phone className="h-4 w-4" />} error={errors.phone?.message} {...register('phone')} />
          <Input label="Age" type="number" error={errors.age?.message} {...register('age')} />
          <Input label="Blood group" placeholder="e.g. O+" error={errors.bloodGroup?.message} {...register('bloodGroup')} />
          <Input label="Gender" placeholder="male / female / other" error={errors.gender?.message} {...register('gender')} />
          <Input label="Address" icon={<MapPin className="h-4 w-4" />} error={errors.address?.message} {...register('address')} />
        </div>

        <p className="pt-2 font-semibold">Emergency contact</p>
        <div className="grid gap-4 sm:grid-cols-3">
          <Input label="Name" {...register('emergencyName')} />
          <Input label="Phone" {...register('emergencyPhone')} />
          <Input label="Relation" {...register('emergencyRelation')} />
        </div>

        <Button type="submit" loading={saving} leftIcon={<Save className="h-4 w-4" />}>
          Save changes
        </Button>
      </form>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-primary-soft/40 px-4 py-2">
      <div className="font-display text-xl font-bold text-primary">{value}</div>
      <div className="text-xs text-ink-2">{label}</div>
    </div>
  );
}

function Fact({ icon: Icon, label, value }: { icon: typeof Phone; label: string; value?: string }) {
  return (
    <div className="glass p-4">
      <Icon className="mb-2 h-5 w-5 text-primary" />
      <div className="text-xs text-ink-3">{label}</div>
      <div className="truncate text-sm font-medium">{value || '—'}</div>
    </div>
  );
}
