/**
 * User Service for Integram Database Integration
 * Manages user registration, authentication, and profile management
 */

import { IntegramClient, type IntegramObject } from '../../database/integram/IntegramClient.js';
import type { User, UserProfileUpdate, UserSettings } from './types.js';

export type { User, UserProfileUpdate, UserSettings };

/**
 * User Service for managing users in Integram database
 * Table: Пользователь (typeId=18)
 */
export class UserService {
  private client: IntegramClient;
  private readonly TYPE_USERS = 18; // Table: Пользователь

  // Field IDs (requisites) from the issue
  private readonly FIELD_ROLE = 115; // Роль - reference to table 42
  private readonly FIELD_EMAIL = 41; // Email - string (required)
  private readonly FIELD_PHONE = 30; // Телефон - string
  private readonly FIELD_DATE = 156; // Дата регистрации - datetime
  private readonly FIELD_NAME = 33; // Имя - string
  private readonly FIELD_NOTE = 39; // Примечание - text
  private readonly FIELD_PHOTO = 38; // Фото - file
  private readonly FIELD_ACTIVITY = 124; // Activity - datetime
  private readonly FIELD_SECRET = 130; // Secret - Telegram User ID
  private readonly FIELD_PASSWORD = 20; // Password - password hash
  private readonly FIELD_TOKEN = 125; // Token - password
  private readonly FIELD_XSRF = 40; // xsrf - password

  constructor(client: IntegramClient) {
    this.client = client;
  }

  /**
   * Find user by Telegram ID
   */
  async findByTelegramId(telegramId: number): Promise<User | null> {
    try {
      const users = await this.client.getObjects<IntegramObject>(this.TYPE_USERS);

      // Filter by Secret field (Telegram User ID)
      const userObj = users.find((user) => {
        const secret = user.requisites[this.FIELD_SECRET];
        return secret === telegramId.toString() || secret === telegramId;
      });

      if (!userObj) {
        return null;
      }

      return this.mapIntegramObjectToUser(userObj);
    } catch (error) {
      console.error(`Failed to find user by Telegram ID ${telegramId}:`, error);
      throw error;
    }
  }

