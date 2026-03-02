# Productivitree

Productivitree is a visual project-management app for creators and entrepreneurs.

## Core metaphor
- Roots: core values and purpose.
- Trunk: education, skills, and expertise.
- Branches: active projects.
- Leaves: project stages/tasks.

## Principles
- Functionality before noise.
- Beauty with intent, not decoration-only.
- Balanced focus (Gray Zones): motivating feedback without addictive pressure loops.
- Privacy-first local mode by default.

## Local development
1. `npm install`
2. `npm run dev`

## Quality gates
- `npm run typecheck`
- `npm run lint`
- `npm run test`
- `npm run test:integration`
- `npm run check`

## Netlify deployment
- Config is in `netlify.toml`.
- Server function for AI passion test is in `netlify/functions/passion-test.js`.
- Deployment runbook: `docs/deploy/netlify-early-access.md`.

## Security and compliance notes
- AI analysis is server-side only; client does not carry the Gemini secret.
- User must explicitly consent before passion-test answers are sent.
- Local-only mode is on by default; no analytics by default.
- Tester privacy note: `docs/compliance/tester-privacy-note.md`.
