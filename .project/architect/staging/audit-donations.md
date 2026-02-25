# Donation System Audit Report

**Audit Date:** 2026-02-25
**Auditor:** Builder Agent
**Files Reviewed:** donate.html, donate-stripe-integration.html, donate-paypal-integration.html, donation-success.html, donors.html, functions/index.js

---

## Executive Summary

The donation system has a functional Stripe Checkout integration via Firebase Functions, but several issues affect the PayPal flow, donor recognition, and payment verification. The most critical issue is that PayPal donations bypass the user-selected amount.

---

## Issues Found

### CRITICAL

#### 1. PayPal Link Ignores User-Selected Amount
**File:** `donate.html:485`
**Description:** The PayPal button links directly to a static PayPal NCP (No Code Payments) URL:
```html
<a href="https://www.paypal.com/ncp/payment/DUQ4EWNTN5LN6" target="_blank" ...>
```
**Problem:** When a user selects $500 and clicks "Donate with PayPal", they are taken to PayPal's pre-configured payment page which likely has its own amount (or asks user to enter again). The amount selected on the form is completely ignored.

**Impact:** User confusion, potential lost donations, inconsistent donation tracking.

**Suggested Fix:**
- Option A: Implement PayPal Smart Payment Buttons with dynamic amounts
- Option B: Use Firebase Function to create PayPal order with selected amount
- Option C: Update PayPal NCP to allow custom amounts and pass via URL params if supported

---

#### 2. Stripe Webhook May Not Be Registered
**File:** `functions/index.js:1687-1797`
**Description:** The `stripeWebhook` function exists and handles `checkout.session.completed` events, but there's no verification that:
1. The webhook URL is registered in Stripe Dashboard
2. `STRIPE_WEBHOOK_SECRET` environment variable is set

**Problem:** Without a registered webhook, successful Stripe payments will:
- NOT be recorded in Firestore `donations` collection
- NOT trigger donation receipt emails
- NOT appear in any admin dashboard

**Impact:** Donations are processed by Stripe but the organization has no record of them.

**Suggested Fix:**
1. Verify webhook is registered at: Stripe Dashboard > Developers > Webhooks
2. Webhook URL should be: `https://us-central1-make-a-splash-foundation.cloudfunctions.net/stripeWebhook`
3. Ensure `STRIPE_WEBHOOK_SECRET` is set in Firebase Functions config:
   ```bash
   firebase functions:config:set stripe.webhook_secret="whsec_xxx"
   ```

---

### HIGH

#### 3. Donor Recognition Page Is Static (Non-Functional)
**File:** `donors.html:280-333`
**Description:** The donors page shows four tiers (Champion Sponsors, Presenting Partners, Aquatic Angels, Wave Makers) but all display "Be the first to join at this level" as static HTML.

**Problem:** There is no JavaScript/Firebase query to fetch actual donors from the `donations` collection. Even if donations are recorded, they will never appear on this page.

**Impact:** Donors who give $1,000+ expecting recognition on the website will not see their names displayed.

**Suggested Fix:**
1. Add Firebase SDK to donors.html
2. Query `donations` collection for donors who opted for recognition
3. Filter by amount into appropriate tiers
4. Render donor cards dynamically (respecting anonymous preference)

---

#### 4. Success Page Shows Thank You Without Payment Verification
**File:** `donation-success.html`
**Description:** The success page displays "Your donation has been received" unconditionally. It doesn't verify that a payment actually completed.

**Problem:**
- User can navigate directly to `/donation-success.html` without donating
- Stripe redirects to success URL even if webhook hasn't processed yet
- No session_id validation from Stripe

**Impact:** False "thank you" shown; user may think donation succeeded when it didn't.

**Suggested Fix:**
1. Pass Stripe `session_id` as URL parameter from checkout
2. Verify session status via Firebase Function before showing thank you
3. Display loading state while verifying, error state if payment not found

---

### MEDIUM

#### 5. Email Configuration May Be Missing
**File:** `functions/index.js:11-17`
**Description:** Email transport requires `EMAIL_USER` and `EMAIL_PASS` environment variables:
```javascript
const transporter = nodemailer.createTransport({
    auth: {
        user: process.env.EMAIL_USER || '',
        pass: process.env.EMAIL_PASS || ''
    }
});
```

