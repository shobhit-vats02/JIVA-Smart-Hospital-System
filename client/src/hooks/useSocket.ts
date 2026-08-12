'use client';

import { useEffect, useRef } from 'react';
import { io, type Socket } from 'socket.io-client';

/**
 * Establishes a Socket.IO connection to the backend.
 * In Milestone 1 this wires the connection + confirms the realtime link.
 * Later milestones subscribe to queue/presence/appointment events.
 */
export function useSocket(accessToken: string | null, enabled = true) {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const url = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    const socket = io(url, {
      auth: { token: accessToken },
      transports: ['websocket', 'polling'],
    });
    socketRef.current = socket;
    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [accessToken, enabled]);

  return socketRef;
}
