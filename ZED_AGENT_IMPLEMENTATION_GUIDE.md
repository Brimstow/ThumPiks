# 🚀 ThumPiks Implementation Guide

**Version:** 1.0  
**Last Updated:** January 2025  
**Purpose:** Detailed technical implementation roadmap

---

## 📋 TABLE OF CONTENTS

1. [Priority P0: Monetization System](#priority-p0-monetization-system)
2. [Priority P0: AI Cost Optimization](#priority-p0-ai-cost-optimization)
3. [Priority P0: FaceSwap Integration](#priority-p0-faceswap-integration)
4. [Priority P1: Analytics & A/B Testing](#priority-p1-analytics--ab-testing)
5. [Marketing & Growth Tactics](#marketing--growth-tactics)
6. [Success Metrics & KPIs](#success-metrics--kpis)

---

## PRIORITY P0: MONETIZATION SYSTEM

### Stripe Integration (Week 1-2)

#### Step 1: Setup Stripe Account
```bash
# 1. Create Stripe account at stripe.com
# 2. Get API keys (test mode first)
# 3. Install Stripe SDK

npm install stripe @stripe/stripe-js
```

#### Step 2: Create Products & Prices in Stripe Dashboard
```javascript
// Or programmatically:
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Create products
const products = [
  {
    name: 'ThumPiks Starter',
    description: '50 AI thumbnails per month',
    price: 1900, // $19.00 in cents
    credits: 50
  },
  {
    name: 'ThumPiks Pro',
    description: '200 AI thumbnails per month',
    price: 3900, // $39.00
    credits: 200
  },
  {
    name: 'ThumPiks Ultimate',
    description: '600 AI thumbnails per month',
    price: 7900, // $79.00
    credits: 600
  }
];

// Create each product
for (const product of products) {
  const stripeProduct = await stripe.products.create({
    name: product.name,
    description: product.description,
    metadata: { credits: product.credits }
  });
  
  const price = await stripe.prices.create({
    product: stripeProduct.id,
    unit_amount: product.price,
    currency: 'usd',
    recurring: { interval: 'month' }
  });
  
  console.log(`Created: ${product.name} - Price ID: ${price.id}`);
}
```

#### Step 3: Update Database Schema
```prisma
// Add to schema.prisma
model Subscription {
  id                String    @id @default(uuid())
  userId            String
  user              User      @relation(fields: [userId], references: [id])
  
  stripeCustomerId      String?   @unique
  stripeSubscriptionId  String?   @unique
  stripePriceId         String?
  stripeCurrentPeriodEnd DateTime?
  
  planType          String    // 'starter', 'pro', 'ultimate'
  status            String    // 'active', 'canceled', 'past_due', 'trialing'
  creditsBalance    Int       @default(0)
  creditsUsed       Int       @default(0)
  creditsTotal      Int       @default(0)
  
  periodStart       DateTime
  periodEnd         DateTime
  cancelAtPeriodEnd Boolean   @default(false)
  
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
  
  @@index([userId])
  @@index([stripeCustomerId])
  @@index([status])
}

model CreditTransaction {
  id            String   @id @default(uuid())
  userId        String
  user          User     @relation(fields: [userId], references: [id])
  
  amount        Int      // Positive = added, negative = used
  type          String   // 'purchase', 'usage', 'refund', 'bonus'
  description   String?
  thumbnailId   String?  // If related to thumbnail generation
  
  balanceBefore Int
  balanceAfter  Int
  
  createdAt     DateTime @default(now())
  
  @@index([userId])
  @@index([createdAt])
}
```

Run migration:
```bash
npx prisma migrate dev --name add_stripe_fields
npx prisma generate
```

#### Step 4: Backend - Checkout Flow
```typescript
// src/routes/subscription.routes.ts
import { Router } from 'express';
import Stripe from 'stripe';
import { authenticate } from '../middleware/auth';

const router = Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16'
});

// Create checkout session
router.post('/checkout', authenticate, async (req, res) => {
  try {
    const { priceId } = req.body;
    const userId = req.user!.id;
    
    // Get or create Stripe customer
    let customer = await prisma.subscription.findUnique({
      where: { userId },
      select: { stripeCustomerId: true }
    });
    
    if (!customer?.stripeCustomerId) {
      const stripeCustomer = await stripe.customers.create({
        email: req.user!.email,
        metadata: { userId }
      });
      
      await prisma.subscription.upsert({
        where: { userId },
        create: {
          userId,
          stripeCustomerId: stripeCustomer.id,
          planType: 'free',
          status: 'inactive',
          creditsBalance: 5,
          creditsTotal: 5,
          periodStart: new Date(),
          periodEnd: new Date()
        },
        update: {
          stripeCustomerId: stripeCustomer.id
        }
      });
      
      customer = { stripeCustomerId: stripeCustomer.id };
    }
    
    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customer.stripeCustomerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.FRONTEND_URL}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/pricing`,
      metadata: { userId }
    });
    
    res.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    console.error('Checkout error:', error);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

// Get subscription status
router.get('/status', authenticate, async (req, res) => {
  try {
    const subscription = await prisma.subscription.findUnique({
      where: { userId: req.user!.id }
    });
    
    if (!subscription) {
      return res.json({
        planType: 'free',
        status: 'active',
        creditsBalance: 5,
        creditsTotal: 5
      });
    }
    
    res.json(subscription);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch subscription' });
  }
});

export default router;
```

#### Step 5: Webhook Handler
```typescript
// src/routes/webhook.routes.ts
import { Router } from 'express';
import Stripe from 'stripe';
import { raw } from 'body-parser';

const router = Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

// Use raw body for signature verification
router.post('/stripe', raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'] as string;
  
  let event: Stripe.Event;
  
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  
  // Handle different event types
  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
        
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;
        
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
        
      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;
        
      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;
        
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
    
    res.json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    res.status(500).json({ error: 'Webhook handler failed' });
  }
});

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId;
  if (!userId) return;
  
  const subscriptionId = session.subscription as string;
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  
  const priceId = subscription.items.data[0].price.id;
  const product = await stripe.products.retrieve(
    subscription.items.data[0].price.product as string
  );
  
  const credits = parseInt(product.metadata.credits || '50');
  const planType = getPlanTypeFromPrice(priceId);
  
  await prisma.subscription.upsert({
    where: { userId },
    create: {
      userId,
      stripeCustomerId: session.customer as string,
      stripeSubscriptionId: subscriptionId,
      stripePriceId: priceId,
      planType,
      status: 'active',
      creditsBalance: credits,
      creditsTotal: credits,
      creditsUsed: 0,
      periodStart: new Date(subscription.current_period_start * 1000),
      periodEnd: new Date(subscription.current_period_end * 1000),
      stripeCurrentPeriodEnd: new Date(subscription.current_period_end * 1000)
    },
    update: {
      stripeSubscriptionId: subscriptionId,
      stripePriceId: priceId,
      planType,
      status: 'active',
      creditsBalance: credits,
      creditsTotal: credits,
      stripeCurrentPeriodEnd: new Date(subscription.current_period_end * 1000)
    }
  });
  
  console.log(`✅ Subscription activated for user ${userId}`);
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  const subscriptionId = invoice.subscription as string;
  if (!subscriptionId) return;
  
  const subscription = await prisma.subscription.findUnique({
    where: { stripeSubscriptionId: subscriptionId }
  });
  
  if (subscription) {
    // Reset credits on successful payment
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        creditsBalance: subscription.creditsTotal,
        creditsUsed: 0,
        status: 'active'
      }
    });
    
    console.log(`✅ Credits reset for subscription ${subscriptionId}`);
  }
}

