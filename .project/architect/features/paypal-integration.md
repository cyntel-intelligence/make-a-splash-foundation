# PayPal Dynamic Amount Integration

**Created**: 2026-02-25
**Status**: Designed
**Priority**: High (donation flow is broken)

## Problem Statement

The current PayPal donation button on `donate.html` (line 485) uses a static PayPal NCP URL:
```html
<a href="https://www.paypal.com/ncp/payment/DUQ4EWNTN5LN6" target="_blank">
```

This ignores the user's selected donation amount. When a user selects $500 and clicks PayPal, they are taken to a pre-configured payment page that does not reflect their choice.

## Requirements

1. User selects amount on donate.html (preset buttons or custom input)
2. Clicks "Donate with PayPal"
3. PayPal shows the correct selected amount
4. Successful payment records to Firestore `donations` collection
5. Receipt email is sent to donor
6. Support for one-time and recurring donations (if PayPal supports it easily)

## Options Analysis

### Option 1: PayPal JavaScript SDK (Smart Payment Buttons) - RECOMMENDED

**How it works:**
- Load PayPal JS SDK on the page
- Render Smart Payment Button in place of current `<a>` link
- Use `createOrder` callback to set dynamic amount
- Use `onApprove` callback to capture payment
- Call Firebase Function to record donation and send receipt

**Pros:**
- Modern, PayPal's recommended approach
- Excellent UX - PayPal opens in popup, user stays on donation page
- Client-side amount control via `createOrder`
- Real-time confirmation without page reload
- Well-documented SDK

**Cons:**
- Requires PayPal Client ID (public, not secret)
- More complex frontend code than static link
- Need to call Firebase function on approval for server-side recording

**Complexity**: Medium
**Recurring Support**: Yes (via PayPal Subscriptions API, but adds complexity)

### Option 2: PayPal REST API via Firebase Function

**How it works:**
- Create `paypalCheckout` Firebase Function (mirrors `stripeCheckout`)
- Frontend calls function with amount
- Function creates PayPal order via REST API
- Returns approval URL
- User redirected to PayPal.com

**Pros:**
- Mirrors Stripe pattern exactly
- Server-side control over order creation
- Can reuse existing IPN webhook

**Cons:**
- More server-side code and complexity
- Requires PayPal Client ID + Secret in Firebase config
- User leaves site (redirect flow, worse UX)
- PayPal REST API is more complex than Stripe's

**Complexity**: High
**Recurring Support**: Yes

### Option 3: PayPal NCP with URL Parameters

**Analysis:** PayPal NCP (No Code Payments) links do NOT support dynamic amounts via URL parameters. They are static pre-configured payment links.

**Verdict**: NOT VIABLE

## Recommended Approach: Option 1 (PayPal JavaScript SDK)

### Rationale

1. **Best UX**: Users stay on the donation page; PayPal opens in a popup
2. **Simplest server-side**: No new Firebase function for order creation
3. **Modern**: This is PayPal's current recommended integration pattern
4. **Works with existing infrastructure**: Can use existing `paypalWebhook` for backup recording

### Architecture

```
User Flow:
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  donate.html    │    │  PayPal Popup   │    │ Firebase Func   │
│  Select Amount  │───>│  Checkout       │───>│ recordPayPal    │
│  Click PayPal   │    │  User Approves  │    │ Donation()      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                      │
                                               ┌──────▼──────┐
                                               │  Firestore  │
                                               │  donations  │
                                               └──────┬──────┘
                                                      │
                                               ┌──────▼──────┐
                                               │ Email Receipt│
                                               └─────────────┘
```

## Implementation Details

### 1. PayPal Dashboard Configuration

**Required Steps:**
1. Log in to PayPal Developer Dashboard: https://developer.paypal.com/dashboard/
2. Navigate to **Apps & Credentials**
3. Create a new app or use existing one
4. Copy the **Client ID** (sandbox for testing, live for production)
5. Note: Client ID is public and safe to include in frontend code

**Webhook Configuration (recommended for reliability):**
1. In the same app, go to **Webhooks**
2. Add webhook URL: `https://us-central1-make-a-splash-foundation.cloudfunctions.net/paypalWebhook`
3. Subscribe to events:
   - `CHECKOUT.ORDER.APPROVED`
   - `PAYMENT.CAPTURE.COMPLETED`
   - `PAYMENT.CAPTURE.DENIED`

### 2. Frontend Changes (donate.html)

**Location**: `donate.html` lines 484-488

**Current Code:**
```html
<a href="https://www.paypal.com/ncp/payment/DUQ4EWNTN5LN6" target="_blank" rel="noopener" class="btn" style="...">
    <svg>...</svg>
    Donate with PayPal
</a>
```

