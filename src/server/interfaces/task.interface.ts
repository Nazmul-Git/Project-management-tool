import { Document, Schema, Types, model } from 'mongoose';
import { IProject, IProjectLean, IProjectResponse } from '../interfaces/project.interface';
import { IUser, IUserLean, IUserResponse } from '../interfaces/user.interface';

export enum TaskStatus {
  TODO = 'todo',
  IN_PROGRESS = 'progress',
  DONE = 'done'
}

export enum TaskPriority {
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low'
}

// Base interface for common task properties
export interface ITaskBase {
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: Date;
  estimatedHours?: number;
  actualHours?: number;
}

// Request-specific interfaces
export interface ITaskCreateRequest {
  title: string;
  description?: string;
  assignedTo?: string; // User ID as string
  priority?: TaskPriority; // Optional in request (default to MEDIUM)
  dueDate?: string | Date; // Allow string or Date in request
  estimatedHours?: number;
  // actualHours should not be in create request as it's for tracking progress
}

export interface ITaskUpdateRequest extends Partial<ITaskCreateRequest> {
  status?: TaskStatus;
  actualHours?: number; // Allow updating actual hours
}

// Mongoose document interface
export interface ITask extends ITaskBase, Document {
  _id: Types.ObjectId;
  project: Types.ObjectId | IProject;
  assignedTo?: Types.ObjectId | IUser;
  createdBy?: Types.ObjectId | IUser;
  lastUpdatedBy?: Types.ObjectId | IUser;
  createdAt: Date;
  updatedAt: Date;
}

// API response interface
export interface ITaskResponse extends Omit<ITaskBase, 'dueDate'> {
  _id: string;
  project: IProjectResponse | string;
  assignedTo?: IUserResponse | string;
  createdBy?: IUserResponse | string;
  lastUpdatedBy?: IUserResponse | string;
  createdAt: string;
  updatedAt: string;
  dueDate?: string; // Stringified date in response
}

// For database queries (plain objects)
export interface ITaskLean extends ITaskBase {
  _id: Types.ObjectId;
  project: Types.ObjectId | IProjectLean;
  assignedTo?: Types.ObjectId | IUserLean;
  createdBy?: Types.ObjectId | IUserLean;
  lastUpdatedBy?: Types.ObjectId | IUserLean;
  createdAt?: Date;
  updatedAt?: Date;
}