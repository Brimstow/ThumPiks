/**
 * Password Validation Utilities
 * Implements OWASP Password Security Standards
 * https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html
 */

export interface PasswordStrength {
  score: number; // 0-4 (0=very weak, 4=very strong)
  label: 'Very Weak' | 'Weak' | 'Medium' | 'Strong' | 'Very Strong';
  feedback: string[];
  meetsRequirements: boolean;
}

export interface PasswordValidation {
  valid: boolean;
  errors: string[];
  strength?: PasswordStrength;
}

export class PasswordUtils {
  // OWASP Standards
  private static readonly MIN_LENGTH = 8;
  private static readonly MAX_LENGTH = 128;
  private static readonly REQUIRE_UPPERCASE = true;
  private static readonly REQUIRE_LOWERCASE = true;
  private static readonly REQUIRE_NUMBER = true;
  private static readonly REQUIRE_SPECIAL = true;

  // Common passwords to reject (top 100 most common)
  private static readonly COMMON_PASSWORDS = [
    'password',
    'password123',
    '123456',
    '12345678',
    'qwerty',
    'qwerty123',
    'abc123',
    'password1',
    'admin',
    'admin123',
    'letmein',
    'welcome',
    'monkey',
    'dragon',
    'master',
    'sunshine',
    'princess',
    'football',
    'iloveyou',
    'shadow',
    'superman',
    'michael',
    'ashley',
    'bailey',
    'passw0rd',
    'trustno1',
    '12345',
    '1234567',
    '123456789',
    '1234567890',
    '000000',
    '111111',
    '123123',
    'qwertyuiop',
    'abcdefgh',
    'abc12345',
  ];

