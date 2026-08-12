'use client';

import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Star, Clock, CalendarPlus, X, Sparkles, Stethoscope } from 'lucide-react';
import { patientApi } from '@/lib/patientApi';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { PageLoader } from '@/components/ui/Spinner';
import type { Department, DoctorSummary } from '@/types';

export function FindDoctors() {
  const toast = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [dept, setDept] = useState('');
  const [bookFor, setBookFor] = useState<DoctorSummary | null>(null);
  const [date, setDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  });
  const [time, setTime] = useState('10:00');
  const [booking, setBooking] = useState(false);

  const { data: depts } = useQuery({ queryKey: ['patient', 'departments'], queryFn: async () => (await patientApi.listDepartments()).data });
  const { data: doctors, isLoading } = useQuery({ queryKey: ['patient', 'doctors-all'], queryFn: async () => (await patientApi.listDoctors()).data });

  const filtered = useMemo(() => {
    let list = doctors || [];
    if (dept) list = list.filter((d) => d.department && typeof d.department === 'object' && (d.department as { id: string }).id === dept);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((d) => d.name.toLowerCase().includes(q) || (d.specialty || '').toLowerCase().includes(q));
    }
    return list;
  }, [doctors, dept, search]);

  const book = async () => {
    if (!bookFor) return;
    setBooking(true);
    try {
      const deptId = bookFor.department && typeof bookFor.department === 'object' ? (bookFor.department as { id: string }).id : '';
      await patientApi.bookAppointment({
        departmentId: deptId,
        doctorId: bookFor.id,
        date,
        startTime: time,
        reason: 'Online booking',
        aiSuggestionAccepted: false,
      });
      toast('success', 'Appointment booked', `${bookFor.name} · ${date} at ${time}`);
      qc.invalidateQueries({ queryKey: ['patient', 'appointments'] });
      setBookFor(null);
    } catch (e) {
      toast('error', 'Booking failed', e instanceof Error ? e.message : 'Try another slot.');
    } finally {
      setBooking(false);
    }
  };

  if (isLoading) return <PageLoader label="Finding doctors" />;

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <h2 className="flex items-center gap-2 text-2xl font-bold">
        <Stethoscope className="h-6 w-6 text-primary" /> Find Doctors
      </h2>

      {/* Search + filters */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or specialty…" className="input pl-10" />
        </div>
        <select value={dept} onChange={(e) => setDept(e.target.value)} className="input sm:w-56">
          <option value="">All departments</option>
          {(depts || []).map((d: Department) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
      </div>

      {/* Doctor cards */}
      <div className="grid gap-4 md:grid-cols-2">
        {filtered.map((doc) => (
          <motion.div key={doc.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="glass glass-hover p-5">
            <div className="flex items-start gap-3">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-gradient-to-br from-primary to-royal text-sm font-bold text-white">
                {doc.name.replace('Dr. ', '').split(' ').map((w) => w[0]).slice(0, 2).join('')}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-bold">{doc.name}</p>
                <p className="text-sm text-ink-2">{doc.specialty || 'General'}</p>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                  <span className="flex items-center gap-1 text-amber-500"><Star className="h-3.5 w-3.5 fill-current" /> {doc.rating || '—'}</span>
                  <span className="text-ink-3">{doc.yearsOfExperience || 0} yrs exp</span>
                  <Badge tone={doc.isAvailable ? 'success' : 'warning'} dot>{doc.isAvailable ? 'Available' : 'Busy'}</Badge>
                </div>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between rounded-xl bg-primary-soft/40 px-3 py-2 text-xs">
              <span className="flex items-center gap-1.5 text-ink-2"><Clock className="h-3.5 w-3.5 text-primary" /> ~{doc.avgConsultationMinutes || 12} min consult</span>
              <Button size="sm" leftIcon={<CalendarPlus className="h-4 w-4" />} onClick={() => setBookFor(doc)}>Book</Button>
            </div>
          </motion.div>
        ))}
        {!filtered.length && (
          <div className="glass col-span-full p-10 text-center">
            <Search className="mx-auto mb-3 h-10 w-10 text-ink-3" />
            <p className="font-semibold">No doctors match your search</p>
          </div>
        )}
      </div>

      {/* Quick book modal */}
      <AnimatePresence>
        {bookFor && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onClick={(e) => e.target === e.currentTarget && setBookFor(null)}>
            <motion.div initial={{ scale: 0.94 }} animate={{ scale: 1 }} exit={{ scale: 0.94 }} className="glass w-full max-w-md p-6 shadow-glass-lg">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-bold">Book with {bookFor.name}</h3>
                <button onClick={() => setBookFor(null)} className="rounded-lg p-2 text-ink-3 hover:bg-primary-soft"><X className="h-5 w-5" /></button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-ink-2">Date</label>
                  <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input" />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-ink-2">Time</label>
                  <select value={time} onChange={(e) => setTime(e.target.value)} className="input">
                    {['09:00','09:30','10:00','10:30','11:00','11:30','12:00','14:00','15:00','16:00','17:00'].map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="flex items-center gap-2 rounded-xl bg-violet-500/10 p-3 text-xs text-ink-2">
                  <Sparkles className="h-4 w-4 text-violet" /> JIVA AI will confirm the best slot and expected wait on booking.
                </div>
                <Button className="w-full" loading={booking} leftIcon={<CalendarPlus className="h-4 w-4" />} onClick={book}>
                  Confirm booking
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
