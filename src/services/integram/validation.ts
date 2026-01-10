/**
 * Validation utilities for user input
 */

/**
 * Validate email format
 */
export function validateEmail(email: string): { valid: boolean; error?: string } {
  if (!email) {
    return { valid: false, error: 'Email is required' };
  }

  // Basic email regex pattern
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(email)) {
    return { valid: false, error: 'Invalid email format' };
  }

  // Check for common mistakes
  if (email.includes('..')) {
    return { valid: false, error: 'Email cannot contain consecutive dots' };
  }

  if (email.startsWith('.') || email.endsWith('.')) {
    return { valid: false, error: 'Email cannot start or end with a dot' };
  }

  return { valid: true };
}

/**
 * Validate phone format (international format)
 * Accepts: +7 900 123-45-67, +79001234567, 89001234567, etc.
 */
export function validatePhone(phone: string): { valid: boolean; error?: string } {
  if (!phone) {
    return { valid: false, error: 'Phone number is required' };
  }

  // Remove all spaces, dashes, and parentheses
  const cleaned = phone.replace(/[\s\-()]/g, '');

  // Check if contains only digits and optional leading +
  const phoneRegex = /^\+?\d{10,15}$/;

  if (!phoneRegex.test(cleaned)) {
    return {
      valid: false,
      error: 'Invalid phone format. Use international format (e.g., +79001234567)',
    };
  }

  // Check length
  if (cleaned.length < 10) {
    return { valid: false, error: 'Phone number too short' };
  }

  if (cleaned.length > 15) {
    return { valid: false, error: 'Phone number too long' };
  }

  return { valid: true };
}

/**
 * Validate and format phone number
 */
export function formatPhone(phone: string): string {
  // Remove all non-digit characters except leading +
  const cleaned = phone.replace(/[\s\-()]/g, '');

  // Ensure it starts with +
  if (!cleaned.startsWith('+')) {
    // Assume Russian number if starts with 8 or 9
    if (cleaned.startsWith('8') || cleaned.startsWith('9')) {
      return '+7' + cleaned.substring(1);
    }
    return '+' + cleaned;
  }

  return cleaned;
}

/**
 * Sanitize user input to prevent XSS and injection
 */
export function sanitizeInput(input: string): string {
  if (!input) return '';

  return input
    .trim()
    .replace(/[<>]/g, '') // Remove HTML tags
    .substring(0, 255); // Limit length
}

/**
 * Validate username format
 */
export function validateUsername(username: string): { valid: boolean; error?: string } {
  if (!username) {
    return { valid: false, error: 'Username is required' };
  }

  if (username.length < 3) {
    return { valid: false, error: 'Username must be at least 3 characters long' };
  }

  if (username.length > 50) {
    return { valid: false, error: 'Username must be at most 50 characters long' };
  }

  // Allow letters, numbers, underscore, and hyphen
  const usernameRegex = /^[a-zA-Z0-9_-]+$/;

  if (!usernameRegex.test(username)) {
    return {
      valid: false,
      error: 'Username can only contain letters, numbers, underscore, and hyphen',
    };
  }

  return { valid: true };
}

/**
 * Validate full name
 */
export function validateFullName(name: string): { valid: boolean; error?: string } {
  if (!name) {
    return { valid: false, error: 'Name is required' };
  }

  if (name.length < 2) {
    return { valid: false, error: 'Name must be at least 2 characters long' };
  }

  if (name.length > 100) {
    return { valid: false, error: 'Name must be at most 100 characters long' };
  }

  return { valid: true };
}
