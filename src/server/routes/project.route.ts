import express from 'express';
import {
  validateProjectCreation,
  validateProjectType,
  validateProjectAccess,
  validateProjectOwner,
  validateProjectMember
} from '../middleware/project.middleware';
import {
  createProject,
  getProjects,
  getProjectById,
  updateProject,
  deleteProject,
  addProjectMember,
  removeProjectMember,
  getProjectMembers
} from '../controllers/project.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = express.Router();

// Apply authentication middleware to all project routes
router.use(authenticate);

/**
 * @route POST /projects
 * @desc Create a new project
 * @access Admin, Manager
 */
router.post(
  '/',
  validateProjectCreation,
  validateProjectType,
  createProject
);

/**
 * @route GET /projects
 * @desc Get all projects (filtered by user role)
 * @access All authenticated users
 */
router.get('/', getProjects);

/**
 * @route GET /projects/:projectId
 * @desc Get a single project by ID
 * @access Project members or admin
 */
router.get('/:projectId', validateProjectAccess, getProjectById);

/**
 * @route PUT /projects/:projectId
 * @desc Update a project
 * @access Project owner or admin
 */
router.put(
  '/:projectId',
  validateProjectAccess,
  validateProjectOwner,
  updateProject
);

/**
 * @route DELETE /projects/:projectId
 * @desc Delete a project
 * @access Project owner or admin
 */
router.delete(
  '/:projectId',
  validateProjectAccess,
  validateProjectOwner,
  deleteProject
);

/**
 * @route GET /projects/:projectId/members
 * @desc Get all project members
 * @access Project members or admin
 */
router.get('/:projectId/members', validateProjectAccess, getProjectMembers);

/**
 * @route POST /projects/:projectId/members
 * @desc Add a member to project
 * @access Project owner or admin
 */
router.post(
  '/:projectId/members',
  validateProjectAccess,
  validateProjectMember,
  addProjectMember
);

/**
 * @route DELETE /projects/:projectId/members/:memberId
 * @desc Remove a member from project
 * @access Project owner or admin
 */
router.delete(
  '/:projectId/members/:memberId',
  validateProjectAccess,
  validateProjectOwner,
  removeProjectMember
);

export default router;