/**
 * Authentication Service for Dashboard (MCP Version)
 * Handles user registration, login, and token management using Integram MCP tools
 */

import jwt, { type SignOptions } from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import type { User } from '../../services/integram/types.js';

const JWT_SECRET = process.env.JWT_SECRET || 'btc-trading-bot-secret-key-change-in-production';
const SALT_ROUNDS = 10;

// Integram table and field IDs
const TYPE_USERS = 18;
const FIELD_EMAIL = 41;
const FIELD_NAME = 33;
const FIELD_PHONE = 30;
const FIELD_DATE = 156;
const FIELD_ACTIVITY = 124;
const FIELD_SECRET = 130; // Telegram User ID
const FIELD_NOTE = 39; // For storing settings including passwordHash

export interface RegisterData {
  fullName: string;
  email: string;
  phone?: string;
  password: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface AuthToken {
  token: string;
  user: User;
}

/**
 * Simple in-memory store for Integram tools
 * In production, this should use proper MCP connection
 */
class IntegramStore {
  private static users: Map<number, any> = new Map();
  private static nextId = 1000;
  private static initialized = false;

  static async initialize(): Promise<void> {
    if (this.initialized) return;

    // Create default user d/d
    const defaultPasswordHash = await bcrypt.hash('d', SALT_ROUNDS);
    const defaultUser = {
      id: 1,
      value: 'd',
      requisites: {
        [FIELD_SECRET]: '-1',
        [FIELD_NAME]: 'Admin',
        [FIELD_EMAIL]: 'd',
        [FIELD_NOTE]: JSON.stringify({ settings: { passwordHash: defaultPasswordHash } }),
        [FIELD_DATE]: new Date().toISOString(),
        [FIELD_ACTIVITY]: new Date().toISOString(),
      },
    };
    this.users.set(1, defaultUser);
    this.initialized = true;
    console.log('✅ Default user d/d created');
  }

  static async getObjects(typeId: number): Promise<any[]> {
    await this.initialize();
    if (typeId === TYPE_USERS) {
      return Array.from(this.users.values());
    }
    return [];
  }

  static async createObject(typeId: number, value: string, requisites: Record<string, any>): Promise<number> {
    const id = this.nextId++;
    const obj = {
      id,
      value,
      requisites,
    };
    this.users.set(id, obj);
    return id;
  }

  static async updateRequisites(objectId: number, requisites: Record<string, any>): Promise<void> {
    const obj = this.users.get(objectId);
    if (obj) {
      obj.requisites = { ...obj.requisites, ...requisites };
    }
  }
}

export class AuthServiceMCP {
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

    // Check if user with this email/username already exists
    const users = await IntegramStore.getObjects(TYPE_USERS);
    const username = email.includes('@') ? email.split('@')[0] : email;

    const existingUser = users.find((u: any) => {
      const userEmail = u.requisites[FIELD_EMAIL];
      const userName = u.value;
      return (
        (userEmail && userEmail.toLowerCase() === email.toLowerCase()) ||
        (userName && userName.toLowerCase() === username.toLowerCase())
      );
    });

    if (existingUser) {
      throw new Error('Пользователь с таким логином/email уже существует');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // Generate unique telegram ID for dashboard users (negative to avoid conflicts)
    const dashboardUserId = -Math.floor(Math.random() * 1000000000);
    const now = new Date().toISOString();

    // Prepare settings with password hash
    const settings = {
      passwordHash,
      maxPositionSize: 10,
      defaultStopLoss: 2,
      defaultTakeProfit: 5,
    };

    // Create user object
    const userId = await IntegramStore.createObject(TYPE_USERS, username, {
      [FIELD_SECRET]: dashboardUserId.toString(),
      [FIELD_NAME]: fullName,
      [FIELD_EMAIL]: email,
      [FIELD_PHONE]: phone || '',
      [FIELD_DATE]: now,
      [FIELD_ACTIVITY]: now,
      [FIELD_NOTE]: JSON.stringify({ settings }),
    });

    // Create user object
    const user: User = {
      id: userId,
      telegramId: dashboardUserId,
      username,
      fullName,
      email,
      phone,
      registrationDate: new Date(now),
      lastActivity: new Date(now),
    };

    // Generate JWT token
    const token = this.generateToken(user);

    return {
      token,
      user,
    };
  }

  /**
   * Login user
   */
  async login(data: LoginData): Promise<AuthToken> {
    const { email, password } = data;

    // Find user by email or username
    const users = await IntegramStore.getObjects(TYPE_USERS);
    const userObj = users.find((u: any) => {
      const userEmail = u.requisites[FIELD_EMAIL];
      const username = u.value;
      return (
        (userEmail && userEmail.toLowerCase() === email.toLowerCase()) ||
        (username && username.toLowerCase() === email.toLowerCase())
      );
    });

    if (!userObj) {
      throw new Error('Неверный email или пароль');
    }

    // Get password hash from settings
    const notes = userObj.requisites[FIELD_NOTE];
    let passwordHash: string | undefined;

    if (notes) {
      try {
        const parsed = JSON.parse(notes);
        passwordHash = parsed.settings?.passwordHash;
      } catch {
        // Invalid JSON
      }
    }

    if (!passwordHash) {
      throw new Error('Пользователь не зарегистрирован через dashboard');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, passwordHash);

    if (!isPasswordValid) {
      throw new Error('Неверный email или пароль');
    }

    // Update last activity
    await IntegramStore.updateRequisites(userObj.id, {
      [FIELD_ACTIVITY]: new Date().toISOString(),
    });

    // Create user object
    const user: User = {
      id: userObj.id,
      telegramId: parseInt(userObj.requisites[FIELD_SECRET] || '0', 10),
      username: userObj.value,
      fullName: userObj.requisites[FIELD_NAME],
      email: userObj.requisites[FIELD_EMAIL],
      phone: userObj.requisites[FIELD_PHONE],
      registrationDate: new Date(userObj.requisites[FIELD_DATE]),
      lastActivity: new Date(),
    };

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

      const users = await IntegramStore.getObjects(TYPE_USERS);
      const userObj = users.find((u: any) => u.id === decoded.userId);

      if (!userObj) {
        throw new Error('User not found');
      }

      const user: User = {
        id: userObj.id,
        telegramId: parseInt(userObj.requisites[FIELD_SECRET] || '0', 10),
        username: userObj.value,
        fullName: userObj.requisites[FIELD_NAME],
        email: userObj.requisites[FIELD_EMAIL],
        phone: userObj.requisites[FIELD_PHONE],
        registrationDate: new Date(userObj.requisites[FIELD_DATE]),
        lastActivity: new Date(userObj.requisites[FIELD_ACTIVITY]),
      };

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
      expiresIn: '7d',
    };

    return jwt.sign(payload, JWT_SECRET, options);
  }
}
