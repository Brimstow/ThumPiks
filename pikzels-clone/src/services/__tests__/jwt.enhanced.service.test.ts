import { EnhancedJWTService } from '../jwt.enhanced.service';
import * as jwt from 'jsonwebtoken';

// Set up test environment
const TEST_JWT_SECRET = 'test-secret-key-12345';
const TEST_REFRESH_SECRET = 'test-refresh-secret-67890';

describe('EnhancedJWTService', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Set test secrets
    process.env.JWT_SECRET = TEST_JWT_SECRET;
    process.env.REFRESH_TOKEN_SECRET = TEST_REFRESH_SECRET;
    jest.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('generateSessionId', () => {
    it('should generate a unique session ID', () => {
      const sessionId1 = EnhancedJWTService.generateSessionId();
      const sessionId2 = EnhancedJWTService.generateSessionId();

      expect(sessionId1).toBeDefined();
      expect(sessionId1).toHaveLength(64); // 32 bytes = 64 hex chars
      expect(sessionId1).not.toBe(sessionId2); // Should be unique
    });

    it('should generate hex-encoded session IDs', () => {
      const sessionId = EnhancedJWTService.generateSessionId();
      expect(sessionId).toMatch(/^[a-f0-9]{64}$/);
    });
  });

  describe('createTokens', () => {
    const userId = 'user-123';
    const email = 'test@example.com';

    it('should create access and refresh tokens', () => {
      const result = EnhancedJWTService.createTokens(userId, email);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('sessionId');
      expect(result).toHaveProperty('expiresIn');
      expect(result.expiresIn).toBe(900); // 15 minutes
    });

    it('should create tokens with correct payload', () => {
      const result = EnhancedJWTService.createTokens(userId, email);

      const accessPayload = jwt.verify(result.accessToken, TEST_JWT_SECRET) as any;
      const refreshPayload = jwt.verify(result.refreshToken, TEST_REFRESH_SECRET) as any;

      // Verify access token payload
      expect(accessPayload.userId).toBe(userId);
      expect(accessPayload.email).toBe(email);
      expect(accessPayload.sessionId).toBe(result.sessionId);
      expect(accessPayload.exp).toBeDefined();

      // Verify refresh token payload
      expect(refreshPayload.userId).toBe(userId);
      expect(refreshPayload.email).toBe(email);
      expect(refreshPayload.sessionId).toBe(result.sessionId);
      expect(refreshPayload.type).toBe('refresh');
    });

    it('should create tokens with different expiration times', () => {
      const result = EnhancedJWTService.createTokens(userId, email);

      const accessPayload = jwt.verify(result.accessToken, TEST_JWT_SECRET) as any;
      const refreshPayload = jwt.verify(result.refreshToken, TEST_REFRESH_SECRET) as any;

      // Access token expires in 15 minutes
      const accessExpDiff = accessPayload.exp - accessPayload.iat;
      expect(accessExpDiff).toBe(15 * 60); // 15 minutes

      // Refresh token expires in 7 days
      const refreshExpDiff = refreshPayload.exp - refreshPayload.iat;
      expect(refreshExpDiff).toBe(7 * 24 * 60 * 60); // 7 days
    });

    it('should include same sessionId in both tokens', () => {
      const result = EnhancedJWTService.createTokens(userId, email);

      const accessPayload = jwt.verify(result.accessToken, TEST_JWT_SECRET) as any;
      const refreshPayload = jwt.verify(result.refreshToken, TEST_REFRESH_SECRET) as any;

      expect(accessPayload.sessionId).toBe(refreshPayload.sessionId);
      expect(accessPayload.sessionId).toBe(result.sessionId);
    });
  });

  describe('verifyAccessToken', () => {
    const userId = 'user-456';
    const email = 'verify@example.com';

    it('should verify valid access token', () => {
      const { accessToken, sessionId } = EnhancedJWTService.createTokens(userId, email);

      const payload = EnhancedJWTService.verifyAccessToken(accessToken);

      expect(payload).not.toBeNull();
      expect(payload?.userId).toBe(userId);
      expect(payload?.email).toBe(email);
      expect(payload?.sessionId).toBe(sessionId);
    });

    it('should reject expired access token', () => {
      // Create token that already expired (1 second ago)
      const expiredToken = jwt.sign(
        { userId, email, sessionId: 'test-session' },
        TEST_JWT_SECRET,
        { expiresIn: '-1s' } // Negative means already expired
      );

      const payload = EnhancedJWTService.verifyAccessToken(expiredToken);
      expect(payload).toBeNull();
    });

    it('should reject token with invalid signature', () => {
      const { accessToken } = EnhancedJWTService.createTokens(userId, email);
      
      // Tamper with the token
      const tamperedToken = accessToken.slice(0, -10) + 'tampered12';

      const payload = EnhancedJWTService.verifyAccessToken(tamperedToken);
      expect(payload).toBeNull();
    });

    it('should reject malformed token', () => {
      const payload = EnhancedJWTService.verifyAccessToken('not.a.valid.token');
      expect(payload).toBeNull();
    });

    it('should reject empty token', () => {
      const payload = EnhancedJWTService.verifyAccessToken('');
      expect(payload).toBeNull();
    });

    it('should reject token signed with wrong secret', () => {
      const wrongToken = jwt.sign(
        { userId, email },
        'wrong-secret',
        { expiresIn: '15m' }
      );

      const payload = EnhancedJWTService.verifyAccessToken(wrongToken);
      expect(payload).toBeNull();
    });
  });

  describe('verifyRefreshToken', () => {
    const userId = 'user-789';
    const email = 'refresh@example.com';

    it('should verify valid refresh token', () => {
      const { refreshToken, sessionId } = EnhancedJWTService.createTokens(userId, email);

      const payload = EnhancedJWTService.verifyRefreshToken(refreshToken);

      expect(payload).not.toBeNull();
      expect(payload?.userId).toBe(userId);
      expect(payload?.email).toBe(email);
      expect(payload?.sessionId).toBe(sessionId);
      expect(payload?.type).toBe('refresh');
    });

    it('should reject token without refresh type', () => {
      // Create token without 'refresh' type
      const invalidToken = jwt.sign(
        { userId, email, sessionId: 'test-session' },
        TEST_REFRESH_SECRET,
        { expiresIn: '7d' }
      );

      const payload = EnhancedJWTService.verifyRefreshToken(invalidToken);
      expect(payload).toBeNull();
    });

    it('should reject expired refresh token', () => {
      const expiredToken = jwt.sign(
        { userId, email, sessionId: 'test-session', type: 'refresh' },
        TEST_REFRESH_SECRET,
        { expiresIn: '-1s' } // Already expired
      );

      const payload = EnhancedJWTService.verifyRefreshToken(expiredToken);
      expect(payload).toBeNull();
    });

    it('should reject access token used as refresh token', () => {
      const { accessToken } = EnhancedJWTService.createTokens(userId, email);

      // Try to verify access token as refresh token (should fail)
      const payload = EnhancedJWTService.verifyRefreshToken(accessToken);
      expect(payload).toBeNull();
    });

    it('should reject token with wrong secret', () => {
      const wrongToken = jwt.sign(
        { userId, email, type: 'refresh' },
        'wrong-refresh-secret',
        { expiresIn: '7d' }
      );

      const payload = EnhancedJWTService.verifyRefreshToken(wrongToken);
      expect(payload).toBeNull();
    });
  });

  describe('createResetToken', () => {
    const userId = 'user-reset';
    const email = 'reset@example.com';

    it('should create reset token with correct payload', () => {
      const resetToken = EnhancedJWTService.createResetToken(userId, email);

      expect(resetToken).toBeDefined();

      const payload = jwt.verify(resetToken, TEST_JWT_SECRET) as any;
      expect(payload.userId).toBe(userId);
      expect(payload.email).toBe(email);
      expect(payload.action).toBe('reset-password');
    });

    it('should create reset token with 1 hour expiration', () => {
      const resetToken = EnhancedJWTService.createResetToken(userId, email);

      const payload = jwt.verify(resetToken, TEST_JWT_SECRET) as any;
      const expirationDiff = payload.exp - payload.iat;
      
      expect(expirationDiff).toBe(60 * 60); // 1 hour
    });

    it('should create unique reset tokens', async () => {
      const token1 = EnhancedJWTService.createResetToken(userId, email);
      
      // Wait 1ms to ensure different iat timestamp
      await new Promise(resolve => setTimeout(resolve, 1));
      
      const token2 = EnhancedJWTService.createResetToken(userId, email);

      // Tokens should be different due to iat timestamp
      expect(token1).not.toBe(token2);
    });
  });

  describe('verifyResetToken', () => {
    const userId = 'user-verify-reset';
    const email = 'verify-reset@example.com';

    it('should verify valid reset token', () => {
      const resetToken = EnhancedJWTService.createResetToken(userId, email);

      const payload = EnhancedJWTService.verifyResetToken(resetToken);

      expect(payload).not.toBeNull();
      expect(payload?.userId).toBe(userId);
      expect(payload?.email).toBe(email);
    });

    it('should reject expired reset token', () => {
      const expiredToken = jwt.sign(
        { userId, email, action: 'reset-password' },
        TEST_JWT_SECRET,
        { expiresIn: '-1s' } // Already expired
      );

      const payload = EnhancedJWTService.verifyResetToken(expiredToken);
      expect(payload).toBeNull();
    });

    it('should reject invalid reset token', () => {
      const payload = EnhancedJWTService.verifyResetToken('invalid-token');
      expect(payload).toBeNull();
    });

    it('should reject reset token with wrong secret', () => {
      const wrongToken = jwt.sign(
        { userId, email, action: 'reset-password' },
        'wrong-secret',
        { expiresIn: '1h' }
      );

      const payload = EnhancedJWTService.verifyResetToken(wrongToken);
      expect(payload).toBeNull();
    });
  });

  describe('Security - Token Isolation', () => {
    it('should not allow refresh token to be verified as access token', () => {
      const { refreshToken } = EnhancedJWTService.createTokens('user', 'test@test.com');

      // Refresh token uses different secret, so access verification should fail
      const payload = EnhancedJWTService.verifyAccessToken(refreshToken);
      expect(payload).toBeNull();
    });

    it('should not allow access token to be verified as refresh token', () => {
      const { accessToken } = EnhancedJWTService.createTokens('user', 'test@test.com');

      // Access token doesn't have 'type: refresh', so should fail
      const payload = EnhancedJWTService.verifyRefreshToken(accessToken);
      expect(payload).toBeNull();
    });
  });
});
