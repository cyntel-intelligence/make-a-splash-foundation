# General Site Audit Report

**Date**: 2026-02-25
**Auditor**: Orchestrator (replacing Builder 4)
**Scope**: General website - navigation, assets, links, SEO, mobile responsiveness

---

## Summary

| Severity | Count |
|----------|-------|
| Critical | 1 |
| High | 2 |
| Medium | 3 |
| Low | 4 |

---

## Critical Issues

### 1. Broken Image File: classroom.jpg
**File**: `assets/images/classroom.jpg`
**Issue**: File is only 84 bytes - this is not a valid image. It's either corrupted or a placeholder.
**Impact**: If referenced anywhere, will show broken image.
**Fix**: Replace with actual image or remove if unused.

---

## High Issues

### 2. donors.html is Completely Static
**File**: `donors.html`
**Issue**: All four donor tiers display "Be the first to join" as static text. No Firebase integration to pull actual donors from database.
**Impact**: Donors who contribute are never recognized on the site, reducing incentive to donate.
**Fix**: Add Firebase query to populate donor lists from Firestore (same approach as admin dashboard).

### 3. Download Links Misleading
**File**: `resources.html` (lines 335-366)
**Issue**: Links say "Download PDF →" but point to `.html` files. Users must manually print-to-PDF.
**Example**: `href="downloads/pool-safety-checklist.html"` with text "Download PDF →"
**Impact**: User confusion; expectation mismatch.
**Fix**: Either:
  - Generate actual PDFs and update links
  - Change link text to "View Resource →" or "Open & Print →"

---

## Medium Issues

### 4. Large Unused Image Files
**Location**: `assets/images/`
**Issue**: Several very large files that don't appear in any HTML:
  - `underwater baby2.jpg` - 23.5 MB
  - `underwater baby3.jpg` - 14.8 MB
  - `underwater baby4.jpg` - 13.8 MB
  - `GPTempDownload.jpg` - 2.9 MB
  - `GPTempDownload (1).jpg` - 6.4 MB
**Total waste**: ~61 MB
**Impact**: Bloats repository, slows clones/deploys.
**Fix**: Review and remove unused files or move to archive.

### 5. Footer Inconsistency Across Pages
**Issue**: Newsletter signup form appears in footer on most pages but is missing from `donors.html`.
**Pages with newsletter**: index.html, resources.html, corporate-partners.html
**Pages without**: donors.html
**Impact**: Inconsistent user experience; missed subscription opportunity.
**Fix**: Add newsletter form to donors.html footer.

### 6. No 404 Testing for External Links
**File**: `resources.html` (lines 279-316)
**Issue**: Six external links to water safety organizations. No verification they're still active:
  - https://www.ndpa.org/
  - https://www.usswimschools.org/
  - https://www.redcross.org/take-a-class/swimming
  - https://www.watersafetyusa.org/
  - https://www.who.int/teams/social-determinants-of-health/safety-and-mobility/drowning
  - https://www.stopdrowningnow.org/
**Impact**: Potential broken links damaging credibility.
**Fix**: Periodically verify external links are valid.

---

## Low Issues

### 7. Unused Legacy Image Files
**Location**: `assets/images/`
**Issue**: Several duplicate/legacy files with non-descriptive names:
  - `3b35fc_1101b8d9e3754fbda493f393b9908f8e~mv2.avif`
  - `3b35fc_793024dcea8d4523ac02ae2f53a5a945~mv2.avif`
  - `3b35fc_f0a86f71f10f4f3d9505c30a2afbf55f~mv2.avif`
**Impact**: Hard to maintain, unclear what they are.
**Fix**: Rename descriptively or remove if unused.

### 8. Mixed Image Formats
**Location**: `assets/images/`
**Issue**: Mix of AVIF, SVG, PNG, JPG, JPEG, WEBP formats. Some modern (AVIF), some legacy (large JPGs).
**Impact**: Inconsistent optimization; some browsers may not support AVIF.
**Fix**: Standardize on modern formats with fallbacks.

### 9. Hardcoded Year in Footer
**Files**: All pages
**Example**: `&copy; 2026 Make A Splash Foundation Inc.`
**Impact**: Will need manual update each year.
**Fix**: Use JavaScript to dynamically insert current year.

### 10. Social Media Links Hardcoded
**Issue**: Instagram and Facebook URLs hardcoded in every page footer. If they change, must update multiple files.
**Fix**: Consider a shared footer component or config file.

---

## Positive Findings

### SEO
- All pages have proper `<title>`, `<meta description>`, canonical URLs
- Open Graph tags present on all pages
- Twitter Card meta tags present
- Proper `robots.txt` blocking admin.html and 404.html
- Valid `sitemap.xml` with all public pages
- Structured data (JSON-LD) on homepage for nonprofit organization

### Google Analytics
- Consistent tracking ID (G-QJL63ED644) on all pages
- Properly placed in `<head>`

### Navigation
- All internal links verified working
- Mobile menu toggle present with proper aria-label
- Consistent navigation across all pages

### Accessibility
- Logo images have alt text
- Buttons have aria-labels
- Form inputs have labels
- Back-to-top button present

### Security
- robots.txt properly excludes admin page from search engines
- External links use `rel="noopener"` attribute

---

## Recommendations Priority

1. **Immediate**: Fix broken classroom.jpg image
2. **High**: Make donors.html dynamic (pull from Firebase)
3. **High**: Clarify download links or provide actual PDFs
4. **Medium**: Clean up unused large image files
5. **Low**: Standardize footer across all pages
