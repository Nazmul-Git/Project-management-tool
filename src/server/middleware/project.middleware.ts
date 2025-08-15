import { Request, Response, NextFunction } from 'express';
import { Project } from '../models/project.model';
import {} from '../interfaces/project.interface'
import { User } from '../models/user.model';
import { redisClient } from '../config/redis.config';
import { CustomRequest } from '../interfaces/custom-request.interface';
import mongoose, { mongo, Types } from 'mongoose';

/**
 * Middleware to validate project existence and user access
 */
export const validateProjectAccess = async (
  req: CustomRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { projectId } = req.params;
    const userId = req.user?._id;

    // Check cache first
    const cacheKey = `project:${projectId}:user:${userId}`;
    const cachedAccess = await redisClient.get(cacheKey);
    
    if (cachedAccess === 'true') {
      return next();
    }
    if (cachedAccess === 'false') {
      return res.status(403).json({ message: 'Access denied to project' });
    }

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Check if user is creator or member of the project
    const hasAccess = project.members.includes(new mongoose.Types.ObjectId(userId));

    // Cache the result for 1 hour
    await redisClient.set(cacheKey, hasAccess ? 'true' : 'false', {'EX':3600});

    if (!hasAccess) {
      return res.status(403).json({ message: 'Access denied to project' });
    }

    req.projectDocument = project as any;
    next();
  } catch (error) {
    console.error('Project access validation error:', error);
    res.status(500).json({ message: 'Error validating project access' });
  }
};

/**
 * Middleware to validate project creation permissions
 */
export const validateProjectCreation = (
  req: CustomRequest,
  res: Response,
  next: NextFunction
) => {
  const user = req.user;
  
  // Only admins and managers can create projects
  if (!user || (user.role !== 'admin' && user.role !== 'manager')) {
    return res.status(403).json({ 
      message: 'Only admins and managers can create projects' 
    });
  }

  next();
};

/**
 * Middleware to validate project type
 */
export const validateProjectType = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const validTypes = ['frontend', 'backend', 'ui/ux'];
  const { type } = req.body;

  if (!type || !validTypes.includes(type)) {
    return res.status(400).json({ 
      message: 'Invalid project type. Must be one of: frontend, backend, ui/ux' 
    });
  }

  next();
};

/**
 * Middleware to check if user is project owner
 */
export const validateProjectOwner = async (
  req: CustomRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { projectId } = req.params;
    const userId = req.user?._id;

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    if (project.createdBy.toString() !== userId) {
      return res.status(403).json({ 
        message: 'Only project owner can perform this action' 
      });
    }

    req.projectDocument = project as any;
    next();
  } catch (error) {
    console.error('Project owner validation error:', error);
    res.status(500).json({ message: 'Error validating project ownership' });
  }
};

/**
 * Middleware to validate project member addition
 */
export const validateProjectMember = async (
  req: CustomRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { userId } = req.body;
    const projectId = req.params.projectId;
    const currentUser = req.user;

    // Check if user exists and is a member role
    const userToAdd = await User.findById(userId);
    if (!userToAdd || userToAdd.role !== 'member') {
      return res.status(400).json({ 
        message: 'Invalid user. Only members can be added to projects' 
      });
    }

    // Check if current user has permission to add members
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    if (project.createdBy.toString() !== currentUser?._id && 
        currentUser?.role !== 'admin') {
      return res.status(403).json({ 
        message: 'Only project owner or admin can add members' 
      });
    }

    // Check if user is already a member
    if (project.members.includes(userId)) {
      return res.status(400).json({ 
        message: 'User is already a project member' 
      });
    }

    req.projectDocument = project as any;
    req.userDocument = userToAdd as any;
    next();
  } catch (error) {
    console.error('Project member validation error:', error);
    res.status(500).json({ message: 'Error validating project member' });
  }
};