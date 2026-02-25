# Project Backlog

> **Next Actions**: See state.json for immediate priorities (top 3-5 items)

**Last Review**: 2026-02-25
**Next Review**: 2026-03-04

---

## Epic: Bug Fixes & Current Issues CRITICAL
**Status**: Active | **Target**: Phase 1

### Tasks
- [x] BUG-1: Audit and document all existing bugs ✅ (Session 1)
- [x] BUG-2: Fix scholarship application form issues ✅ (Session 1 - validation)
- [x] BUG-3: Fix admin dashboard bugs ✅ (Session 1 - sorting, escape key)
- [x] BUG-4: Fix donation flow issues - PayPal integration ✅ (Session 1)
- [x] BUG-5: Address any broken links or missing assets ✅ (Session 1 - classroom.jpg)
- [x] BUG-6: Fix Stripe webhook security issue ✅ (Session 1)

**Spec**: `.project/architect/features/bug-fixes.md`
**Dependencies**: None

---

## Epic: Scholarship System Improvements HIGH
**Status**: Planned | **Target**: Phase 2

### Tasks
- [ ] SCHOL-1: Review current scholarship workflow
- [ ] SCHOL-2: Improve application form UX
- [ ] SCHOL-3: Enhance application status tracking
- [ ] SCHOL-4: Improve admin review process

**Spec**: `.project/architect/features/scholarship-improvements.md`
**Dependencies**: bug-fixes

---

## Epic: Admin Dashboard Enhancements HIGH
**Status**: Planned | **Target**: Phase 2

### Tasks
- [ ] ADMIN-1: Audit current admin features
- [ ] ADMIN-2: Improve application management interface
- [ ] ADMIN-3: Enhance donor management
- [ ] ADMIN-4: Add reporting/export features

**Spec**: `.project/architect/features/admin-enhancements.md`
**Dependencies**: bug-fixes

---

## Epic: Site Polish & Optimization MEDIUM
**Status**: Planned | **Target**: Phase 3

### Tasks
- [ ] POLISH-1: Performance audit and optimization
- [ ] POLISH-2: Mobile responsiveness review
- [ ] POLISH-3: Content and copy updates
- [ ] POLISH-4: Final QA pass

**Spec**: `.project/architect/features/polish.md`
**Dependencies**: scholarship-improvements, admin-enhancements

---

## Completed Epics (Archived)
<!-- Move completed epics to .project/architect/archive/[YYYY-MM]-completed.md -->
<!-- Keep one-line references here: -->
<!-- - [x] EPIC-NAME: See architect/archive/2026-02-completed.md -->

---

## Backlog Rules
- Task descriptions: ONE LINE max
- No implementation details (put in architect/features/)
- No dependency diagrams (put in architect/staging/)
- No session notes (put in session-log.jsonl)
- When epic complete: move to architect/archive/
