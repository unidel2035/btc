/**
 * Shared types for Integram services
 */

export interface User {
  id: number;
  telegramId: number;
  username: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  email?: string;
  phone?: string;
  role?: string;
  roleId?: number;
  registrationDate: Date;
  lastActivity: Date;
  profilePhoto?: string;
  notes?: string;
}

export interface UserProfileUpdate {
  fullName?: string;
  email?: string;
  phone?: string;
}

export interface UserSettings {
  maxPositionSize?: number;
  defaultStopLoss?: number;
  defaultTakeProfit?: number;
  tradingPreferences?: Record<string, unknown>;
  passwordHash?: string; // For dashboard users
  [key: string]: unknown; // Allow additional properties
}
