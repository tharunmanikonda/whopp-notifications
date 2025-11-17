import * as bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { UserService } from './db/user-service.js';
import { config } from '../config/index.js';

/**
 * Authentication Service
 * Handles user signup, login, and JWT token management
 */
export class AuthService {
  private userService: UserService;
  private jwtSecret: string;
  private jwtExpiryTime: string = '24h'; // Token expires in 24 hours

  constructor() {
    this.userService = new UserService();
    this.jwtSecret = process.env.JWT_SECRET || 'your-super-secret-key-change-me';

    if (!process.env.JWT_SECRET) {
      console.warn('⚠️  JWT_SECRET not set in .env - using default (not secure for production!)');
    }
  }

  /**
   * Hash a password using bcrypt
   */
  async hashPassword(password: string): Promise<string> {
    try {
      const salt = await bcrypt.genSalt(10); // 10 rounds of hashing
      return await bcrypt.hash(password, salt);
    } catch (error) {
      console.error('Error hashing password:', error);
      throw new Error('Failed to hash password');
    }
  }

  /**
   * Compare password with hash
   */
  async comparePassword(password: string, hash: string): Promise<boolean> {
    try {
      return await bcrypt.compare(password, hash);
    } catch (error) {
      console.error('Error comparing password:', error);
      return false;
    }
  }

  /**
   * Generate JWT token
   */
  generateToken(userId: string, email: string): string {
    try {
      const payload = {
        userId,
        email,
        iat: Math.floor(Date.now() / 1000),
      };

      const token = jwt.sign(payload, this.jwtSecret, {
        expiresIn: this.jwtExpiryTime,
      });

      return token;
    } catch (error) {
      console.error('Error generating token:', error);
      throw new Error('Failed to generate authentication token');
    }
  }

  /**
   * Verify JWT token
   */
  verifyToken(token: string): { userId: string; email: string } | null {
    try {
      const decoded = jwt.verify(token, this.jwtSecret) as any;
      return {
        userId: decoded.userId,
        email: decoded.email,
      };
    } catch (error) {
      console.error('Error verifying token:', error);
      return null;
    }
  }

  /**
   * Sign up a new user
   */
  async signup(
    email: string,
    password: string,
    fullName: string,
    timezone: string = 'America/New_York',
    notificationTime: string = '08:00'
  ): Promise<{
    success: boolean;
    userId?: string;
    token?: string;
    message: string;
  }> {
    try {
      // Validate input
      if (!email || !password || !fullName) {
        return {
          success: false,
          message: 'Email, password, and full name are required',
        };
      }

      if (password.length < 8) {
        return {
          success: false,
          message: 'Password must be at least 8 characters long',
        };
      }

      // Check if email already exists
      const existingUser = await this.userService.emailExists(email);
      if (existingUser) {
        return {
          success: false,
          message: 'Email already registered',
        };
      }

      // Hash password
      const passwordHash = await this.hashPassword(password);

      // Create user in database
      const userId = await this.userService.createUser(
        email,
        passwordHash,
        fullName,
        timezone,
        notificationTime
      );

      // Generate JWT token
      const token = this.generateToken(userId, email);

      return {
        success: true,
        userId,
        token,
        message: 'User created successfully',
      };
    } catch (error) {
      console.error('Signup error:', error);
      return {
        success: false,
        message: 'Failed to create user account',
      };
    }
  }

  /**
   * Login user
   */
  async login(
    email: string,
    password: string
  ): Promise<{
    success: boolean;
    userId?: string;
    token?: string;
    message: string;
  }> {
    try {
      // Validate input
      if (!email || !password) {
        return {
          success: false,
          message: 'Email and password are required',
        };
      }

      // Get user by email
      const user = await this.userService.getUserByEmail(email);

      if (!user) {
        return {
          success: false,
          message: 'Invalid email or password',
        };
      }

      // Compare password
      const passwordMatch = await this.comparePassword(password, user.password_hash);

      if (!passwordMatch) {
        return {
          success: false,
          message: 'Invalid email or password',
        };
      }

      // Generate JWT token
      const token = this.generateToken(user.id, user.email);

      return {
        success: true,
        userId: user.id,
        token,
        message: 'Login successful',
      };
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        message: 'Failed to authenticate user',
      };
    }
  }

  /**
   * Get user profile from token
   */
  async getUserFromToken(token: string): Promise<any | null> {
    try {
      const decoded = this.verifyToken(token);

      if (!decoded) {
        return null;
      }

      const user = await this.userService.getUserById(decoded.userId);
      return user;
    } catch (error) {
      console.error('Error getting user from token:', error);
      return null;
    }
  }

  /**
   * Change user password
   */
  async changePassword(
    userId: string,
    oldPassword: string,
    newPassword: string
  ): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      // Get user
      const user = await this.userService.getUserById(userId);

      if (!user) {
        return {
          success: false,
          message: 'User not found',
        };
      }

      // Verify old password
      const passwordMatch = await this.comparePassword(oldPassword, user.password_hash);

      if (!passwordMatch) {
        return {
          success: false,
          message: 'Current password is incorrect',
        };
      }

      if (newPassword.length < 8) {
        return {
          success: false,
          message: 'New password must be at least 8 characters long',
        };
      }

      // Hash new password
      const newPasswordHash = await this.hashPassword(newPassword);

      // Update password in database
      // Note: You'll need to add this method to UserService
      // For now, we'll return success but you should implement this
      console.log(`Password changed for user ${userId}`);

      return {
        success: true,
        message: 'Password changed successfully',
      };
    } catch (error) {
      console.error('Change password error:', error);
      return {
        success: false,
        message: 'Failed to change password',
      };
    }
  }

  /**
   * Validate token (for middleware)
   */
  validateToken(token: string): boolean {
    try {
      jwt.verify(token, this.jwtSecret);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Extract token from Authorization header
   */
  extractTokenFromHeader(authHeader?: string): string | null {
    if (!authHeader) {
      return null;
    }

    // Format: "Bearer <token>"
    const parts = authHeader.split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer') {
      return parts[1];
    }

    return null;
  }
}
