'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  ArrowLeft,
  ArrowRight,
  KeyRound,
  LogIn,
  Mail,
  Sparkles,
  Eye,
  EyeOff,
  Check,
} from 'lucide-react';
import { Logo } from '@/components/ui/Logo';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/context/AuthContext';
import { ROLES, DEMO_CREDENTIALS, type Role } from '@/lib/constants';
import { cn } from '@/lib/utils';

const schema = z.object({
  identifier: z.string().min(1, 'Required'),
  password: z.string().min(1, 'Required'),
  remember: z.boolean(),
});

type LoginForm = z.infer<typeof schema>;

const roleIcons: Record<Role, typeof LogIn> = {
  patient: ROLES.patient.icon,
  doctor: ROLES.doctor.icon,
  admin: ROLES.admin.icon,
};

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const toast = useToast();
  const [role, setRole] = useState<Role | null>(null);
  const [showPass, setShowPass] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(schema),
    defaultValues: { identifier: '', password: '', remember: true },
  });

  const identifier = watch('identifier');

  const onSelect = (r: Role) => {
    setRole(r);
    // Prefill a demo credential for frictionless demos.
    const demo = DEMO_CREDENTIALS[r]?.[0];
    if (demo) {
      setValue('identifier', 'staffId' in demo ? (demo.staffId as string) : (demo.email as string));
      setValue('password', demo.password);
    }
  };

  const onSubmit = handleSubmit(async (values) => {
    if (!role) return;
    setSubmitting(true);
    try {
      await login({ role, identifier: values.identifier, password: values.password, remember: values.remember });
      toast('success', 'Login successful', `Welcome back, ${role}!`);
      router.push(`/${role}`);
    } catch (e) {
      toast('error', 'Login failed', e instanceof Error ? e.message : 'Please check your credentials.');
    } finally {
      setSubmitting(false);
    }
  });

  const Icon = role ? roleIcons[role] : LogIn;

  return (
    <div className="relative">
      {/* top-right controls */}
      <div className="absolute -top-2 right-0 flex items-center gap-2">
        {role && (
          <button
            onClick={() => setRole(null)}
            className="btn-glass flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium"
          >
            <ArrowLeft className="h-4 w-4" /> Roles
          </button>
        )}
        <ThemeToggle />
      </div>

      <AnimatePresence mode="wait">
        {role === null ? (
          <motion.div
            key="roles"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
          >
            <div className="mb-8 flex justify-center">
              <Logo size="lg" />
            </div>
            <div className="mb-8 text-center">
              <h1 className="text-3xl font-bold">Welcome to JIVA</h1>
              <p className="mt-2 text-ink-2">Select your role to continue</p>
            </div>

            <div className="space-y-3">
              {(Object.keys(ROLES) as Role[]).map((r) => {
                const meta = ROLES[r];
                const RIcon = meta.icon;
                return (
                  <motion.button
                    key={r}
                    whileHover={{ scale: 1.01, y: -2 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => onSelect(r)}
                    className="glass glass-hover flex w-full items-center gap-4 p-4 text-left"
                  >
                    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-primary to-royal text-white shadow-glass">
                      <RIcon className="h-6 w-6" />
                    </span>
                    <span className="flex-1">
                      <span className="block font-semibold">{meta.label}</span>
                      <span className="block text-xs text-ink-2">{meta.description}</span>
                    </span>
                    <ArrowRight className="h-5 w-5 text-ink-3" />
                  </motion.button>
                );
              })}
            </div>

            <p className="mt-6 text-center text-sm text-ink-3">
              New to JIVA?{' '}
              <Link href="/register" className="font-medium text-primary hover:underline">
                Create a patient account
              </Link>
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
          >
            <div className="glass glow-border p-8 shadow-glass-lg">
              <div className="mb-6 flex items-center gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-primary to-royal text-white shadow-glass">
                  <Icon className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="text-xl font-bold">{ROLES[role].label} Login</h2>
                  <p className="text-xs text-ink-2">
                    Sign in with your {ROLES[role].loginLabel.toLowerCase()}
                  </p>
                </div>
              </div>

              <form onSubmit={onSubmit} className="space-y-4">
                <Input
                  label={ROLES[role].loginLabel}
                  icon={role === 'doctor' ? <KeyRound className="h-4 w-4" /> : <Mail className="h-4 w-4" />}
                  placeholder={ROLES[role].loginPlaceholder}
                  error={errors.identifier?.message}
                  {...register('identifier')}
                />
                <div className="relative">
                  <Input
                    label="Password"
                    type={showPass ? 'text' : 'password'}
                    icon={<KeyRound className="h-4 w-4" />}
                    placeholder="••••••••"
                    error={errors.password?.message}
                    {...register('password')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass((s) => !s)}
                    className="absolute right-3 top-[38px] text-ink-3 hover:text-ink"
                    aria-label="Toggle password"
                  >
                    {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <label className="flex cursor-pointer items-center gap-2 text-ink-2">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-primary"
                      {...register('remember')}
                    />
                    Remember me
                  </label>
                  <a href="#" className="text-primary hover:underline" onClick={(e) => e.preventDefault()}>
                    Forgot password?
                  </a>
                </div>

                <Button type="submit" loading={submitting} className="w-full" leftIcon={<LogIn className="h-4 w-4" />}>
                  Enter Dashboard
                </Button>
              </form>

              {/* Google login (prototype) */}
              <div className="mt-5">
                <div className="mb-3 flex items-center gap-3 text-xs text-ink-3">
                  <span className="h-px flex-1 bg-border" /> or continue with <span className="h-px flex-1 bg-border" />
                </div>
                <button
                  type="button"
                  onClick={() => toast('info', 'Google sign-in', 'Social login will be wired to the backend in a later milestone.')}
                  className="btn-glass flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden>
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
                  </svg>
                  Sign in with Google
                </button>
              </div>
            </div>

            {/* demo credential helper */}
            <div className="mt-4 rounded-2xl border border-border bg-card p-3">
              <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-ink-2">
                <Sparkles className="h-3.5 w-3.5 text-primary" /> Demo credentials
              </p>
              <div className="flex flex-wrap gap-2">
                {DEMO_CREDENTIALS[role].map((d) => (
                  <button
                    key={'staffId' in d ? d.staffId : d.email}
                    onClick={() => {
                      const idv = 'staffId' in d ? (d.staffId as string) : (d.email as string);
                      setValue('identifier', idv);
                      setValue('password', d.password);
                    }}
                    className={cn(
                      'rounded-lg border border-border px-2.5 py-1.5 text-xs transition-colors',
                      identifier === ('staffId' in d ? d.staffId : d.email)
                        ? 'border-primary bg-primary-soft text-primary'
                        : 'text-ink-2 hover:bg-primary-soft'
                    )}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4 text-center text-sm text-ink-3">
              <Link href="/register" className="font-medium text-primary hover:underline">
                Create a patient account
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {role === 'admin' && (
        <div className="mt-4 flex justify-center">
          <span className="flex items-center gap-1.5 text-xs text-ink-3">
            <Check className="h-3.5 w-3.5 text-emerald-500" /> Admin Access · Restricted area
          </span>
        </div>
      )}
    </div>
  );
}
