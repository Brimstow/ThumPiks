# Extending Password Recovery Guide

This guide explains how to extend and customize the password recovery functionality.

## Overview

The password recovery system is designed to be extensible and can be customized to meet specific requirements. This guide covers common extensions and customizations.

## Integrating Real Email Services

The current implementation simulates email sending by logging to the console. To integrate a real email service, you'll need to modify the EmailService.

### Example: Integrating SendGrid

1. Install the SendGrid package:
```bash
npm install @sendgrid/mail
```

2. Update the EmailService:
```typescript
// src/modules/auth/email.service.ts
import sgMail from '@sendgrid/mail';

sgMail.setApiKey(process.env.SENDGRID_API_KEY || '');

export class EmailService {
  static async sendPasswordResetEmail(email: string, userId: string): Promise<{ resetToken: string }> {
    // Generate reset token
    const resetToken = jwt.sign({ userId, action: 'reset-password' }, JWT_SECRET, {
      expiresIn: '1h'
    });

    // Send email via SendGrid
    const msg = {
      to: email,
      from: 'noreply@pikzels.com',
      subject: 'Password Reset Request',
      html: `
        <p>Hello,</p>
        <p>You have requested to reset your password. Please click the link below to reset your password:</p>
        <p><a href="http://localhost:5173/reset-password?token=${resetToken}">Reset Password</a></p>
        <p>This link will expire in 1 hour.</p>
        <p>If you did not request a password reset, please ignore this email.</p>
        <p>Thanks,<br>The Pikzels Team</p>
      `,
    };

    try {
      await sgMail.send(msg);
    } catch (error) {
      console.error('Error sending email:', error);
      throw new Error('Failed to send password reset email');
    }

    return { resetToken };
  }
}
```

### Environment Variables

Add your email service API keys to `.env`:
```env
SENDGRID_API_KEY=your_sendgrid_api_key_here
```

## Customizing Token Expiration

The default token expiration is 1 hour. To change this:

```typescript
// In auth.service.ts requestPasswordReset method
const resetToken = jwt.sign({ userId, action: 'reset-password' }, JWT_SECRET, {
  expiresIn: '2h' // Change to 2 hours
});
```

Common expiration formats:
- `'30m'` - 30 minutes
- `'1h'` - 1 hour (default)
- `'2h'` - 2 hours
- `'6h'` - 6 hours
- `'1d'` - 1 day

## Adding Rate Limiting

To prevent abuse, you can add rate limiting to password reset requests:

```typescript
// Install rate limiting middleware
// npm install express-rate-limit

// In server.ts or auth.routes.ts
import rateLimit from 'express-rate-limit';

const passwordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3, // limit each IP to 3 requests per windowMs
  message: 'Too many password reset requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply to routes
router.post('/request-password-reset', passwordResetLimiter, (req, res) => authController.requestPasswordReset(req, res));
```

## Adding Security Questions

To add security questions as an additional verification step:

1. Update the User model in `prisma/schema.prisma`:
```prisma
model User {
  // ... existing fields
  securityQuestion String?
  securityAnswer   String?
}
```

2. Run migration:
```bash
npx prisma migrate dev --name add_security_questions
```

3. Update AuthService to include security question validation:
```typescript
async validateSecurityQuestion(userId: string, answer: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId }
  });

  if (!user || !user.securityAnswer) {
    return false;
  }

  return await bcrypt.compare(answer.toLowerCase(), user.securityAnswer);
}
```

## Adding SMS Recovery Option

To add SMS as a recovery option:

1. Install SMS service package (example with Twilio):
```bash
npm install twilio
```

2. Add SMS method to EmailService:
```typescript
import twilio from 'twilio';

static async sendPasswordResetSMS(phone: string, resetToken: string): Promise<void> {
  const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  
  await client.messages.create({
    body: `Your password reset code: ${resetToken}`,
    from: process.env.TWILIO_PHONE_NUMBER,
    to: phone
  });
}
```

## Adding Multi-Factor Authentication

To extend password recovery with MFA:

1. Add MFA fields to User model:
```prisma
model User {
  // ... existing fields
  mfaEnabled     Boolean   @default(false)
  mfaMethod      String?   // 'sms' or 'email' or 'authenticator'
  mfaPhoneNumber String?
  mfaSecret      String?   // For authenticator apps
}
```

