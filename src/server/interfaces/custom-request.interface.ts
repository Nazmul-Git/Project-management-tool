import { Request } from 'express';
import { Document } from 'mongoose';
import { 
  IUser, 
  IUserResponse,
  IUserLean
} from '../interfaces/user.interface';
import { 
  IProject, 
  IProjectResponse,
  IProjectLean
} from '../interfaces/project.interface';
import { 
  ITask, 
  ITaskResponse,
  ITaskLean
} from '../interfaces/task.interface';

/**
 * Extended Express Request types with our custom properties
 */
declare global {
  namespace Express {
    interface Request {
      // Authentication
      user?: IUserResponse;
      userDocument?: IUser & Document;
      token?: string;
      jwtPayload?: {
        userId: string;
        role: string;
        iat: number;
        exp: number;
      };

      // Projects
      project?: IProjectResponse;
      projectDocument?: IProject & Document;
      projectLean?: IProjectLean;
      userToAdd?: IUserResponse;

      // Tasks
      task?: ITaskResponse;
      taskDocument?: ITask & Document;
      taskLean?: ITaskLean;
      assignedUser?: IUserResponse;

      // Context
      context?: {
        requestId: string;
        ipAddress: string;
        userAgent: string;
      };

      // Pagination
      pagination?: {
        page: number;
        limit: number;
        total: number;
      };
    }
  }
}

/**
 * Project with fully populated relations
 */
export type PopulatedProject = IProject & Document & {
  createdBy: IUser & Document;
  members: (IUser & Document)[];
};

/**
 * Task with fully populated relations
 */
export type PopulatedTask = ITask & Document & {
  project: PopulatedProject;
  assignedTo: IUser & Document;
  createdBy: IUser & Document;
};

/**
 * Lean task with populated relations
 */
export type LeanTaskWithRelations = ITaskLean & {
  project: IProjectLean;
  assignedTo: IUserLean;
  createdBy: IUserLean;
};

export interface CustomRequest extends Request {}
// Note: Removed the redundant CustomRequest interface since it's already 
// included in the global Express namespace extension