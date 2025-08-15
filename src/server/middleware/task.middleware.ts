import { Request, Response, NextFunction } from 'express';
import { Task } from '../models/task.model';
import { Project } from '../models/project.model';
import { User } from '../models/user.model';
import { redisClient } from '../config/redis.config';
import { CustomRequest } from '../interfaces/custom-request.interface';
import { Types } from 'mongoose';
import { IProject } from '../interfaces/project.interface';


/**
 * Middleware to validate task existence and user access
 */
export const validateTaskAccess = async (
  req: CustomRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { taskId, projectId } = req.params;
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Check cache first
    const cacheKey = `task:${taskId}:user:${userId}`;
    const cachedAccess = await redisClient.get(cacheKey);

    if (cachedAccess === 'true') return next();
    if (cachedAccess === 'false') {
      return res.status(403).json({ message: 'Access denied to task' });
    }

    const task = await Task.findOne({ _id: taskId, project: projectId })
      .populate<{ project: IProject & { createdBy: Types.ObjectId, members: Types.ObjectId[] } }>(
        'project', 
        'createdBy members'
      );

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Type-safe access check
    const hasAccess = 
      task.project.createdBy.toString() === userId.toString() ||
      task.project.members.some(member => member.toString() === userId.toString());

    // Cache the result for 1 hour
    await redisClient.set(cacheKey, hasAccess ? 'true' : 'false', { 'EX': 3600 });

    if (!hasAccess) {
      return res.status(403).json({ message: 'Access denied to task' });
    }

    req.task = task;
    next();
  } catch (error) {
    console.error('Task access validation error:', error);
    res.status(500).json({ 
      message: 'Error validating task access',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
};

/**
 * Middleware to validate task creation permissions
 */
export const validateTaskCreation = async (
  req: CustomRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { projectId } = req.params;
    const { assignedTo, type } = req.body;
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Check if project exists and user has access
    const project = await Project.findOne({
      _id: projectId,
      $or: [
        { createdBy: userId },
        { members: userId }
      ]
    });

    if (!project) {
      return res.status(404).json({ message: 'Project not found or access denied' });
    }

    // Validate assigned user (if provided)
    if (assignedTo) {
      const user = await User.findById(assignedTo);
      if (!user || user.role !== 'member') {
        return res.status(400).json({
          message: 'Invalid user assignment. Only members can be assigned tasks'
        });
      }

      // Check if assigned user is a project member
      if (!project.members.includes(assignedTo)) {
        return res.status(400).json({
          message: 'Assigned user is not a project member'
        });
      }

      // Check if task type matches user's profession
      if (type && user.professionRoleType && type !== user.professionRoleType) {
        return res.status(400).json({
          message: `Task type must match user's profession (${user.professionRoleType})`
        });
      }
    }

    req.project = project;
    next();
  } catch (error) {
    console.error('Task creation validation error:', error);
    res.status(500).json({ 
      message: 'Error validating task creation',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
};

/**
 * Middleware to validate task priority with enum
 */
export const validateTaskPriority = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { priority } = req.body;

  if (priority && !Object.values(TaskPriority).includes(priority)) {
    return res.status(400).json({
      message: `Invalid task priority. Must be one of: ${Object.values(TaskPriority).join(', ')}`
    });
  }

  next();
};

/**
 * Middleware to validate task status with enum
 */
export const validateTaskStatus = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { status } = req.body;

  if (status && !Object.values(TaskStatus).includes(status)) {
    return res.status(400).json({
      message: `Invalid task status. Must be one of: ${Object.values(TaskStatus).join(', ')}`
    });
  }

  next();
};

/**
 * Middleware to validate task assignment with proper typing
 */
export const validateTaskAssignment = async (
  req: CustomRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { assignedTo } = req.body;
    const task = req.task;
    const userId = req.user?._id;

    if (!assignedTo) return next();
    if (!task || !userId) {
      return res.status(400).json({ message: 'Invalid request' });
    }

    // Get fresh project data with populated members
    const project = await Project.findById(task.project)
      .populate<{ members: IUser[] }>('members', 'role professionRoleType');

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Check if assigner has permission
    const isAdmin = req.user?.role === 'admin';
    const isManager = req.user?.role === 'manager';

    if (!isAdmin && !isManager) {
      return res.status(403).json({
        message: 'Only project managers or admins can assign tasks'
      });
    }

    // Find assigned user with type safety
    const assignedUser = project.members.find(
      member => member._id.toString() === assignedTo
    );

    if (!assignedUser) {
      return res.status(400).json({
        message: 'Assigned user is not a project member'
      });
    }

    if (assignedUser.role !== 'member') {
      return res.status(400).json({
        message: 'Only members can be assigned tasks'
      });
    }

    req.assignedUser = assignedUser;
    next();
  } catch (error) {
    console.error('Task assignment validation error:', error);
    res.status(500).json({ 
      message: 'Error validating task assignment',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};