# Email Automation Setup Guide

## Overview
Automated emails will be sent when:
1. Someone submits a scholarship application
2. Someone makes a donation (when integrated)
3. Someone subscribes to your newsletter

## Setup Instructions

### Step 1: Install Firebase Functions Dependencies

```bash
cd "/Users/carlycaldwell/Desktop/Make A Splash Foundation/website/functions"
npm install
```

### Step 2: Set Up Email Service

You have two options:

#### Option A: Gmail (Free, Easy Setup)
1. Use your Gmail account: contact@makeasplashfoundation.co
2. Enable 2-Factor Authentication in your Google Account
3. Create an App Password:
   - Go to https://myaccount.google.com/apppasswords
   - Select "Mail" and your device
   - Copy the 16-character password

4. Configure Firebase:
```bash
firebase functions:config:set email.user="contact@makeasplashfoundation.co"
firebase functions:config:set email.pass="your-16-character-app-password"
```

#### Option B: SendGrid (Recommended for Higher Volume)
1. Sign up at https://sendgrid.com/free/
2. Create an API key
3. Modify `functions/index.js` to use SendGrid instead of Gmail
4. Free tier: 100 emails/day

### Step 3: Deploy Functions

```bash
cd "/Users/carlycaldwell/Desktop/Make A Splash Foundation/website"
firebase deploy --only functions
```

This will deploy:
- `onScholarshipApplicationSubmit` - Sends emails when applications are submitted
- `onDonationReceived` - Sends donation receipts
- `onNewsletterSubscribe` - Sends welcome email to subscribers

### Step 4: Test the Automation

1. Submit a test scholarship application
2. Check both emails:
   - Applicant should receive confirmation
   - You should receive admin notification at contact@makeasplashfoundation.co

## What Gets Sent

### Scholarship Application Confirmation (to applicant)
- Confirmation that application was received
- Application ID for reference
- Timeline for review (5-7 business days)
- Next steps
- Contact information

### Scholarship Application Notification (to you)
- Applicant's name and contact info
- Children's information
- List of uploaded documents
- Link to view in Firebase Console

### Donation Receipt (to donor)
- Thank you message
- Donation amount
- Transaction ID
- Tax deduction information (501(c)(3) details)
- Impact message

### Newsletter Welcome (to subscriber)
- Welcome message
- What to expect
- Contact information

## Customizing Email Templates

To customize the emails, edit `/functions/index.js`:

1. Find the email template you want to change
2. Modify the HTML in the `html:` section
3. Redeploy: `firebase deploy --only functions`

## Monitoring

View function logs:
```bash
firebase functions:log
```

Or view in Firebase Console:
https://console.firebase.google.com/project/make-a-splash-foundation/functions

## Cost

- **Gmail:** Free (limited to ~500 emails/day)
- **SendGrid:** Free up to 100 emails/day, then $15/month for 40,000 emails
- **Firebase Functions:** Free tier includes 2M invocations/month (more than enough)

## Troubleshooting

**Emails not sending?**
1. Check Firebase Functions logs
2. Verify email credentials are set correctly
3. Make sure Gmail App Password is enabled (if using Gmail)
4. Check spam folder

**Need help?**
The email automation code is in `/functions/index.js` - any developer can help customize it if needed.
