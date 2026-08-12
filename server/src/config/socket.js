import { Server } from 'socket.io';
import { env } from './env.js';
import { registerIO } from './realtime.js';
import { verifyAccessToken } from '../utils/jwt.js';

/**
 * Configures Socket.IO attached to the HTTP server.
 *   - default namespace `/`  : queue, presence, notifications, alerts.
 *   - `/video`               : video consultation signaling.
 *
 * Sockets are authenticated with the JWT access token from `auth.token` and
 * automatically joined to their role room (`patient:<id>`, `doctor:<id>`, ...)
 * so services can push targeted realtime events.
 */
export function initSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: env.clientUrl,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 60000,
  });

  // Auth middleware: attach user identity + join role room.
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('auth required'));
    try {
      const payload = verifyAccessToken(token);
      socket.data.role = payload.role;
      socket.data.id = payload.sub;
      socket.data.userId = payload.sub;
      return next();
    } catch (e) {
      return next(new Error('invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const role = socket.data.role;
    const id = socket.data.id;
    socket.emit('jiva:connected', { sid: socket.id, message: 'Connected to JIVA realtime service' });

    // Join role room + a generic room for the user.
    if (role && id) {
      socket.join(`${role}:${id}`);
      socket.join(`user:${id}`);
    }

    // Subscribe to a doctor's live queue (patient watching their doctor).
    socket.on('queue:subscribe', ({ doctorId }) => {
      if (doctorId) socket.join(`doctor:${doctorId}`);
    });
    socket.on('queue:unsubscribe', ({ doctorId }) => {
      if (doctorId) socket.leave(`doctor:${doctorId}`);
    });

    socket.on('disconnect', () => {
      // Socket.IO cleans rooms automatically.
    });
  });

  // --- Video consultation namespace ---
  const videoIo = io.of('/video');
  videoIo.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('auth required'));
    try {
      const payload = verifyAccessToken(token);
      socket.data.role = payload.role;
      socket.data.id = payload.sub;
      return next();
    } catch (e) {
      return next(new Error('invalid token'));
    }
  });
  videoIo.on('connection', (socket) => {
    // Join a specific session room.
    socket.on('video:join', ({ sessionId }) => {
      if (sessionId) socket.join(`video:${sessionId}`);
      socket.emit('video:joined', { sessionId });
    });

    // WebRTC signaling passthrough (prototype).
    socket.on('video:signal', (payload) => {
      socket.to(`video:${payload.sessionId}`).emit('video:signal', payload);
    });

    // Simple chat message relay.
    socket.on('video:chat', (payload) => {
      socket.to(`video:${payload.sessionId}`).emit('video:chat', {
        from: socket.data.role,
        text: payload.text,
        at: new Date().toISOString(),
      });
    });
  });

  registerIO(io);
  return io;
}

export { Server };
