import { Response } from 'express';
import { Task } from '../models/task.model';
import { Project } from '../models/project.model';
import { User } from '../models/user.model';
import { redisClient } from '../config/redis.config';
import { CustomRequest } from '../interfaces/custom-request.interface';

// Response interface matching your schema
interface ITaskResponse {
  _id: string;
  title: string;
  description?: string;
  project: string | { _id: string; name: string }; // Basic project info
  assignedTo?: string | { _id: string; username: string; email: string };
  status: 'todo' | 'progress' | 'done';
  priority: 'high' | 'medium' | 'low';
  createdAt: string;
  updatedAt: string;
}

// Helper function to transform task document to response format
const transformTask = (task: any): ITaskResponse => {
  return {
    _id: task._id.toString(),
    title: task.title,
    description: task.description,
    project: task.project?.name 
      ? { _id: task.project._id.toString(), name: task.project.name }
      : task.project.toString(),
    assignedTo: task.assignedTo?.username
      ? {
          _id: task.assignedTo._id.toString(),
          username: task.assignedTo.username,
          email: task.assignedTo.email
        }
      : task.assignedTo?.toString(),
    status: task.status,
    priority: task.priority,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString()
  };
};

/**
 * Create a new task
 */
export const createTask = async (req: CustomRequest, res: Response) => {
  try {
    const { projectId } = req.params;
    const { title, description, assignedTo, priority } = req.body;
    const createdBy = req.user?._id;

    if (!createdBy) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    if (assignedTo) {
      const user = await User.findById(assignedTo);
      if (!user) {
        return res.status(400).json({ success: false, message: 'Assigned user not found' });
      }
    }

    const task = new Task({
      title,
      description,
      project: projectId,
      assignedTo,
      priority: priority || 'medium',
      createdBy
    });

    await task.save();
    await redisClient.del(`tasks:project:${projectId}`);

    const populatedTask = await task.populate([
      { path: 'assignedTo', select: 'username email' },
      { path: 'project', select: 'name' }
    ]);

    res.status(201).json({
      success: true,
      data: transformTask(populatedTask)
    });
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create task',
      error: error instanceof Error ? error.message : error
    });
  }
};

/**
 * Get all tasks for a project
 */
export const getTasks = async (req: CustomRequest, res: Response) => {
  try {
    const { projectId } = req.params;
    const userId = req.user?._id;
    const cacheKey = `tasks:project:${projectId}:user:${userId}`;

    const cachedTasks = await redisClient.get(cacheKey);
    if (cachedTasks) {
      return res.json({
        success: true,
        fromCache: true,
        data: JSON.parse(cachedTasks)
      });
    }

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    const tasks = await Task.find({ project: projectId })
      .populate('assignedTo', 'username email')
      .populate('project', 'name')
      .sort({ priority: -1, createdAt: -1 });

    const response = tasks.map(task => transformTask(task));

    await redisClient.set(cacheKey, JSON.stringify(response), { EX: 1800 });
    
    res.json({
      success: true,
      fromCache: false,
      data: response
    });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch tasks',
      error: error instanceof Error ? error.message : error
    });
  }
};

/**
 * Get single task by ID
 */
export const getTaskById = async (req: CustomRequest, res: Response) => {
  try {
    const { taskId } = req.params;
    
    const task = await Task.findById(taskId)
      .populate('assignedTo', 'username email')
      .populate('project', 'name');
    
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    res.json({
      success: true,
      data: transformTask(task)
    });
  } catch (error) {
    console.error('Error fetching task:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch task',
      error: error instanceof Error ? error.message : error
    });
  }
};

/**
 * Update task
 */
export const updateTask = async (req: CustomRequest, res: Response) => {
  try {
    const { title, description, status, priority, assignedTo } = req.body;
    const { taskId, projectId } = req.params;

    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    if (assignedTo) {
      const user = await User.findById(assignedTo);
      if (!user) {
        return res.status(400).json({ success: false, message: 'Assigned user not found' });
      }
    }

    // Update fields
    if (title) task.title = title;
    if (description) task.description = description;
    if (status) task.status = status;
    if (priority) task.priority = priority;
    if (assignedTo) task.assignedTo = assignedTo;

    const updatedTask = await task.save();
    await redisClient.del(`tasks:project:${projectId}:*`);

    const populatedTask = await updatedTask.populate([
      { path: 'assignedTo', select: 'username email' },
      { path: 'project', select: 'name' }
    ]);

    res.json({
      success: true,
      data: transformTask(populatedTask)
    });
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update task',
      error: error instanceof Error ? error.message : error
    });
  }
};

/**
 * Delete task
 */
export const deleteTask = async (req: CustomRequest, res: Response) => {
  try {
    const { taskId, projectId } = req.params;

    const task = await Task.findByIdAndDelete(taskId);
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    await redisClient.del(`tasks:project:${projectId}:*`);
    res.json({ success: true, message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete task',
      error: error instanceof Error ? error.message : error
    });
  }
};

/**
 * Update task status
 */
export const updateTaskStatus = async (req: CustomRequest, res: Response) => {
  try {
    const { status } = req.body;
    const { taskId, projectId } = req.params;

    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    task.status = status;
    const updatedTask = await task.save();

    await redisClient.del(`tasks:project:${projectId}:*`);
    res.json({ 
      success: true, 
      data: transformTask(updatedTask) 
    });
  } catch (error) {
    console.error('Error updating task status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update task status',
      error: error instanceof Error ? error.message : error
    });
  }
};