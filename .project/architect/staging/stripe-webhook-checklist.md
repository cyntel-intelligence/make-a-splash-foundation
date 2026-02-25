# Stripe Webhook Configuration Audit

**Date:** 2026-02-25
**Project:** Make A Splash Foundation Website
**Auditor:** Builder Agent

---

## Code Review Findings

### stripeWebhook Function (`functions/index.js:1687`)

**Purpose:** Receives Stripe webhook events and records donations to Firestore.

**Events Handled:**
| Event Type | Purpose |
|------------|---------|
| `checkout.session.completed` | One-time donations via Stripe Checkout |
| `invoice.payment_succeeded` | Recurring subscription payments |

**Security Features:**
- Webhook signature verification using `STRIPE_WEBHOOK_SECRET`
- Duplicate transaction detection (checks Firestore before recording)
- Input sanitization via `sanitize()` helper

### Code Issue Fixed

**CRITICAL SECURITY FIX APPLIED**

**Before (vulnerable):**
```javascript
if (webhookSecret && sig) {
    event = stripeClient.webhooks.constructEvent(req.rawBody, sig, webhookSecret);
} else {
    // No signature verification (not recommended for production)
    event = req.body;  // ACCEPTS UNVERIFIED EVENTS!
}
```

**After (secure):**
```javascript
if (!webhookSecret) {
    return res.status(500).send('Webhook secret not configured');
}
if (!sig) {
    return res.status(400).send('Missing signature');
}
event = stripeClient.webhooks.constructEvent(req.rawBody, sig, webhookSecret);
```

**Why this matters:** The old code would accept ANY POST request as a valid webhook if `STRIPE_WEBHOOK_SECRET` was not configured. This could allow attackers to create fraudulent donation records.

---

## Human Verification Checklist

### Step 1: Verify Firebase Environment Variables

Run this command to check if Stripe secrets are configured:

```bash
firebase functions:secrets:access STRIPE_SECRET_KEY
firebase functions:secrets:access STRIPE_WEBHOOK_SECRET
```

**If not configured, set them:**
```bash
firebase functions:secrets:set STRIPE_SECRET_KEY
# Paste your Stripe secret key (sk_live_... or sk_test_...)

firebase functions:secrets:set STRIPE_WEBHOOK_SECRET
# Paste webhook signing secret from Stripe Dashboard (whsec_...)
```

**Alternative (older config method):**
```bash
firebase functions:config:set stripe.secret_key="sk_live_..."
firebase functions:config:set stripe.webhook_secret="whsec_..."
```

### Step 2: Verify Webhook in Stripe Dashboard

1. **Log in to Stripe Dashboard:** https://dashboard.stripe.com

2. **Navigate to Webhooks:**
   - Click **Developers** in the left sidebar
   - Click **Webhooks**

3. **Check for existing webhook endpoint:**
   - Look for: `https://us-central1-make-a-splash-foundation.cloudfunctions.net/stripeWebhook`

4. **If webhook exists, verify configuration:**
   - [ ] Endpoint URL matches: `https://us-central1-make-a-splash-foundation.cloudfunctions.net/stripeWebhook`
   - [ ] Status shows "Enabled"
   - [ ] Events include:
     - `checkout.session.completed`
     - `invoice.payment_succeeded`

5. **If webhook does NOT exist, create it:**
   - Click **Add endpoint**
   - Endpoint URL: `https://us-central1-make-a-splash-foundation.cloudfunctions.net/stripeWebhook`
   - Select events to listen for:
     - `checkout.session.completed`
     - `invoice.payment_succeeded`
   - Click **Add endpoint**

6. **Copy the Signing Secret:**
   - Click on the webhook endpoint
   - Under "Signing secret", click **Reveal** (or click the eye icon)
   - Copy the secret (starts with `whsec_`)
   - This is the value for `STRIPE_WEBHOOK_SECRET`

### Step 3: Deploy Updated Code

After verifying/setting environment variables:

```bash
cd functions
firebase deploy --only functions:stripeWebhook
```

### Step 4: Test the Webhook

**Option A: Use Stripe CLI (recommended)**
```bash
# Install Stripe CLI if needed
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward webhooks to local emulator for testing
stripe listen --forward-to localhost:5001/make-a-splash-foundation/us-central1/stripeWebhook

# In another terminal, trigger a test event
stripe trigger checkout.session.completed
```

**Option B: Use Stripe Dashboard**
1. Go to the webhook endpoint in Stripe Dashboard
2. Click **Send test webhook**
3. Select event type: `checkout.session.completed`
4. Click **Send test webhook**

**Option C: Make a test donation**
1. Go to the live site donation page
2. Make a small test donation ($1)
3. Verify it appears in Firestore `donations` collection

### Step 5: Verify Webhook Success

Check Firebase Functions logs:

```bash
firebase functions:log --only stripeWebhook
```

**Expected success log:**
```
Stripe donation processed: cs_xxx $XX.XX
```

**Error indicators to look for:**
- `STRIPE_SECRET_KEY not found` - Environment variable not set
- `STRIPE_WEBHOOK_SECRET not configured` - Webhook secret not set
- `Webhook signature verification failed` - Wrong signing secret
- `Missing signature` - Request not from Stripe

---

## Firestore Data Structure

Donations are stored in the `donations` collection with this structure:

```javascript
{
  donorEmail: "donor@example.com",
  donorName: "John Doe",
  amount: 50.00,
  transactionId: "cs_xxx...",  // Stripe session ID or invoice ID
  paymentMethod: "stripe",
  recurring: false,  // true for subscription payments
  createdAt: Timestamp,
  receiptSent: true
}
```

---

## Summary

| Item | Status |
|------|--------|
| Code review | Complete |
| Security fix applied | Yes - removed unverified webhook fallback |
| Environment variables | **HUMAN ACTION REQUIRED** |
| Stripe Dashboard webhook | **HUMAN ACTION REQUIRED** |
| Deployment | After human verification |

**Next Steps for Human:**
1. Verify/set `STRIPE_WEBHOOK_SECRET` in Firebase
2. Verify webhook endpoint exists in Stripe Dashboard
3. Confirm signing secret matches
4. Deploy updated code
5. Test with a real or test donation
