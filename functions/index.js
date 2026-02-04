const functions = require('firebase-functions');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');

admin.initializeApp();

// Stripe will be initialized with the key from .env file
const Stripe = require('stripe');

// Configure email transport using environment variables
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER || '',
        pass: process.env.EMAIL_PASS || ''
    }
});

// ========================================
// SECURITY HELPERS
// ========================================

// Simple in-memory rate limiter (per function instance)
const rateLimitStore = {};

function checkRateLimit(key, maxRequests, windowMs) {
    const now = Date.now();
    if (!rateLimitStore[key]) {
        rateLimitStore[key] = [];
    }
    // Remove expired entries
    rateLimitStore[key] = rateLimitStore[key].filter(ts => now - ts < windowMs);
    if (rateLimitStore[key].length >= maxRequests) {
        return false; // Rate limited
    }
    rateLimitStore[key].push(now);
    return true; // Allowed
}

// Sanitize string input — strip HTML tags to prevent XSS in emails
function sanitize(str) {
    if (typeof str !== 'string') return '';
    return str.replace(/<[^>]*>/g, '').trim();
}

// Validate email format
function isValidEmail(email) {
    if (typeof email !== 'string') return false;
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email) && email.length < 256;
}

// ========================================
// SCHOLARSHIP APPLICATION EMAIL
// ========================================

exports.onScholarshipApplicationSubmit = functions.firestore
    .document('scholarship-applications/{applicationId}')
    .onCreate(async (snap, context) => {
        const application = snap.data();
        const applicationId = context.params.applicationId;

        // Validate required fields exist
        if (!application.parentInfo || !application.parentInfo.email || !application.parentInfo.firstName) {
            console.error('Invalid application data — missing required fields');
            return null;
        }

        const parentEmail = sanitize(application.parentInfo.email);
        if (!isValidEmail(parentEmail)) {
            console.error('Invalid applicant email:', parentEmail);
            return null;
        }

        const firstName = sanitize(application.parentInfo.firstName);
        const lastName = sanitize(application.parentInfo.lastName);
        const phone = sanitize(application.parentInfo.phone);
        const appId = sanitize(application.applicationId);

        try {
            // Send confirmation email to applicant
            await transporter.sendMail({
                from: '"Make A Splash Foundation" <contact@makeasplashfoundation.co>',
                to: parentEmail,
                subject: 'Scholarship Application Received - Make A Splash Foundation',
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <div style="background: linear-gradient(135deg, #4A90E2, #5AAFE5); padding: 30px; text-align: center;">
                            <h1 style="color: white; margin: 0;">Application Received!</h1>
                        </div>

                        <div style="padding: 30px; background: #f8f9fa;">
                            <p>Dear ${firstName},</p>

                            <p>Thank you for applying for a Make A Splash Foundation scholarship! We have successfully received your application.</p>

                            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                                <p style="margin: 0;"><strong>Application ID:</strong> ${appId}</p>
                                <p style="margin: 10px 0 0 0;"><strong>Submitted:</strong> ${new Date().toLocaleDateString()}</p>
                            </div>

                            <h3 style="color: #4A90E2;">What Happens Next?</h3>
                            <ol>
                                <li>Our team will review your application and supporting documents</li>
                                <li>We will contact you within 5-7 business days with an update</li>
                                <li>If approved, we'll work with you to schedule swim lessons</li>
                            </ol>

                            <p>If you have any questions, please don't hesitate to contact us at <a href="mailto:contact@makeasplashfoundation.co">contact@makeasplashfoundation.co</a></p>

                            <p>Together, we're making water safety accessible to every child!</p>

                            <p style="margin-top: 30px;">
                                <strong>Make A Splash Foundation</strong><br>
                                501(c)(3) Nonprofit Organization<br>
                                Tax ID: 92-3713877
                            </p>
                        </div>

                        <div style="background: #1E3A5F; padding: 20px; text-align: center; color: white;">
                            <p style="margin: 0; font-size: 14px;">&copy; 2026 Make A Splash Foundation Inc.</p>
                        </div>
                    </div>
                `
            });

            // Send notification email to admin
            const childrenHtml = (application.children || []).map((child, i) => {
                const childName = sanitize(child.name);
                const childDob = sanitize(child.dob);
                return `<p><strong>Child ${i + 1}:</strong> ${childName}, DOB: ${childDob}</p>`;
            }).join('');

            const docsHtml = Object.keys(application.documents || {})
                .map(doc => `<li>${sanitize(doc)}</li>`).join('');

            await transporter.sendMail({
                from: '"Make A Splash Foundation" <contact@makeasplashfoundation.co>',
                to: 'contact@makeasplashfoundation.co',
                subject: `New Scholarship Application: ${firstName} ${lastName}`,
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #4A90E2;">New Scholarship Application Received</h2>

                        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                            <h3>Applicant Information</h3>
                            <p><strong>Name:</strong> ${firstName} ${lastName}</p>
                            <p><strong>Email:</strong> ${parentEmail}</p>
                            <p><strong>Phone:</strong> ${phone}</p>
                            <p><strong>Application ID:</strong> ${appId}</p>

                            <h3>Children</h3>
                            ${childrenHtml || '<p>No children data</p>'}

                            <h3>Documents Uploaded</h3>
                            <ul>${docsHtml || '<li>None</li>'}</ul>
                        </div>

                        <p><a href="https://console.firebase.google.com/project/make-a-splash-foundation/firestore" style="background: #4A90E2; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">View in Firebase Console</a></p>
                    </div>
                `
            });

            console.log('Emails sent successfully for application:', applicationId);
            return null;

        } catch (error) {
            console.error('Error sending emails:', error);
            return null;
        }
    });

// ========================================
// DONATION RECEIPT EMAIL
// ========================================

