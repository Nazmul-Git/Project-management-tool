import express from 'express';
import authRoutes from './auth.route';
import projectRoutes from './project.route';
import taskRoutes from './task.routes';
import { authenticate } from '../middleware/auth.middleware';
import { rateLimiter } from '../middleware/rate-limiter.middleware';

const router = express.Router({ mergeParams: true });

router.use(rateLimiter);
router.use('/auth', authRoutes);
router.use('/projects', authenticate, projectRoutes);
router.use('/projects/:projectId/tasks', authenticate, taskRoutes);

export default router;