function getPlanTypeFromPrice(priceId: string): string {
  // Map price IDs to plan types
  const priceMap: Record<string, string> = {
    [process.env.STRIPE_STARTER_PRICE_ID!]: 'starter',
    [process.env.STRIPE_PRO_PRICE_ID!]: 'pro',
    [process.env.STRIPE_ULTIMATE_PRICE_ID!]: 'ultimate'
  };
  
  return priceMap[priceId] || 'starter';
}

export default router;
```

#### Step 6: Credit Deduction Logic
```typescript
// src/services/credit.service.ts
export class CreditService {
  async deductCredits(userId: string, amount: number, description: string, thumbnailId?: string) {
    const subscription = await prisma.subscription.findUnique({
      where: { userId }
    });
    
    if (!subscription) {
      throw new Error('No subscription found');
    }
    
    if (subscription.creditsBalance < amount) {
      throw new Error('Insufficient credits');
    }
    
    // Deduct credits and create transaction
    const updated = await prisma.$transaction([
      prisma.subscription.update({
        where: { userId },
        data: {
          creditsBalance: { decrement: amount },
          creditsUsed: { increment: amount }
        }
      }),
      prisma.creditTransaction.create({
        data: {
          userId,
          amount: -amount,
          type: 'usage',
          description,
          thumbnailId,
          balanceBefore: subscription.creditsBalance,
          balanceAfter: subscription.creditsBalance - amount
        }
      })
    ]);
    
    return updated[0];
  }
  
