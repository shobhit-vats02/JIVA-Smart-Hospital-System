'use client';

import { useEffect, useState, useCallback } from 'react';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { useSocket } from './useSocket';
import { useAuth } from '@/context/AuthContext';
import { notificationApi } from '@/lib/notificationApi';
import type { NotificationItem } from '@/types';

/**
 * Realtime notifications for any role: subscribes to `notification:new` events
 * and exposes unread count + mark-read actions.
 */
export function useNotifications() {
  const { accessToken } = useAuth();
  const socket = useSocket(accessToken, !!accessToken);
  const qc = useQueryClient();

  const [unread, setUnread] = useState(0);

  const { data } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await notificationApi.list();
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
      qc.invalidateQueries({ queryKey: ['notifications'] });
    };
    s.on('notification:new', onNotification);
    return () => {
      s.off('notification:new', onNotification);
    };
  }, [socket, qc]);

  const markRead = useCallback(
    async (id: string) => {
      await notificationApi.markRead(id);
      qc.invalidateQueries({ queryKey: ['notifications'] });
      setUnread((u) => Math.max(0, u - 1));
    },
    [qc]
  );

  const markAllRead = useCallback(async () => {
    await notificationApi.markAllRead();
    qc.invalidateQueries({ queryKey: ['notifications'] });
    setUnread(0);
  }, [qc]);

  return { unread, notifications: data || [], markRead, markAllRead };
}
