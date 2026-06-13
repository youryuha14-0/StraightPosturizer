# StraightPosturizer Frontend

This frontend is the user-facing posture monitoring app for StraightPosturizer. It is responsible for camera access, live posture scoring, alert UI, and the session flow that later syncs to the backend.

## Stack

- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- MediaPipe Pose
- Supabase client
- Recharts

## Current Role of the Frontend

The frontend owns the real-time experience:

- capture webcam input
- run posture analysis in the browser
- render posture scores and alert states
- collect settings and session actions
- send settings and session summaries to the backend

## Important Source Areas

- `src/app/` - app shell and routes
- `src/hooks/usePostureMonitor.ts` - MediaPipe loading, camera lifecycle, alert timing, session stats
- `src/utils/postureCalc.ts` - posture scoring and calibration math
- `src/utils/audioAlert.ts` - browser-generated alert sounds
- `src/utils/supabase.ts` - Supabase and local mock session helpers

## Local Development

Install dependencies:

```bash
npm install
```

Run the frontend:

```bash
npm run dev
```

Open `http://localhost:3000`.

## Environment Variables

The frontend can run without Supabase for early UI work, but production auth and persistence need these values:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

## Expected Backend

The current frontend is intended to talk to a FastAPI backend that exposes:

- `GET /api/health`
- `GET /api/settings/{user_id}`
- `POST /api/settings/{user_id}`
- `POST /api/sessions`
- `GET /api/sessions/{user_id}`

## Current Project Status

The repository already includes posture scoring utilities and a monitoring hook, but the main page still needs to be turned into the real product UI. The fastest path forward is:

1. replace the default landing page
2. wire in `usePostureMonitor`
3. show live score cards and alert UI
4. save sessions through the backend API

## Notes

- Keep posture analysis on the client unless server involvement is required.
- Do not store raw webcam footage.
- Prefer calm, readable UI over noisy warning patterns.
