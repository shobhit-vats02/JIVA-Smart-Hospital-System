'use client';

import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Badge } from '@/components/ui/Badge';

/**
 * Lightweight dashboard home for Milestone 1.
 * Displays the authenticated user from the backend session (real data) and the
 * list of role modules that become fully functional in later milestones.
 */
export function RoleHome({
  greeting,
  modules,
}: {
  greeting: string;
  modules: string[];
}) {
  const { user } = useAuth();

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass glow-border p-8"
      >
        <Badge tone="success" dot className="mb-4">
          Authenticated · {user?.role}
        </Badge>
        <h2 className="text-3xl font-bold">
          {greeting}, <span className="text-gradient">{user?.name}</span>
        </h2>
        <p className="mt-2 text-ink-2">
          Your session is verified against the JIVA backend. Your role-based modules are wired
          into this shell and become fully operational in the upcoming milestones.
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {[
            { label: 'Name', value: user?.name },
            { label: 'Email', value: user?.email },
            { label: 'Role', value: user?.role },
            { label: 'ID', value: user?.id?.slice(0, 8) + '…' },
          ].map((f) => (
            <div key={f.label} className="rounded-xl bg-primary-soft p-3">
              <div className="text-xs text-ink-3">{f.label}</div>
              <div className="truncate text-sm font-medium">{String(f.value)}</div>
            </div>
          ))}
        </div>
      </motion.div>

      <div className="glass p-6">
        <p className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <Sparkles className="h-4 w-4 text-primary" /> Available modules
        </p>
        <div className="flex flex-wrap gap-2">
          {modules.map((m) => (
            <span key={m} className="badge badge-primary">
              {m}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
