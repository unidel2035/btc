/**
 * Authentication Service for Dashboard
 * Handles user registration, login, and token management
 */

import jwt, { type SignOptions } from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { UserService } from '../../services/integram/UserService.js';
import { IntegramClient } from '../../database/integram/IntegramClient.js';
import type { User } from '../../services/integram/types.js';

const JWT_SECRET = process.env.JWT_SECRET || 'btc-trading-bot-secret-key-change-in-production';
const SALT_ROUNDS = 10;

export interface RegisterData {
  fullName: string;
  email: string;
  phone?: string;
  password: string;
}

export interface LoginData {
  email: string; // can be email or username
  password: string;
}

export interface AuthToken {
  token: string;
  user: User;
}

export class AuthService {
  private userService: UserService;

  constructor(userService: UserService) {
    this.userService = userService;
  }

  /**
   * Create a new instance with fresh Integram client
   */
  static async create(): Promise<AuthService> {
    const client = new IntegramClient({
      serverURL: process.env.INTEGRAM_URL || 'https://интеграм.рф',
      database: process.env.INTEGRAM_DATABASE || 'bts',
      login: process.env.INTEGRAM_LOGIN || 'd',
      password: process.env.INTEGRAM_PASSWORD || 'd',
    });

    await client.authenticate();
    const userService = new UserService(client);

    return new AuthService(userService);
  }

  /**
   * Register a new user
   */
  async register(data: RegisterData): Promise<AuthToken> {
    const { fullName, email, phone, password } = data;

    // Validate input
    if (!fullName || fullName.length < 2) {
      throw new Error('Имя должно содержать минимум 2 символа');
    }

    if (!email || email.length < 1) {
      throw new Error('Email/логин не может быть пустым');
    }

    if (password.length < 1) {
      throw new Error('Пароль не может быть пустым');
    }

    // Check if user with this email already exists
    const existingUser = await this.userService.findByEmail(email);
    if (existingUser) {
      throw new Error('Пользователь с таким email уже существует');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // Generate unique telegram ID for dashboard users (negative to avoid conflicts)
    const dashboardUserId = -Math.floor(Math.random() * 1000000000);

    // Create user using UserService
    const user = await this.userService.createUser({
      id: dashboardUserId,
      username: email.split('@')[0], // use email prefix as username
      first_name: fullName.split(' ')[0],
      last_name: fullName.split(' ').slice(1).join(' ') || undefined,
    });

    // Update profile with additional data
    await this.userService.updateProfile(user.id, {
      fullName,
      email,
      phone,
    });

    // Save password hash in user settings (temporary solution)
    // TODO: Create separate password field in Integram schema
    await this.userService.saveUserSettings(user.id, {
      passwordHash,
      maxPositionSize: 10,
      defaultStopLoss: 2,
      defaultTakeProfit: 5,
    });

    // Refresh user data
    const updatedUser = await this.userService.getUserById(user.id);
    if (!updatedUser) {
      throw new Error('Failed to retrieve created user');
    }

    // Generate JWT token
    const token = this.generateToken(updatedUser);

    return {
      token,
      user: updatedUser,
    };
  }

  /**
   * Login user
   */
  async login(data: LoginData): Promise<AuthToken> {
    const { email, password } = data;

    // Find user by email or username
    let user = await this.userService.findByEmail(email);

    if (!user) {
      // Try finding by username
      user = await this.userService.findByUsername(email);
    }

    if (!user) {
      throw new Error('Неверный email или пароль');
    }

    // Get user settings to retrieve password hash
    const settings = await this.userService.getUserSettings(user.id);
    const passwordHash = settings.passwordHash as string | undefined;

    if (!passwordHash) {
      throw new Error('Пользователь не зарегистрирован через dashboard');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, passwordHash);

    if (!isPasswordValid) {
      throw new Error('Неверный email или пароль');
    }

    // Update last activity
    await this.userService.updateActivity(user.id);

    // Generate JWT token
    const token = this.generateToken(user);

    return {
      token,
      user,
    };
  }

  /**
   * Verify JWT token and return user
   */
  async verifyToken(token: string): Promise<User> {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
      const user = await this.userService.getUserById(decoded.userId);

      if (!user) {
        throw new Error('User not found');
      }

      return user;
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }

  /**
   * Generate JWT token for user
   */
  private generateToken(user: User): string {
    const payload = {
      userId: user.id,
      email: user.email,
      username: user.username,
    };

    const options: SignOptions = {
      expiresIn: '7d', // 7 days
    };

    return jwt.sign(payload, JWT_SECRET, options);
  }
}