exports.onDonationReceived = functions.https.onCall(async (data, context) => {
    const donorEmail = sanitize(data.donorEmail);
    const donorName = sanitize(data.donorName);
    const amount = sanitize(String(data.amount));
    const transactionId = sanitize(data.transactionId);

    // Validate
    if (!isValidEmail(donorEmail)) {
        throw new functions.https.HttpsError('invalid-argument', 'Valid email is required.');
    }
    if (!donorName || donorName.length > 200) {
        throw new functions.https.HttpsError('invalid-argument', 'Valid name is required.');
    }
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
        throw new functions.https.HttpsError('invalid-argument', 'Valid amount is required.');
    }

    // Rate limit: 5 donation receipts per email per hour
    if (!checkRateLimit(`donation_${donorEmail}`, 5, 3600000)) {
        throw new functions.https.HttpsError('resource-exhausted', 'Too many requests. Please try again later.');
    }

    try {
        await transporter.sendMail({
            from: '"Make A Splash Foundation" <contact@makeasplashfoundation.co>',
            to: donorEmail,
            subject: 'Thank You for Your Donation - Make A Splash Foundation',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: linear-gradient(135deg, #4A90E2, #5AAFE5); padding: 30px; text-align: center;">
                        <h1 style="color: white; margin: 0;">Thank You!</h1>
                    </div>

                    <div style="padding: 30px; background: #f8f9fa;">
                        <p>Dear ${donorName},</p>

                        <p>Thank you for your generous donation of <strong>$${amount}</strong> to Make A Splash Foundation!</p>

                        <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                            <h3 style="color: #4A90E2;">Your Impact</h3>
                            <p>Your gift will help provide life-saving swim lessons to children in need. Together, we're preventing childhood drowning and making water safety accessible to every child.</p>
                        </div>

                        <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border: 2px solid #4A90E2;">
                            <h3 style="color: #1E3A5F; margin-top: 0;">Tax Receipt</h3>
                            <p><strong>Transaction ID:</strong> ${transactionId}</p>
                            <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
                            <p><strong>Amount:</strong> $${amount}</p>
                            <p style="font-size: 14px; color: #666; margin-top: 15px;">
                                Make A Splash Foundation Inc. is a 501(c)(3) nonprofit organization.<br>
                                Tax ID: 92-3713877<br>
                                Your donation is tax-deductible to the fullest extent allowed by law.
                            </p>
                        </div>

                        <p>If you have any questions about your donation, please contact us at <a href="mailto:contact@makeasplashfoundation.co">contact@makeasplashfoundation.co</a></p>

                        <p style="margin-top: 30px;">With gratitude,<br><strong>Make A Splash Foundation Team</strong></p>
                    </div>

                    <div style="background: #1E3A5F; padding: 20px; text-align: center; color: white;">
                        <p style="margin: 0; font-size: 14px;">&copy; 2026 Make A Splash Foundation Inc.</p>
                    </div>
                </div>
            `
        });

        console.log('Donation receipt sent to:', donorEmail);
        return { success: true };

    } catch (error) {
        console.error('Error sending donation receipt:', error);
        throw new functions.https.HttpsError('internal', 'Failed to send email');
    }
});

// ========================================
// CONTACT FORM EMAIL
// ========================================

exports.sendContactEmail = functions.https.onCall(async (data, context) => {
    const name = sanitize(data.name);
    const email = sanitize(data.email);
    const subject = sanitize(data.subject);
    const message = sanitize(data.message);

    // Validate required fields
    if (!name || name.length > 200) {
        throw new functions.https.HttpsError('invalid-argument', 'Valid name is required.');
    }
    if (!isValidEmail(email)) {
        throw new functions.https.HttpsError('invalid-argument', 'Valid email is required.');
    }
    if (!subject || subject.length > 500) {
        throw new functions.https.HttpsError('invalid-argument', 'Valid subject is required.');
    }
    if (!message || message.length > 5000) {
        throw new functions.https.HttpsError('invalid-argument', 'Message is required (max 5000 characters).');
    }

    // Honeypot check — if the hidden field is filled, it's a bot
    if (data._honeypot) {
        console.log('Honeypot triggered — blocking spam submission');
        return { success: true }; // Pretend success so bots don't retry
    }

    // Rate limit: 3 contact submissions per IP-like key per 10 minutes
    const rateLimitKey = `contact_${email}`;
    if (!checkRateLimit(rateLimitKey, 3, 600000)) {
        throw new functions.https.HttpsError('resource-exhausted', 'Too many messages sent. Please try again later.');
    }

    try {
        // Save to Firestore for admin dashboard
        await admin.firestore().collection('contact-submissions').add({
            name,
            email,
            subject,
            message,
            submittedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        await transporter.sendMail({
            from: '"Make A Splash Foundation Website" <contact@makeasplashfoundation.co>',
            to: 'contact@makeasplashfoundation.co',
            replyTo: email,
            subject: `Contact Form: ${subject}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: linear-gradient(135deg, #4A90E2, #5AAFE5); padding: 20px; text-align: center;">
                        <h2 style="color: white; margin: 0;">New Contact Form Message</h2>
                    </div>
                    <div style="padding: 20px; background: #f8f9fa;">
                        <p><strong>From:</strong> ${name}</p>
                        <p><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
                        <p><strong>Subject:</strong> ${subject}</p>
                        <hr style="border: 1px solid #ddd;">
                        <p><strong>Message:</strong></p>
                        <p style="white-space: pre-wrap;">${message}</p>
                    </div>
                    <div style="background: #1E3A5F; padding: 15px; text-align: center; color: white;">
                        <p style="margin: 0; font-size: 12px;">Sent from the Make A Splash Foundation website contact form</p>
                    </div>
                </div>
            `
        });

        console.log('Contact form email sent from:', email);
        return { success: true };

    } catch (error) {
        console.error('Error sending contact email:', error);
        throw new functions.https.HttpsError('internal', 'Failed to send message. Please try again.');
    }
});

// ========================================
// CORPORATE PARTNERSHIP INQUIRY
// ========================================

exports.submitCorporateInquiry = functions.https.onCall(async (data, context) => {
    const companyName = sanitize(data.companyName);
    const contactName = sanitize(data.contactName);
    const email = sanitize(data.email);
    const phone = sanitize(data.phone || '');
    const interestedTier = sanitize(data.interestedTier || '');
    const message = sanitize(data.message || '');

    // Validate required fields
    if (!companyName || companyName.length > 200) {
        throw new functions.https.HttpsError('invalid-argument', 'Company name is required.');
    }
    if (!contactName || contactName.length > 200) {
        throw new functions.https.HttpsError('invalid-argument', 'Contact name is required.');
    }
    if (!isValidEmail(email)) {
        throw new functions.https.HttpsError('invalid-argument', 'Valid email is required.');
    }

    // Honeypot check
    if (data._honeypot) {
        console.log('Honeypot triggered — blocking spam submission');
        return { success: true };
    }

    // Rate limit: 3 inquiries per email per hour
    if (!checkRateLimit(`corporate_${email}`, 3, 3600000)) {
        throw new functions.https.HttpsError('resource-exhausted', 'Too many requests. Please try again later.');
    }

    try {
        // Save to Firestore
        await admin.firestore().collection('corporate-inquiries').add({
            companyName,
            contactName,
            email,
            phone,
            interestedTier,
            message,
            status: 'new',
            submittedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        // Send notification email to admin
        await transporter.sendMail({
            from: '"Make A Splash Foundation Website" <contact@makeasplashfoundation.co>',
            to: 'contact@makeasplashfoundation.co',
            replyTo: email,
            subject: `Corporate Partnership Inquiry: ${companyName}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: linear-gradient(135deg, #1E3A5F, #4A90E2); padding: 20px; text-align: center;">
                        <h2 style="color: white; margin: 0;">New Corporate Partnership Inquiry</h2>
                    </div>
                    <div style="padding: 20px; background: #f8f9fa;">
                        <p><strong>Company:</strong> ${companyName}</p>
                        <p><strong>Contact:</strong> ${contactName}</p>
                        <p><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
                        <p><strong>Phone:</strong> ${phone || 'Not provided'}</p>
                        <p><strong>Interested Tier:</strong> ${interestedTier || 'Not specified'}</p>
                        ${message ? `<hr style="border: 1px solid #ddd;"><p><strong>Message:</strong></p><p style="white-space: pre-wrap;">${message}</p>` : ''}
                    </div>
                    <div style="background: #1E3A5F; padding: 15px; text-align: center; color: white;">
                        <p style="margin: 0; font-size: 12px;">Sent from the Make A Splash Foundation website</p>
                    </div>
                </div>
            `
        });

        console.log('Corporate inquiry received from:', companyName);
        return { success: true };

    } catch (error) {
        console.error('Error processing corporate inquiry:', error);
        throw new functions.https.HttpsError('internal', 'Failed to submit inquiry. Please try again.');
    }
});

// ========================================
// ADMIN — SET ADMIN CUSTOM CLAIMS
// ========================================

// Allowed admin email(s) — only these accounts can be promoted to admin
const ADMIN_EMAILS = ['contact@makeasplashfoundation.co'];

exports.setAdminClaim = functions.https.onCall(async (data, context) => {
    // Must be called by an authenticated user
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Must be signed in.');
    }

    // Check if caller's email is in the admin whitelist
    const callerEmail = context.auth.token.email;
    if (!ADMIN_EMAILS.includes(callerEmail)) {
        throw new functions.https.HttpsError('permission-denied', 'Not authorized as admin.');
    }

    // Set admin custom claim on the caller
    await admin.auth().setCustomUserClaims(context.auth.uid, { admin: true });
    return { success: true };
});

// ========================================
// ADMIN — UPDATE APPLICATION STATUS
// ========================================

exports.updateApplicationStatus = functions.https.onCall(async (data, context) => {
    // Must be admin
    if (!context.auth || !context.auth.token.admin) {
        throw new functions.https.HttpsError('permission-denied', 'Admin access required.');
    }

    const { applicationId, status, note, awardInfo } = data;
    const validStatuses = ['pending', 'new', 'under_review', 'approved', 'denied', 'active', 'completed'];

    if (!applicationId || typeof applicationId !== 'string') {
        throw new functions.https.HttpsError('invalid-argument', 'Application ID required.');
    }
    if (!validStatuses.includes(status)) {
        throw new functions.https.HttpsError('invalid-argument', `Status must be one of: ${validStatuses.join(', ')}`);
    }

    const updateData = {
        status,
        lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
        updatedBy: context.auth.token.email
    };

    // Add award info if provided (for active/approved/completed scholarships)
    if (awardInfo && typeof awardInfo === 'object') {
        updateData.awardInfo = {
            swimSchool: sanitize(awardInfo.swimSchool || ''),
            amount: parseFloat(awardInfo.amount) || 0,
            awardDate: sanitize(awardInfo.awardDate || ''),
            totalLessons: parseInt(awardInfo.totalLessons) || 0,
            lessonsCompleted: parseInt(awardInfo.lessonsCompleted) || 0,
            expectedCompletion: sanitize(awardInfo.expectedCompletion || ''),
            notes: sanitize(awardInfo.notes || '')
        };
    }

    // Add note if provided
    if (note && typeof note === 'string' && note.trim()) {
        const noteEntry = {
            text: sanitize(note.trim()),
            author: context.auth.token.email,
            createdAt: new Date().toISOString(),
            statusChange: status
        };
        updateData.notes = admin.firestore.FieldValue.arrayUnion(noteEntry);
    }

    try {
        await admin.firestore()
            .collection('scholarship-applications')
            .doc(applicationId)
            .update(updateData);

        return { success: true };
    } catch (error) {
        console.error('Error updating application status:', error);
        throw new functions.https.HttpsError('internal', 'Failed to update application.');
    }
});

// ========================================
// NEWSLETTER SUBSCRIPTION
// ========================================

exports.onNewsletterSubscribe = functions.https.onCall(async (data, context) => {
    const email = sanitize(data.email);
    const name = sanitize(data.name || '');

    // Validate email
    if (!isValidEmail(email)) {
        throw new functions.https.HttpsError('invalid-argument', 'Valid email is required.');
    }

    // Honeypot check
    if (data._honeypot) {
        console.log('Honeypot triggered — blocking spam subscription');
        return { success: true };
    }

    // Rate limit: 3 subscriptions per email per hour
    if (!checkRateLimit(`newsletter_${email}`, 3, 3600000)) {
        throw new functions.https.HttpsError('resource-exhausted', 'Too many requests. Please try again later.');
    }

    // Check for duplicate subscription
    const existing = await admin.firestore().collection('newsletter-subscribers')
        .where('email', '==', email).limit(1).get();
    if (!existing.empty) {
        return { success: true, message: 'Already subscribed' };
    }

    try {
        // Save to Firestore
        await admin.firestore().collection('newsletter-subscribers').add({
            email,
            name,
            subscribedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        // Send welcome email
        await transporter.sendMail({
            from: '"Make A Splash Foundation" <contact@makeasplashfoundation.co>',
            to: email,
            subject: 'Welcome to Make A Splash Foundation Updates',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: linear-gradient(135deg, #4A90E2, #5AAFE5); padding: 30px; text-align: center;">
                        <h1 style="color: white; margin: 0;">Welcome!</h1>
                    </div>

                    <div style="padding: 30px; background: #f8f9fa;">
                        <p>Hi ${name || 'there'},</p>

                        <p>Thank you for subscribing to Make A Splash Foundation updates!</p>

                        <p>You'll now receive:</p>
                        <ul>
                            <li>Impact stories from scholarship recipients</li>
                            <li>Water safety tips and resources</li>
                            <li>Event announcements</li>
                            <li>Ways to get involved</li>
                        </ul>

                        <p>Together, we're making a difference in our community!</p>

                        <p style="margin-top: 30px;">
                            <strong>Make A Splash Foundation</strong><br>
                            <a href="mailto:contact@makeasplashfoundation.co">contact@makeasplashfoundation.co</a>
                        </p>
                    </div>
                </div>
            `
        });

        return { success: true };

    } catch (error) {
        console.error('Error processing newsletter subscription:', error);
        throw new functions.https.HttpsError('internal', 'Failed to subscribe');
    }
});

// ========================================
// PAYMENT HELPERS
// ========================================

// Save donation to Firestore and send receipt email
async function processDonation({ donorEmail, donorName, amount, transactionId, paymentMethod, recurring = false }) {
    const donation = {
        donorEmail: sanitize(donorEmail),
        donorName: sanitize(donorName),
        amount: parseFloat(amount),
        transactionId: sanitize(transactionId),
        paymentMethod, // 'paypal' or 'stripe'
        recurring,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        receiptSent: false
    };

    // Save to Firestore
    const docRef = await admin.firestore().collection('donations').add(donation);

    // Send receipt email
    try {
        await transporter.sendMail({
            from: '"Make A Splash Foundation" <contact@makeasplashfoundation.co>',
            to: donation.donorEmail,
            subject: 'Thank You for Your Donation - Make A Splash Foundation',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: linear-gradient(135deg, #4A90E2, #5AAFE5); padding: 30px; text-align: center;">
                        <h1 style="color: white; margin: 0;">Thank You!</h1>
                    </div>

                    <div style="padding: 30px; background: #f8f9fa;">
                        <p>Dear ${donation.donorName || 'Generous Donor'},</p>

                        <p>Thank you for your ${recurring ? 'recurring ' : ''}donation of <strong>$${donation.amount.toFixed(2)}</strong> to Make A Splash Foundation!</p>

                        <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                            <h3 style="color: #4A90E2;">Your Impact</h3>
                            <p>Your gift will help provide life-saving swim lessons to children in need. Together, we're preventing childhood drowning and making water safety accessible to every child.</p>
                        </div>

                        <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border: 2px solid #4A90E2;">
                            <h3 style="color: #1E3A5F; margin-top: 0;">Tax Receipt</h3>
                            <p><strong>Transaction ID:</strong> ${donation.transactionId}</p>
                            <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
                            <p><strong>Amount:</strong> $${donation.amount.toFixed(2)}</p>
                            <p><strong>Payment Method:</strong> ${paymentMethod === 'stripe' ? 'Credit Card (Stripe)' : 'PayPal'}</p>
                            <p style="font-size: 14px; color: #666; margin-top: 15px;">
                                Make A Splash Foundation Inc. is a 501(c)(3) nonprofit organization.<br>
                                Tax ID: 92-3713877<br>
                                Your donation is tax-deductible to the fullest extent allowed by law.
                            </p>
                        </div>

                        <p>If you have any questions about your donation, please contact us at <a href="mailto:contact@makeasplashfoundation.co">contact@makeasplashfoundation.co</a></p>

                        <p style="margin-top: 30px;">With gratitude,<br><strong>Make A Splash Foundation Team</strong></p>
                    </div>

                    <div style="background: #1E3A5F; padding: 20px; text-align: center; color: white;">
                        <p style="margin: 0; font-size: 14px;">&copy; 2026 Make A Splash Foundation Inc.</p>
                    </div>
                </div>
            `
        });

        // Update receipt sent status
        await docRef.update({ receiptSent: true });
        console.log('Donation receipt sent to:', donation.donorEmail);
    } catch (error) {
        console.error('Error sending donation receipt:', error);
    }

    return docRef.id;
}

// ========================================
// PAYPAL IPN WEBHOOK
// ========================================

exports.paypalWebhook = functions.https.onRequest(async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).send('Method Not Allowed');
    }

    try {
        const body = req.body;

        // PayPal sends IPN data as form-urlencoded
        // For production, you should verify the IPN with PayPal
        // https://developer.paypal.com/api/nvp-soap/ipn/IPNIntro/

        // Check payment status
        const paymentStatus = body.payment_status;
        if (paymentStatus !== 'Completed') {
            console.log('PayPal IPN: Payment not completed, status:', paymentStatus);
            return res.status(200).send('OK');
        }

        // Extract donation details
        const donorEmail = body.payer_email || body.email || '';
        const donorName = `${body.first_name || ''} ${body.last_name || ''}`.trim() || body.payer_email;
        const amount = parseFloat(body.mc_gross || body.payment_gross || 0);
        const transactionId = body.txn_id || `PP-${Date.now()}`;
        const recurring = body.txn_type === 'subscr_payment' || body.txn_type === 'recurring_payment';

        if (!donorEmail || amount <= 0) {
            console.error('PayPal IPN: Invalid donation data');
            return res.status(200).send('OK'); // Still return 200 to acknowledge receipt
        }

        // Check for duplicate transaction
        const existingDonation = await admin.firestore()
            .collection('donations')
            .where('transactionId', '==', transactionId)
            .limit(1)
            .get();

        if (!existingDonation.empty) {
            console.log('PayPal IPN: Duplicate transaction ignored:', transactionId);
            return res.status(200).send('OK');
        }

        // Process the donation
        await processDonation({
            donorEmail,
            donorName,
            amount,
            transactionId,
            paymentMethod: 'paypal',
            recurring
        });

        console.log('PayPal donation processed:', transactionId, amount);
        return res.status(200).send('OK');

    } catch (error) {
        console.error('PayPal webhook error:', error);
        return res.status(200).send('OK'); // Always return 200 to prevent retries
    }
});

// ========================================
// STRIPE CHECKOUT SESSION
// ========================================

// Stripe checkout - creates a checkout session for donations
exports.stripeCheckout = functions.https.onCall(async (data, context) => {
    const stripeKey = process.env.STRIPE_SECRET_KEY;

    if (!stripeKey) {
        throw new functions.https.HttpsError('failed-precondition', 'Stripe key not configured.');
    }

    const { amount, donorEmail, donorName, recurring } = data;

    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) < 1) {
        throw new functions.https.HttpsError('invalid-argument', 'Amount must be at least $1.');
    }

    const stripe = Stripe(stripeKey);
    const amountInCents = Math.round(parseFloat(amount) * 100);

    // Build session config
    const sessionConfig = {
        mode: 'payment',
        line_items: [{
            price_data: {
                currency: 'usd',
                product_data: {
                    name: 'Donation to Make A Splash Foundation',
                },
                unit_amount: amountInCents,
            },
            quantity: 1,
        }],
        success_url: 'https://makeasplashfoundation.co/donation-success.html',
        cancel_url: 'https://makeasplashfoundation.co/donate.html',
    };

    // Add optional fields
    if (donorEmail) {
        sessionConfig.customer_email = donorEmail;
    }

    if (donorName || donorEmail) {
        sessionConfig.metadata = {
            donorName: donorName || '',
            donorEmail: donorEmail || ''
        };
    }

    // Handle recurring donations
    if (recurring === 'monthly' || recurring === 'annual') {
        sessionConfig.mode = 'subscription';
        sessionConfig.line_items[0].price_data.recurring = {
            interval: recurring === 'monthly' ? 'month' : 'year'
        };
        sessionConfig.line_items[0].price_data.product_data.name =
            `${recurring === 'monthly' ? 'Monthly' : 'Annual'} Donation - Make A Splash Foundation`;
    }

    try {
        const session = await stripe.checkout.sessions.create(sessionConfig);
        return { sessionId: session.id, url: session.url };
    } catch (stripeError) {
        console.error('Stripe API error:', stripeError.type, stripeError.message);
        throw new functions.https.HttpsError('internal', `Stripe: ${stripeError.message}`);
    }
});

// ========================================
// STRIPE WEBHOOK
// ========================================

// ========================================
// SWIM SCHOOL MANAGEMENT
// ========================================

exports.createSwimSchool = functions.https.onCall(async (data, context) => {
    // Must be admin
    if (!context.auth || !context.auth.token.admin) {
        throw new functions.https.HttpsError('permission-denied', 'Admin access required.');
    }

    const schoolData = {
        name: sanitize(data.name),
        contactPerson: sanitize(data.contactPerson || ''),
        email: sanitize(data.email),
        phone: sanitize(data.phone || ''),
        address: sanitize(data.address || ''),
        city: sanitize(data.city || ''),
        stateZip: sanitize(data.stateZip || ''),
        capacity: parseInt(data.capacity) || 0,
        ratePerLesson: parseFloat(data.ratePerLesson) || 0,
        status: data.status === 'inactive' ? 'inactive' : 'active',
        acceptingStudents: data.acceptingStudents !== false,
        notes: sanitize(data.notes || ''),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        createdBy: context.auth.token.email
    };

    if (!schoolData.name || !isValidEmail(schoolData.email)) {
        throw new functions.https.HttpsError('invalid-argument', 'Name and valid email are required.');
    }

    const docRef = await admin.firestore().collection('swim-schools').add(schoolData);
    return { success: true, schoolId: docRef.id };
});

exports.updateSwimSchool = functions.https.onCall(async (data, context) => {
    // Must be admin
    if (!context.auth || !context.auth.token.admin) {
        throw new functions.https.HttpsError('permission-denied', 'Admin access required.');
    }

    const { schoolId, ...updateData } = data;
    if (!schoolId) {
        throw new functions.https.HttpsError('invalid-argument', 'School ID required.');
    }

    const sanitizedData = {
        name: sanitize(updateData.name),
        contactPerson: sanitize(updateData.contactPerson || ''),
        email: sanitize(updateData.email),
        phone: sanitize(updateData.phone || ''),
        address: sanitize(updateData.address || ''),
        city: sanitize(updateData.city || ''),
        stateZip: sanitize(updateData.stateZip || ''),
        capacity: parseInt(updateData.capacity) || 0,
        ratePerLesson: parseFloat(updateData.ratePerLesson) || 0,
        status: updateData.status === 'inactive' ? 'inactive' : 'active',
        acceptingStudents: updateData.acceptingStudents !== false,
        notes: sanitize(updateData.notes || ''),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedBy: context.auth.token.email
    };

    await admin.firestore().collection('swim-schools').doc(schoolId).update(sanitizedData);
    return { success: true };
});

exports.recordSchoolPayment = functions.https.onCall(async (data, context) => {
    // Must be admin
    if (!context.auth || !context.auth.token.admin) {
        throw new functions.https.HttpsError('permission-denied', 'Admin access required.');
    }

    const paymentData = {
        schoolId: sanitize(data.schoolId),
        amount: parseFloat(data.amount),
        paymentDate: sanitize(data.paymentDate),
        applicationId: sanitize(data.applicationId || ''),
        paymentMethod: sanitize(data.paymentMethod || 'check'),
        reference: sanitize(data.reference || ''),
        notes: sanitize(data.notes || ''),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        createdBy: context.auth.token.email
    };

    if (!paymentData.schoolId || !paymentData.amount || paymentData.amount <= 0) {
        throw new functions.https.HttpsError('invalid-argument', 'School ID and valid amount are required.');
    }

    const docRef = await admin.firestore().collection('school-payments').add(paymentData);
    return { success: true, paymentId: docRef.id };
});

// ========================================
// EMAIL TEMPLATES & COMMUNICATION
// ========================================

// Helper to replace placeholders in template
function replacePlaceholders(template, data) {
    let result = template;
    const placeholders = {
        '{{firstName}}': data.firstName || '',
        '{{lastName}}': data.lastName || '',
        '{{email}}': data.email || '',
        '{{childName}}': data.childName || '',
        '{{status}}': data.status || '',
        '{{applicationId}}': data.applicationId || '',
        '{{awardAmount}}': data.awardAmount ? `$${data.awardAmount}` : '',
        '{{swimSchool}}': data.swimSchool || '',
        '{{currentDate}}': new Date().toLocaleDateString()
    };

    for (const [placeholder, value] of Object.entries(placeholders)) {
        result = result.replace(new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'), value);
    }
    return result;
}

exports.sendTemplatedEmail = functions.https.onCall(async (data, context) => {
    // Must be admin
    if (!context.auth || !context.auth.token.admin) {
        throw new functions.https.HttpsError('permission-denied', 'Admin access required.');
    }

    const { templateId, recipient, placeholders } = data;

    // Get template
    const templateDoc = await admin.firestore().collection('email-templates').doc(templateId).get();
    if (!templateDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'Template not found.');
    }

    const template = templateDoc.data();
    const subject = replacePlaceholders(template.subject, placeholders);
    const body = replacePlaceholders(template.body, placeholders);

    try {
        await transporter.sendMail({
            from: '"Make A Splash Foundation" <contact@makeasplashfoundation.co>',
            to: recipient,
            subject: subject,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: linear-gradient(135deg, #4A90E2, #5AAFE5); padding: 30px; text-align: center;">
                        <h1 style="color: white; margin: 0;">Make A Splash Foundation</h1>
                    </div>
                    <div style="padding: 30px; background: #f8f9fa;">
                        ${body.replace(/\n/g, '<br>')}
                    </div>
                    <div style="background: #1E3A5F; padding: 20px; text-align: center; color: white;">
                        <p style="margin: 0; font-size: 14px;">&copy; 2026 Make A Splash Foundation Inc.</p>
                    </div>
                </div>
            `
        });

        // Log the email
        await admin.firestore().collection('email-logs').add({
            recipient,
            subject,
            templateId,
            type: template.type || 'custom',
            status: 'sent',
            sentAt: admin.firestore.FieldValue.serverTimestamp(),
            sentBy: context.auth.token.email
        });

        return { success: true };
    } catch (error) {
        console.error('Error sending templated email:', error);

        // Log the failure
        await admin.firestore().collection('email-logs').add({
            recipient,
            subject,
            templateId,
            type: template.type || 'custom',
            status: 'failed',
            error: error.message,
            sentAt: admin.firestore.FieldValue.serverTimestamp(),
            sentBy: context.auth.token.email
        });

        throw new functions.https.HttpsError('internal', 'Failed to send email.');
    }
});

exports.sendBulkEmail = functions.https.onCall(async (data, context) => {
    // Must be admin
    if (!context.auth || !context.auth.token.admin) {
        throw new functions.https.HttpsError('permission-denied', 'Admin access required.');
    }

    const { templateId, recipientType, customSubject } = data;

    // Get template
    const templateDoc = await admin.firestore().collection('email-templates').doc(templateId).get();
    if (!templateDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'Template not found.');
    }

    const template = templateDoc.data();

    // Get recipients based on type
    let recipients = [];

    if (recipientType === 'subscribers') {
        const subsSnap = await admin.firestore().collection('newsletter-subscribers').get();
        recipients = subsSnap.docs.map(d => ({
            email: d.data().email,
            firstName: d.data().name || 'Friend',
            lastName: ''
        }));
    } else {
        let appsQuery = admin.firestore().collection('scholarship-applications');

        if (recipientType !== 'all_applicants') {
            appsQuery = appsQuery.where('status', '==', recipientType);
        }

        const appsSnap = await appsQuery.get();
        recipients = appsSnap.docs.map(d => {
            const app = d.data();
            return {
                email: app.parentInfo?.email,
                firstName: app.parentInfo?.firstName || '',
                lastName: app.parentInfo?.lastName || '',
                childName: (app.children || [])[0]?.name || '',
                status: app.status,
                applicationId: app.applicationId || d.id,
                awardAmount: app.awardInfo?.amount,
                swimSchool: app.awardInfo?.swimSchool
            };
        });
    }

    // Remove duplicates and invalid emails
    const seenEmails = new Set();
    recipients = recipients.filter(r => {
        if (!r.email || !isValidEmail(r.email) || seenEmails.has(r.email)) return false;
        seenEmails.add(r.email);
        return true;
    });

    // Process in batches of 50 with delays
    const batchSize = 50;
    let sent = 0;
    let failed = 0;

    for (let i = 0; i < recipients.length; i += batchSize) {
        const batch = recipients.slice(i, i + batchSize);

        for (const recipient of batch) {
            const subject = customSubject || replacePlaceholders(template.subject, recipient);
            const body = replacePlaceholders(template.body, recipient);

            try {
                await transporter.sendMail({
                    from: '"Make A Splash Foundation" <contact@makeasplashfoundation.co>',
                    to: recipient.email,
                    subject: subject,
                    html: `
                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                            <div style="background: linear-gradient(135deg, #4A90E2, #5AAFE5); padding: 30px; text-align: center;">
                                <h1 style="color: white; margin: 0;">Make A Splash Foundation</h1>
                            </div>
                            <div style="padding: 30px; background: #f8f9fa;">
                                ${body.replace(/\n/g, '<br>')}
                            </div>
                            <div style="background: #1E3A5F; padding: 20px; text-align: center; color: white;">
                                <p style="margin: 0; font-size: 14px;">&copy; 2026 Make A Splash Foundation Inc.</p>
                            </div>
                        </div>
                    `
                });
                sent++;
            } catch (error) {
                console.error('Bulk email error for', recipient.email, error);
                failed++;
            }
        }

        // Add delay between batches to avoid rate limits
        if (i + batchSize < recipients.length) {
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }

    // Log the bulk send
    await admin.firestore().collection('email-logs').add({
        recipient: `Bulk: ${sent} sent, ${failed} failed`,
        subject: customSubject || template.subject,
        templateId,
        type: 'bulk',
        status: failed === 0 ? 'sent' : 'partial',
        sentAt: admin.firestore.FieldValue.serverTimestamp(),
        sentBy: context.auth.token.email,
        details: { sent, failed, total: recipients.length }
    });

    return { success: true, sent, failed, total: recipients.length };
});

// Auto-send email on status change
exports.onApplicationStatusChange = functions.firestore
    .document('scholarship-applications/{applicationId}')
    .onUpdate(async (change, context) => {
        const before = change.before.data();
        const after = change.after.data();

        // Check if status changed to approved or denied
        if (before.status === after.status) return null;
        if (after.status !== 'approved' && after.status !== 'denied') return null;

        // Find appropriate template
        const templatesSnap = await admin.firestore()
            .collection('email-templates')
            .where('type', '==', 'status_change')
            .get();

        if (templatesSnap.empty) {
            console.log('No status change templates found');
            return null;
        }

        // Find template matching the status (approval or denial)
        let template = null;
        for (const doc of templatesSnap.docs) {
            const t = doc.data();
            if (t.name.toLowerCase().includes(after.status)) {
                template = { id: doc.id, ...t };
                break;
            }
        }

        if (!template) {
            template = { id: templatesSnap.docs[0].id, ...templatesSnap.docs[0].data() };
        }

        const recipient = after.parentInfo?.email;
        if (!recipient || !isValidEmail(recipient)) return null;

        const placeholders = {
            firstName: after.parentInfo?.firstName || '',
            lastName: after.parentInfo?.lastName || '',
            email: recipient,
            childName: (after.children || [])[0]?.name || '',
            status: after.status,
            applicationId: after.applicationId || context.params.applicationId,
            awardAmount: after.awardInfo?.amount,
            swimSchool: after.awardInfo?.swimSchool
        };

        const subject = replacePlaceholders(template.subject, placeholders);
        const body = replacePlaceholders(template.body, placeholders);

        try {
            await transporter.sendMail({
                from: '"Make A Splash Foundation" <contact@makeasplashfoundation.co>',
                to: recipient,
                subject: subject,
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <div style="background: linear-gradient(135deg, #4A90E2, #5AAFE5); padding: 30px; text-align: center;">
                            <h1 style="color: white; margin: 0;">Application Update</h1>
                        </div>
                        <div style="padding: 30px; background: #f8f9fa;">
                            ${body.replace(/\n/g, '<br>')}
                        </div>
                        <div style="background: #1E3A5F; padding: 20px; text-align: center; color: white;">
                            <p style="margin: 0; font-size: 14px;">&copy; 2026 Make A Splash Foundation Inc.</p>
                        </div>
                    </div>
                `
            });

            await admin.firestore().collection('email-logs').add({
                recipient,
                subject,
                templateId: template.id,
                type: 'status_change',
                status: 'sent',
                sentAt: admin.firestore.FieldValue.serverTimestamp(),
                applicationId: context.params.applicationId
            });

            console.log('Status change email sent to:', recipient);
        } catch (error) {
            console.error('Error sending status change email:', error);
            await admin.firestore().collection('email-logs').add({
                recipient,
                subject,
                templateId: template.id,
                type: 'status_change',
                status: 'failed',
                error: error.message,
                sentAt: admin.firestore.FieldValue.serverTimestamp(),
                applicationId: context.params.applicationId
            });
        }

        return null;
    });

// ========================================
// SCHEDULED REMINDERS
// ========================================

// Run daily at 9 AM
exports.processScheduledReminders = functions.pubsub
    .schedule('0 9 * * *')
    .timeZone('America/New_York')
    .onRun(async (context) => {
        console.log('Processing scheduled reminders...');

        // Get admin settings
        const settingsDoc = await admin.firestore().collection('admin-settings').doc('general').get();
        const settings = settingsDoc.exists ? settingsDoc.data() : {};

        if (!settings.progressReminderEnabled) {
            console.log('Progress reminders disabled');
            return null;
        }

        const reminderDays = settings.progressReminderDays || 14;
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - reminderDays);

        // Find active scholarships with no recent updates
        const activeApps = await admin.firestore()
            .collection('scholarship-applications')
            .where('status', '==', 'active')
            .get();

        for (const doc of activeApps.docs) {
            const app = doc.data();
            const lastUpdated = app.lastUpdated?.toDate?.() || app.submittedAt?.toDate?.();

            if (!lastUpdated || lastUpdated < cutoffDate) {
                // Check if we already sent a reminder recently
                const recentReminder = await admin.firestore()
                    .collection('scheduled-reminders')
                    .where('applicationId', '==', doc.id)
                    .where('type', '==', 'progress')
                    .orderBy('createdAt', 'desc')
                    .limit(1)
                    .get();

                if (!recentReminder.empty) {
                    const lastReminder = recentReminder.docs[0].data().createdAt?.toDate?.();
                    if (lastReminder && (new Date() - lastReminder) < (7 * 24 * 60 * 60 * 1000)) {
                        continue; // Skip if reminder sent within last 7 days
                    }
                }

                // Send reminder
                const email = app.parentInfo?.email;
                if (email && isValidEmail(email)) {
                    try {
                        await transporter.sendMail({
                            from: '"Make A Splash Foundation" <contact@makeasplashfoundation.co>',
                            to: email,
                            subject: 'Swim Lesson Progress Check-In',
                            html: `
                                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                                    <div style="background: linear-gradient(135deg, #4A90E2, #5AAFE5); padding: 30px; text-align: center;">
                                        <h1 style="color: white; margin: 0;">Progress Check-In</h1>
                                    </div>
                                    <div style="padding: 30px; background: #f8f9fa;">
                                        <p>Dear ${app.parentInfo?.firstName || 'Parent/Guardian'},</p>
                                        <p>We hope swim lessons are going well! We wanted to check in on ${(app.children || [])[0]?.name || 'your child'}'s progress.</p>
                                        <p>Please reply to this email or contact us to let us know how things are going. We love hearing success stories!</p>
                                        <p>Best wishes,<br><strong>Make A Splash Foundation Team</strong></p>
                                    </div>
                                </div>
                            `
                        });

                        // Log the reminder
                        await admin.firestore().collection('scheduled-reminders').add({
                            applicationId: doc.id,
                            type: 'progress',
                            email,
                            createdAt: admin.firestore.FieldValue.serverTimestamp()
                        });

                        await admin.firestore().collection('email-logs').add({
                            recipient: email,
                            subject: 'Swim Lesson Progress Check-In',
                            type: 'reminder',
                            status: 'sent',
                            sentAt: admin.firestore.FieldValue.serverTimestamp()
                        });
                    } catch (error) {
                        console.error('Error sending progress reminder:', error);
                    }
                }
            }
        }

        return null;
    });

// ========================================
// IMPACT REPORT
// ========================================

exports.generateImpactReport = functions.https.onCall(async (data, context) => {
    // Must be admin
    if (!context.auth || !context.auth.token.admin) {
        throw new functions.https.HttpsError('permission-denied', 'Admin access required.');
    }

    const year = parseInt(data.year) || new Date().getFullYear();
    const startOfYear = new Date(year, 0, 1);
    const endOfYear = new Date(year, 11, 31, 23, 59, 59);

    // Get all applications for the year
    const appsSnap = await admin.firestore()
        .collection('scholarship-applications')
        .where('submittedAt', '>=', startOfYear)
        .where('submittedAt', '<=', endOfYear)
        .get();

    const applications = appsSnap.docs.map(d => d.data());

    // Calculate metrics
    const activeCompleted = applications.filter(a => a.status === 'active' || a.status === 'completed');
    const completed = applications.filter(a => a.status === 'completed').length;

    let childrenHelped = 0;
    activeCompleted.forEach(app => {
        childrenHelped += (app.children || []).length || 1;
    });

    const fundsDistributed = activeCompleted.reduce((sum, app) => sum + (app.awardInfo?.amount || 0), 0);
    const avgScholarship = activeCompleted.length > 0 ? fundsDistributed / activeCompleted.length : 0;
    const completionRate = activeCompleted.length > 0 ? (completed / activeCompleted.length * 100) : 0;

    // Get schools
    const schoolsSnap = await admin.firestore().collection('swim-schools').get();
    const schoolsPartnered = schoolsSnap.size;

    // Get donations for the year
    const donationsSnap = await admin.firestore()
        .collection('donations')
        .where('createdAt', '>=', startOfYear)
        .where('createdAt', '<=', endOfYear)
        .get();

    const totalDonations = donationsSnap.docs.reduce((sum, d) => sum + (d.data().amount || 0), 0);

    return {
        year,
        childrenHelped,
        fundsDistributed,
        avgScholarship: Math.round(avgScholarship),
        completionRate: completionRate.toFixed(1),
        schoolsPartnered,
        totalDonations,
        totalApplications: applications.length,
        activeScholarships: activeCompleted.length,
        completedScholarships: completed
    };
});

// ========================================
// WAITLIST MANAGEMENT
// ========================================

exports.addToWaitlist = functions.https.onCall(async (data, context) => {
    // Must be admin
    if (!context.auth || !context.auth.token.admin) {
        throw new functions.https.HttpsError('permission-denied', 'Admin access required.');
    }

    const { applicationId, reason, priority, notes } = data;

    if (!applicationId) {
        throw new functions.https.HttpsError('invalid-argument', 'Application ID required.');
    }

    // Check if already on waitlist
    const existing = await admin.firestore()
        .collection('waitlist')
        .where('applicationId', '==', applicationId)
        .limit(1)
        .get();

    if (!existing.empty) {
        throw new functions.https.HttpsError('already-exists', 'Application already on waitlist.');
    }

    // Get current max position
    const maxPosSnap = await admin.firestore()
        .collection('waitlist')
        .orderBy('position', 'desc')
        .limit(1)
        .get();

    const position = maxPosSnap.empty ? 1 : (maxPosSnap.docs[0].data().position || 0) + 1;

    const docRef = await admin.firestore().collection('waitlist').add({
        applicationId,
        reason: sanitize(reason || 'insufficient_funds'),
        priority: priority || 'normal',
        notes: sanitize(notes || ''),
        position,
        addedAt: admin.firestore.FieldValue.serverTimestamp(),
        addedBy: context.auth.token.email
    });

    return { success: true, waitlistId: docRef.id, position };
});

exports.removeFromWaitlist = functions.https.onCall(async (data, context) => {
    // Must be admin
    if (!context.auth || !context.auth.token.admin) {
        throw new functions.https.HttpsError('permission-denied', 'Admin access required.');
    }

    const { waitlistId } = data;

    if (!waitlistId) {
        throw new functions.https.HttpsError('invalid-argument', 'Waitlist ID required.');
    }

    await admin.firestore().collection('waitlist').doc(waitlistId).delete();
    return { success: true };
});

exports.processWaitlist = functions.https.onCall(async (data, context) => {
    // Must be admin
    if (!context.auth || !context.auth.token.admin) {
        throw new functions.https.HttpsError('permission-denied', 'Admin access required.');
    }

    const { waitlistId } = data;

    // Get waitlist entry
    const waitlistDoc = await admin.firestore().collection('waitlist').doc(waitlistId).get();
    if (!waitlistDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'Waitlist entry not found.');
    }

    const waitlistEntry = waitlistDoc.data();

    // Get the application
    const appDoc = await admin.firestore()
        .collection('scholarship-applications')
        .doc(waitlistEntry.applicationId)
        .get();

    if (!appDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'Application not found.');
    }

    const app = appDoc.data();
    const email = app.parentInfo?.email;

    // Send notification email
    if (email && isValidEmail(email)) {
        try {
            await transporter.sendMail({
                from: '"Make A Splash Foundation" <contact@makeasplashfoundation.co>',
                to: email,
                subject: 'Good News! Scholarship Funds Available',
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <div style="background: linear-gradient(135deg, #28A745, #20c997); padding: 30px; text-align: center;">
                            <h1 style="color: white; margin: 0;">Great News!</h1>
                        </div>
                        <div style="padding: 30px; background: #f8f9fa;">
                            <p>Dear ${app.parentInfo?.firstName || 'Parent/Guardian'},</p>
                            <p>We're excited to let you know that scholarship funds are now available for your application!</p>
                            <p>Your application has been moved from our waitlist and is now being processed. We will be in touch shortly with next steps.</p>
                            <p>Thank you for your patience!</p>
                            <p>Best wishes,<br><strong>Make A Splash Foundation Team</strong></p>
                        </div>
                    </div>
                `
            });

            await admin.firestore().collection('email-logs').add({
                recipient: email,
                subject: 'Good News! Scholarship Funds Available',
                type: 'waitlist',
                status: 'sent',
                sentAt: admin.firestore.FieldValue.serverTimestamp()
            });
        } catch (error) {
            console.error('Error sending waitlist notification:', error);
        }
    }

    // Remove from waitlist
    await admin.firestore().collection('waitlist').doc(waitlistId).delete();

    // Update application status
    await admin.firestore()
        .collection('scholarship-applications')
        .doc(waitlistEntry.applicationId)
        .update({
            status: 'under_review',
            lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
            notes: admin.firestore.FieldValue.arrayUnion({
                text: 'Moved from waitlist - funds available',
                author: context.auth.token.email,
                createdAt: new Date().toISOString(),
                statusChange: 'under_review'
            })
        });

    return { success: true };
});

// ========================================
// IMPORT SUBSCRIBERS
// ========================================

exports.importSubscribers = functions.https.onCall(async (data, context) => {
    // Must be admin
    if (!context.auth || !context.auth.token.admin) {
        throw new functions.https.HttpsError('permission-denied', 'Admin access required.');
    }

    const { subscribers } = data;

    if (!Array.isArray(subscribers) || subscribers.length === 0) {
        throw new functions.https.HttpsError('invalid-argument', 'Subscribers array is required.');
    }

    // Limit batch size to prevent timeout
    if (subscribers.length > 500) {
        throw new functions.https.HttpsError('invalid-argument', 'Maximum 500 subscribers per import.');
    }

    let imported = 0;
    let skipped = 0;

    // Process in batches of 500 (Firestore batch limit)
    const batchSize = 500;
    const db = admin.firestore();

    for (let i = 0; i < subscribers.length; i += batchSize) {
        const batch = db.batch();
        const chunk = subscribers.slice(i, i + batchSize);

        for (const sub of chunk) {
            const email = sanitize(sub.email).toLowerCase();
            const name = sanitize(sub.name || '');

            if (!email || !isValidEmail(email)) {
                skipped++;
                continue;
            }

            // Check for existing subscriber
            const existing = await db.collection('newsletter-subscribers')
                .where('email', '==', email)
                .limit(1)
                .get();

            if (!existing.empty) {
                skipped++;
                continue;
            }

            const docRef = db.collection('newsletter-subscribers').doc();
            batch.set(docRef, {
                email,
                name,
                subscribedAt: admin.firestore.FieldValue.serverTimestamp(),
                source: 'csv_import',
                importedBy: context.auth.token.email
            });
            imported++;
        }

        await batch.commit();
    }

    console.log(`Import complete: ${imported} imported, ${skipped} skipped`);
    return { success: true, imported, skipped };
});

exports.updateAvailableFunds = functions.https.onCall(async (data, context) => {
    // Must be admin
    if (!context.auth || !context.auth.token.admin) {
        throw new functions.https.HttpsError('permission-denied', 'Admin access required.');
    }

    const { amount, threshold } = data;

    await admin.firestore().collection('admin-settings').doc('general').set({
        availableFunds: parseFloat(amount) || 0,
        lowFundsThreshold: parseFloat(threshold) || 500,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedBy: context.auth.token.email
    }, { merge: true });

    // Check if funds are above threshold and there's a waitlist
    const settings = { availableFunds: parseFloat(amount) || 0, lowFundsThreshold: parseFloat(threshold) || 500 };

    if (settings.availableFunds >= settings.lowFundsThreshold) {
        const waitlistSnap = await admin.firestore()
            .collection('waitlist')
            .orderBy('position', 'asc')
            .limit(1)
            .get();

        if (!waitlistSnap.empty) {
            console.log('Funds available and waitlist exists - admin should process waitlist');
        }
    }

    return { success: true };
});

exports.stripeWebhook = functions.https.onRequest(async (req, res) => {
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
        console.error('Stripe webhook: STRIPE_SECRET_KEY not found');
        return res.status(500).send('Stripe not configured');
    }
    const stripeClient = Stripe(stripeKey);

    if (req.method !== 'POST') {
        return res.status(405).send('Method Not Allowed');
    }

    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;

    try {
        if (webhookSecret && sig) {
            // Verify webhook signature
            event = stripeClient.webhooks.constructEvent(req.rawBody, sig, webhookSecret);
        } else {
            // No signature verification (not recommended for production)
            event = req.body;
        }
    } catch (err) {
        console.error('Stripe webhook signature verification failed:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    try {
        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object;

                // Check for duplicate
                const existingDonation = await admin.firestore()
                    .collection('donations')
                    .where('transactionId', '==', session.id)
                    .limit(1)
                    .get();

                if (!existingDonation.empty) {
                    console.log('Stripe: Duplicate session ignored:', session.id);
                    break;
                }

                const donorEmail = session.customer_email || session.metadata?.donorEmail || '';
                const donorName = session.metadata?.donorName || '';
                const amount = (session.amount_total || 0) / 100;
                const recurring = session.mode === 'subscription';

                if (amount > 0) {
                    await processDonation({
                        donorEmail,
                        donorName,
                        amount,
                        transactionId: session.id,
                        paymentMethod: 'stripe',
                        recurring
                    });
                    console.log('Stripe donation processed:', session.id, amount);
                }
                break;
            }

            case 'invoice.payment_succeeded': {
                // Handle recurring subscription payments
                const invoice = event.data.object;

                // Check for duplicate
                const existingInvoice = await admin.firestore()
                    .collection('donations')
                    .where('transactionId', '==', invoice.id)
                    .limit(1)
                    .get();

                if (!existingInvoice.empty) {
                    console.log('Stripe: Duplicate invoice ignored:', invoice.id);
                    break;
                }

                const donorEmail = invoice.customer_email || '';
                const amount = (invoice.amount_paid || 0) / 100;

                if (amount > 0 && donorEmail) {
                    await processDonation({
                        donorEmail,
                        donorName: invoice.customer_name || '',
                        amount,
                        transactionId: invoice.id,
                        paymentMethod: 'stripe',
                        recurring: true
                    });
                    console.log('Stripe subscription payment processed:', invoice.id, amount);
                }
                break;
            }

            default:
                console.log('Stripe webhook: Unhandled event type:', event.type);
        }

        return res.status(200).json({ received: true });

    } catch (error) {
        console.error('Stripe webhook processing error:', error);
        return res.status(200).json({ received: true }); // Return 200 to prevent retries
    }
});
