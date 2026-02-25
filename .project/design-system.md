# Project Design System

> Overrides: `~/.claude/DESIGN_SYSTEM.md` (global defaults)

## Active Theme: Light Mode (with Dark Mode support)

This project uses light mode as the primary theme to maintain a friendly, approachable nonprofit feel.

## Colors (Project-Specific)

### Brand Colors
Based on Make A Splash Foundation branding:

- **Primary Blue**: #0077be (Ocean blue - represents water/swimming)
- **Secondary Teal**: #00a99d (Aqua accent)
- **Accent Gold**: #f7b733 (Warmth, positivity)

### Theme - Light Mode (Primary)
- Background: #ffffff
- Surface: #f8f9fa
- Text primary: #212529
- Text secondary: #6c757d
- Border: #dee2e6

### Theme - Dark Mode (Secondary)
- Background: #1a1a2e
- Surface: #16213e
- Text primary: #e9ecef
- Text secondary: #adb5bd
- Border: #495057

### Semantic Colors
- Success: #28a745
- Warning: #ffc107
- Error: #dc3545
- Info: #17a2b8

## Typography
- Headings: Clean, bold sans-serif
- Body: Readable, accessible font sizing (minimum 16px base)
- Links: Primary blue with underline on hover

## UI Components
- Buttons: Rounded corners, clear hover states
- Forms: Clear labels, validation feedback
- Cards: Subtle shadows, clear visual hierarchy

## Accessibility Requirements
- Minimum contrast ratio: 4.5:1 for normal text
- Focus indicators visible on all interactive elements
- Form inputs have associated labels
- Error messages are clear and descriptive

## Notes
- Build light-first, dark mode is secondary
- Ensure all donation and application forms are highly accessible
- Mobile-first responsive design
- Test with screen readers for critical flows (donations, applications)
