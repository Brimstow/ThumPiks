import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as GitHubStrategy } from 'passport-github2';
import { getPrisma } from '../../utils/prisma-factory';
import { logger } from '../../utils/logger';
import { EnhancedJWTService } from '../../services/jwt.enhanced.service';
import { v4 as uuidv4 } from 'uuid';

const prisma = getPrisma();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface PassportProfile {
  id: string;
  provider: string;
  displayName?: string;
  username?: string;
  emails?: Array<{ value: string }>;
  photos?: Array<{ value: string }>;
  [key: string]: unknown;
}

interface OAuthProfile {
  id: string;
  provider: 'google' | 'github';
  email: string;
  name: string;
  avatar?: string;
}

interface OAuthUser {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string | null;
  isVerified: boolean;
}

export class OAuthService {
  static initializePassport() {
    // Google OAuth Strategy
    if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      // secretlint-disable-next-line @secretlint/secretlint-rule-pattern
      passport.use(
        new GoogleStrategy(
          {
            clientID: process.env.GOOGLE_CLIENT_ID,
            // secretlint-disable-next-line @secretlint/secretlint-rule-pattern
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            callbackURL: '/api/auth/google/callback',
          },
          this.handleOAuthCallback as any
        )
      ); // OAuth library types are complex

      logger.info('Google OAuth strategy initialized');
    }

    // GitHub OAuth Strategy
    if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      // secretlint-disable-next-line @secretlint/secretlint-rule-pattern
      passport.use(
        new GitHubStrategy(
          {
            clientID: process.env.GITHUB_CLIENT_ID,
            // secretlint-disable-next-line @secretlint/secretlint-rule-pattern
            clientSecret: process.env.GITHUB_CLIENT_SECRET,
            callbackURL: '/api/auth/github/callback',
          },
          this.handleOAuthCallback as any
        )
      ); // OAuth library types are complex

      logger.info('GitHub OAuth strategy initialized');
    }

    // Serialize/deserialize user for session
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    passport.serializeUser((user: any, done) => {
      done(null, user.id);
    });

    passport.deserializeUser(async (id: string, done) => {
      try {
        const user = await prisma.user.findUnique({
          where: { id },
          select: {
            id: true,
            email: true,
            name: true,
            avatarUrl: true,
            isVerified: true,
          },
        });
        done(null, user);
      } catch (error) {
        done(error, null);
      }
    });
  }

  static async handleOAuthCallback(
    _accessToken: string,
    _refreshToken: string,
    profile: PassportProfile,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    done: any
  ) {
    try {
      const oauthProfile: OAuthProfile = {
        id: profile.id,
        provider: profile.provider as 'google' | 'github',
        email: profile.emails?.[0]?.value ?? '',
        name: profile.displayName ?? profile.username ?? '',
        ...(profile.photos?.[0]?.value && { avatar: profile.photos[0].value }),
      };

      if (!oauthProfile.email) {
        return done(
          new Error('No email address provided by OAuth provider'),
          null
        );
      }

      // Check if user exists
      let user = await prisma.user.findUnique({
        where: { email: oauthProfile.email },
      });

      if (user) {
        // Update existing user with OAuth info
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            name: user.name ?? oauthProfile.name,
            avatarUrl: user.avatarUrl ?? oauthProfile.avatar ?? null,
            isVerified: true, // OAuth users are auto-verified
          },
        });

        logger.info('OAuth login successful', {
          userId: user.id,
          provider: oauthProfile.provider,
          email: oauthProfile.email,
        });
      } else {
        // Create new user
        // Generate username from email or name
        const emailParts = oauthProfile.email.split('@');
        const DEFAULT_USERNAME = 'user';
        const baseUsername = (emailParts[0] ?? DEFAULT_USERNAME)
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '');
        user = await prisma.user.create({
          data: {
            id: uuidv4(),
            email: oauthProfile.email,
            username: baseUsername, // OAuth users get username from email
            name: oauthProfile.name,
            avatarUrl: oauthProfile.avatar ?? null,
            passwordHash: '', // OAuth users don't have passwords
            isVerified: true,
            updatedAt: new Date(),
          },
        });

        logger.info('OAuth user created', {
          userId: user.id,
          provider: oauthProfile.provider,
          email: oauthProfile.email,
        });
      }

      return done(null, user);
    } catch (error) {
      logger.error('OAuth callback error', error as Error, {
        provider: profile.provider,
        profileId: profile.id,
      });
      return done(error, null);
    }
  }

  static async generateTokensForOAuthUser(user: OAuthUser) {
    try {
      const tokens = EnhancedJWTService.createTokens(user.id, user.email);

      logger.info('OAuth tokens generated', {
        userId: user.id,
        email: user.email,
      });

      return {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          avatarUrl: user.avatarUrl,
          isVerified: user.isVerified,
        },
        ...tokens,
      };
    } catch (error) {
      logger.error('Failed to generate OAuth tokens', error as Error, {
        userId: user.id,
      });
      throw new Error('Failed to generate authentication tokens');
    }
  }
}
