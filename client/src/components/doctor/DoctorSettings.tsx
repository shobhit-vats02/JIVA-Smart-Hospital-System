'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { KeyRound, Moon, Bell, ShieldCheck } from 'lucide-react';
import { doctorApi } from '@/lib/doctorApi';
import { useTheme } from '@/hooks/useTheme';
import { useToast } from '@/components/ui/Toast';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/context/AuthContext';

const pwSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'At least 8 characters'),
  confirm: z.string().min(1),
}).superRefine((d, ctx) => {
  if (d.newPassword !== d.confirm) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['confirm'], message: 'Passwords do not match' });
});

type PwForm = z.infer<typeof pwSchema>;

export function DoctorSettings() {
  const toast = useToast();
  const { isDark, toggle } = useTheme();
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<PwForm>({
    resolver: zodResolver(pwSchema),
  });

  const onChangePassword = handleSubmit(async (values) => {
    setSaving(true);
    try {
      await doctorApi.changePassword(values.currentPassword, values.newPassword);
      toast('success', 'Password changed');
      reset();
    } catch (e) {
      toast('error', 'Could not change password', e instanceof Error ? e.message : 'Check your current password.');
    } finally {
      setSaving(false);
    }
  });

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="glass p-6">
        <p className="mb-4 flex items-center gap-2 font-semibold"><Moon className="h-5 w-5 text-primary" /> Appearance</p>
        <div className="flex items-center justify-between rounded-xl bg-primary-soft/40 p-4">
          <div>
            <p className="font-medium">Theme</p>
            <p className="text-sm text-ink-2">{isDark ? 'Dark mode active' : 'Light mode active'}</p>
          </div>
          <button onClick={toggle} className="btn-glass rounded-xl px-4 py-2 text-sm">Toggle theme</button>
        </div>
      </div>

      <div className="glass p-6">
        <p className="mb-4 flex items-center gap-2 font-semibold"><Bell className="h-5 w-5 text-primary" /> Notifications</p>
        {['Patient queue updates', 'Emergency alerts', 'Appointment requests', 'System announcements'].map((p) => (
          <label key={p} className="flex items-center justify-between border-b border-border py-3 text-sm">
            <span>{p}</span>
            <input type="checkbox" defaultChecked className="h-4 w-4 accent-primary" />
          </label>
        ))}
      </div>

      <div className="glass p-6">
        <p className="mb-4 flex items-center gap-2 font-semibold"><KeyRound className="h-5 w-5 text-primary" /> Change password</p>
        <form onSubmit={onChangePassword} className="space-y-4">
          <Input label="Current password" type="password" icon={<KeyRound className="h-4 w-4" />} error={errors.currentPassword?.message} {...register('currentPassword')} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="New password" type="password" error={errors.newPassword?.message} {...register('newPassword')} />
            <Input label="Confirm new" type="password" error={errors.confirm?.message} {...register('confirm')} />
          </div>
          <Button type="submit" loading={saving}>Update password</Button>
        </form>
      </div>

      <div className="glass p-6">
        <p className="mb-4 flex items-center gap-2 font-semibold"><ShieldCheck className="h-5 w-5 text-primary" /> Account</p>
        <p className="text-sm text-ink-2">Signed in as <b>{user?.email}</b> · Staff ID</p>
      </div>
    </div>
  );
}
