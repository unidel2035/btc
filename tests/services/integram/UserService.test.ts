/**
 * UserService Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UserService } from '../../../src/services/integram/UserService.js';
import type { IntegramClient, IntegramObject } from '../../../src/database/integram/IntegramClient.js';

describe('UserService', () => {
  let userService: UserService;
  let mockClient: IntegramClient;

  beforeEach(() => {
    // Create mock IntegramClient
    mockClient = {
      getObjects: vi.fn(),
      createObject: vi.fn(),
      updateRequisites: vi.fn(),
      authenticate: vi.fn(),
      findObjectByValue: vi.fn(),
      deleteObject: vi.fn(),
      ping: vi.fn(),
      getDatabaseInfo: vi.fn(),
    } as unknown as IntegramClient;

    userService = new UserService(mockClient);
  });

  describe('findByTelegramId', () => {
    it('should find user by Telegram ID', async () => {
      const mockUser: IntegramObject = {
        id: 12345,
        type: 18,
        value: 'testuser',
        requisites: {
          '130': '987654321', // Telegram ID in Secret field
          '33': 'Test User',
          '41': 'test@example.com',
          '156': '2026-01-10T00:00:00Z',
          '124': '2026-01-10T12:00:00Z',
        },
      };

      vi.mocked(mockClient.getObjects).mockResolvedValue([mockUser]);

      const result = await userService.findByTelegramId(987654321);

      expect(result).not.toBeNull();
      expect(result?.id).toBe(12345);
      expect(result?.username).toBe('testuser');
      expect(result?.telegramId).toBe(987654321);
      expect(result?.fullName).toBe('Test User');
      expect(result?.email).toBe('test@example.com');
    });

    it('should return null if user not found', async () => {
      vi.mocked(mockClient.getObjects).mockResolvedValue([]);

      const result = await userService.findByTelegramId(999999999);

      expect(result).toBeNull();
    });
  });

  describe('createUser', () => {
    it('should create a new user', async () => {
      vi.mocked(mockClient.createObject).mockResolvedValue(12345);

      const result = await userService.createUser({
        id: 987654321,
        username: 'newuser',
        first_name: 'New',
        last_name: 'User',
      });

      expect(result.id).toBe(12345);
      expect(result.username).toBe('newuser');
      expect(result.telegramId).toBe(987654321);
      expect(result.fullName).toBe('New User');
      expect(result.email).toContain('@telegram.temp');

      expect(mockClient.createObject).toHaveBeenCalledWith(
        18,
        'newuser',
        expect.objectContaining({
          '130': '987654321', // Secret field
          '33': 'New User', // Name field
        }),
      );
    });

    it('should generate username if not provided', async () => {
      vi.mocked(mockClient.createObject).mockResolvedValue(12345);

      const result = await userService.createUser({
        id: 987654321,
        first_name: 'Test',
      });

      expect(result.username).toBe('user_987654321');
    });
  });

  describe('updateProfile', () => {
    it('should update user profile', async () => {
      vi.mocked(mockClient.updateRequisites).mockResolvedValue();

      await userService.updateProfile(12345, {
        fullName: 'Updated Name',
        email: 'updated@example.com',
        phone: '+79001234567',
      });

      expect(mockClient.updateRequisites).toHaveBeenCalledWith(
        12345,
        expect.objectContaining({
          '33': 'Updated Name',
          '41': 'updated@example.com',
          '30': '+79001234567',
        }),
      );
    });
  });

  describe('updateActivity', () => {
    it('should update user activity timestamp', async () => {
      vi.mocked(mockClient.updateRequisites).mockResolvedValue();

      await userService.updateActivity(12345);

      expect(mockClient.updateRequisites).toHaveBeenCalledWith(
        12345,
        expect.objectContaining({
          '124': expect.any(String), // Activity field
        }),
      );
    });
  });

  describe('getUserSettings', () => {
    it('should return user settings from notes field', async () => {
      const mockUser: IntegramObject = {
        id: 12345,
        type: 18,
        value: 'testuser',
        requisites: {
          '39': JSON.stringify({
            settings: {
              maxPositionSize: 10,
              defaultStopLoss: 2,
            },
          }),
        },
      };

      vi.mocked(mockClient.getObjects).mockResolvedValue([mockUser]);

      const result = await userService.getUserSettings(12345);

      expect(result.maxPositionSize).toBe(10);
      expect(result.defaultStopLoss).toBe(2);
    });

    it('should return empty settings if notes field is not JSON', async () => {
      const mockUser: IntegramObject = {
        id: 12345,
        type: 18,
        value: 'testuser',
        requisites: {
          '39': 'not json',
        },
      };

      vi.mocked(mockClient.getObjects).mockResolvedValue([mockUser]);

      const result = await userService.getUserSettings(12345);

      expect(result).toEqual({});
    });
  });

  describe('saveUserSettings', () => {
    it('should save user settings to notes field', async () => {
      const mockUser: IntegramObject = {
        id: 12345,
        type: 18,
        value: 'testuser',
        requisites: {},
      };

      vi.mocked(mockClient.getObjects).mockResolvedValue([mockUser]);
      vi.mocked(mockClient.updateRequisites).mockResolvedValue();

      await userService.saveUserSettings(12345, {
        maxPositionSize: 10,
        defaultStopLoss: 2,
      });

      expect(mockClient.updateRequisites).toHaveBeenCalledWith(
        12345,
        expect.objectContaining({
          '39': expect.stringContaining('maxPositionSize'),
        }),
      );
    });
  });
});
