'use client';

import { BellRing, CheckCheck, CheckCircle2 } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import { cn } from '@/lib/utils';
import type { NotificationItem } from '@/types';

const typeIcon: Record<string, string> = {
  appointment_confirmed: 'bg-emerald-500/15 text-emerald-500',
  appointment_rescheduled: 'bg-amber-500/15 text-amber-500',
  appointment_cancelled: 'bg-rose-500/15 text-rose-500',
  doctor_arrived: 'bg-primary/15 text-primary',
  doctor_delayed: 'bg-amber-500/15 text-amber-500',
  queue_updated: 'bg-violet-500/15 text-violet',
  video_ready: 'bg-primary/15 text-primary',
  prescription_available: 'bg-emerald-500/15 text-emerald-500',
  emergency_alert: 'bg-rose-500/15 text-rose-500',
  system: 'bg-ink-2/10 text-ink-2',
};

export function NotificationsView() {
  const { unread, notifications, markRead, markAllRead } = useNotifications();

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BellRing className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-bold">Notifications</h2>
          {unread > 0 && (
            <span className="rounded-full bg-danger px-2 py-0.5 text-xs font-bold text-white">{unread} new</span>
          )}
        </div>
        {unread > 0 && (
          <button onClick={markAllRead} className="btn-glass flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm">
            <CheckCheck className="h-4 w-4" /> Mark all read
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="glass p-10 text-center">
          <BellRing className="mx-auto mb-3 h-10 w-10 text-ink-3" />
          <p className="font-semibold">No notifications</p>
          <p className="text-sm text-ink-2">Realtime alerts will appear here.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n: NotificationItem) => (
            <button
              key={n.id}
              onClick={() => !n.read && markRead(n.id)}
              className={cn(
                'flex w-full items-start gap-3 rounded-2xl border p-4 text-left transition-all',
                n.read ? 'border-border bg-card' : 'border-primary/40 bg-primary-soft/50'
              )}
            >
              <span className={cn('mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl', typeIcon[n.type] || typeIcon.system)}>
                <CheckCircle2 className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold">{n.title}</span>
                {n.message && <span className="block text-sm text-ink-2">{n.message}</span>}
                <span className="mt-1 block text-xs text-ink-3">
                  {new Date(n.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                </span>
              </span>
              {!n.read && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
