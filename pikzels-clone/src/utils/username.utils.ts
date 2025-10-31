import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Username Generation and Validation Utilities
 * Follows industry standards (GitHub, Twitter, Instagram)
 */

export class UsernameUtils {
  // Username validation rules
  private static readonly MIN_LENGTH = 3;
  private static readonly MAX_LENGTH = 30;
  private static readonly USERNAME_REGEX = /^[a-zA-Z0-9._-]+$/;
  private static readonly RESERVED_USERNAMES = [
    'admin',
    'administrator',
    'root',
    'system',
    'api',
    'support',
    'help',
    'about',
    'contact',
    'login',
    'logout',
    'signup',
    'signin',
    'register',
    'dashboard',
    'settings',
    'profile',
    'user',
    'users',
    'account',
    'accounts',
    'thumpiks',
    'pikzels',
    'moderator',
    'mod',
    'staff',
  ];

  /**
   * Generate username suggestions from full name and email
   * @param fullName - User's full name (e.g., "John Smith")
   * @param email - User's email (e.g., "john.smith@example.com")
   * @returns Array of 5 unique username suggestions
   */
  static async generateSuggestions(
    fullName: string,
    email: string
  ): Promise<string[]> {
    const suggestions: string[] = [];
    const emailPrefix = email.split('@')[0].toLowerCase();

    // Clean and prepare the name
    const cleanName = fullName
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '') // Remove special characters
      .trim();

    const nameParts = cleanName.split(/\s+/);
    const firstName = nameParts[0] || '';
    const lastName = nameParts[nameParts.length - 1] || '';
    const middleName = nameParts.length > 2 ? nameParts[1] : '';

    // Strategy 1: Full name without spaces (johnsmith)
    if (cleanName.length >= this.MIN_LENGTH) {
      suggestions.push(cleanName.replace(/\s+/g, ''));
    }

    // Strategy 2: First + Last (johnsmith, jsmith)
    if (firstName && lastName) {
      suggestions.push(`${firstName}${lastName}`);
      suggestions.push(`${firstName[0]}${lastName}`);
    }

    // Strategy 3: Email prefix (john.smith becomes johnsmith)
    if (emailPrefix.length >= this.MIN_LENGTH) {
      suggestions.push(emailPrefix.replace(/[^a-z0-9]/g, ''));
    }

    // Strategy 4: First + Middle initial + Last (johnmsmith)
    if (firstName && middleName && lastName) {
      suggestions.push(`${firstName}${middleName[0]}${lastName}`);
    }

    // Strategy 5: First + underscore + Last (john_smith)
    if (firstName && lastName) {
      suggestions.push(`${firstName}_${lastName}`);
    }

    // Strategy 6: First + dot + Last (john.smith)
    if (firstName && lastName) {
      suggestions.push(`${firstName}.${lastName}`);
    }

    // Filter valid suggestions and check availability
    const validSuggestions = suggestions.filter(
      (s) => this.isValidFormat(s) && !this.isReserved(s)
    );

    // Check which suggestions are available
    const availableSuggestions: string[] = [];

    for (const suggestion of validSuggestions) {
      const isAvailable = await this.isUsernameAvailable(suggestion);
      if (isAvailable) {
        availableSuggestions.push(suggestion);
      } else {
        // If taken, try adding numbers
        const withNumber = await this.findAvailableVariation(suggestion);
        if (withNumber) {
          availableSuggestions.push(withNumber);
        }
      }

      // Stop when we have 5 suggestions
      if (availableSuggestions.length >= 5) break;
    }

    // If we still don't have enough, generate random variations
    while (availableSuggestions.length < 5 && firstName) {
      const random = this.generateRandomSuffix();
      const variation = `${firstName}${random}`;
      if (
        this.isValidFormat(variation) &&
        (await this.isUsernameAvailable(variation))
      ) {
        availableSuggestions.push(variation);
      }
    }

