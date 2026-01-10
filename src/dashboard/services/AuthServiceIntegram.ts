/**
 * Authentication Service for Dashboard using direct Integram API
 * Works with real Integram database for user authentication
 */

import jwt, { type SignOptions } from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import type { User } from '../../services/integram/types.js';
import { IntegramClient } from '../../database/integram/IntegramClient.js';

const JWT_SECRET = process.env.JWT_SECRET || 'btc-trading-bot-secret-key-change-in-production';

// Integram configuration
const INTEGRAM_URL = process.env.INTEGRAM_URL || 'https://интеграм.рф';
const INTEGRAM_DB = process.env.INTEGRAM_DATABASE || 'bts';
const INTEGRAM_LOGIN = process.env.INTEGRAM_LOGIN || 'd';
const INTEGRAM_PASSWORD = process.env.INTEGRAM_PASSWORD || 'd';

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
  email: string; // can be email or username
  password: string;
}

export interface AuthToken {
  token: string;
  user: User;
}

interface IntegramObject {
  id: number;
  value: string;
  requisites: Record<string, any>;
}

export class AuthServiceIntegram {
  private integramClient: IntegramClient | null = null;

  /**
   * Get Integram client instance
   */
  private async getClient(): Promise<IntegramClient> {
    if (!this.integramClient) {
      this.integramClient = new IntegramClient({
        serverURL: INTEGRAM_URL,
        database: INTEGRAM_DB,
        login: INTEGRAM_LOGIN,
        password: INTEGRAM_PASSWORD,
      });
      await this.integramClient.authenticate();
    }
    return this.integramClient;
  }

  /**
   * Get all users from Integram
   */
  private async getIntegramUsers(): Promise<IntegramObject[]> {
    try {
      const client = await this.getClient();
      const users = await client.getObjects(TYPE_USERS);

      console.log(`✅ Loaded ${users.length} users from Integram database`);
      return users as IntegramObject[];
    } catch (error) {
      console.error('Failed to fetch users from Integram:', error);
      console.warn('⚠️ Using default users as fallback');
      return [];
    }
  }

  /**
   * Find user by email or username in Integram
   */
  private async findUser(emailOrUsername: string): Promise<IntegramObject | null> {
    const users = await this.getIntegramUsers();

    return users.find((u) => {
      const userEmail = u.requisites[FIELD_EMAIL];
      const username = u.value;
      return (
        (userEmail && userEmail.toLowerCase() === emailOrUsername.toLowerCase()) ||
        (username && username.toLowerCase() === emailOrUsername.toLowerCase())
      );
    }) || null;
  }

  /**
   * Get all default users
   */
  private getDefaultUsers(): IntegramObject[] {
    return [
      {
        id: 1,
        value: 'd',
        requisites: {
          [FIELD_SECRET]: '-1',
          [FIELD_NAME]: 'Admin',
          [FIELD_EMAIL]: 'd',
          [FIELD_NOTE]: JSON.stringify({
            settings: {
              passwordHash: '$2b$10$7MJiGHdSXe27XnSmh44JHu9Jux83QgzaVuOxsHQ05qRfS5TMHQMVq'
            }
          }),
          [FIELD_DATE]: new Date().toISOString(),
          [FIELD_ACTIVITY]: new Date().toISOString(),
        },
      },
      {
        id: 2,
        value: 'dd',
        requisites: {
          [FIELD_SECRET]: '-2',
          [FIELD_NAME]: 'Admin DD',
          [FIELD_EMAIL]: 'dd',
          [FIELD_NOTE]: JSON.stringify({
            settings: {
              passwordHash: '$2b$10$FeRx.I4iv13Kt/MiBmFd6udmuY1LVFIZHhioh1SliGS8ZniVRhxpO'
            }
          }),
          [FIELD_DATE]: new Date().toISOString(),
          [FIELD_ACTIVITY]: new Date().toISOString(),
        },
      },
    ];
  }

  /**
   * Map Integram object to User type
   */
  private mapToUser(obj: IntegramObject): User {
    const telegramId = parseInt(obj.requisites[FIELD_SECRET] || '-1');
    const email = obj.requisites[FIELD_EMAIL] || '';
    const fullName = obj.requisites[FIELD_NAME] || '';
    const phone = obj.requisites[FIELD_PHONE] || undefined;
    const registrationDate = obj.requisites[FIELD_DATE] || new Date().toISOString();
    const lastActivity = obj.requisites[FIELD_ACTIVITY] || new Date().toISOString();

    return {
      id: obj.id,
      telegramId,
      username: obj.value,
      fullName,
      email,
      phone,
      registrationDate: new Date(registrationDate),
      lastActivity: new Date(lastActivity),
    };
  }

  /**
   * Get password hash from user object
   */
  private getPasswordHash(obj: IntegramObject): string | null {
    const notes = obj.requisites[FIELD_NOTE];
    if (!notes) return null;

    try {
      const parsed = JSON.parse(notes);
      return parsed.settings?.passwordHash || null;
    } catch {
      return null;
    }
  }

  /**
   * Register a new user
   */
  async register(data: RegisterData): Promise<AuthToken> {
    const { fullName, email, password } = data;

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

    // Check if user exists
    const existingUser = await this.findUser(email);
    if (existingUser) {
      throw new Error('Пользователь с таким логином/email уже существует');
    }

    // For now, registration is disabled in Integram mode
    throw new Error('Регистрация временно недоступна. Обратитесь к администратору.');
  }

  /**
   * Login user
   */
  async login(data: LoginData): Promise<AuthToken> {
    const { email, password } = data;

    // Try to find user in Integram
    let userObj = await this.findUser(email);
    let passwordHash: string | null = null;

    // Get password hash from Integram user
    if (userObj) {
      passwordHash = this.getPasswordHash(userObj);
    }

    // If user not found in Integram OR has no password hash, try default users
    if (!userObj || !passwordHash) {
      const defaultUsers = this.getDefaultUsers();
      const defaultUser = defaultUsers.find(u =>
        u.value.toLowerCase() === email.toLowerCase() ||
        String(u.requisites[FIELD_EMAIL] || '').toLowerCase() === email.toLowerCase()
      );

      if (defaultUser) {
        userObj = defaultUser;
        passwordHash = this.getPasswordHash(defaultUser);
      }
    }

    if (!userObj) {
      throw new Error('Неверный email или пароль');
    }

    if (!passwordHash) {
      throw new Error('Пользователь не зарегистрирован через dashboard');
    }

    // Verify password with bcrypt
    const isPasswordValid = await bcrypt.compare(password, passwordHash);
    if (!isPasswordValid) {
      throw new Error('Неверный email или пароль');
    }

    // Map to User type
    const user = this.mapToUser(userObj);

    // Generate JWT token
    const token = this.generateToken(user);

    console.log(`✅ User logged in: ${user.username} (ID: ${user.id})`);

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
      const decoded = jwt.verify(token, JWT_SECRET) as {
        userId: number;
        email?: string;
        username?: string;
      };

      // Try to find user in Integram
      const users = await this.getIntegramUsers();
      let userObj = users.find(u => u.id === decoded.userId);

      // Fallback to default users
      if (!userObj) {
        const defaultUsers = this.getDefaultUsers();
        userObj = defaultUsers.find(u => u.id === decoded.userId);
      }

      if (!userObj) {
        throw new Error('User not found');
      }

      return this.mapToUser(userObj);
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