  async addCredits(userId: string, amount: number, type: string, description: string) {
    const subscription = await prisma.subscription.findUnique({
      where: { userId }
    });
    
    if (!subscription) {
      throw new Error('No subscription found');
    }
    
    const updated = await prisma.$transaction([
      prisma.subscription.update({
        where: { userId },
        data: {
          creditsBalance: { increment: amount }
        }
      }),
      prisma.creditTransaction.create({
        data: {
          userId,
          amount,
          type,
          description,
          balanceBefore: subscription.creditsBalance,
          balanceAfter: subscription.creditsBalance + amount
        }
      })
    ]);
    
    return updated[0];
  }
  
  async getBalance(userId: string): Promise<number> {
    const subscription = await prisma.subscription.findUnique({
      where: { userId },
      select: { creditsBalance: true }
    });
    
    return subscription?.creditsBalance || 0;
  }
}
```

#### Step 7: Frontend - Pricing Page
```typescript
// client/src/components/PricingPage.tsx
import React, { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY!);

const plans = [
  {
    name: 'Starter',
    price: 19,
    priceId: process.env.REACT_APP_STRIPE_STARTER_PRICE_ID,
    credits: 50,
    features: [
      '50 AI thumbnails/month',
      'Basic editing tools',
      'All templates',
      'Email support'
    ]
  },
  {
    name: 'Pro',
    price: 39,
    priceId: process.env.REACT_APP_STRIPE_PRO_PRICE_ID,
    credits: 200,
    popular: true,
    features: [
      '200 AI thumbnails/month',
      'Advanced editing tools',
      'FaceSwap (coming soon)',
      'A/B testing',
      'Analytics dashboard',
      'Priority support'
    ]
  },
  {
    name: 'Ultimate',
    price: 79,
    priceId: process.env.REACT_APP_STRIPE_ULTIMATE_PRICE_ID,
    credits: 600,
    features: [
      '600 AI thumbnails/month',
      'All Pro features',
      'Custom AI training',
      'API access',
      'White-label option',
      'Dedicated support'
    ]
  }
];

