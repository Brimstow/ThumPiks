import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as GitHubStrategy } from 'passport-github2';
import { PrismaClient } from '@prisma/client';
import { logger } from '../../utils/logger';
import { EnhancedJWTService } from '../../services/jwt.enhanced.service';

const prisma = new PrismaClient();

interface OAuthProfile {
  id: string;
  provider: 'google' | 'github';
  email: string;
  name: string;
  avatar?: string;
}

export class OAuthService {
  
  static initializePassport() {
    // Google OAuth Strategy
    if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
      passport.use(new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: "/api/auth/google/callback"
      }, this.handleOAuthCallback));
      
      logger.info('Google OAuth strategy initialized');
    }

    // GitHub OAuth Strategy  
    if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
      passport.use(new GitHubStrategy({
        clientID: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
        callbackURL: "/api/auth/github/callback"
      }, this.handleOAuthCallback));
      
      logger.info('GitHub OAuth strategy initialized');
    }

    // Serialize/deserialize user for session
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
    profile: any,
    done: any
  ) {
    try {
      const oauthProfile: OAuthProfile = {
        id: profile.id,
        provider: profile.provider,
        email: profile.emails?.[0]?.value,
        name: profile.displayName || profile.username,
        avatar: profile.photos?.[0]?.value,
      };

      if (!oauthProfile.email) {
        return done(new Error('No email address provided by OAuth provider'), null);
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
            name: user.name || oauthProfile.name,
            avatarUrl: user.avatarUrl || oauthProfile.avatar || null,
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
        user = await prisma.user.create({
          data: {
            email: oauthProfile.email,
            name: oauthProfile.name,
            avatarUrl: oauthProfile.avatar || null,
            passwordHash: '', // OAuth users don't have passwords
            isVerified: true,
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

  static async generateTokensForOAuthUser(user: any) {
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