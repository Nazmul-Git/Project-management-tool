import { Request, Response } from 'express';
import jwt, { JwtPayload, Secret } from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { User } from '../models/user.model';
import { generateAuthTokens } from '../middleware/auth.middleware';
import { redisClient } from '../config/redis.config';
import { CustomRequest } from '../interfaces/custom-request.interface';
import { IUser, IUserResponse, TUserRole, TProfessionType, IUserDocument } from '../interfaces/user.interface';
import { config } from '../config/config';

// Helper function to convert between user types
const toUserResponse = (user: IUser | (IUser & Document)): IUserResponse => {
  const userObj = user instanceof Document ? user.toObject() : user;
  return {
    _id: userObj._id.toString(),
    username: userObj.username,
    email: userObj.email,
    role: userObj.role,
    professionRoleType: userObj.professionRoleType,
    createdAt: userObj.createdAt.toISOString(),
    updatedAt: userObj.updatedAt.toISOString()
  };
};

export const register = async (req: Request, res: Response) => {
  try {
    const { username, email, password, role = 'member', professionRoleType } = req.body;

    // Validate required fields
    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username, email and password are required'
      });
    }

    // Validate role
    const validRoles: TUserRole[] = ['admin', 'manager', 'member'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user role'
      });
    }

    // Validate profession type for members
    if (role === 'member' && professionRoleType) {
      const validProfessions: TProfessionType[] = ['frontend', 'backend', 'ui/ux'];
      if (!validProfessions.includes(professionRoleType)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid profession type'
        });
      }
    }

    // Check if user exists
    const existingUser: (IUser & Document) | null = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'User already exists'
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user: IUserDocument = new User({
      username,
      email,
      password: hashedPassword,
      role,
      ...(role === 'member' && { professionRoleType })
    });

    await user.save();

    // Generate tokens
    const { accessToken, refreshToken } = await generateAuthTokens(user);

    // Cache user data
    await redisClient.set(`user:${user._id}`, JSON.stringify(toUserResponse(user)), {
      EX: config.redis.ttl.user
    });

    res.status(201).json({
      success: true,
      data: {
        user: toUserResponse(user),
        tokens: { accessToken, refreshToken }
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to register user',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    // Find user by email with password
    const user: (IUser & Document) | null = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Generate tokens
    const { accessToken, refreshToken } = await generateAuthTokens(user);

    // Update user cache
    await redisClient.set(`user:${user._id}`, JSON.stringify(toUserResponse(user)), {
      EX: config.redis.ttl.user
    });

    res.json({
      success: true,
      data: {
        user: toUserResponse(user),
        tokens: { accessToken, refreshToken }
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to login',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const logout = async (req: CustomRequest, res: Response) => {
  try {
    const { token, user } = req;

    if (!token || !user) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated'
      });
    }

    // Add token to blacklist
    const decoded = jwt.decode(token) as { exp: number };
    const expiresIn = decoded.exp - Math.floor(Date.now() / 1000);

    if (expiresIn > 0) {
      await redisClient.set(
        `blacklist:${token}`,
        'logged out',
        { EX: expiresIn }
      );
    }

    // Delete refresh token and cached user data
    await Promise.all([
      redisClient.del(`refresh:${user._id}`),
      redisClient.del(`user:${user._id}`)
    ]);

    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to logout',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};


export const getCurrentUser = async (req: CustomRequest, res: Response) => {
  try {
    const user = req.user as IUserResponse;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated'
      });
    }

    // Try to get from cache first
    const cachedUser = await redisClient.get(`user:${user._id}`);
    if (cachedUser) {
      return res.json({
        success: true,
        data: JSON.parse(cachedUser) as IUserResponse
      });
    }

    // If not in cache, get from database
    const dbUser: (IUser & Document) | null = await User.findById(user._id);
    if (!dbUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Cache the user data
    const userResponse = toUserResponse(dbUser);
    await redisClient.set(`user:${user._id}`, JSON.stringify(userResponse), {
      EX: config.redis.ttl.user
    });

    res.json({
      success: true,
      data: userResponse
    });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get current user',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};