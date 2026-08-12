'use client';

import { useEffect, useState, useCallback } from 'react';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { useSocket } from './useSocket';
import { useAuth } from '@/context/AuthContext';
import { patientApi } from '@/lib/patientApi';
import type { NotificationItem } from '@/types';

/**
 * Patient realtime state: subscribes to Socket.IO for notifications and queue
 * updates, keeps the unread count in sync, and exposes mark-read actions.
 */
export function usePatientRealtime() {
  const { accessToken } = useAuth();
  const socket = useSocket(accessToken, !!accessToken);
  const qc = useQueryClient();

  const [unread, setUnread] = useState(0);
  const [latestNotification, setLatestNotification] = useState<NotificationItem | null>(null);

  // Initial unread from server.
  useQuery({
    queryKey: ['patient', 'notifications'],
    queryFn: async () => {
      const res = await patientApi.listNotifications();
      setUnread(res.data.unread);
      return res.data.notifications;
    },
    enabled: !!accessToken,
  });

  useEffect(() => {
    const s = socket.current;
    if (!s) return;

    const onNotification = (n: NotificationItem) => {
      setUnread((u) => u + 1);
      setLatestNotification(n);
      qc.invalidateQueries({ queryKey: ['patient', 'notifications'] });
    };
    const onQueue = () => qc.invalidateQueries({ queryKey: ['patient', 'queue'] });

    s.on('notification:new', onNotification);
    s.on('queue:update', onQueue);
    s.on('queue:global', onQueue);
    return () => {
      s.off('notification:new', onNotification);
      s.off('queue:update', onQueue);
      s.off('queue:global', onQueue);
    };
  }, [socket, qc]);

  const markRead = useCallback(
    async (id: string) => {
      await patientApi.markNotificationRead(id);
      qc.invalidateQueries({ queryKey: ['patient', 'notifications'] });
      setUnread((u) => Math.max(0, u - 1));
    },
    [qc]
  );

  const markAllRead = useCallback(async () => {
    await patientApi.markAllNotificationsRead();
    qc.invalidateQueries({ queryKey: ['patient', 'notifications'] });
    setUnread(0);
  }, [qc]);

  return { unread, latestNotification, markRead, markAllRead };
}
