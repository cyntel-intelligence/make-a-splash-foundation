# Project Decisions Log

## 2026-02-25

### Decision: Project Structure
- **Choice**: v2.5 .project/ tracking structure
- **Rationale**: Component dependency map, lean backlog, architect folder for specs, archival workflow
- **Alternatives**: Ad-hoc management
- **Impact**: Smaller BACKLOG.md, clear document separation, better agent efficiency

### Decision: Phase Structure
- **Choice**: Fix -> Enhance -> Polish approach
- **Rationale**: Address existing bugs first before adding features, then polish for best user experience
- **Alternatives**: Feature-by-feature, Priority-based
- **Impact**: Ensures stable foundation before enhancements

### Decision: Infrastructure
- **Choice**: No additional infrastructure scaffolding
- **Rationale**: Existing Firebase setup handles hosting, database, and functions. No need for Docker or local dev infrastructure.
- **Alternatives**: Add Docker/local dev setup
- **Impact**: Keeps project simple, leverages existing Firebase infrastructure

### Decision: PayPal Dynamic Amount Integration
- **Choice**: PayPal JavaScript SDK (Smart Payment Buttons)
- **Rationale**: Best UX (popup vs redirect), modern/recommended approach, simpler than REST API server-side flow
- **Alternatives**: PayPal REST API via Firebase Function (higher complexity, redirect flow), PayPal NCP URL params (not supported)
- **Impact**: Fixes broken PayPal donation flow, maintains consistent UX with Stripe, requires PayPal Client ID config
- **Spec**: `.project/architect/features/paypal-integration.md`
