import { Request, Response } from 'express';
import { Project } from '../models/project.model';
import { User } from '../models/user.model';
import { IPopulatedProject, IProject, IProjectLean, IProjectResponse, ProjectStatus, ProjectType } from '../interfaces/project.interface';
import { redisClient } from '../config/redis.config';
import { CustomRequest } from '../interfaces/custom-request.interface';
import { Types } from 'mongoose';
import { IUser, IUserResponse } from '../interfaces/user.interface';

/**
 * @swagger
 * /projects/members/{projectId}:
 *   get:
 *     summary: Get all members of a project
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of project members
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/User'
 */
export const getProjectMembers = async (req: CustomRequest, res: Response) => {
  try {
    const project = req.projectDocument;

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    const cacheKey = `project:${project._id}:members`;
    const cachedMembers = await redisClient.get(cacheKey);

    if (cachedMembers) {
      return res.json({
        success: true,
        fromCache: true,
        data: JSON.parse(cachedMembers)
      });
    }

    await project.populate({
      path: 'members',
      select: 'username email role professionRoleType',
    });

    const members = project.members;

    await redisClient.set(cacheKey, JSON.stringify(members), { 'EX': 1800 });

    res.json({
      success: true,
      fromCache: false,
      data: members
    });
  } catch (error) {
    console.error('Error fetching project members:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch project members',
      error: error instanceof Error ? error.message : error
    });
  }
};

/**
 * @swagger
 * /projects:
 *   post:
 *     summary: Create a new project
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Project'
 *     responses:
 *       201:
 *         description: Project created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Project'
 */
export const createProject = async (req: CustomRequest, res: Response) => {
  try {
    const { name, description, type } = req.body;
    const createdBy = req.user?._id;

    const project = new Project({
      name,
      description,
      type,
      createdBy,
      members: [createdBy]
    });

    await project.save();
    await redisClient.del('projects:*');

    res.status(201).json({
      success: true,
      data: toProjectResponse(project)
    });
  } catch (error) {
    console.error('Error creating project:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create project',
      error: error instanceof Error ? error.message : error
    });
  }
};

/**
 * @swagger
 * /projects:
 *   get:
 *     summary: Get all projects
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of projects
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Project'
 */
export const getProjects = async (req: CustomRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    const cacheKey = `projects:user:${userId}`;

    const cachedProjects = await redisClient.get(cacheKey);
    if (cachedProjects) {
      return res.json({
        success: true,
        fromCache: true,
        data: JSON.parse(cachedProjects)
      });
    }

    let query = {};
    if (req.user?.role === 'member') {
      query = { members: userId };
    } else if (req.user?.role === 'manager') {
      query = {
        $or: [
          { createdBy: userId },
          { members: userId }
        ]
      };
    }

    const projects = await Project.find(query)
      .populate('createdBy', 'username email role')
      .populate('members', 'username email role professionRoleType')
      .sort({ createdAt: -1 });

    await redisClient.set(cacheKey, JSON.stringify(projects), { 'EX': 3600 });

    res.json({
      success: true,
      fromCache: false,
      data: projects.map(p => toProjectResponse(p))
    });
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch projects',
      error: error instanceof Error ? error.message : error
    });
  }
};

/**
 * @swagger
 * /projects/{projectId}:
 *   get:
 *     summary: Get project by ID
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Project details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Project'
 */
export const getProjectById = async (req: CustomRequest, res: Response) => {
  try {
    const project = req.projectDocument;

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    await project.populate('createdBy', 'username email role');
    await project.populate('members', 'username email role professionRoleType');

    res.json({
      success: true,
      data: toProjectResponse(project)
    });
  } catch (error) {
    console.error('Error fetching project:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch project',
      error: error instanceof Error ? error.message : error
    });
  }
};

/**
 * @swagger
 * /projects/{projectId}:
 *   put:
 *     summary: Update project
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Project'
 *     responses:
 *       200:
 *         description: Updated project
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Project'
 */
