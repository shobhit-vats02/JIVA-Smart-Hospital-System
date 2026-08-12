'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, Pencil, Trash2, X } from 'lucide-react';
import { adminApi } from '@/lib/adminApi';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { PageLoader } from '@/components/ui/Spinner';
import type { PatientAdmin } from '@/types';

const emptyForm = { name: '', email: '', phone: '', age: '', gender: 'other', bloodGroup: '', address: '' };

export function PatientsAdmin() {
  const toast = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<null | { editing?: PatientAdmin }>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);

  const { data: patients, isLoading } = useQuery({
    queryKey: ['admin', 'patients', search],
    queryFn: async () => (await adminApi.listPatients(search)).data,
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (modal?.editing) {
        await adminApi.updatePatient(modal.editing.id, form);
        toast('success', 'Patient updated');
      } else {
        await adminApi.createPatient(form);
        toast('success', 'Patient created');
      }
      qc.invalidateQueries({ queryKey: ['admin', 'patients'] });
      setModal(null);
    } catch (err) {
      toast('error', 'Save failed', err instanceof Error ? err.message : 'Try again.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (p: PatientAdmin) => {
    if (!confirm(`Delete patient ${p.name}?`)) return;
    await adminApi.deletePatient(p.id);
    toast('success', 'Patient deleted');
    qc.invalidateQueries({ queryKey: ['admin', 'patients'] });
  };

  const openEdit = (p: PatientAdmin) => {
    setForm({ name: p.name, email: p.email, phone: p.phone, age: String(p.age || ''), gender: p.gender || 'other', bloodGroup: p.bloodGroup || '', address: p.address || '' });
    setModal({ editing: p });
  };

  if (isLoading) return <PageLoader label="Loading patients" />;

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold">Patients</h2>
        <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => { setForm({ ...emptyForm }); setModal({}); }}>Create patient</Button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, email, phone…" className="input pl-10" />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-ink-3">
              <th className="pb-3 pr-3">Patient</th>
              <th className="pb-3 pr-3">Phone</th>
              <th className="pb-3 pr-3">Age</th>
              <th className="pb-3 pr-3">Blood</th>
              <th className="pb-3 pr-3">Status</th>
              <th className="pb-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {(patients || []).map((p) => (
              <tr key={p.id} className="border-t border-border">
                <td className="py-3 pr-3">
                  <p className="font-semibold">{p.name}</p>
                  <p className="text-xs text-ink-3">{p.email}</p>
                </td>
                <td className="py-3 pr-3">{p.phone}</td>
                <td className="py-3 pr-3">{p.age || '—'}</td>
                <td className="py-3 pr-3">{p.bloodGroup || '—'}</td>
                <td className="py-3 pr-3">
                  <Badge tone={p.isActive ? 'success' : 'danger'} dot>{p.isActive ? 'Active' : 'Disabled'}</Badge>
                </td>
                <td className="py-3">
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(p)} className="rounded-lg p-2 text-ink-2 hover:bg-primary-soft hover:text-primary" aria-label="Edit"><Pencil className="h-4 w-4" /></button>
                    <button onClick={() => remove(p)} className="rounded-lg p-2 text-ink-2 hover:bg-danger/10 hover:text-danger" aria-label="Delete"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
            {!patients?.length && <tr><td colSpan={6} className="py-10 text-center text-ink-3">No patients found.</td></tr>}
          </tbody>
        </table>
      </div>

      <AnimatePresence>
        {modal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onClick={(e) => e.target === e.currentTarget && setModal(null)}>
            <motion.div initial={{ scale: 0.94 }} animate={{ scale: 1 }} exit={{ scale: 0.94 }} className="glass max-h-[90vh] w-full max-w-lg overflow-y-auto p-6 shadow-glass-lg">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-bold">{modal.editing ? `Edit ${modal.editing.name}` : 'Create patient'}</h3>
                <button onClick={() => setModal(null)} className="rounded-lg p-2 text-ink-3 hover:bg-primary-soft"><X className="h-5 w-5" /></button>
              </div>
              <form onSubmit={submit} className="grid grid-cols-2 gap-3">
                <Input label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
                <Input label="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
                <Input label="Age" type="number" value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} />
                <div className="w-full">
                  <label className="mb-1.5 block text-sm font-medium text-ink-2">Gender</label>
                  <select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })} className="input">
                    <option value="male">Male</option><option value="female">Female</option><option value="other">Other</option>
                  </select>
                </div>
                <Input label="Blood group" value={form.bloodGroup} onChange={(e) => setForm({ ...form, bloodGroup: e.target.value })} />
                <div className="col-span-2">
                  <Input label="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
                </div>
                <div className="col-span-2">
                  <Button type="submit" loading={saving} className="w-full">{modal.editing ? 'Save changes' : 'Create patient'}</Button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
