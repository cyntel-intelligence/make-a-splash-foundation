# Make A Splash Foundation Website

A modern, responsive website for the Make A Splash Foundation - a 501(c)(3) nonprofit dedicated to preventing childhood drowning through survival swim scholarships.

## 📋 What's Included

Your new website includes:

### Pages
1. **index.html** - Homepage with all sections
   - Hero section with impact message
   - About Us section
   - Programs overview
   - Impact statistics
   - Partners section
   - Get Involved CTAs
   - Contact form

2. **apply.html** - Scholarship Application
   - Complete application form with all required fields
   - Document requirements checklist
   - Instructions for applicants

3. **donate.html** - Donation Page
   - One-time and recurring donation options
   - Preset and custom amounts
   - Impact messaging
   - Multiple giving options

### Assets
- **assets/css/styles.css** - All styling (modern, responsive, accessible)
- **assets/js/script.js** - Interactive features and animations
- **assets/images/logo.svg** - Your organization logo

## 🚀 Quick Start

### Option 1: Open Locally (Easiest)
1. Navigate to the `website` folder on your Desktop
2. Double-click `index.html` to open in your browser
3. That's it! You can view and test everything locally

### Option 2: Use a Local Server (Recommended for Testing)
```bash
# Navigate to the website folder
cd "/Users/carlycaldwell/Desktop/Make A Splash Foundation/website"

# Start a simple server (Python 3)
python3 -m http.server 8000

# Or using Python 2
python -m SimpleHTTPServer 8000

# Open in browser: http://localhost:8000
```

## 🎨 Customization Guide

### Adding Photos
Replace the placeholder SVGs with real photos:

1. **Homepage Photos**
   - Save your photos in `assets/images/`
   - Edit `index.html` and replace the `<svg>` placeholders with:
     ```html
     <img src="assets/images/your-photo.jpg" alt="Description">
     ```

2. **Recommended Photos to Add**
   - Children learning to swim (About section)
   - Scholarship recipients
   - Community events
   - Team/board members

### Updating Content

#### Change Statistics
Edit the numbers in `index.html` around line 70-95:
```html
<div class="stat-number" data-target="100">0</div>
```
Change `data-target="100"` to your actual numbers.

#### Update Contact Email
Search for `info@makeasplashfoundation.co` and replace with your actual email in:
- index.html
- apply.html
- donate.html

#### Add Social Media Links
In `index.html` around line 500, update:
```html
<a href="https://www.instagram.com/makeasplashfoundation" target="_blank">
```

### Changing Colors
Edit `assets/css/styles.css` at the top (lines 10-20):
```css
:root {
    --primary-blue: #4A90E2;  /* Change these values */
    --primary-blue-dark: #2E5F8E;
    --secondary-blue: #5AAFE5;
}
```

## 🌐 Deployment Options

