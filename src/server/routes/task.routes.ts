import express from 'express';
import { createTask, getTasks, getTaskById, updateTask } from '../controllers/task.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = express.Router({ mergeParams: true });

router.post('/', authenticate, authorize(['admin', 'manager', 'member']), createTask);
router.get('/', authenticate, getTasks);
router.get('/:taskId', authenticate, getTaskById);
router.patch('/:taskId', authenticate, updateTask);

export default router;