import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import mainRouter from './routes';
import { errorHandler } from './middleware/error.middleware';
import { notFoundHandler } from './middleware/not-found.middleware';
import { config } from '../config';

const app = express();

// ========================
// Security Middleware
// ========================
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      'script-src': ["'self'", "'unsafe-inline'", 'cdn.jsdelivr.net'],
      'style-src': ["'self'", "'unsafe-inline'", 'cdn.jsdelivr.net'],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

app.use(cors({
  origin: config.corsOrigins,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
}));

// ========================
// Request Processing
// ========================
app.use(express.json({ limit: '10kb', strict: true }));
app.use(express.urlencoded({ extended: true, limit: '10kb', parameterLimit: 10 }));

// Logging
app.use(morgan(config.isProduction ? 'combined' : 'dev', {
  skip: (req) => req.path === '/health'
}));

// ========================
// Routes
// ========================
app.use('/api', mainRouter);

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date() });
});

// Error Handling
app.use(notFoundHandler);
app.use(errorHandler);

export { app };