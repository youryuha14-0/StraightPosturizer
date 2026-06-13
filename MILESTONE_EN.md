# StraightPosturizer - Build Checklist

This document is the execution-facing TODO for the project. A task should be checked only when the code exists and the behavior has been verified, not merely when a scaffold is present.

Legend:

- `[x]` Confirmed in the repository
- `[ ]` Still needs implementation, wiring, or verification

---

## Phase 0. Foundation

Goal: clean up the runtime setup and basic branding before feature work accelerates.

- [x] `frontend/` Next.js project exists
- [x] `backend/` FastAPI project exists
- [x] Frontend and backend are split into separate directories
- [x] Supabase environment example file exists
- [ ] Document and verify frontend local run steps
- [ ] Document and verify backend local run steps
- [ ] Define the API base URL strategy for local and production
- [ ] Replace default metadata and branding with StraightPosturizer-specific values

---

## Phase 1. Posture Monitoring MVP

Goal: complete the core flow where a user enables the camera, calibrates, and receives posture feedback.

- [x] Posture calculation utilities exist
- [x] MediaPipe monitoring hook exists
- [x] Audio alert utility exists
- [ ] Replace the main page with the real app screen
- [ ] Render webcam video and canvas overlay in the UI
- [ ] Connect the start button to the monitoring hook
- [ ] Connect the stop button to the monitoring hook
- [ ] Connect the calibration button to the monitoring hook
- [ ] Add UI for the overall score
- [ ] Add UI for the turtle neck score
- [ ] Add UI for the shoulder symmetry score
- [ ] Add UI for the slump score
- [ ] Show a visual overlay when alert state is active
- [ ] Show a local session summary after monitoring stops
- [ ] Add a camera-permission failure state
- [ ] Add a pose-model loading failure state

---

## Phase 2. API Integration

Goal: move settings and session results between the frontend and backend.

- [x] Health API exists
- [x] Settings fetch API exists
- [x] Settings save API exists
- [x] Session save API exists
- [x] Session fetch API exists
- [ ] Create a shared frontend API layer
- [ ] Load user settings during initial screen setup
- [ ] Save user settings from the settings UI
- [ ] Send session results when monitoring ends
- [ ] Render session history from backend data
- [ ] Handle API loading states
- [ ] Handle API error states
- [ ] Define the retry flow for failed requests
- [ ] Document mock mode vs Supabase mode behavior

---

## Phase 3. User and Settings Experience

Goal: make at least one user flow save and restore data reliably.

- [x] Supabase client helper exists
- [x] Local mock session helper exists
- [ ] Finish one end-to-end persistence flow with a mock user first
- [ ] Design a login screen or login section
- [ ] Add Supabase Auth sign-in UI
- [ ] Add sign-out UI
- [ ] Add a sensitivity setting UI
- [ ] Add an alert-delay setting UI
- [ ] Add a visual-alert toggle
- [ ] Add an audio-alert toggle
- [ ] Add an alert-sound selector
- [ ] Verify settings apply immediately to monitoring behavior
- [ ] Verify data is scoped correctly per user

---

## Phase 4. History and Dashboard

Goal: help users understand habit trends from past sessions.

- [x] Chart dependency is installed
- [ ] Build a session history table
- [ ] Build a recent sessions summary card
- [ ] Build a daily posture score chart
- [ ] Build a weekly alert trend chart
- [ ] Build a summary for the worst posture time of day
- [ ] Add an empty state for dashboard views
- [ ] Add a loading state for dashboard views

---

## Phase 5. Verification and Deployment

Goal: verify the MVP at a usable quality bar and prepare it for deployment.

- [ ] Confirm webcam video renders after permission is granted
- [ ] Confirm canvas overlay rendering
- [ ] Confirm scoring changes after calibration
- [ ] Confirm alerts fire after sustained poor posture
- [ ] Confirm alerts clear after posture recovery
- [ ] Confirm session data is saved after monitoring ends
- [ ] Pass frontend lint
- [ ] Pass frontend production build
- [ ] Confirm backend server startup
- [ ] Confirm `/api/health` responds correctly
- [ ] Finalize deployment environment variables
- [ ] Deploy the frontend
- [ ] Deploy the backend

---

## Immediate Next Slice

These are the highest-leverage next tasks for the current repository state.

- [ ] Replace `frontend/src/app/page.tsx` with the real monitoring screen
- [ ] Wire `usePostureMonitor` into the page
- [ ] Add live score cards and alert UI
- [ ] Connect session saving to the backend API
- [ ] Add the first settings panel
