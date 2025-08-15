import express from 'express';
import {
  register,
  login,
  logout,
  // refreshToken,
  getCurrentUser
} from '../controllers/auth.controller';
import {
  // validateRegistration,
  // validateLogin,
  authenticate,
  authorize
} from '../middleware/auth.middleware';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/logout', authenticate, logout);
// router.post('/refresh-token', refreshToken);
router.get('/me', authenticate, getCurrentUser);

export default router;