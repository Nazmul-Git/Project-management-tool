import cluster from 'cluster';
import os from 'os';
import { app } from './app';
import { config } from '../config';
import { connectDB, disconnectDB } from './config/db/db';
import type { Server } from 'http';

const startServer = async (): Promise<Server> => {
  try {
    // Database connection with retry logic
    await connectDB();
    
    const server = app.listen(config.port, () => {
      console.log(`Server ${process.pid} running in ${config.env} mode on port ${config.port}`);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (err: Error) => {
      console.error('Unhandled Rejection:', err);
      if (server) {
        server.close(() => process.exit(1));
      } else {
        process.exit(1);
      }
    });

    // Graceful shutdown handlers
    const shutdown = async (signal: string) => {
      console.log(`${signal} received. Shutting down gracefully...`);
      
      try {
        await new Promise<void>((resolve, reject) => {
          server.close((err) => {
            if (err) {
              console.error('Error during server close:', err);
              reject(err);
            } else {
              console.log('HTTP server closed');
              resolve();
            }
          });
        });

        await disconnectDB();
        console.log('Database connection closed');
        process.exit(0);
      } catch (err) {
        console.error('Graceful shutdown failed:', err);
        process.exit(1);
      }
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    return server;
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
};

// Cluster mode (production only)
if (config.isProduction && cluster.isPrimary) {
  const numCPUs = Math.min(os.cpus().length, 8); // Limit to 8 CPUs max
  console.log(`Master ${process.pid} is running with ${numCPUs} workers`);

  // Fork workers
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  cluster.on('exit', (worker, code, signal) => {
    const exitMsg = signal ? `by signal ${signal}` : `with code ${code}`;
    console.log(`Worker ${worker.process.pid} died ${exitMsg}. Restarting...`);
    cluster.fork();
  });

  // Handle cluster messages if needed
  cluster.on('message', (worker, message) => {
    console.log(`Message from worker ${worker.process.pid}:`, message);
  });
} else {
  // Worker process or development mode
  startServer().catch(err => {
    console.error('Worker failed to start:', err);
    process.exit(1);
  });
}