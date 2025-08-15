import mongoose, { Document, Schema } from 'mongoose';
import { IUser } from '../interfaces/user.interface';

export interface IProject extends Document {
  name: string;
  description: string;
  type: 'frontend' | 'backend' | 'ui/ux';
  createdBy: IUser['_id'];
  members: IUser['_id'][];
  createdAt: Date;
  updatedAt: Date;
}

const projectSchema = new Schema<IProject>({
  name: { type: String, required: true },
  description: { type: String },
  type: { type: String, enum: ['frontend', 'backend', 'ui/ux'], required: true },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  members: [{ type: Schema.Types.ObjectId, ref: 'User' }]
}, { timestamps: true });

export const Project = mongoose.model<IProject>('projects', projectSchema);