**Problem:** If these are not set in Firebase environment, emails silently fail with empty credentials.

**Impact:** No donation receipts, no application confirmations, no admin notifications.

**Suggested Fix:** Verify with:
```bash
firebase functions:config:get
```
Should show `email.user` and `email.pass` configured.

---

#### 6. Server-Side Validation Is Minimal
**File:** `functions/index.js:750-753`
**Description:** Amount validation on server:
```javascript
if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) < 1) {
    throw new functions.https.HttpsError('invalid-argument', 'Amount must be at least $1.');
}
```

**Issues:**
- No maximum amount check (potential for very large test/fraudulent charges)
- No validation that amount is a reasonable value (e.g., not $0.01)
- Recurring donation validation could be stricter

**Impact:** Potential for abuse or accidental very large charges.

**Suggested Fix:** Add maximum amount validation (e.g., $100,000) and consider minimum of $5 for recurring.

---

#### 7. Recurring Donation Messaging Could Be Clearer
**File:** `donate.html:427-431`
**Description:** The recurring info states "A donor account is created automatically" but Stripe manages subscription accounts, not the website.

**Impact:** Minor user confusion about what account is being created.

**Suggested Fix:** Update copy to: "Stripe will manage your recurring donation. You can cancel anytime via the link in your receipt email."

---

### LOW

#### 8. Template Files Are Unused and Potentially Confusing
**Files:** `donate-stripe-integration.html`, `donate-paypal-integration.html`
**Description:** These appear to be documentation/template files showing alternative integration approaches, but they're not actually used by `donate.html`.

**Impact:** Developer confusion when maintaining the codebase.

**Suggested Fix:** Move to `/docs/` folder or delete if no longer needed.

---

#### 9. Mobile Tab Navigation Could Be Improved
**File:** `donate.html:351-354`
**Description:** On mobile, donation type tabs stack vertically:
```css
@media (max-width: 768px) {
    .donation-type-tabs {
        flex-direction: column;
    }
}
```

**Impact:** Takes up more vertical space; may push form below the fold.

**Suggested Fix:** Consider keeping horizontal tabs with smaller text on mobile, or use a dropdown selector.

---

## Checklist Summary

| Item | Status | Severity |
|------|--------|----------|
| Donation form - fields present | PASS | - |
| Donation form - validation | PARTIAL | Medium |
| Donation form - preset amounts | PASS | - |
| Payment method selection | PASS | - |
| Stripe checkout works | UNKNOWN | Critical |
| PayPal checkout works | FAIL | Critical |
| Success redirects | PARTIAL | High |
| Failure/cancel handling | PASS | - |
| Donor recognition (donors.html) | FAIL | High |
| Mobile responsiveness | PASS | - |
| Console errors | NOT TESTED | - |

---

## Recommendations (Priority Order)

1. **URGENT:** Test Stripe end-to-end in test mode and verify webhook is registered
2. **URGENT:** Fix PayPal integration to respect user-selected amounts
3. **HIGH:** Implement dynamic donor recognition on donors.html
4. **HIGH:** Add payment verification to success page
5. **MEDIUM:** Verify email configuration in Firebase
6. **LOW:** Clean up unused template files

---

## Test Plan (For QA)

### Stripe Testing
1. Select $250 donation amount
2. Click "Donate with Card"
3. Verify redirect to Stripe Checkout with correct amount
4. Complete test payment using card: `4242 4242 4242 4242`
5. Verify redirect to donation-success.html
6. Check Firebase `donations` collection for new record
7. Check email inbox for receipt

### PayPal Testing
1. Select $500 donation amount
2. Click "Donate with PayPal"
3. Verify PayPal page shows $500 (EXPECTED TO FAIL - known issue)
4. If PayPal IPN is configured, verify Firebase `donations` gets record

### Recurring Donation Testing
1. Select Monthly tab
2. Select $120 amount
3. Complete Stripe checkout
4. Verify Stripe Dashboard shows active subscription
5. Verify donation recorded with `recurring: true`

### Donor Recognition Testing
1. Make donation of $1,000+ (or seed test data)
2. Navigate to donors.html
3. Verify donor name appears in appropriate tier (EXPECTED TO FAIL - static page)

---

*Report generated by Builder Agent - 2026-02-25 09:05 EST*
