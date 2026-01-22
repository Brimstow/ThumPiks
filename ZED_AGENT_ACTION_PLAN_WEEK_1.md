# 🚀 ThumPiks - Week 1 Action Plan

**Created:** January 2025  
**Status:** READY TO EXECUTE  
**Goal:** Make product revenue-ready in 7 days

---

## 📊 CURRENT SITUATION

**What We Have:**
- ✅ Working app with user authentication
- ✅ Basic AI thumbnail generation (DALL-E 3)
- ✅ Project management
- ✅ Database schema (includes subscription tables)
- ✅ Good technical foundation

**Critical Gaps:**
- ❌ NO monetization/payment system
- ❌ NO credit tracking
- ❌ NO pricing page
- ❌ AI costs too high (DALL-E only)
- ❌ Weak landing page

**Bottom Line:** We have a product but no business model. Fix this first!

---

## 🎯 WEEK 1 OBJECTIVES

By end of week, you must have:
1. ✅ Stripe payment integration working
2. ✅ Users can subscribe to paid plans
3. ✅ Credits are tracked and deducted
4. ✅ First paying customer (even if it's just a test)

**Success Metric:** 1 person pays for a subscription = YOU WIN

---

## 📅 DAY-BY-DAY BREAKDOWN

### DAY 1 (Monday) - Stripe Setup [4 hours]

#### Morning (2 hours)
**Task 1.1: Create Stripe Account**
- [ ] Go to https://stripe.com and sign up
- [ ] Verify email and business details
- [ ] Enable test mode
- [ ] Get API keys (test mode):
  - Publishable key: `pk_test_...`
  - Secret key: `sk_test_...`
- [ ] Save in `.env` file

**Task 1.2: Install Stripe SDK**
```bash
# Backend
cd pikzels-clone
npm install stripe

# Frontend
cd client
npm install @stripe/stripe-js
```

#### Afternoon (2 hours)
**Task 1.3: Create Products in Stripe Dashboard**

Go to Stripe Dashboard → Products → Create Product

**Product 1: ThumPiks Starter**
- Name: ThumPiks Starter
- Description: 50 AI thumbnails per month
- Pricing: $19/month (recurring)
- Add metadata: `credits: 50`
- Copy Price ID: `price_xxx...`

**Product 2: ThumPiks Pro**
- Name: ThumPiks Pro
- Description: 200 AI thumbnails per month  
- Pricing: $39/month (recurring)
- Add metadata: `credits: 200`
- Copy Price ID: `price_xxx...`

**Product 3: ThumPiks Ultimate**
- Name: ThumPiks Ultimate
- Description: 600 AI thumbnails per month
- Pricing: $79/month (recurring)
- Add metadata: `credits: 600`
- Copy Price ID: `price_xxx...`

**Task 1.4: Update Environment Variables**
```bash
# Add to pikzels-clone/.env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...

STRIPE_STARTER_PRICE_ID=price_...
STRIPE_PRO_PRICE_ID=price_...
STRIPE_ULTIMATE_PRICE_ID=price_...

FRONTEND_URL=http://localhost:8556
```

```bash
# Add to pikzels-clone/client/.env
REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_test_...
REACT_APP_STRIPE_STARTER_PRICE_ID=price_...
REACT_APP_STRIPE_PRO_PRICE_ID=price_...
REACT_APP_STRIPE_ULTIMATE_PRICE_ID=price_...
```

---

### DAY 2 (Tuesday) - Database Schema Update [3 hours]

**Task 2.1: Update Prisma Schema**

Add to `pikzels-clone/prisma/schema.prisma`:

```prisma
model Subscription {
  id                    String    @id @default(uuid())
  userId                String    @unique
  user                  User      @relation(fields: [userId], references: [id])
  
  stripeCustomerId      String?   @unique
  stripeSubscriptionId  String?   @unique
  stripePriceId         String?
  
  planType              String    @default("free") // 'free', 'starter', 'pro', 'ultimate'
  status                String    @default("active") // 'active', 'canceled', 'past_due'
  
  creditsBalance        Int       @default(5)
  creditsTotal          Int       @default(5)
  creditsUsed           Int       @default(0)
  
  periodStart           DateTime  @default(now())
  periodEnd             DateTime
  cancelAtPeriodEnd     Boolean   @default(false)
  
  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt
  
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
  thumbnailId   String?
  
  balanceBefore Int
  balanceAfter  Int
  
  createdAt     DateTime @default(now())
  
  @@index([userId])
  @@index([createdAt])
}
```

Also update User model to add relations:
```prisma
model User {
  // ... existing fields ...
  subscription      Subscription?
  creditTransactions CreditTransaction[]
}
```

**Task 2.2: Run Migration**
```bash
cd pikzels-clone
npx prisma migrate dev --name add_subscription_system
npx prisma generate
```

**Task 2.3: Verify Migration**
```bash
npx prisma studio
# Check that Subscription and CreditTransaction tables exist
```

---

### DAY 3 (Wednesday) - Backend API Routes [5 hours]

**Task 3.1: Create Subscription Routes**

Create `pikzels-clone/src/routes/subscription.routes.ts`:
```typescript
import { Router } from 'express';
import Stripe from 'stripe';
import { authenticate } from '../middleware/auth';
import { prisma } from '../config/database';

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
    let subscription = await prisma.subscription.findUnique({
      where: { userId }
    });
    
    let customerId = subscription?.stripeCustomerId;
    
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: req.user!.email,
        metadata: { userId }
      });
      customerId = customer.id;
      
      // Create subscription record
      await prisma.subscription.upsert({
        where: { userId },
        create: {
          userId,
          stripeCustomerId: customerId,
          planType: 'free',
          creditsBalance: 5,
          creditsTotal: 5,
          periodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        },
        update: {
          stripeCustomerId: customerId
        }
      });
    }
    
    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.FRONTEND_URL}/dashboard?success=true`,
      cancel_url: `${process.env.FRONTEND_URL}/pricing?canceled=true`,
      metadata: { userId }
    });
    
    res.json({ url: session.url });
  } catch (error: any) {
    console.error('Checkout error:', error);
    res.status(500).json({ error: error.message });
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
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
```

**Task 3.2: Register Routes**

Update `pikzels-clone/src/server.ts`:
```typescript
import subscriptionRoutes from './routes/subscription.routes';

// Add after other routes
app.use('/api/subscription', subscriptionRoutes);
```

**Task 3.3: Test Backend**
```bash
# Start server
npm run dev

# Test in another terminal
curl http://localhost:8550/api/subscription/status \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### DAY 4 (Thursday) - Credit System [4 hours]

**Task 4.1: Create Credit Service**

Create `pikzels-clone/src/services/credit.service.ts`:
```typescript
import { prisma } from '../config/database';

export class CreditService {
  async deductCredits(
    userId: string, 
    amount: number, 
    description: string,
    thumbnailId?: string
  ) {
    const subscription = await prisma.subscription.findUnique({
      where: { userId }
    });
    
    if (!subscription) {
      throw new Error('No subscription found');
    }
    
    if (subscription.creditsBalance < amount) {
      throw new Error('Insufficient credits');
    }
    
    // Deduct credits atomically
    const [updated] = await prisma.$transaction([
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
    
    return updated;
  }
  
  async getBalance(userId: string): Promise<number> {
    const subscription = await prisma.subscription.findUnique({
      where: { userId },
      select: { creditsBalance: true }
    });
    
    return subscription?.creditsBalance || 0;
  }
}

export const creditService = new CreditService();
```

**Task 4.2: Update Thumbnail Generation**

Modify `pikzels-clone/src/routes/thumbnail.routes.ts` (or wherever thumbnails are created):
```typescript
import { creditService } from '../services/credit.service';

router.post('/generate', authenticate, async (req, res) => {
  const { prompt, style, projectId } = req.body;
  const userId = req.user!.id;
  
  try {
    // Check credits BEFORE generating
    const balance = await creditService.getBalance(userId);
    if (balance < 1) {
      return res.status(402).json({ 
        error: 'Insufficient credits. Please upgrade your plan.',
        creditsNeeded: 1,
        creditsAvailable: balance
      });
    }
    
    // Generate thumbnail (your existing code)
    const imageUrl = await aiService.generateThumbnails(prompt, style, 1);
    
    // Deduct credit AFTER successful generation
    await creditService.deductCredits(
      userId,
      1,
      `Generated thumbnail: ${prompt.substring(0, 50)}`
    );
    
    // Save thumbnail
    const thumbnail = await prisma.thumbnail.create({
      data: {
        userId,
        projectId,
        title: prompt.substring(0, 100),
        imageUrl: imageUrl[0],
        prompt,
        parameters: { style }
      }
    });
    
    const newBalance = await creditService.getBalance(userId);
    
    res.json({
      thumbnail,
      creditsUsed: 1,
      creditsRemaining: newBalance
    });
  } catch (error: any) {
    console.error('Generation error:', error);
    res.status(500).json({ error: error.message });
  }
});
```

---

### DAY 5 (Friday) - Frontend Pricing Page [4 hours]

**Task 5.1: Create Pricing Component**

Create `pikzels-clone/client/src/components/PricingPage.tsx`:
```typescript
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const plans = [
  {
    name: 'Free',
    price: 0,
    priceId: null,
    credits: 5,
    features: [
      '5 AI thumbnails/month',
      'Basic templates',
      'Standard quality',
      'Email support'
    ]
  },
  {
    name: 'Starter',
    price: 19,
    priceId: process.env.REACT_APP_STRIPE_STARTER_PRICE_ID,
    credits: 50,
    features: [
      '50 AI thumbnails/month',
      'All templates',
      'Standard + HD quality',
      'Priority email support'
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
      'All templates',
      'HD quality',
      'Advanced editing tools',
      'Priority support',
      'Coming soon: FaceSwap'
    ]
  },
  {
    name: 'Ultimate',
    price: 79,
    priceId: process.env.REACT_APP_STRIPE_ULTIMATE_PRICE_ID,
    credits: 600,
    features: [
      '600 AI thumbnails/month',
      'Everything in Pro',
      'API access',
      'Custom AI training',
      'Dedicated support',
      'Early access to new features'
    ]
  }
];

export function PricingPage() {
  const [loading, setLoading] = useState<string | null>(null);
  const navigate = useNavigate();
  
  const handleSubscribe = async (priceId: string | null) => {
    if (!priceId) {
      navigate('/signup');
      return;
    }
    
    setLoading(priceId);
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login?redirect=/pricing');
        return;
      }
      
      const response = await fetch('http://localhost:8550/api/subscription/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
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
    <div className="pricing-page" style={{ padding: '40px 20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ textAlign: 'center', fontSize: '36px', marginBottom: '10px' }}>
        Choose Your Plan
      </h1>
      <p style={{ textAlign: 'center', color: '#666', marginBottom: '40px' }}>
        Start free, upgrade anytime. No credit card required for free plan.
      </p>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
        {plans.map(plan => (
          <div 
            key={plan.name}
            style={{
              border: plan.popular ? '2px solid #6366f1' : '1px solid #e5e7eb',
              borderRadius: '12px',
              padding: '30px',
              position: 'relative',
              backgroundColor: 'white',
              boxShadow: plan.popular ? '0 10px 25px rgba(99, 102, 241, 0.2)' : '0 4px 6px rgba(0,0,0,0.1)'
            }}
          >
            {plan.popular && (
              <div style={{
                position: 'absolute',
                top: '-12px',
                left: '50%',
                transform: 'translateX(-50%)',
                backgroundColor: '#6366f1',
                color: 'white',
                padding: '4px 16px',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: 'bold'
              }}>
                MOST POPULAR
              </div>
            )}
            
            <h3 style={{ fontSize: '24px', marginBottom: '10px' }}>{plan.name}</h3>
            
            <div style={{ marginBottom: '20px' }}>
              <span style={{ fontSize: '48px', fontWeight: 'bold' }}>${plan.price}</span>
              <span style={{ color: '#666' }}>/month</span>
            </div>
            
            <p style={{ color: '#666', marginBottom: '20px' }}>
              {plan.credits} thumbnails per month
            </p>
            
            <ul style={{ listStyle: 'none', padding: 0, marginBottom: '30px' }}>
              {plan.features.map((feature, i) => (
                <li key={i} style={{ padding: '8px 0', display: 'flex', alignItems: 'center' }}>
                  <span style={{ color: '#10b981', marginRight: '8px' }}>✓</span>
                  {feature}
                </li>
              ))}
            </ul>
            
            <button
              onClick={() => handleSubscribe(plan.priceId)}
              disabled={loading === plan.priceId}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: plan.popular ? '#6366f1' : '#f3f4f6',
                color: plan.popular ? 'white' : '#374151',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: loading === plan.priceId ? 'wait' : 'pointer'
              }}
            >
              {loading === plan.priceId ? 'Loading...' : plan.price === 0 ? 'Get Started' : 'Subscribe Now'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
```

**Task 5.2: Add Route**

Update `pikzels-clone/client/src/App.tsx`:
```typescript
import { PricingPage } from './components/PricingPage';

// Add route
<Route path="/pricing" element={<PricingPage />} />
```

**Task 5.3: Add Navigation Link**

Add to your navigation menu:
```typescript
<Link to="/pricing">Pricing</Link>
```

---

### DAY 6 (Saturday) - Stripe Webhooks [5 hours]

**Task 6.1: Create Webhook Handler**

Create `pikzels-clone/src/routes/webhook.routes.ts`:
```typescript
import { Router } from 'express';
import { raw } from 'body-parser';
import Stripe from 'stripe';
import { prisma } from '../config/database';

const router = Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

router.post('/stripe', raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'] as string;
  
  let event: Stripe.Event;
  
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  
  console.log('Webhook received:', event.type);
  
  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
        
      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;
        
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
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
  
  // Map price ID to credits
  const creditMap: Record<string, { planType: string, credits: number }> = {
    [process.env.STRIPE_STARTER_PRICE_ID!]: { planType: 'starter', credits: 50 },
    [process.env.STRIPE_PRO_PRICE_ID!]: { planType: 'pro', credits: 200 },
    [process.env.STRIPE_ULTIMATE_PRICE_ID!]: { planType: 'ultimate', credits: 600 }
  };
  
  const plan = creditMap[priceId] || { planType: 'starter', credits: 50 };
  
  await prisma.subscription.upsert({
    where: { userId },
    create: {
      userId,
      stripeCustomerId: session.customer as string,
      stripeSubscriptionId: subscriptionId,
      stripePriceId: priceId,
      planType: plan.planType,
      status: 'active',
      creditsBalance: plan.credits,
      creditsTotal: plan.credits,
      creditsUsed: 0,
      periodStart: new Date(subscription.current_period_start * 1000),
      periodEnd: new Date(subscription.current_period_end * 1000)
    },
    update: {
      stripeSubscriptionId: subscriptionId,
      stripePriceId: priceId,
      planType: plan.planType,
      status: 'active',
      creditsBalance: plan.credits,
      creditsTotal: plan.credits,
      creditsUsed: 0,
      periodEnd: new Date(subscription.current_period_end * 1000)
    }
  });
  
  console.log(`✅ Subscription activated: ${userId} - ${plan.planType}`);
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  const subscriptionId = invoice.subscription as string;
  if (!subscriptionId) return;
  
  const sub = await prisma.subscription.findUnique({
    where: { stripeSubscriptionId: subscriptionId }
  });
  
  if (sub) {
    await prisma.subscription.update({
      where: { id: sub.id },
      data: {
        creditsBalance: sub.creditsTotal,
        creditsUsed: 0,
        status: 'active'
      }
    });
    console.log(`✅ Credits reset for subscription ${subscriptionId}`);
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  await prisma.subscription.updateMany({
    where: { stripeSubscriptionId: subscription.id },
    data: { status: 'canceled' }
  });
  console.log(`✅ Subscription canceled: ${subscription.id}`);
}

export default router;
```

**Task 6.2: Register Webhook Route**

Update `pikzels-clone/src/server.ts`:
```typescript
import webhookRoutes from './routes/webhook.routes';

// IMPORTANT: Add BEFORE body parser middleware
app.use('/api/webhook', webhookRoutes);

// Then add body parser
app.use(express.json());
```

**Task 6.3: Setup Stripe Webhook Endpoint**
```bash
# Install Stripe CLI
# Windows: scoop install stripe
# Mac: brew install stripe/stripe-cli/stripe
# Or download from: https://stripe.com/docs/stripe-cli

# Login
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:8550/api/webhook/stripe

# This will output a webhook secret like: whsec_...
# Add it to .env:
STRIPE_WEBHOOK_SECRET=whsec_...
```

---

### DAY 7 (Sunday) - Testing & Launch [4 hours]

**Task 7.1: End-to-End Testing**

Test the complete flow:

```
Test Plan:
□ Create new account
□ Login successfully
□ Go to /pricing page
□ Click "Subscribe" on Starter plan
□ Complete Stripe checkout (use test card: 4242 4242 4242 4242)
□ Redirect back to dashboard
□ Check subscription status shows "Starter" plan
□ Check credits show 50
□ Generate 1 thumbnail
□ Check credits now show 49
□ Verify thumbnail is created
□ Generate 49 more thumbnails to use all credits
□ Try to generate 1 more (should fail with "Insufficient credits")
```

**Test Cards (Stripe Test Mode):**
- Success: 4242 4242 4242 4242
- Decline: 4000 0000 0000 0002
- Requires authentication: 4000 0025 0000 3155

**Task 7.2: Fix Any Bugs**

Common issues to check:
- CORS errors (add frontend URL to CORS allowlist)
- Auth token not being sent
- Webhook not receiving events
- Credits not deducting
- Redirect URLs incorrect

**Task 7.3: Deploy to Production (Optional)**

If you want to accept real payments:
```bash
# 1. Switch Stripe to live mode
# 2. Get live API keys
# 3. Update .env with live keys
# 4. Set up production webhook endpoint
# 5. Test with real card (charge $1, then refund)
```

**Task 7.4: Create First Real Customer**

Options:
- Ask a friend to be your first paying customer
- Post in YouTube creator communities
- Tweet about launch
- Reddit (r/YouTubers - be helpful, not spammy)

---

## 📝 ENVIRONMENT VARIABLES CHECKLIST

Make sure ALL these are set:

**Backend (pikzels-clone/.env):**
```bash
# Stripe
STRIPE_SECRET_KEY=sk_test_... # or sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_STARTER_PRICE_ID=price_...
STRIPE_PRO_PRICE_ID=price_...
STRIPE_ULTIMATE_PRICE_ID=price_...

# URLs
FRONTEND_URL=http://localhost:8556

# Database (existing)
DATABASE_URL=postgresql://...

# OpenAI (existing)
OPENAI_API_KEY=sk-...
```

**Frontend (pikzels-clone/client/.env):**
```bash
REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_test_... # or pk_live_...
REACT_APP_STRIPE_STARTER_PRICE_ID=price_...
REACT_APP_STRIPE_PRO_PRICE_ID=price_...
REACT_APP_STRIPE_ULTIMATE_PRICE_ID=price_...
```

---

## 🎯 SUCCESS CRITERIA

By end of Week 1, you MUST have:

**Technical:**
- [x] Stripe integration working end-to-end
- [x] Users can subscribe and pay
- [x] Credits are tracked correctly
- [x] Credits deduct on thumbnail generation
- [x] Out of credits = blocked from generating
- [x] Webhooks handle subscription lifecycle

**Business:**
- [ ] **1 PAYING CUSTOMER** (even if it's a test account)
- [ ] Pricing page live
- [ ] Clear upgrade path from free to paid

**If you have these, YOU WIN WEEK 1! 🎉**

---

## 🚫 WHAT TO AVOID

**Don't:**
- ❌ Overengineer - MVP first, polish later
- ❌ Add new features - focus on monetization only
- ❌ Redesign UI - current is fine
- ❌ Optimize prematurely - works > perfect
- ❌ Get distracted by "nice to haves"

**Do:**
- ✅ Keep it simple
- ✅ Test frequently
- ✅ Ship fast
- ✅ Get feedback
- ✅ Iterate quickly

---

## 🆘 TROUBLESHOOTING

### Issue: "Stripe checkout session fails"
**Solution:**
- Check API keys are correct (test vs live mode)
- Verify customer ID is being created
- Check browser console for errors
- Test with curl first

### Issue: "Webhook not receiving events"
**Solution:**
- Run `stripe listen --forward-to localhost:8550/api/webhook/stripe`
- Check webhook secret is in .env
- Verify endpoint is registered in server.ts BEFORE body parser
- Check Stripe dashboard webhook logs

### Issue: "Credits not deducting"
**Solution:**
- Add console.logs in credit service
- Check database to see if transaction records exist
- Verify subscription exists for user
- Test credit service independently

### Issue: "Can't test with real money"
**Solution:**
- Stay in test mode
- Use test cards: 4242 4242 4242 4242
- Don't switch to live mode until fully tested

---

## 📞 GETTING HELP

**Stripe Documentation:**
- https://stripe.com/docs/billing/subscriptions/overview
- https://stripe.com/docs/payments/checkout
- https://stripe.com/docs/webhooks

**Test Environment:**
- Use Stripe Dashboard (test mode) to see all events
- Check webhook logs for errors
- Use `stripe listen` for local testing

**Community:**
- Stripe Discord: https://discord.gg/stripe
- Reddit: r/stripe
- Stack Overflow: [stripe] tag

---

## 🎉 NEXT STEPS (Week 2)

Once you have 1 paying customer, move to:
1. Add cheaper AI provider (Stability AI) to reduce costs
2. Improve landing page with social proof
3. Add analytics to track user behavior
4. Launch on ProductHunt
5. Get 10 paying customers

**But don't think about Week 2 until Week 1 is DONE!**

---

## 💪 MOTIVATION

You're building a real business. Week 1 is about proving you can make