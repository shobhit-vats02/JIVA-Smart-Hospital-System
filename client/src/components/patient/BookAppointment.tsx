'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  CalendarPlus,
  UserRound,
  Clock,
  AlertTriangle,
  Check,
  RefreshCw,
  Building2,
  Mic,
} from 'lucide-react';
import { patientApi } from '@/lib/patientApi';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { cn } from '@/lib/utils';
import { VoiceBookingModal } from '@/components/patient/VoiceBookingModal';
import type { AIBookingRecommendation, Department, DoctorSummary } from '@/types';

const TIME_SLOTS = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '14:00', '14:30', '15:00', '15:30',
  '16:00', '16:30', '17:00', '17:30',
];

const schema = z.object({
  departmentId: z.string().min(1, 'Select a department'),
  doctorId: z.string().min(1, 'Select a doctor'),
  date: z.string().min(1, 'Pick a date'),
  startTime: z.string().min(1, 'Pick a time'),
  reason: z.string().optional(),
  symptoms: z.string().optional(),
  isEmergency: z.boolean().optional(),
});

type FormData = z.infer<typeof schema>;

function todayPlus(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function BookAppointment() {
  const toast = useToast();
  const qc = useQueryClient();
  const { user } = useAuth();

  const [recommendation, setRecommendation] = useState<AIBookingRecommendation | null>(null);
  const [acceptAI, setAcceptAI] = useState(false);
  const [checking, setChecking] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [voiceOpen, setVoiceOpen] = useState(false);

  const applyVoice = (data: { departmentId?: string; doctorId?: string; date?: string; startTime?: string; reason?: string }) => {
    if (data.startTime) setValue('startTime', data.startTime);
    if (data.date) setValue('date', data.date);
    if (data.reason) setValue('reason', data.reason);
    toast('info', 'Voice booking applied', 'Review the details and confirm.');
  };

  const { data: deptsData } = useQuery({
    queryKey: ['patient', 'departments'],
    queryFn: async () => (await patientApi.listDepartments()).data,
  });
  const departments = deptsData || [];

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { date: todayPlus(1), startTime: '10:00', isEmergency: false },
  });

  const departmentId = watch('departmentId');

  const { data: doctorsData } = useQuery({
    queryKey: ['patient', 'doctors', departmentId],
    queryFn: async () => (await patientApi.listDoctors(departmentId)).data,
    enabled: !!departmentId,
  });
  const doctors = doctorsData || [];

  const onGetRecommendation = handleSubmit(async (values) => {
    setChecking(true);
    try {
      const res = await patientApi.previewRecommendation({
        departmentId: values.departmentId,
        doctorId: values.doctorId,
        date: values.date,
        startTime: values.startTime,
      });
      setRecommendation(res.data);
      setAcceptAI(false);
      toast('info', 'AI recommendation ready', 'Review the suggested slot below.');
    } catch (e) {
      toast('error', 'Could not generate recommendation', e instanceof Error ? e.message : 'Try again.');
    } finally {
      setChecking(false);
    }
  });

  const onSubmit = handleSubmit(async (values) => {
    setSubmitting(true);
    try {
      const chosenSlot = acceptAI && recommendation?.suggested.slot ? recommendation.suggested.slot : values.startTime;
      const res = await patientApi.bookAppointment({
        departmentId: values.departmentId,
        doctorId: values.doctorId,
        date: values.date,
        startTime: chosenSlot,
        reason: values.reason,
        symptoms: values.symptoms,
        isEmergency: values.isEmergency,
        aiSuggestionAccepted: acceptAI,
      });
      toast('success', 'Appointment booked', `Confirmed for ${values.date} at ${res.data.startTime}.`);
      qc.invalidateQueries({ queryKey: ['patient', 'appointments'] });
      qc.invalidateQueries({ queryKey: ['patient', 'queue'] });
      setRecommendation(null);
    } catch (e) {
      toast('error', 'Booking failed', e instanceof Error ? e.message : 'Please try another slot.');
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-bold">
            <CalendarPlus className="h-6 w-6 text-primary" /> Book Appointment
          </h2>
          <p className="text-ink-2">Pick your care and let JIVA AI suggest the best slot.</p>
        </div>
        <button
          onClick={() => setVoiceOpen(true)}
          aria-label="Voice booking"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-violet to-royal text-white shadow-glass transition-transform hover:scale-105"
        >
          <Mic className="h-5 w-5" />
        </button>
      </div>

      <VoiceBookingModal open={voiceOpen} onClose={() => setVoiceOpen(false)} onFilled={applyVoice} />

      <form onSubmit={onSubmit} className="glass space-y-5 p-6">
        {/* Department */}
        <div>
          <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-ink-2">
            <Building2 className="h-4 w-4" /> Department
          </label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {departments.map((d: Department) => (
              <button
                type="button"
                key={d.id}
                onClick={() => setValue('departmentId', d.id)}
                className={cn(
                  'rounded-xl border px-3 py-2.5 text-sm font-medium transition-all',
                  departmentId === d.id
                    ? 'border-primary bg-primary-soft text-primary'
                    : 'border-border text-ink-2 hover:bg-primary-soft'
                )}
              >
                {d.name}
              </button>
            ))}
          </div>
          {errors.departmentId && <p className="mt-1 text-xs text-danger">{errors.departmentId.message}</p>}
        </div>

        {/* Doctor */}
        <div>
          <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-ink-2">
            <UserRound className="h-4 w-4" /> Doctor
          </label>
          {departmentId ? (
            <div className="grid gap-2 sm:grid-cols-2">
              {doctors.map((doc: DoctorSummary) => (
                <button
                  type="button"
                  key={doc.id}
                  onClick={() => setValue('doctorId', doc.id)}
                  className={cn(
                    'flex items-start gap-3 rounded-xl border p-3 text-left transition-all',
                    watch('doctorId') === doc.id
                      ? 'border-primary bg-primary-soft'
                      : 'border-border hover:bg-primary-soft'
                  )}
                >
                  <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-primary to-royal text-xs font-bold text-white">
                    {doc.name.replace('Dr. ', '').split(' ').map((w) => w[0]).slice(0, 2).join('')}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">{doc.name}</span>
                    <span className="block text-xs text-ink-2">{doc.specialty}</span>
                    <span className="mt-0.5 flex items-center gap-1 text-xs">
                      <span className={cn('h-1.5 w-1.5 rounded-full', doc.isAvailable ? 'bg-emerald-500' : 'bg-amber-500')} />
                      {doc.isAvailable ? 'Available' : 'Scheduled'} · avg {doc.avgConsultationMinutes}m
                    </span>
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <p className="rounded-xl border border-dashed border-border p-4 text-sm text-ink-3">
              Select a department to see its doctors.
            </p>
          )}
          {errors.doctorId && <p className="mt-1 text-xs text-danger">{errors.doctorId.message}</p>}
        </div>

        {/* Date + Time */}
        <div className="grid gap-4 sm:grid-cols-2">
          <Input type="date" label="Preferred date" error={errors.date?.message} {...register('date')} />
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-ink-2">
              <Clock className="h-4 w-4" /> Preferred time
            </label>
            <div className="grid grid-cols-3 gap-2">
              {TIME_SLOTS.slice(0, 6).map((t) => (
                <button
                  type="button"
                  key={t}
                  onClick={() => setValue('startTime', t)}
                  className={cn(
                    'rounded-lg border px-2 py-1.5 text-sm transition-all',
                    watch('startTime') === t
                      ? 'border-primary bg-primary-soft text-primary'
                      : 'border-border text-ink-2 hover:bg-primary-soft'
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
            <select className="input mt-2" {...register('startTime')}>
              {TIME_SLOTS.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            {errors.startTime && <p className="mt-1 text-xs text-danger">{errors.startTime.message}</p>}
          </div>
        </div>

        {/* Reason + symptoms */}
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Reason" placeholder="Why are you visiting?" error={errors.reason?.message} {...register('reason')} />
          <Input label="Symptoms" placeholder="Brief symptoms" error={errors.symptoms?.message} {...register('symptoms')} />
        </div>

        {/* Emergency toggle */}
        <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-border p-3">
          <input type="checkbox" className="h-4 w-4 accent-danger" {...register('isEmergency')} />
          <span className="flex items-center gap-2 text-sm font-medium">
            <AlertTriangle className="h-4 w-4 text-danger" /> This is an emergency
          </span>
        </label>

        {/* AI recommendation */}
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button
            type="button"
            variant="glass"
            onClick={onGetRecommendation}
            loading={checking}
            leftIcon={!checking ? <Sparkles className="h-4 w-4 text-violet" /> : undefined}
            className="flex-1"
          >
            Get AI recommendation
          </Button>
          <Button type="submit" loading={submitting} leftIcon={<Check className="h-4 w-4" />} className="flex-1">
            Confirm booking
          </Button>
        </div>
      </form>

      {/* AI suggestion panel */}
      <AnimatePresence>
        {recommendation && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            className="glass glow-border p-6"
          >
            <div className="mb-4 flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-violet to-royal text-white">
                <Sparkles className="h-4 w-4" />
              </span>
              <div>
                <p className="font-semibold">{recommendation.title}</p>
                <p className="text-xs text-ink-3">{recommendation.reason}</p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl bg-primary-soft/40 p-4">
                <p className="text-xs text-ink-3">Best available slot</p>
                <p className="text-2xl font-bold text-primary">{recommendation.suggested.slot}</p>
                <p className="mt-1 text-xs text-ink-2">Est. wait ~{formatMin(recommendation.suggested.waitMinutes)}</p>
              </div>
              {recommendation.suggested.alternativeDoctor ? (
                <div className="rounded-xl bg-violet-500/10 p-4">
                  <p className="text-xs text-ink-3">Alternative doctor available</p>
                  <p className="text-lg font-bold">{recommendation.suggested.alternativeDoctor.name}</p>
                  <p className="text-xs text-ink-2">
                    {recommendation.suggested.alternativeDoctor.specialty} · avg{' '}
                    {recommendation.suggested.alternativeDoctor.avgConsultationMinutes}m
                  </p>
                </div>
              ) : (
                <div className="rounded-xl bg-emerald-500/10 p-4">
                  <p className="text-xs text-ink-3">Current doctor is the best option</p>
                  <p className="text-lg font-bold">No reallocation needed</p>
                </div>
              )}
            </div>

            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <button
                onClick={() => setAcceptAI(true)}
                className={cn(
                  'flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all',
                  acceptAI ? 'bg-gradient-to-r from-primary to-royal text-white' : 'btn-glass'
                )}
              >
                <Sparkles className="h-4 w-4" /> Accept AI suggestion
              </button>
              <button
                onClick={() => setAcceptAI(false)}
                className={cn(
                  'flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all',
                  !acceptAI ? 'bg-gradient-to-r from-primary to-royal text-white' : 'btn-glass'
                )}
              >
                <Clock className="h-4 w-4" /> Keep original
              </button>
            </div>
            <p className="mt-3 text-center text-xs text-ink-3">
              {acceptAI
                ? `Booking ${recommendation.suggested.slot} (AI suggested).`
                : 'Keeping your originally selected time.'}{' '}
              {user ? `Logged in as ${user.name}.` : ''}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function formatMin(m: number) {
  if (m < 60) return `${Math.round(m)}m`;
  return `${Math.floor(m / 60)}h ${Math.round(m % 60)}m`;
}
