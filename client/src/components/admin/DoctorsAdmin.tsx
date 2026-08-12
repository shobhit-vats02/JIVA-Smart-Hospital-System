'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, Pencil, Trash2, Eye, X, Stethoscope, Clock, ScanFace } from 'lucide-react';
import { adminApi } from '@/lib/adminApi';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { PageLoader } from '@/components/ui/Spinner';
import type { Department, DoctorAdmin } from '@/types';

const emptyForm = {
  name: '', staffId: '', email: '', phone: '', specialty: '', qualification: '',
  yearsOfExperience: 0, avgConsultationMinutes: 12, rfidTag: '', departmentId: '',
};

export function DoctorsAdmin() {
  const toast = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [modal, setModal] = useState<null | { editing?: DoctorAdmin }>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [detail, setDetail] = useState<DoctorAdmin | null>(null);

  const { data: doctors, isLoading } = useQuery({
    queryKey: ['admin', 'doctors', search, status],
    queryFn: async () => (await adminApi.listDoctors({ search, status })).data,
  });
  const { data: deptsData } = useQuery({
    queryKey: ['admin', 'departments'],
    queryFn: async () => (await adminApi.listDepartments()).data,
  });
  const depts = deptsData || [];

  const { data: detailData } = useQuery({
    queryKey: ['admin', 'doctor-detail', detail?.id],
    queryFn: async () => (await adminApi.getDoctorDetail(detail!.id)).data,
    enabled: !!detail?.id,
  });

  const openCreate = () => {
    setForm({ ...emptyForm, departmentId: depts[0]?.id || '' });
    setModal({});
  };
  const openEdit = (d: DoctorAdmin) => {
    setForm({
      name: d.name, staffId: d.staffId, email: d.email, phone: d.phone || '',
      specialty: d.specialty || '', qualification: d.qualification || '',
      yearsOfExperience: d.yearsOfExperience || 0, avgConsultationMinutes: d.avgConsultationMinutes || 12,
      rfidTag: d.rfidTag || '', departmentId: d.department && typeof d.department === 'object' ? d.department.id : '',
    });
    setModal({ editing: d });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (modal?.editing) {
        await adminApi.updateDoctor(modal.editing.id, form);
        toast('success', 'Doctor updated');
      } else {
        await adminApi.createDoctor(form);
        toast('success', 'Doctor created');
      }
      qc.invalidateQueries({ queryKey: ['admin', 'doctors'] });
      setModal(null);
    } catch (err) {
      toast('error', 'Save failed', err instanceof Error ? err.message : 'Try again.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (d: DoctorAdmin) => {
    if (!confirm(`Delete ${d.name}?`)) return;
    await adminApi.deleteDoctor(d.id);
    toast('success', 'Doctor deleted');
    qc.invalidateQueries({ queryKey: ['admin', 'doctors'] });
  };

  const toggleActive = async (d: DoctorAdmin) => {
    await adminApi.updateDoctor(d.id, { isActive: !d.isActive });
    toast('success', d.isActive ? 'Doctor deactivated' : 'Doctor activated');
    qc.invalidateQueries({ queryKey: ['admin', 'doctors'] });
  };

  if (isLoading) return <PageLoader label="Loading doctors" />;

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold">Doctors</h2>
        <Button leftIcon={<Plus className="h-4 w-4" />} onClick={openCreate}>Create doctor</Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, ID, specialty…" className="input pl-10" />
        </div>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="input w-auto">
          <option value="">All status</option>
          <option value="online">Online</option>
          <option value="offline">Offline</option>
        </select>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-ink-3">
              <th className="pb-3 pr-3">Doctor</th>
              <th className="pb-3 pr-3">Staff ID</th>
              <th className="pb-3 pr-3">Department</th>
              <th className="pb-3 pr-3">Status</th>
              <th className="pb-3 pr-3">Avg consult</th>
              <th className="pb-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {(doctors || []).map((d) => (
              <tr key={d.id} className="border-t border-border">
                <td className="py-3 pr-3">
                  <div className="flex items-center gap-2">
                    <span className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-primary to-royal text-xs font-bold text-white">
                      {d.name.replace('Dr. ', '').split(' ').map((w) => w[0]).slice(0, 2).join('')}
                    </span>
                    <div>
                      <p className="font-semibold">{d.name}</p>
                      <p className="text-xs text-ink-3">{d.specialty}</p>
                    </div>
                  </div>
                </td>
                <td className="py-3 pr-3 font-mono text-xs">{d.staffId}</td>
                <td className="py-3 pr-3">{d.department && typeof d.department === 'object' ? d.department.name : '—'}</td>
                <td className="py-3 pr-3">
                  <Badge tone={d.isPresent ? 'success' : d.isAvailable ? 'warning' : 'neutral'} dot>
                    {d.isPresent ? 'Online' : d.isAvailable ? 'Available' : 'Offline'}
                  </Badge>
                </td>
                <td className="py-3 pr-3">{d.avgConsultationMinutes}m</td>
                <td className="py-3">
                  <div className="flex gap-1">
                    <button onClick={() => setDetail(d)} className="rounded-lg p-2 text-ink-2 hover:bg-primary-soft hover:text-primary" aria-label="View"><Eye className="h-4 w-4" /></button>
                    <button onClick={() => openEdit(d)} className="rounded-lg p-2 text-ink-2 hover:bg-primary-soft hover:text-primary" aria-label="Edit"><Pencil className="h-4 w-4" /></button>
                    <button onClick={() => toggleActive(d)} className="rounded-lg p-2 text-ink-2 hover:bg-primary-soft hover:text-primary" aria-label="Toggle active"><Clock className="h-4 w-4" /></button>
                    <button onClick={() => remove(d)} className="rounded-lg p-2 text-ink-2 hover:bg-danger/10 hover:text-danger" aria-label="Delete"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
            {!doctors?.length && (
              <tr><td colSpan={6} className="py-10 text-center text-ink-3">No doctors found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Detail modal */}
      <AnimatePresence>
        {detail && (
          <Modal onClose={() => setDetail(null)} title={detail.name}>
            {detailData && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <Detail label="Staff ID" value={detailData.doctor.staffId} />
                  <Detail label="Specialty" value={detailData.doctor.specialty || '—'} />
                  <Detail label="Experience" value={`${detailData.doctor.yearsOfExperience} years`} />
                  <Detail label="Avg consult" value={`${detailData.doctor.avgConsultationMinutes} min`} />
                </div>
                <div>
                  <p className="mb-2 flex items-center gap-2 text-sm font-semibold"><ScanFace className="h-4 w-4 text-primary" /> Presence logs</p>
                  {detailData.presenceLogs.length ? (
                    <div className="space-y-2">
                      {detailData.presenceLogs.slice(0, 5).map((l: unknown) => {
                        const lg = l as { aiConfidence: number; activated: boolean; createdAt: string };
                        return (
                          <div key={(l as { id: string }).id} className="flex items-center justify-between rounded-xl bg-primary-soft/40 px-3 py-2 text-sm">
                            <span>{new Date(lg.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                            <Badge tone={lg.activated ? 'success' : 'warning'}>{lg.aiConfidence}%</Badge>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-ink-3">No presence logs yet.</p>
                  )}
                </div>
              </div>
            )}
          </Modal>
        )}
      </AnimatePresence>

      {/* Create/Edit modal */}
      <AnimatePresence>
        {modal && (
          <Modal onClose={() => setModal(null)} title={modal.editing ? `Edit ${modal.editing.name}` : 'Create doctor'}>
            <form onSubmit={submit} className="grid grid-cols-2 gap-3">
              <Input label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              <Input label="Staff ID" value={form.staffId} onChange={(e) => setForm({ ...form, staffId: e.target.value })} required placeholder="DOC2001" />
              <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
              <Input label="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              <Input label="Specialty" value={form.specialty} onChange={(e) => setForm({ ...form, specialty: e.target.value })} />
              <Input label="Qualification" value={form.qualification} onChange={(e) => setForm({ ...form, qualification: e.target.value })} />
              <Input label="Years experience" type="number" value={form.yearsOfExperience} onChange={(e) => setForm({ ...form, yearsOfExperience: Number(e.target.value) })} />
              <Input label="Avg consult (min)" type="number" value={form.avgConsultationMinutes} onChange={(e) => setForm({ ...form, avgConsultationMinutes: Number(e.target.value) })} />
              <Input label="RFID tag" value={form.rfidTag} onChange={(e) => setForm({ ...form, rfidTag: e.target.value })} />
              <div className="w-full">
                <label className="mb-1.5 block text-sm font-medium text-ink-2">Department</label>
                <select value={form.departmentId} onChange={(e) => setForm({ ...form, departmentId: e.target.value })} className="input">
                  {depts.map((d: Department) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <Button type="submit" loading={saving} className="w-full">{modal.editing ? 'Save changes' : 'Create doctor'}</Button>
              </div>
            </form>
          </Modal>
        )}
      </AnimatePresence>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-primary-soft/40 p-3">
      <div className="text-xs text-ink-3">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );
}

function Modal({ onClose, title, children }: { onClose: () => void; title: string; children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.94, y: 10 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.94, y: 10 }}
        className="glass max-h-[90vh] w-full max-w-lg overflow-y-auto p-6 shadow-glass-lg"
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold">{title}</h3>
          <button onClick={onClose} className="rounded-lg p-2 text-ink-3 hover:bg-primary-soft"><X className="h-5 w-5" /></button>
        </div>
        {children}
      </motion.div>
    </motion.div>
  );
}