2. Update reset flow to include MFA verification step

## Customizing Frontend Components

### Styling

To customize the appearance of the components:

1. Update Tailwind classes in the JSX
2. Add custom CSS classes
3. Modify the color scheme

### Adding Captcha

To add reCAPTCHA to the forms:

1. Install react-google-recaptcha:
```bash
npm install react-google-recaptcha
```

2. Update ForgotPassword component:
```tsx
import ReCAPTCHA from "react-google-recaptcha";

const ForgotPassword: React.FC = () => {
  const [recaptchaValue, setRecaptchaValue] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!recaptchaValue) {
      setError('Please complete the reCAPTCHA');
      return;
    }
    
    // ... rest of submit logic
  };

  return (
    <form onSubmit={handleSubmit}>
      // ... existing form fields
      
      <ReCAPTCHA
        sitekey="your-site-key"
        onChange={setRecaptchaValue}
      />
      
      // ... submit button
    </form>
  );
};
```

## Adding Analytics

To track password recovery events:

```typescript
// In AuthService methods
import analytics from '../utils/analytics';

async requestPasswordReset(email: string) {
  // ... existing logic
  
  // Track event
  analytics.track('password_reset_requested', {
    email: email,
    timestamp: new Date().toISOString()
  });
  
  return result;
}

async resetPassword(token: string, newPassword: string) {
  try {
    // ... existing logic
    
    // Track success
    analytics.track('password_reset_completed', {
      userId: decoded.userId,
      timestamp: new Date().toISOString()
    });
    
    return result;
  } catch (error) {
    // Track failure
    analytics.track('password_reset_failed', {
      error: error.message,
      timestamp: new Date().toISOString()
    });
    
    throw error;
  }
}
```

## Adding Database Token Storage

For enhanced security, you can store tokens in the database:

1. Update User model:
```prisma
model User {
  // ... existing fields
  resetToken      String?   @unique
  resetTokenExpiry DateTime?
}
```

2. Update AuthService:
```typescript
async requestPasswordReset(email: string) {
  // ... existing validation
  
  // Generate random token
  const resetToken = crypto.randomBytes(32).toString('hex');
  const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour
  
  // Store in database
  await prisma.user.update({
    where: { email },
    data: {
      resetToken,
      resetTokenExpiry
    }
  });
  
  // Send email with token
  await EmailService.sendPasswordResetEmail(email, resetToken);
  
  return { message: 'If your email is registered, you will receive a password reset link.' };
}

async resetPassword(token: string, newPassword: string) {
  // Find user with valid token
  const user = await prisma.user.findFirst({
    where: {
      resetToken: token,
      resetTokenExpiry: {
        gt: new Date()
      }
    }
  });
  
  if (!user) {
    throw new Error('Invalid or expired password reset token');
  }
  
  // ... rest of logic
  
  // Clear token
  await prisma.user.update({
    where: { id: user.id },
    data: {
      resetToken: null,
      resetTokenExpiry: null
    }
  });
}
```

## Testing Extensions

### Unit Tests

Add tests for new functionality:

```typescript
// auth.service.test.ts
describe('Password Recovery Extensions', () => {
  it('should handle custom token expiration', async () => {
    // Test with different expiration times
  });
  
  it('should integrate with email service', async () => {
    // Test email sending
  });
  
  it('should handle rate limiting', async () => {
    // Test rate limiting behavior
  });
});
```

### Integration Tests

Test the complete flow with extensions:

```typescript
// test-password-recovery-extended.js
describe('Extended Password Recovery Flow', () => {
  it('should complete recovery with MFA', async () => {
    // Test extended flow
  });
});
```

## Troubleshooting

### Common Issues

1. **Emails not sending**: Check API keys and environment variables
2. **Tokens expiring too quickly**: Adjust expiration time
3. **Rate limiting blocking legitimate requests**: Adjust limits
4. **MFA not working**: Verify secret storage and validation

### Debugging Tips

1. Enable detailed logging
2. Use development tools to inspect network requests
3. Check browser console for frontend errors
4. Verify database records for token storage approaches

## Best Practices

1. **Security**: Always hash sensitive data
2. **Usability**: Provide clear error messages
3. **Monitoring**: Log important events
4. **Testing**: Test all edge cases
5. **Documentation**: Keep documentation updated
6. **Environment**: Use different settings for development and production