    return availableSuggestions.slice(0, 5);
  }

  /**
   * Check if username is available (case-insensitive)
   * @param username - Username to check
   * @returns true if available, false if taken
   */
  static async isUsernameAvailable(username: string): Promise<boolean> {
    try {
      const existing = await prisma.user.findFirst({
        where: {
          username: {
            equals: username,
            mode: 'insensitive', // Case-insensitive search
          },
        },
      });

      return !existing;
    } catch (error) {
      console.error('Error checking username availability:', error);
      return false;
    }
  }

  /**
   * Find available variation by adding numbers
   * @param baseUsername - Base username to vary
   * @returns Available username with number suffix, or null
   */
  private static async findAvailableVariation(
    baseUsername: string
  ): Promise<string | null> {
    // Try numbers 1-999
    for (let i = 1; i <= 999; i++) {
      const variation = `${baseUsername}${i}`;
      if (
        variation.length <= this.MAX_LENGTH &&
        (await this.isUsernameAvailable(variation))
      ) {
        return variation;
      }
    }

    // Try random 4-digit suffix
    const random = Math.floor(1000 + Math.random() * 9000);
    const variation = `${baseUsername}${random}`;
    if (
      variation.length <= this.MAX_LENGTH &&
      (await this.isUsernameAvailable(variation))
    ) {
      return variation;
    }

    return null;
  }

  /**
   * Generate random suffix for username
   * @returns Random number string (2-4 digits)
   */
  private static generateRandomSuffix(): string {
    return Math.floor(Math.random() * 9999 + 1).toString();
  }

  /**
   * Validate username format
   * @param username - Username to validate
   * @returns true if format is valid
   */
  static isValidFormat(username: string): boolean {
    if (!username) return false;
    if (username.length < this.MIN_LENGTH) return false;
    if (username.length > this.MAX_LENGTH) return false;
    if (!this.USERNAME_REGEX.test(username)) return false;

    // Cannot start or end with special characters
    if (/^[._-]|[._-]$/.test(username)) return false;

    // Cannot have consecutive special characters
    if (/[._-]{2,}/.test(username)) return false;

    return true;
  }

  /**
   * Check if username is reserved
   * @param username - Username to check
   * @returns true if reserved
   */
  static isReserved(username: string): boolean {
    return this.RESERVED_USERNAMES.includes(username.toLowerCase());
  }

  /**
   * Validate username with detailed error message
   * @param username - Username to validate
   * @returns Object with valid flag and error message
   */
  static async validateUsername(
    username: string
  ): Promise<{ valid: boolean; error?: string }> {
    if (!username) {
      return { valid: false, error: 'Username is required' };
    }

    if (username.length < this.MIN_LENGTH) {
      return {
        valid: false,
        error: `Username must be at least ${this.MIN_LENGTH} characters`,
      };
    }

    if (username.length > this.MAX_LENGTH) {
      return {
        valid: false,
        error: `Username must be at most ${this.MAX_LENGTH} characters`,
      };
    }

    if (!this.USERNAME_REGEX.test(username)) {
      return {
        valid: false,
        error:
          'Username can only contain letters, numbers, dots, underscores, and dashes',
      };
    }

    if (/^[._-]|[._-]$/.test(username)) {
      return {
        valid: false,
        error: 'Username cannot start or end with special characters',
      };
    }

    if (/[._-]{2,}/.test(username)) {
      return {
        valid: false,
        error: 'Username cannot have consecutive special characters',
      };
    }

    if (this.isReserved(username)) {
      return {
        valid: false,
        error: 'This username is reserved and cannot be used',
      };
    }

    const isAvailable = await this.isUsernameAvailable(username);
    if (!isAvailable) {
      return {
        valid: false,
        error: 'This username is already taken',
      };
    }

    return { valid: true };
  }

  /**
   * Sanitize username input
   * @param input - Raw username input
   * @returns Sanitized username
   */
  static sanitize(input: string): string {
    return input
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '_') // Replace spaces with underscores
      .replace(/[^a-z0-9._-]/g, '') // Remove invalid characters
      .substring(0, this.MAX_LENGTH); // Trim to max length
  }

  /**
   * Format username for display (preserve original case but validate)
   * @param username - Username to format
   * @returns Formatted username with @ prefix
   */
  static formatForDisplay(username: string): string {
    return `@${username}`;
  }

  /**
   * Get username validation rules for frontend
   * @returns Object with validation rules
   */
  static getValidationRules() {
    return {
      minLength: this.MIN_LENGTH,
      maxLength: this.MAX_LENGTH,
      pattern: this.USERNAME_REGEX.source,
      allowedCharacters: 'letters, numbers, dots (.), underscores (_), dashes (-)',
      rules: [
        `Must be ${this.MIN_LENGTH}-${this.MAX_LENGTH} characters`,
        'Can only contain letters, numbers, dots, underscores, and dashes',
        'Cannot start or end with special characters',
        'Cannot have consecutive special characters',
        'Must be unique (case-insensitive)',
      ],
    };
  }
}

export default UsernameUtils;
