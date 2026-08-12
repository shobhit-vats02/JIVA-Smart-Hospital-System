import http from 'http';
import { app } from './app.js';
import { env } from './config/env.js';
import { connectDB } from './config/db.js';
import { initSocket } from './config/socket.js';
import { aiEngine } from './services/ai-engine.service.js';

async function bootstrap() {
  await connectDB();

  const server = http.createServer(app);
  const io = initSocket(server);

  // Expose io on the app for use inside controllers (later milestones).
  app.set('io', io);

  server.listen(env.port, '0.0.0.0', () => {
    console.log(`[JIVA] ${env.appName} backend running on http://localhost:${env.port}`);
    console.log(`[JIVA] CORS origin: ${env.clientUrl}`);
    startAIEngine();
  });

  /**
   * Starts the silent AI engine background loop.
   * Runs a full cycle immediately (seeding analytics) and then every 60s.
   */
  function startAIEngine() {
    aiEngine.runCycle().catch((e) => console.error('[AI] initial cycle failed', e.message));
    const interval = setInterval(() => {
      aiEngine.runCycle().catch((e) => console.error('[AI] cycle failed', e.message));
    }, 60_000);
    // Avoid keeping the process alive purely for the timer during shutdown.
    if (typeof interval.unref === 'function') interval.unref();
    console.log('[AI] JIVA AI Engine started (60s cycle)');
  }

  const shutdown = async (signal) => {
    console.log(`\n[JIVA] Received ${signal}. Shutting down...`);
    server.close(async () => {
      const { disconnectDB } = await import('./config/db.js');
      await disconnectDB();
      process.exit(0);
    });
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

bootstrap().catch((err) => {
  console.error('[JIVA] Failed to start:', err);
  process.exit(1);
});