**Replace With:**
```html
<div id="paypal-button-container" style="width: 100%;"></div>
```

**Add PayPal SDK Script** (before closing `</body>` tag):
```html
<script src="https://www.paypal.com/sdk/js?client-id=PAYPAL_CLIENT_ID&currency=USD&intent=capture"></script>
```

**Add PayPal Button Initialization:**
```javascript
// PayPal Smart Payment Button
if (typeof paypal !== 'undefined') {
    paypal.Buttons({
        style: {
            layout: 'vertical',
            color: 'blue',
            shape: 'rect',
            label: 'donate'
        },

        createOrder: function(data, actions) {
            const amount = document.getElementById('customAmount').value;
            const donorName = document.getElementById('donorName').value || '';
            const donorEmail = document.getElementById('donorEmail').value || '';

            if (!amount || parseFloat(amount) < 1) {
                const donateStatus = document.getElementById('donateStatus');
                donateStatus.textContent = 'Please enter a donation amount of at least $1.';
                donateStatus.style.background = '#FFEBEE';
                donateStatus.style.color = '#C62828';
                donateStatus.style.display = 'block';
                return Promise.reject(new Error('Invalid amount'));
            }

            return actions.order.create({
                purchase_units: [{
                    description: 'Donation to Make A Splash Foundation',
                    amount: {
                        value: parseFloat(amount).toFixed(2),
                        currency_code: 'USD'
                    },
                    custom_id: JSON.stringify({
                        donorName: donorName,
                        donorEmail: donorEmail
                    })
                }]
            });
        },

        onApprove: function(data, actions) {
            return actions.order.capture().then(function(orderData) {
                // Extract donation details
                const captureId = orderData.purchase_units[0].payments.captures[0].id;
                const amount = orderData.purchase_units[0].payments.captures[0].amount.value;
                const payerEmail = orderData.payer.email_address || '';
                const payerName = orderData.payer.name
                    ? `${orderData.payer.name.given_name || ''} ${orderData.payer.name.surname || ''}`.trim()
                    : '';

                // Try to get custom donor info
                let customData = {};
                try {
                    customData = JSON.parse(orderData.purchase_units[0].custom_id || '{}');
                } catch (e) {}

                const donorEmail = customData.donorEmail || payerEmail;
                const donorName = customData.donorName || payerName;

                // Call Firebase function to record donation
                const recordPayPalDonation = httpsCallable(functions, 'recordPayPalDonation');
                return recordPayPalDonation({
                    transactionId: captureId,
                    orderId: data.orderID,
                    amount: parseFloat(amount),
                    donorEmail: donorEmail,
                    donorName: donorName
                }).then(function(result) {
                    // Redirect to success page
                    window.location.href = 'donation-success.html';
                }).catch(function(error) {
                    console.error('Error recording donation:', error);
                    // Still redirect - webhook will catch it
                    window.location.href = 'donation-success.html';
                });
            });
        },

        onError: function(err) {
            console.error('PayPal error:', err);
            const donateStatus = document.getElementById('donateStatus');
            donateStatus.textContent = 'PayPal encountered an error. Please try again or use card payment.';
            donateStatus.style.background = '#FFEBEE';
            donateStatus.style.color = '#C62828';
            donateStatus.style.display = 'block';
        },

        onCancel: function(data) {
            const donateStatus = document.getElementById('donateStatus');
            donateStatus.textContent = 'PayPal payment was canceled. You can try again when ready.';
            donateStatus.style.background = '#FFF3E0';
            donateStatus.style.color = '#E65100';
            donateStatus.style.display = 'block';
        }
    }).render('#paypal-button-container');
}
```

### 3. Firebase Function Changes (functions/index.js)

**Add New Function: `recordPayPalDonation`**

