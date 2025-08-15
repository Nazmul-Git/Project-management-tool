// models/user.model.ts
import mongoose, { Schema, model } from 'mongoose';
import bcrypt from 'bcryptjs';
import { IUser, IUserDocument, IUserResponse } from '../interfaces/user.interface';

const userSchema = new Schema<IUserDocument>({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'manager', 'member'], default: 'member' },
  professionRoleType: { type: String, enum: ['frontend', 'backend', 'ui/ux'] },
}, {
  timestamps: true
});

// Add methods
userSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.toResponseObject = function(): IUserResponse {
  return {
    _id: this._id.toString(),
    username: this.username,
    email: this.email,
    role: this.role,
    ...(this.professionRoleType && { professionRoleType: this.professionRoleType }),
    createdAt: this.createdAt.toISOString(),
    updatedAt: this.updatedAt.toISOString()
  };
};


export const User = mongoose.model<IUser>('users', userSchema);