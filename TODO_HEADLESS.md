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
- [x] Test: Can main process access templates?

## Phase 2: Direct execution from WebSocket
- [x] In `claudeControl.ts`, handle `workflow:runTemplate` directly
- [x] Call `executeWorkflow()` from main process with template data
- [x] Remove dependency on renderer for execution
- [x] Test: Run workflow from HTML without app UI interaction

## Phase 3: Full headless mode
- [x] Add `workflow:runTemplate` command - load + run in one step
- [x] Return final result directly to WebSocket client
- [x] Test: HTML client can run workflow and get result without touching app

## Phase 4: Cleanup
- [x] Update HTML client to use new commands
- [x] Test both UI and headless work correctly
- [x] Document the API

## Phase 5: REST API (ADDED)
- [x] Add HTTP REST API on port 9998
- [x] `GET /health` - health check
- [x] `GET /templates` - list with full schema
- [x] `GET /templates/:id` - single template schema
- [x] `POST /run` - run with custom params
- [x] Test with curl
- [x] Create docs/REST_API.md
- [x] Create docs/WEBSOCKET_API.md

---

## Progress Log

### Session: [DATE]
- Started implementation