### Option 1: Netlify (Free & Easy)
1. Go to [netlify.com](https://netlify.com)
2. Drag and drop your entire `website` folder
3. Done! You get a free domain like `makeasplash.netlify.app`
4. Optional: Connect your own domain

### Option 2: GitHub Pages (Free)
1. Create a GitHub account if you don't have one
2. Create a new repository named `makeasplash-website`
3. Upload all files from the `website` folder
4. Go to Settings → Pages → Enable GitHub Pages
5. Your site will be live at `username.github.io/makeasplash-website`

### Option 3: Vercel (Free)
1. Go to [vercel.com](https://vercel.com)
2. Sign up with GitHub or email
3. Import your website folder
4. Deploy with one click

### Option 4: Traditional Web Hosting
If you have a hosting provider (GoDaddy, Bluehost, etc.):
1. Upload all files via FTP or File Manager
2. Ensure `index.html` is in the root directory
3. Done!

## 📧 Setting Up Forms

### Contact Form
Currently opens email client. To use a proper backend:

**Option A: Formspree (Easiest)**
```html
<!-- Replace form tag in index.html -->
<form action="https://formspree.io/f/YOUR_FORM_ID" method="POST">
```

**Option B: Netlify Forms**
If using Netlify, just add `netlify` attribute:
```html
<form name="contact" method="POST" netlify>
```

### Scholarship Application
The application form collects data but needs a backend to process it.

**Recommended Setup:**
1. Use [Formspree](https://formspree.io) or [Netlify Forms](https://www.netlify.com/products/forms/)
2. Receive applications via email
3. Store documents in Google Drive or Dropbox

**For Advanced Users:**
- Set up a backend with Firebase, Supabase, or custom server
- Store applications in a database
- Implement file upload for documents

### Donation Processing

**Important:** The donation form needs payment integration.

**Recommended Options:**
1. **Stripe** - Most popular, nonprofit-friendly
   - Sign up at [stripe.com](https://stripe.com)
   - Use Stripe Checkout or Elements
   - 2.9% + $0.30 per transaction

2. **PayPal Giving Fund** - 0% fees for nonprofits
   - Sign up at [paypal.com/fundraiser](https://paypal.com/fundraiser)
   - Add PayPal button to donate page

3. **Donorbox** - Built for nonprofits
   - Easy embedded donation forms
   - Recurring donation management

4. **Network for Good** - Nonprofit-specific platform

## 🔧 Technical Details

### Browser Support
- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

### Responsive Breakpoints
- Desktop: 1200px+
- Tablet: 768px - 1199px
- Mobile: 320px - 767px

### Accessibility Features
- Semantic HTML5
- ARIA labels
- Keyboard navigation support
- Screen reader friendly
- High contrast ratios
- Focus indicators

### Performance
- Optimized CSS and JavaScript
- Lazy loading ready (add `data-src` to images)
- Minimal external dependencies
- Fast load times

## 📝 Next Steps

### Immediate (Before Launch)
- [ ] Add real photos of children in swim lessons
- [ ] Update statistics with accurate numbers
- [ ] Set up contact form with Formspree/Netlify
- [ ] Integrate payment processor (Stripe/PayPal)
- [ ] Test application form submission
- [ ] Update all email addresses
- [ ] Verify all social media links

### Soon After Launch
- [ ] Set up Google Analytics
- [ ] Submit to Google Search Console
- [ ] Create Facebook/Instagram pixels
- [ ] Set up automated email receipts
- [ ] Add testimonials with photos
- [ ] Create blog section for water safety tips
- [ ] Add success stories/case studies

### Ongoing
- [ ] Update impact statistics quarterly
- [ ] Share news and updates
- [ ] Add new photos regularly
- [ ] Monitor form submissions
- [ ] Respond to inquiries within 24 hours
- [ ] Update partner swim schools

## 🆘 Need Help?

### Common Issues

**Problem:** Forms don't submit
- **Solution:** Set up Formspree or Netlify Forms (see "Setting Up Forms" above)

**Problem:** Images don't load
- **Solution:** Check file paths are correct and images are in `assets/images/`

**Problem:** Site looks broken on mobile
- **Solution:** Make sure you're viewing with a modern browser. Clear cache and reload.

**Problem:** Donation button doesn't work
- **Solution:** This requires payment integration. See "Donation Processing" section above.

### Getting Support
- Email: info@makeasplashfoundation.co
- For technical issues with the website code, reach out to a web developer
- For hosting questions, contact your hosting provider's support

## 📊 Analytics & Tracking

Recommended tools to add:

1. **Google Analytics 4**
   - Track visitors, page views, conversions
   - Free and comprehensive

2. **Facebook Pixel**
   - Track ad performance
   - Retarget visitors

3. **Hotjar**
   - See how users interact with your site
   - Identify improvements

## 🔒 Security Best Practices

- Use HTTPS (automatic with Netlify/Vercel)
- Don't expose API keys in frontend code
- Validate all form inputs
- Use secure payment processors only
- Keep backups of your website files
- Update dependencies periodically

## 📱 Social Media Integration

Add these meta tags to `<head>` for better social sharing:

```html
<!-- Facebook/LinkedIn -->
<meta property="og:title" content="Make A Splash Foundation">
<meta property="og:description" content="Preventing childhood drowning through survival swim scholarships">
<meta property="og:image" content="URL_TO_YOUR_IMAGE">
<meta property="og:url" content="https://yourwebsite.com">

<!-- Twitter -->
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="Make A Splash Foundation">
<meta name="twitter:description" content="Preventing childhood drowning through survival swim scholarships">
<meta name="twitter:image" content="URL_TO_YOUR_IMAGE">
```

## 🎯 SEO Optimization

Your site is already optimized with:
- Semantic HTML
- Meta descriptions
- Proper heading hierarchy
- Alt text for images
- Fast load times

**Additional Steps:**
1. Submit sitemap to Google Search Console
2. Create Google My Business listing
3. Get listed in nonprofit directories
4. Build backlinks from partner organizations
5. Create regular blog content

## 💡 Feature Ideas for Future

- **Impact Dashboard** - Real-time statistics
- **Photo Gallery** - Showcase your work
- **Blog** - Water safety tips and news
- **Events Calendar** - Community events
- **Volunteer Portal** - Sign up and manage volunteers
- **Success Stories** - Share recipient stories
- **Newsletter Signup** - Build email list
- **Live Chat** - Instant support

## 📄 License & Credits

**Website Built For:** Make A Splash Foundation Inc.
**Tax ID:** 92-3713877
**Status:** 501(c)(3) Nonprofit Organization

**Technologies Used:**
- HTML5
- CSS3 (Custom styling, no frameworks)
- Vanilla JavaScript
- Google Fonts (Poppins, Open Sans)

**Images:**
- Logo: Provided by Make A Splash Foundation
- Placeholder graphics: SVG illustrations

---

## 🎉 Congratulations!

You now have a professional, modern website that will help you:
- Reach more families in need
- Accept scholarship applications
- Process donations
- Raise awareness
- Grow your impact

**Remember:** A website is never truly "done" - keep updating it with fresh content, photos, and impact stories to engage your audience and attract more support.

**Good luck making a splash and saving lives! 💙🏊**

---

*For questions about this website, contact your web developer or reach out for support.*