  // Special characters allowed
  private static readonly SPECIAL_CHARS = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]+/;

  /**
   * Validate password against all requirements
   * @param password - Password to validate
   * @returns Validation result with errors and strength
   */
  static validate(password: string): PasswordValidation {
    const errors: string[] = [];

    // Check if password exists
    if (!password) {
      return {
        valid: false,
        errors: ['Password is required'],
      };
    }

    // Check minimum length
    if (password.length < this.MIN_LENGTH) {
      errors.push(`Password must be at least ${this.MIN_LENGTH} characters long`);
    }

    // Check maximum length
    if (password.length > this.MAX_LENGTH) {
      errors.push(`Password must not exceed ${this.MAX_LENGTH} characters`);
    }

    // Check for uppercase letter
    if (this.REQUIRE_UPPERCASE && !/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter (A-Z)');
    }

    // Check for lowercase letter
    if (this.REQUIRE_LOWERCASE && !/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter (a-z)');
    }

    // Check for number
    if (this.REQUIRE_NUMBER && !/[0-9]/.test(password)) {
      errors.push('Password must contain at least one number (0-9)');
    }

    // Check for special character
    if (this.REQUIRE_SPECIAL && !this.SPECIAL_CHARS.test(password)) {
      errors.push(
        'Password must contain at least one special character (!@#$%^&*()_+-=[]{};\':"|,.<>/?)'
      );
    }

    // Check for common passwords
    if (this.isCommonPassword(password)) {
      errors.push(
        'This password is too common. Please choose a more unique password'
      );
    }

    // Check for sequential characters
    if (this.hasSequentialCharacters(password)) {
      errors.push('Password should not contain sequential characters (abc, 123, etc.)');
    }

    // Check for repeated characters
    if (this.hasRepeatedCharacters(password)) {
      errors.push('Password should not contain repeated characters (aaa, 111, etc.)');
    }

    // Calculate strength
    const strength = this.calculateStrength(password);

    return {
      valid: errors.length === 0,
      errors,
      strength,
    };
  }

  /**
   * Calculate password strength score
   * @param password - Password to evaluate
   * @returns Password strength details
   */
  static calculateStrength(password: string): PasswordStrength {
    let score = 0;
    const feedback: string[] = [];

    // Length scoring
    if (password.length >= 8) score += 1;
    if (password.length >= 12) score += 1;
    if (password.length >= 16) score += 1;

    // Character variety scoring
    const hasLower = /[a-z]/.test(password);
    const hasUpper = /[A-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = this.SPECIAL_CHARS.test(password);

    let varietyCount = 0;
    if (hasLower) varietyCount++;
    if (hasUpper) varietyCount++;
    if (hasNumber) varietyCount++;
    if (hasSpecial) varietyCount++;

    score += Math.min(varietyCount - 1, 2);

    // Deductions
    if (this.isCommonPassword(password)) {
      score = Math.max(0, score - 2);
      feedback.push('Avoid common passwords');
    }

    if (this.hasSequentialCharacters(password)) {
      score = Math.max(0, score - 1);
      feedback.push('Avoid sequential characters');
    }

    if (this.hasRepeatedCharacters(password)) {
      score = Math.max(0, score - 1);
      feedback.push('Avoid repeated characters');
    }

    // Positive feedback
    if (password.length >= 12) {
      feedback.push('Good length');
    }
    if (varietyCount >= 4) {
      feedback.push('Great character variety');
    }

    // Generate feedback for missing requirements
    if (!hasUpper) feedback.push('Add uppercase letters');
    if (!hasLower) feedback.push('Add lowercase letters');
    if (!hasNumber) feedback.push('Add numbers');
    if (!hasSpecial) feedback.push('Add special characters');

    // Determine label
    let label: PasswordStrength['label'];
    if (score <= 1) label = 'Very Weak';
    else if (score === 2) label = 'Weak';
    else if (score === 3) label = 'Medium';
    else if (score === 4) label = 'Strong';
    else label = 'Very Strong';

    // Check if meets all requirements
    const meetsRequirements =
      password.length >= this.MIN_LENGTH &&
      password.length <= this.MAX_LENGTH &&
      hasLower &&
      hasUpper &&
      hasNumber &&
      hasSpecial &&
      !this.isCommonPassword(password);

    return {
      score,
      label,
      feedback,
      meetsRequirements,
    };
  }

  /**
   * Check if password is in common passwords list
   * @param password - Password to check
   * @returns true if common
   */
  private static isCommonPassword(password: string): boolean {
    return this.COMMON_PASSWORDS.includes(password.toLowerCase());
  }

  /**
   * Check for sequential characters (abc, 123, etc.)
   * @param password - Password to check
   * @returns true if contains sequential characters
   */
  private static hasSequentialCharacters(password: string): boolean {
    const sequences = [
      'abc',
      'bcd',
      'cde',
      'def',
      'efg',
      'fgh',
      'ghi',
      'hij',
      'ijk',
      'jkl',
      'klm',
      'lmn',
      'mno',
      'nop',
      'opq',
      'pqr',
      'qrs',
      'rst',
      'stu',
      'tuv',
      'uvw',
      'vwx',
      'wxy',
      'xyz',
      '123',
      '234',
      '345',
      '456',
      '567',
      '678',
      '789',
      '890',
    ];

    const lowerPassword = password.toLowerCase();
    return sequences.some((seq) => lowerPassword.includes(seq));
  }

  /**
   * Check for repeated characters (aaa, 111, etc.)
   * @param password - Password to check
   * @returns true if contains repeated characters
   */
  private static hasRepeatedCharacters(password: string): boolean {
    return /(.)\1{2,}/.test(password);
  }

  /**
   * Generate a strong random password
   * @param length - Desired length (default 16)
   * @returns Strong random password
   */
  static generateStrongPassword(length: number = 16): string {
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    const special = '!@#$%^&*()_+-=[]{}|;:,.<>?';
    const allChars = lowercase + uppercase + numbers + special;

    let password = '';

    // Ensure at least one of each required character type
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += special[Math.floor(Math.random() * special.length)];

    // Fill the rest randomly
    for (let i = password.length; i < length; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)];
    }

    // Shuffle the password
    return password
      .split('')
      .sort(() => Math.random() - 0.5)
      .join('');
  }

  /**
   * Get password requirements for display
   * @returns Array of requirement strings
   */
  static getRequirements(): string[] {
    return [
      `At least ${this.MIN_LENGTH} characters long`,
      'At least one uppercase letter (A-Z)',
      'At least one lowercase letter (a-z)',
      'At least one number (0-9)',
      'At least one special character (!@#$%^&*)',
      'Not a common password',
      'No sequential characters (abc, 123)',
      'No repeated characters (aaa, 111)',
    ];
  }

  /**
   * Get requirement status for each rule
   * @param password - Password to check
   * @returns Object with each requirement and its status
   */
  static getRequirementStatus(password: string): {
    [key: string]: boolean;
  } {
    return {
      length: password.length >= this.MIN_LENGTH && password.length <= this.MAX_LENGTH,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      special: this.SPECIAL_CHARS.test(password),
      notCommon: !this.isCommonPassword(password),
      noSequential: !this.hasSequentialCharacters(password),
      noRepeated: !this.hasRepeatedCharacters(password),
    };
  }

  /**
   * Check if password matches confirmation
   * @param password - Original password
   * @param confirmation - Confirmation password
   * @returns true if they match
   */
  static matchesConfirmation(password: string, confirmation: string): boolean {
    return password === confirmation;
  }

  /**
   * Get strength color for UI
   * @param strength - Password strength object
   * @returns Tailwind color class
   */
  static getStrengthColor(strength: PasswordStrength): string {
    switch (strength.label) {
      case 'Very Weak':
        return 'text-red-600';
      case 'Weak':
        return 'text-orange-600';
      case 'Medium':
        return 'text-yellow-600';
      case 'Strong':
        return 'text-green-600';
      case 'Very Strong':
        return 'text-emerald-600';
      default:
        return 'text-gray-600';
    }
  }

  /**
   * Get strength bar width percentage
   * @param strength - Password strength object
   * @returns Width percentage (0-100)
   */
  static getStrengthPercentage(strength: PasswordStrength): number {
    return (strength.score / 5) * 100;
  }

  /**
   * Get strength bar color for UI
   * @param strength - Password strength object
   * @returns Tailwind background color class
   */
  static getStrengthBarColor(strength: PasswordStrength): string {
    switch (strength.label) {
      case 'Very Weak':
        return 'bg-red-600';
      case 'Weak':
        return 'bg-orange-600';
      case 'Medium':
        return 'bg-yellow-600';
      case 'Strong':
        return 'bg-green-600';
      case 'Very Strong':
        return 'bg-emerald-600';
      default:
        return 'bg-gray-600';
    }
  }
}

export default PasswordUtils;
