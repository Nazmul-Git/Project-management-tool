// interfaces/user.interface.ts
import { Document, Types } from 'mongoose';

export type TUserRole = 'admin' | 'manager' | 'member';
export type TProfessionType = 'frontend' | 'backend' | 'ui/ux';

// Base user properties without Mongoose-specific fields
interface IUserBase {
  username: string;
  email: string;
  password: string;
  role: TUserRole;
  professionRoleType?: TProfessionType;
  createdAt: Date;
  updatedAt: Date;
}

// Mongoose document interface
export interface IUser extends IUserBase, Document {
  _id: Types.ObjectId;
  
  // Instance methods
  comparePassword(candidatePassword: string): Promise<boolean>;
  toResponseObject(): IUserResponse;
}

// For API responses (with string IDs and ISO date strings)
export interface IUserResponse {
  _id: string;  // Using 'id' instead of '_id' for frontend consistency
  username: string;
  email: string;
  role: TUserRole;
  professionRoleType?: TProfessionType;
  createdAt: string;
  updatedAt: string;
}

// For lean queries (plain objects)
export interface IUserLean extends Omit<IUserBase, 'password'> {
  _id: Types.ObjectId | string;
  password?: string;  // Optional since we might exclude it
}

// Type for user creation (DTO)
export interface ICreateUserDto {
  username: string;
  email: string;
  password: string;
  role?: TUserRole;  // Optional with default
  professionRoleType?: TProfessionType;
}

// Type for user updates (DTO)
export interface IUpdateUserDto extends Partial<Omit<ICreateUserDto, 'password'>> {
  currentPassword?: string;
  newPassword?: string;
}

// Utility type for authentication response
export interface IAuthResponse {
  user: IUserResponse;
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
}

export interface IUserDocument extends IUserBase, Document {
  _id: Types.ObjectId;
  comparePassword(candidatePassword: string): Promise<boolean>;
  toResponseObject(): IUserResponse;
}

// Type guard for TUserRole
export function isUserRole(role: string): role is TUserRole {
  return ['admin', 'manager', 'member'].includes(role);
}

// Type guard for TProfessionType
export function isProfessionType(type: string): type is TProfessionType {
  return ['frontend', 'backend', 'ui/ux'].includes(type);
}