export function PricingPage() {
  const [loading, setLoading] = useState<string | null>(null);
  
  const handleSubscribe = async (priceId: string) => {
    setLoading(priceId);
    
    try {
      const response = await fetch('/api/subscription/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ priceId })
      });
      
      const { url } = await response.json();
      window.location.href = url;
    } catch (error) {
      console.error('Checkout error:', error);
      alert('Failed to start checkout. Please try again.');
    } finally {
      setLoading(null);
    }
  };
  
  return (
    <div className="pricing-page">
      <h1>Choose Your Plan</h1>
      <p>Start with 5 free thumbnails, upgrade anytime</p>
      
      <div className="plans-grid">
        {plans.map(plan => (
          <div 
            key={plan.name} 
            className={`plan-card ${plan.popular ? 'popular' : ''}`}
          >
            {plan.popular && <div className="badge">Most Popular</div>}
            
            <h3>{plan.name}</h3>
            <div className="price">
              <span className="amount">${plan.price}</span>
              <span className="period">/month</span>
            </div>
            
            <ul className="features">
              {plan.features.map(feature => (
                <li key={feature}>✓ {feature}</li>
              ))}
            </ul>
            
            <button
              onClick={() => handleSubscribe(plan.priceId)}
              disabled={loading === plan.priceId}
              className="subscribe-button"
            >
              {loading === plan.priceId ? 'Loading...' : 'Get Started'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
```

#### Step 8: Environment Variables
```bash
# .env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

STRIPE_STARTER_PRICE_ID=price_...
STRIPE_PRO_PRICE_ID=price_...
STRIPE_ULTIMATE_PRICE_ID=price_...

FRONTEND_URL=http://localhost:8556
```

#### Step 9: Testing Checklist
```
□ Create test account
□ Subscribe to Starter plan
□ Verify credits are added (50)
□ Generate thumbnail (credits should deduct)
□ Verify webhook fires on payment
□ Test upgrade flow (Starter → Pro)
□ Test downgrade flow
□ Test cancellation
□ Test payment failure
□ Test card decline
□ Verify email notifications
```

---

## PRIORITY P0: AI COST OPTIMIZATION

### Add Stability AI (Week 3-4)

#### Step 1: Setup Stability AI Account
```bash
# Sign up at stability.ai
# Get API key

npm install stabilityai
```

#### Step 2: Create Multi-Provider AI Service
```typescript
// src/services/ai/ai-provider.interface.ts
export interface AIProvider {
  name: string;
  generateImage(prompt: string, options: GenerateOptions): Promise<string[]>;
  getCost(): number; // Cost per image in USD
  getQuality(): 'standard' | 'premium';
}

export interface GenerateOptions {
  style?: string;
  width?: number;
  height?: number;
  count?: number;
}
```

#### Step 3: Stability AI Implementation
```typescript
// src/services/ai/stability-provider.ts
import Stability from 'stabilityai';

export class StabilityAIProvider implements AIProvider {
  name = 'Stability AI';
  private client: Stability;
  
  constructor() {
    this.client = new Stability({
      apiKey: process.env.STABILITY_API_KEY!
    });
  }
  
  async generateImage(prompt: string, options: GenerateOptions): Promise<string[]> {
    const stylePrompt = this.enhancePrompt(prompt, options.style);
    
    const response = await this.client.generateImage({
      prompt: stylePrompt,
      width: options.width || 1024,
      height: options.height || 1024,
      samples: options.count || 1,
      steps: 30,
      cfg_scale: 7,
      sampler: 'K_DPMPP_2M'
    });
    
    // Convert base64 images to URLs (upload to S3/storage)
    const urls = await Promise.all(
      response.artifacts.map(artifact => 
        this.uploadImage(artifact.base64)
      )
    );
    
    return urls;
  }
  
  getCost(): number {
    return 0.01; // $0.01 per image
  }
  
  getQuality(): 'standard' | 'premium' {
    return 'standard';
  }
  
  private enhancePrompt(prompt: string, style?: string): string {
    const styleEnhancements: Record<string, string> = {
      bold: 'high contrast, vibrant colors, bold design, eye-catching, professional thumbnail',
      minimalist: 'clean, minimal, simple, white space, elegant design',
      dramatic: 'cinematic lighting, dramatic, moody, professional photography'
    };
    
    const enhancement = styleEnhancements[style || 'bold'] || '';
    return `${prompt}, ${enhancement}, youtube thumbnail, 4k, high quality`;
  }
  
  private async uploadImage(base64: string): Promise<string> {
    // Upload to your storage (S3, Cloudinary, etc.)
    // Return public URL
    const buffer = Buffer.from(base64, 'base64');
    // ... upload logic
    return 'https://your-cdn.com/image.png';
  }
}
```

#### Step 4: Update AI Service with Provider Selection
```typescript
// src/services/ai/ai.service.ts
import { DALLEProvider } from './dalle-provider';
import { StabilityAIProvider } from './stability-provider';
import { AIProvider } from './ai-provider.interface';

export class AIService {
  private providers: Map<string, AIProvider>;
  
  constructor() {
    this.providers = new Map([
      ['dalle', new DALLEProvider()],
      ['stability', new StabilityAIProvider()]
    ]);
  }
  
  async generateThumbnails(
    prompt: string,
    style: string,
    quality: 'standard' | 'premium' = 'standard',
    count = 1
  ): Promise<{ urls: string[], cost: number, provider: string }> {
    // Select provider based on quality preference
    const providerName = quality === 'premium' ? 'dalle' : 'stability';
    const provider = this.providers.get(providerName)!;
    
    const urls = await provider.generateImage(prompt, { style, count });
    const cost = provider.getCost() * count;
    
    return {
      urls,
      cost,
      provider: provider.name
    };
  }
  
  getProviders() {
    return Array.from(this.providers.values()).map(p => ({
      name: p.name,
      cost: p.getCost(),
      quality: p.getQuality()
    }));
  }
}
```

#### Step 5: Update Thumbnail Controller
```typescript
// src/controllers/thumbnail.controller.ts
router.post('/generate', authenticate, async (req, res) => {
  const { prompt, style, quality = 'standard', count = 1 } = req.body;
  const userId = req.user!.id;
  
  try {
    // Calculate credit cost
    const creditCost = quality === 'premium' ? count * 2 : count;
    
    // Check credits
    const balance = await creditService.getBalance(userId);
    if (balance < creditCost) {
      return res.status(402).json({ 
        error: 'Insufficient credits',
        required: creditCost,
        available: balance
      });
    }
    
    // Generate thumbnails
    const aiService = new AIService();
    const result = await aiService.generateThumbnails(prompt, style, quality, count);
    
    // Deduct credits
    await creditService.deductCredits(
      userId,
      creditCost,
      `Generated ${count} ${quality} thumbnail(s) using ${result.provider}`
    );
    
    // Save thumbnails
    const thumbnails = await Promise.all(
      result.urls.map(url => 
        prisma.thumbnail.create({
          data: {
            userId,
            projectId: req.body.projectId,
            title: prompt.substring(0, 100),
            imageUrl: url,
            prompt,
            parameters: {
              style,
              quality,
              provider: result.provider,
              cost: result.cost / count
            }
          }
        })
      )
    );
    
    res.json({
      thumbnails,
      creditsUsed: creditCost,
      creditsRemaining: balance - creditCost,
      provider: result.provider
    });
  } catch (error) {
    console.error('Generation error:', error);
    res.status(500).json({ error: 'Failed to generate thumbnails' });
  }
});
```

#### Step 6: Frontend - Quality Selector
```typescript
// client/src/components/CreateThumbnail.tsx
<div className="quality-selector">
  <label>Quality</label>
  <select value={quality} onChange={e => setQuality(e.target.value)}>
    <option value="standard">
      Standard (1 credit) - Stability AI
    </option>
    <option value="premium">
      Premium (2 credits) - DALL-E 3
    </option>
  </select>
  
  <p className="hint">
    {quality === 'standard' 
      ? 'Great quality, fast generation'
      : 'Highest quality, best for important videos'
    }
  </p>
</div>
```

---

## PRIORITY P0: FACESWAP INTEGRATION

### Replicate API Implementation (Month 4)

#### Step 1: Setup Replicate
```bash
npm install replicate
```

#### Step 2: Face Library Database Schema
```prisma
model UserFace {
  id          String   @id @default(uuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id])
  
  name        String   // "Professional", "Casual", "Excited"
  imageUrl    String   // Original face photo URL
  faceData    Json?    // Face embedding/metadata
  
  isPrimary   Boolean  @default(false)
  isActive    Boolean  @default(true)
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  @@index([userId])
}
```

#### Step 3: Face Upload & Processing
```typescript
// src/services/face.service.ts
import Replicate from 'replicate';
import sharp from 'sharp';

export class FaceService {
  private replicate: Replicate;
  
  constructor() {
    this.replicate = new Replicate({
      auth: process.env.REPLICATE_API_TOKEN!
    });
  }
  
  async uploadFace(userId: string, imageBuffer: Buffer, name: string): Promise<UserFace> {
    // 1. Validate image contains a face
    const faceDetected = await this.detectFace(imageBuffer);
    if (!faceDetected) {
      throw new Error('No face detected in image');
    }
    
    // 2. Crop and optimize image
    const processed = await sharp(imageBuffer)
      .resize(512, 512, { fit: 'cover', position: 'attention' })
      .jpeg({ quality: 90 })
      .toBuffer();
    
    // 3. Upload to storage
    const imageUrl = await this.uploadToStorage(processed, userId);
    
    // 4. Extract face embedding
    const faceData = await this.extractFaceEmbedding(imageUrl);
    
    // 5. Save to database
    const userFace = await prisma.userFace.create({
      data: {
        userId,
        name,
        imageUrl,
        faceData,
        isPrimary: false
      }
    });
    
    return userFace;
  }
  
  async swapFace(thumbnailUrl: string, faceId: string): Promise<string> {
    const face = await prisma.userFace.findUnique({
      where: { id: faceId }
    });
    
    if (!face) {
      throw new Error('Face not found');
    }
    
    // Run face swap model
    const output = await this.replicate.run(
      "lucataco/faceswap:9a4298548422074c3f57258c5d544497314ae4112df80d116f0d2109e843d20d",
      {
        input: {
          target_image: thumbnailUrl,
          swap_image: face.imageUrl,
          cache_days: 0
        }
      }
    );
    
    // Output is a URL to the swapped image
    return output as string;
  }
  
  private async detectFace(imageBuffer: Buffer): Promise<boolean> {
    // Use face detection API or local library
    // Return true if face found
    return true; // Simplified
  }
  
  private async extractFaceEmbedding(imageUrl: string): Promise<any> {
    // Extract face features for better swapping
    // This can improve consistency
    return {};
  }
}
```

#### Step 4: API Endpoints
```typescript
// src/routes/face.routes.ts
import multer from 'multer';

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only images allowed'));
    }
    cb(null, true);
  }
});

router.post('/upload', authenticate, upload.single('face'), async (req, res) => {
  try {
    const { name } = req.body;
    const faceService = new FaceService();
    
    const userFace = await faceService.uploadFace(
      req.user!.id,
      req.file!.buffer,
      name
    );
    
    res.json(userFace);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/list', authenticate, async (req, res) => {
  const faces = await prisma.userFace.findMany({
    where: { userId: req.user!.id, isActive: true }
  });
  
  res.json(faces);
});

router.post('/swap', authenticate, async (req, res) => {
  const { thumbnailId, faceId } = req.body;
  const userId = req.user!.id;
  
  try {
    // Check credits (face swap = 2 credits)
    const balance = await creditService.getBalance(userId);
    if (balance < 2) {
      return res.status(402).json({ error: 'Insufficient credits' });
    }
    
    // Get thumbnail
    const thumbnail = await prisma.thumbnail.findUnique({
      where: { id: thumbnailId }
    });
    
    if (!thumbnail || thumbnail.userId !== userId)