import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import routes from './routes/index.js';
import { notFound, errorHandler } from './middleware/error.js';

const app = express();

// Security headers.
app.use(helmet());

// CORS - allow the Next.js client.
app.use(
  cors({
    origin: env.clientUrl,
    credentials: true,
  })
);

// Request parsing.
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Logging (skip in test).
if (env.nodeEnv !== 'test') {
  app.use(morgan('dev'));
}

// Trust proxy when deployed behind a reverse proxy.
app.set('trust proxy', 1);

// API routes.
app.use('/api', routes);

// 404 + error handler.
app.use(notFound);
app.use(errorHandler);

export { app };
