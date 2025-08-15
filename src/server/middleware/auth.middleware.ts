import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/user.model';
import { redisClient } from '../config/redis.config';
import { CustomRequest } from '../interfaces/custom-request.interface';
import { 
  IUser, 
  IUserLean, 
  IUserResponse,
  TUserRole 
} from '../interfaces/user.interface';

/**
 * Authentication middleware with enhanced type safety
 */
export const authenticate = async (
  req: CustomRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.header('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({
        message: 'Authorization header with Bearer token required'
      });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({
        message: 'Authentication token missing'
      });
    }

    // Check token blacklist
    const isBlacklisted = await redisClient.get(`blacklist:${token}`);
    if (isBlacklisted) {
      return res.status(401).json({
        message: 'Session expired. Please login again'
      });
    }

    // Verify and decode token
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      _id: string;
      role: TUserRole;
      iat: number;
      exp: number;
    };

    // Fetch user without sensitive data
    const user = await User.findById(decoded._id)
      .select('-password -__v -refreshToken')
      .lean<IUserLean>();

    if (!user) {
      return res.status(401).json({
        message: 'User account not found'
      });
    }

    // Create response object
    const userResponse: IUserResponse = {
      _id: user._id.toString(),
      username: user.username,
      email: user.email,
      role: user.role,
      ...(user.professionRoleType && { professionRoleType: user.professionRoleType }),
      createdAt: user.createdAt?.toISOString() || new Date().toISOString(),
      updatedAt: user.updatedAt?.toISOString() || new Date().toISOString()
    };

    // Attach to request
    req.user = userResponse;
    req.token = token;
    next();
  } catch (error) {
    console.error('Authentication error:', error);

    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({
        message: 'Session expired. Please login again'
      });
    }
    
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({
        message: 'Invalid authentication token'
      });
    }

    res.status(500).json({
      message: 'Authentication failed',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
};

/**
 * Strictly typed authorization middleware
 */
export const authorize = (allowedRoles: TUserRole[]) => {
  return (req: CustomRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(403).json({
        message: 'Authentication required'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        message: `Insufficient permissions. Required role: ${allowedRoles.join(' or ')}`
      });
    }

    next();
  };
};

/**
 * Secure token generation with refresh token
 */
export const generateAuthTokens = async (user: IUser | IUserLean) => {
  if (!user._id) {
    throw new Error('User ID is required for token generation');
  }

  const accessToken = jwt.sign(
    {
      _id: user._id.toString(),
      role: user.role
    },
    process.env.JWT_SECRET!,
    { expiresIn: '15m' }
  );

  const refreshToken = jwt.sign(
    { _id: user._id.toString() },
    process.env.JWT_REFRESH_SECRET!,
    { expiresIn: '7d' }
  );

  // Store refresh token in Redis
  await redisClient.set(
    `refresh:${user._id}`,
    refreshToken,
    { EX: 7 * 24 * 60 * 60 } 
  );

  return {
    accessToken,
    refreshToken,
    user: {
      _id: user._id.toString(),
      username: user.username,
      email: user.email,
      role: user.role
    }
  };
};

