# PAYPAL-1: Fix PayPal Dynamic Amount Integration

AGENT_ROLE: builder
PROJECT: masf-website

## Task

Replace the broken static PayPal NCP link with PayPal JavaScript SDK Smart Payment Buttons that respect the user's selected donation amount.

## Context

- **Problem**: Current PayPal button links to static URL that ignores user-selected amounts
- **Location**: `donate.html` line 485
- **Spec**: `.project/architect/features/paypal-integration.md`

## Files to Modify

1. `donate.html` - Replace PayPal link with SDK button container + initialization script
2. `functions/index.js` - Add `recordPayPalDonation` callable function

## Implementation Steps

### 1. donate.html Changes

1. Replace the PayPal `<a>` tag (line 485-488) with:
   ```html
   <div id="paypal-button-container" style="width: 100%;"></div>
   ```

2. Add PayPal SDK script before closing `</body>`:
   ```html
   <script src="https://www.paypal.com/sdk/js?client-id=sb&currency=USD&intent=capture"></script>
   ```
   Note: `client-id=sb` is PayPal sandbox. Replace with actual Client ID for production.

3. Add PayPal button initialization in the existing `<script type="module">` block, using the `functions` variable already initialized there. The initialization code should:
   - Read amount from `customAmount` input
   - Read donor info from `donorName` and `donorEmail` inputs
   - Validate amount >= $1
   - Create order with dynamic amount
   - On approval, capture and call `recordPayPalDonation` function
   - On success, redirect to `donation-success.html`
   - Handle cancel and error states with user-friendly messages

### 2. functions/index.js Changes

Add a new callable function `recordPayPalDonation` that:
- Accepts: `transactionId`, `orderId`, `amount`, `donorEmail`, `donorName`
- Validates inputs
- Checks for duplicate transactions
- Uses existing `processDonation()` helper to record and send receipt

## Acceptance Criteria

- [ ] User can select preset amount ($120, $250, etc.) and PayPal shows that amount
- [ ] User can enter custom amount and PayPal shows that amount
- [ ] Amounts less than $1 show validation error
- [ ] Successful payment records to Firestore `donations` collection
- [ ] Receipt email is sent after successful payment
- [ ] Cancel in PayPal popup shows appropriate message
- [ ] PayPal errors show user-friendly message

## Testing

1. Use PayPal sandbox (client-id=sb) for testing
2. Test amounts: $1, $50, $120, custom values
3. Test cancel flow
4. Verify Firestore record after successful payment
5. Verify email receipt (if email is configured)

## Notes

- The `httpsCallable` function is already imported and `functions` is initialized in the existing module script
- Use the existing `donateStatus` element for error/cancel messages
- Follow the existing Stripe button's styling patterns for consistency
