# TODO: Headless Workflow Execution

## Goal
Run workflows directly from WebSocket without needing UI.

## Current State
- WebSocket streaming works (progress, logs, results)
- But execution requires UI (clicks Run button in renderer)
- Templates only exist in React (frontend)

---

## Phase 1: Move templates to main process
- [x] Create `electron/main/templates.ts` - copy template definitions
- [x] Add function `getTemplate(id)` and `listTemplates()`
- [ ] Test: Can main process access templates?

## Phase 2: Direct execution from WebSocket
- [x] In `claudeControl.ts`, handle `workflow:runTemplate` directly
- [x] Call `executeWorkflow()` from main process with template data
- [x] Remove dependency on renderer for execution
- [ ] Test: Run workflow from HTML without app UI interaction

## Phase 3: Full headless mode
- [ ] Add `workflow:runTemplate` command - load + run in one step
- [ ] Return final result directly to WebSocket client
- [ ] Test: HTML client can run workflow and get result without touching app

## Phase 4: Cleanup
- [ ] Update HTML client to use new commands
- [ ] Test both UI and headless work correctly
- [ ] Document the API

---

## Progress Log

### Session: [DATE]
- Started implementation
