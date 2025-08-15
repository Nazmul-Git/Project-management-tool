import { Document, Types } from 'mongoose';
import { IUser, IUserLean, IUserResponse } from '../interfaces/user.interface';


export enum ProjectType {
  FRONTEND = 'frontend',
  BACKEND = 'backend',
  UI_UX = 'ui/ux'
}

export enum ProjectStatus {
  ACTIVE = 'active',
  ARCHIVED = 'archived',
  DELETED = 'deleted'
}

// Base interface without Mongoose-specific properties
interface IProjectBase {
  name: string;
  description?: string;
  type: ProjectType;
  status?: ProjectStatus;
  createdAt: Date;
  updatedAt: Date;
}

// Mongoose document interface
export interface IProject extends IProjectBase, Document {
  createdBy: Types.ObjectId | IUser;
  members: Array<Types.ObjectId | IUser>;
}

// For API responses (with string IDs and populated users)
export interface IProjectResponse extends Omit<IProjectBase, 'createdAt' | 'updatedAt'> {
  id: string;
  createdBy: IUserResponse;
  members: IUserResponse[];
  createdAt: string;  // ISO string format
  updatedAt: string;  // ISO string format
}

// For lean queries (plain objects)
export interface IProjectLean extends IProjectBase {
  _id: Types.ObjectId;
  createdBy: Types.ObjectId | IUserLean;
  members: Array<Types.ObjectId | IUserLean>;
}

// Type for fully populated project document
export interface IPopulatedProject extends IProjectBase, Document {
  createdBy: IUser & Document;
  members: Array<IUser & Document>;
}

// Type guard for checking ProjectType
export function isProjectType(type: string): type is ProjectType {
  return Object.values(ProjectType).includes(type as ProjectType);
}

// Type guard for checking ProjectStatus
export function isProjectStatus(status: string): status is ProjectStatus {
  return Object.values(ProjectStatus).includes(status as ProjectStatus);
}

// Utility type for project creation DTO
export interface ICreateProjectDto {
  name: string;
  description?: string;
  type: ProjectType;
  members?: string[]; // Array of user IDs
}

// Utility type for project update DTO
export interface IUpdateProjectDto extends Partial<ICreateProjectDto> {
  status?: ProjectStatus;
}

// Utility type for project with populated members
export type ProjectWithMembers = Omit<IProject, 'members'> & {
  members: IUser[];
};