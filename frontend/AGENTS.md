<!-- BEGIN:nextjs-agent-rules -->
# Frontend Agent Notes

This frontend uses a modern Next.js release, and some framework behavior may differ from older references.
Before changing routing, rendering, caching, metadata, or build configuration, read the relevant guide in `node_modules/next/dist/docs/`.
Treat deprecation warnings as migration work, not optional cleanup.
<!-- END:nextjs-agent-rules -->

## Project Context

- The app uses the App Router.
- Keep posture analysis on the client unless persistence or authentication requires the server.
- Preserve clear client and server component boundaries.
- Favor small, composable UI pieces over a single oversized page component.
- Always use 최신 문법(레거시 필요 x)
