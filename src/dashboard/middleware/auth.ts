/**
 * Authentication Middleware for Dashboard API
 * Validates JWT tokens and protects routes
 */

import type { Request, Response, NextFunction } from 'express';
import { AuthServiceIntegram } from '../services/AuthServiceIntegram.js';
import type { User } from '../../services/integram/types.js';

// Create global auth service instance
const authService = new AuthServiceIntegram();

// Extend Express Request type to include user
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

/**
 * Authentication middleware
 * Verifies JWT token from Authorization header
 */
export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'No authentication token provided' });
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    const user = await authService.verifyToken(token);

    // Attach user to request
    req.user = user;

    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/**
 * Optional authentication middleware
 * Attaches user if token is valid, but doesn't fail if missing
 */
export async function optionalAuthMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const user = await authService.verifyToken(token);
      req.user = user;
    }

    next();
  } catch (error) {
    // Ignore errors in optional auth
    next();
  }
}
