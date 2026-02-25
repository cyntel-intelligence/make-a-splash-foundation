# Project Management Directory

This directory contains project tracking and management files.

## Files
- `state.json` - Current project state and top 3-5 next actions (categorized by owner)
- `BACKLOG.md` - LEAN task list (one-line tasks, references to specs)
- `roadmap.md` - Phases, milestones, and timeline
- `architecture.md` - System design overview
- `design-system.md` - UI colors, themes, and styling guidance
- `decisions.md` - Quick decision log
- `session-log.jsonl` - Session-by-session history
- `super-history.jsonl` - Supervisor review history
- `dashboard/dashboard-data.json` - Metrics and gantt data for visualization
- `architect/` - Feature specs, decisions, staging plans, archive

## Commands

**Note**: Slash commands are defined at the **user level** (`~/.claude/commands/`), not per-project. All projects share the same command definitions.

- `/orch` - Start working on the project
- `/max` - Maximum parallelization analysis (generates PARALLEL-EXECUTION-PLAN.md)
- `/endsession` - Save progress before stopping (categorizes tasks)
- `/super` - Review progress (use periodically)
- `/architect` - Architecture consultation (creates specs in architect/)
- `/pm` - Project management (lean startup)
- `/sync [agent]` - Full synchronization protocol
- `/librarian` - Knowledge base management
- `/template` - Generate presentations, questionnaires on demand
- `/ux-test` - Manual UX testing with comment widget
- `/fe-test` - Frontend E2E testing with Playwright

## Workflow
1. Start work with `/orch`
2. Work on tasks from state.json next_actions (3-5 priorities)
3. Reference BACKLOG.md for full context when planning
4. Use `/max` for parallelization analysis when spawning multiple builders
5. End with `/endsession` to update tracking and categorize tasks
6. Periodically run `/super` for oversight
7. Use `/sync pm` to update dashboard metrics and gantt data
8. Weekly: Review and groom BACKLOG.md

## Key Principles
- **Lean Backlog**: BACKLOG.md has task checkboxes only, specs live in architect/
- **Mandatory Sync**: BACKLOG.md and state.json must stay in sync on every merge
- **Archival**: Completed epics move to architect/archive/, not deleted
- **Parallelization**: Use `/max` to plan parallel builder execution
- **Keep state.json focused**: Only 3-5 next_actions
