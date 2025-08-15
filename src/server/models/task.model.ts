import mongoose, { Document, Schema } from 'mongoose';
import { IProject } from './project.model';
import { IUser } from '../interfaces/user.interface';

export interface ITask extends Document {
  title: string;
  description: string;
  project: IProject['_id'];
  assignedTo: IUser['_id'];
  status: 'todo' | 'progress' | 'done';
  priority: 'high' | 'medium' | 'low';
  createdAt: Date;
  updatedAt: Date;
}

const taskSchema = new Schema<ITask>({
  title: { type: String, required: true },
  description: { type: String },
  project: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
  assignedTo: { type: Schema.Types.ObjectId, ref: 'User' },
  status: { type: String, enum: ['todo', 'progress', 'done'], default: 'todo' },
  priority: { type: String, enum: ['high', 'medium', 'low'], default: 'medium' }
}, { timestamps: true });

export const Task = mongoose.model<ITask>('tasks', taskSchema);