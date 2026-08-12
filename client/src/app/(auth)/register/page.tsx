'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { UserPlus, Mail, Phone, UserRound, Lock, ArrowLeft, CalendarDays, MapPin } from 'lucide-react';
import { Logo } from '@/components/ui/Logo';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/context/AuthContext';

const schema = z
  .object({
    name: z.string().min(2, 'Full name is required'),
    email: z.string().email('A valid email is required'),
    phone: z.string().min(7, 'A valid phone number is required'),
    password: z.string().min(8, 'At least 8 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
    gender: z.enum(['male', 'female', 'other']),
    age: z.coerce.number().int().min(0).max(150).optional(),
    address: z.string().optional(),
    emergencyName: z.string().optional(),
    emergencyPhone: z.string().optional(),
    emergencyRelation: z.string().optional(),
  })
  .superRefine((d, ctx) => {
    if (d.password !== d.confirmPassword) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['confirmPassword'], message: 'Passwords do not match' });
    }
  });

type RegisterForm = z.infer<typeof schema>;

export default function RegisterPage() {
  const router = useRouter();
  const { register: registerUser } = useAuth();
  const toast = useToast();
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterForm>({ resolver: zodResolver(schema) });

  const onSubmit = handleSubmit(async (values) => {
    setSubmitting(true);
    try {
      await registerUser({
        name: values.name,
        email: values.email,
        phone: values.phone,
        password: values.password,
        confirmPassword: values.confirmPassword,
        gender: values.gender,
        age: values.age,
        address: values.address,
        emergencyContact: {
          name: values.emergencyName || '',
          phone: values.emergencyPhone || '',
          relation: values.emergencyRelation || '',
        },
      });
      toast('success', 'Account created', 'Welcome to JIVA! Redirecting to your dashboard.');
      router.push('/patient');
    } catch (e) {
      toast('error', 'Registration failed', e instanceof Error ? e.message : 'Please check your details.');
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <div className="relative">
      <div className="absolute -top-2 right-0">
        <ThemeToggle />
      </div>

      <div className="mb-6 flex justify-center">
        <Logo size="lg" />
      </div>

      <div className="glass glow-border p-8 shadow-glass-lg">
        <div className="mb-6 flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-primary to-royal text-white shadow-glass">
            <UserPlus className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-xl font-bold">Create Patient Account</h2>
            <p className="text-xs text-ink-2">Self-registration is available to patients only</p>
          </div>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <Input label="Full name" icon={<UserRound className="h-4 w-4" />} placeholder="Jane Doe" error={errors.name?.message} {...register('name')} />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input label="Email" type="email" icon={<Mail className="h-4 w-4" />} placeholder="you@example.com" error={errors.email?.message} {...register('email')} />
            <Input label="Phone" type="tel" icon={<Phone className="h-4 w-4" />} placeholder="+91 XXXXX XXXXX" error={errors.phone?.message} {...register('phone')} />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input label="Gender" type="text" list="genders" placeholder="male / female / other" error={errors.gender?.message} {...register('gender')} />
            <Input label="Age" type="number" icon={<CalendarDays className="h-4 w-4" />} placeholder="30" error={errors.age?.message} {...register('age')} />
          </div>
          <datalist id="genders">
            <option value="male" />
            <option value="female" />
            <option value="other" />
          </datalist>
          <Input label="Address" icon={<MapPin className="h-4 w-4" />} placeholder="Street, City" error={errors.address?.message} {...register('address')} />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input label="Password" type="password" icon={<Lock className="h-4 w-4" />} placeholder="••••••••" error={errors.password?.message} {...register('password')} />
            <Input label="Confirm password" type="password" icon={<Lock className="h-4 w-4" />} placeholder="••••••••" error={errors.confirmPassword?.message} {...register('confirmPassword')} />
          </div>

          <div className="rounded-xl bg-primary-soft p-4">
            <p className="mb-3 text-xs font-semibold text-ink-2">Emergency contact (optional)</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Input placeholder="Name" error={errors.emergencyName?.message} {...register('emergencyName')} />
              <Input placeholder="Phone" error={errors.emergencyPhone?.message} {...register('emergencyPhone')} />
              <Input placeholder="Relation" error={errors.emergencyRelation?.message} {...register('emergencyRelation')} />
            </div>
          </div>

          <Button type="submit" loading={submitting} className="w-full" leftIcon={<UserPlus className="h-4 w-4" />}>
            Create account
          </Button>
        </form>
      </div>

      <p className="mt-5 text-center text-sm text-ink-3">
        Already have an account?{' '}
        <Link href="/login" className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to login
        </Link>
      </p>
    </div>
  );
}