  /**
   * Create a new user
   */
  async createUser(telegramUser: {
    id: number;
    username?: string;
    first_name?: string;
    last_name?: string;
  }): Promise<User> {
    try {
      // Generate username from Telegram data
      const username = telegramUser.username || `user_${telegramUser.id}`;
      const fullName = [telegramUser.first_name, telegramUser.last_name]
        .filter(Boolean)
        .join(' ') || username;

      // Generate temporary email (required field)
      const tempEmail = `user_${telegramUser.id}@telegram.temp`;

      const now = new Date().toISOString();

      // Create user object
      const userId = await this.client.createObject(this.TYPE_USERS, username, {
        [this.FIELD_SECRET]: telegramUser.id.toString(),
        [this.FIELD_NAME]: fullName,
        [this.FIELD_EMAIL]: tempEmail,
        [this.FIELD_DATE]: now,
        [this.FIELD_ACTIVITY]: now,
        // Note: FIELD_ROLE is required (:!NULL:) but we'll need to get default role ID from config
        // For now, we'll let Integram handle the default or add it later
      });

      console.log(`✅ Created user ${username} (ID: ${userId}) for Telegram ID ${telegramUser.id}`);

      // Return the created user
      return {
        id: userId,
        telegramId: telegramUser.id,
        username,
        firstName: telegramUser.first_name,
        lastName: telegramUser.last_name,
        fullName,
        email: tempEmail,
        registrationDate: new Date(now),
        lastActivity: new Date(now),
      };
    } catch (error) {
      console.error(`Failed to create user for Telegram ID ${telegramUser.id}:`, error);
      throw error;
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(userId: number, data: UserProfileUpdate): Promise<void> {
    try {
      const requisites: Record<string, unknown> = {
        [this.FIELD_ACTIVITY]: new Date().toISOString(),
      };

      if (data.fullName !== undefined) {
        requisites[this.FIELD_NAME] = data.fullName;
      }

      if (data.email !== undefined) {
        requisites[this.FIELD_EMAIL] = data.email;
      }

      if (data.phone !== undefined) {
        requisites[this.FIELD_PHONE] = data.phone;
      }

      await this.client.updateRequisites(userId, requisites);
      console.log(`✅ Updated profile for user ${userId}`);
    } catch (error) {
      console.error(`Failed to update profile for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Update user's last activity timestamp
   */
  async updateActivity(userId: number): Promise<void> {
    try {
      await this.client.updateRequisites(userId, {
        [this.FIELD_ACTIVITY]: new Date().toISOString(),
      });
    } catch (error) {
      console.error(`Failed to update activity for user ${userId}:`, error);
      // Don't throw - this is not critical
    }
  }

  /**
   * Get user settings (stored in Notes field as JSON)
   */
  async getUserSettings(userId: number): Promise<UserSettings> {
    try {
      const users = await this.client.getObjects<IntegramObject>(this.TYPE_USERS);
      const userObj = users.find((u) => u.id === userId);

      if (!userObj) {
        return {};
      }

      const notes = userObj.requisites[this.FIELD_NOTE];
      if (!notes || typeof notes !== 'string') {
        return {};
      }

      try {
        // Try to parse settings from JSON in notes field
        const parsed = JSON.parse(notes);
        return parsed.settings || {};
      } catch {
        // Not JSON, return empty settings
        return {};
      }
    } catch (error) {
      console.error(`Failed to get settings for user ${userId}:`, error);
      return {};
    }
  }

  /**
   * Save user settings (store in Notes field as JSON)
   */
  async saveUserSettings(userId: number, settings: UserSettings): Promise<void> {
    try {
      // Get existing notes to preserve other data
      const users = await this.client.getObjects<IntegramObject>(this.TYPE_USERS);
      const userObj = users.find((u) => u.id === userId);

      let existingData: Record<string, unknown> = {};
      if (userObj) {
        const notes = userObj.requisites[this.FIELD_NOTE];
        if (notes && typeof notes === 'string') {
          try {
            existingData = JSON.parse(notes);
          } catch {
            // Not JSON, start fresh
          }
        }
      }

      // Merge settings
      existingData.settings = settings;

      await this.client.updateRequisites(userId, {
        [this.FIELD_NOTE]: JSON.stringify(existingData),
        [this.FIELD_ACTIVITY]: new Date().toISOString(),
      });

      console.log(`✅ Saved settings for user ${userId}`);
    } catch (error) {
      console.error(`Failed to save settings for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: number): Promise<User | null> {
    try {
      const users = await this.client.getObjects<IntegramObject>(this.TYPE_USERS);
      const userObj = users.find((u) => u.id === userId);

      if (!userObj) {
        return null;
      }

      return this.mapIntegramObjectToUser(userObj);
    } catch (error) {
      console.error(`Failed to get user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Find user by email
   */
  async findByEmail(email: string): Promise<User | null> {
    try {
      const users = await this.client.getObjects<IntegramObject>(this.TYPE_USERS);

      const userObj = users.find((user) => {
        const userEmail = user.requisites[this.FIELD_EMAIL];
        return userEmail && typeof userEmail === 'string' && userEmail.toLowerCase() === email.toLowerCase();
      });

      if (!userObj) {
        return null;
      }

      return this.mapIntegramObjectToUser(userObj);
    } catch (error) {
      console.error(`Failed to find user by email ${email}:`, error);
      throw error;
    }
  }

  /**
   * Find user by username
   */
  async findByUsername(username: string): Promise<User | null> {
    try {
      const users = await this.client.getObjects<IntegramObject>(this.TYPE_USERS);

      const userObj = users.find((user) => {
        return user.value.toLowerCase() === username.toLowerCase();
      });

      if (!userObj) {
        return null;
      }

      return this.mapIntegramObjectToUser(userObj);
    } catch (error) {
      console.error(`Failed to find user by username ${username}:`, error);
      throw error;
    }
  }

  /**
   * Map Integram object to User interface
   */
  private mapIntegramObjectToUser(obj: IntegramObject): User {
    const telegramId = obj.requisites[this.FIELD_SECRET];
    const fullName = obj.requisites[this.FIELD_NAME];
    const email = obj.requisites[this.FIELD_EMAIL];
    const phone = obj.requisites[this.FIELD_PHONE];
    const roleId = obj.requisites[this.FIELD_ROLE];
    const registrationDate = obj.requisites[this.FIELD_DATE];
    const lastActivity = obj.requisites[this.FIELD_ACTIVITY];
    const notes = obj.requisites[this.FIELD_NOTE];
    const photo = obj.requisites[this.FIELD_PHOTO];

    return {
      id: obj.id,
      telegramId: typeof telegramId === 'string' ? parseInt(telegramId, 10) : (telegramId as number),
      username: obj.value,
      fullName: typeof fullName === 'string' ? fullName : undefined,
      email: typeof email === 'string' ? email : undefined,
      phone: typeof phone === 'string' ? phone : undefined,
      roleId: typeof roleId === 'number' ? roleId : undefined,
      registrationDate: registrationDate ? new Date(registrationDate as string) : new Date(),
      lastActivity: lastActivity ? new Date(lastActivity as string) : new Date(),
      notes: typeof notes === 'string' ? notes : undefined,
      profilePhoto: typeof photo === 'string' ? photo : undefined,
    };
  }
}