```javascript
// ========================================
// PAYPAL DONATION RECORDING (Smart Buttons)
// ========================================

exports.recordPayPalDonation = functions.https.onCall(async (data, context) => {
    const { transactionId, orderId, amount, donorEmail, donorName } = data;

    // Validate inputs
    if (!transactionId || !amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
        throw new functions.https.HttpsError('invalid-argument', 'Valid transaction ID and amount are required.');
    }

    // Check for duplicate
    const existingDonation = await admin.firestore()
        .collection('donations')
        .where('transactionId', '==', transactionId)
        .limit(1)
        .get();

    if (!existingDonation.empty) {
        console.log('PayPal: Duplicate transaction ignored:', transactionId);
        return { success: true, message: 'Already recorded' };
    }

    // Rate limit: prevent abuse
    if (donorEmail && !checkRateLimit(`paypal_${donorEmail}`, 10, 3600000)) {
        throw new functions.https.HttpsError('resource-exhausted', 'Too many requests.');
    }

    try {
        // Use existing processDonation helper
        const donationId = await processDonation({
            donorEmail: sanitize(donorEmail) || '',
            donorName: sanitize(donorName) || '',
            amount: parseFloat(amount),
            transactionId: sanitize(transactionId),
            paymentMethod: 'paypal',
            recurring: false
        });

        console.log('PayPal donation recorded via Smart Button:', transactionId, amount);
        return { success: true, donationId };

    } catch (error) {
        console.error('Error recording PayPal donation:', error);
        throw new functions.https.HttpsError('internal', 'Failed to record donation.');
    }
});
```

### 4. Update Existing PayPal Webhook (Optional Enhancement)

The existing `paypalWebhook` function handles IPN. To also handle modern webhook events:

**Add to `paypalWebhook` function** (after line 679):
```javascript
// Handle modern webhook events (not just IPN)
if (body.event_type) {
    // This is a modern webhook event
    const eventType = body.event_type;
    const resource = body.resource || {};

    if (eventType === 'PAYMENT.CAPTURE.COMPLETED') {
        const transactionId = resource.id;
        const amount = parseFloat(resource.amount?.value || 0);

        // Check for duplicate
        const existing = await admin.firestore()
            .collection('donations')
            .where('transactionId', '==', transactionId)
            .limit(1)
            .get();

        if (existing.empty && amount > 0) {
            await processDonation({
                donorEmail: resource.payer?.email_address || '',
                donorName: '',
                amount,
                transactionId,
                paymentMethod: 'paypal',
                recurring: false
            });
            console.log('PayPal webhook: Donation recorded via webhook:', transactionId);
        }
    }

    return res.status(200).send('OK');
}
```

## Recurring Donations (Future Enhancement)

PayPal subscriptions require additional complexity:
- PayPal Subscriptions API instead of Orders API
- Must create a Product and Plan in PayPal Dashboard
- Different `createSubscription` callback instead of `createOrder`

**Recommendation**: Implement one-time donations first. Add recurring support as a separate feature if needed. The current Stripe integration handles recurring well.

## Test Plan

### Manual Testing

1. **Sandbox Testing**:
   - Use PayPal sandbox credentials
   - Create sandbox buyer account at developer.paypal.com
   - Test various amounts: $1, $50, $120, $500, custom amounts

2. **Test Cases**:
   | Test | Expected Result |
   |------|-----------------|
   | Select $120, click PayPal | PayPal popup shows $120.00 |
   | Enter custom $75.50 | PayPal popup shows $75.50 |
   | Enter $0 or empty | Error message, PayPal doesn't open |
   | Complete payment | Redirect to success page |
   | Cancel in PayPal popup | Cancel message shown, stays on page |
   | Check Firestore after payment | New document in `donations` collection |
   | Check email after payment | Receipt email received |

3. **Integration Tests**:
   - Verify donation appears in admin dashboard
   - Verify receipt email content is correct
   - Verify duplicate transactions are rejected

### Production Checklist

- [ ] Replace sandbox Client ID with live Client ID
- [ ] Test with real PayPal account (small amount like $1)
- [ ] Verify webhook URL is configured in PayPal Dashboard
- [ ] Monitor Firebase Functions logs for errors
- [ ] Verify donations appear in Firestore

## Files to Modify

| File | Changes |
|------|---------|
| `donate.html` | Replace PayPal link with SDK button, add script |
| `functions/index.js` | Add `recordPayPalDonation` function, enhance webhook |

## Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| PayPal SDK fails to load | Keep fallback static link hidden, show if SDK fails |
| Duplicate donations | Check transactionId before recording |
| User closes popup before approval | onCancel handler shows message |
| Firebase function fails | Webhook provides backup recording |

## Acceptance Criteria

- [ ] User can select any preset amount and PayPal shows that amount
- [ ] User can enter custom amount and PayPal shows that amount
- [ ] Successful PayPal payment creates record in Firestore `donations` collection
- [ ] Donor receives receipt email after successful payment
- [ ] Error states (cancel, invalid amount, network error) show appropriate messages
- [ ] No duplicate donations are recorded

## References

- [PayPal JavaScript SDK Reference](https://developer.paypal.com/sdk/js/reference/)
- [PayPal SDK Configuration](https://developer.paypal.com/sdk/js/configuration/)
- [PayPal Webhooks Guide](https://developer.paypal.com/api/rest/webhooks/)