export const updateProject = async (req: CustomRequest, res: Response) => {
  try {
    const { name, description, type, status } = req.body;
    const project = req.projectDocument;

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    project.name = name || project.name;
    project.description = description || project.description;
    project.type = type || project.type;
    if (status) project.status = status;

    const updatedProject = await project.save();

    await redisClient.del(`projects:user:${req.user?._id}`);
    await redisClient.del(`project:${project._id}:*`);

    res.json({
      success: true,
      data: toProjectResponse(updatedProject)
    });
  } catch (error) {
    console.error('Error updating project:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update project',
      error: error instanceof Error ? error.message : error
    });
  }
};

/**
 * @swagger
 * /projects/{projectId}:
 *   delete:
 *     summary: Delete project
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Project deleted successfully
 */
export const deleteProject = async (req: CustomRequest, res: Response) => {
  try {
    const project = req.projectDocument;

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    await project.deleteOne();
    await redisClient.del(`projects:user:${req.user?._id}`);
    await redisClient.del(`project:${project._id}:*`);

    res.json({
      success: true,
      message: 'Project deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete project',
      error: error instanceof Error ? error.message : error
    });
  }
};

/**
 * @swagger
 * /projects/{projectId}/members:
 *   post:
 *     summary: Add member to project
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Member added successfully
 */
export const addProjectMember = async (req: CustomRequest, res: Response) => {
  try {
    const project = req.projectDocument;
    const userToAdd = req.userToAdd;

    if (!project || !userToAdd) {
      return res.status(400).json({
        success: false,
        message: 'Invalid project or user'
      });
    }

    const userToAddId = new Types.ObjectId(userToAdd._id);
    const isMemberExists = project.members.some(member =>
      member instanceof Types.ObjectId
        ? member.equals(userToAddId)
        : member._id.equals(userToAddId)
    );

    if (!isMemberExists) {
      project.members.push(userToAddId);
      await project.save();
    }

    await redisClient.del(`projects:user:${req.user?._id}`);
    await redisClient.del(`project:${project._id}:*`);
    await redisClient.del(`projects:user:${userToAdd._id}`);

    res.json({
      success: true,
      message: 'Member added successfully',
      data: toProjectResponse(project)
    });
  } catch (error) {
    console.error('Error adding project member:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add member to project',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * @swagger
 * /projects/{projectId}/members/{memberId}:
 *   delete:
 *     summary: Remove member from project
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: memberId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Member removed successfully
 */
export const removeProjectMember = async (req: CustomRequest, res: Response) => {
  try {
    const project = req.projectDocument;
    const { memberId } = req.params;

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    project.members = project.members.filter(
      member => member.toString() !== memberId
    );

    await project.save();
    await redisClient.del(`projects:user:${req.user?._id}`);
    await redisClient.del(`project:${project._id}:*`);
    await redisClient.del(`projects:user:${memberId}`);

    res.json({
      success: true,
      message: 'Member removed successfully',
      data: toProjectResponse(project)
    });
  } catch (error) {
    console.error('Error removing project member:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove member from project',
      error: error instanceof Error ? error.message : error
    });
  }
};

// Helper function to convert Mongoose document to response format
function toProjectResponse(project: any): IProjectResponse {
  const toUserResponse = (user: Types.ObjectId | IUser): IUserResponse => {
    if (user instanceof Types.ObjectId) {
      return {
        _id: user.toString(),
        username: '',
        email: '',
        role: 'member',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    }
    
    return {
      _id: user._id.toString(),
      username: user.username,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString()
    };
  };

  return {
    id: project._id.toString(),
    name: project.name,
    description: project.description || '',
    type: project.type,
    status: project.status || ProjectStatus.ACTIVE,
    createdBy: toUserResponse(project.createdBy),
    members: project.members.map((m: any) => toUserResponse(m)),
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString()
  };
}