# Netlify Early Access Runbook (Password-Protected)

## Deployment policy
- Production deploy source branch: `main` only.
- Development happens in `codex/dev` (or feature branches).
- Once stable, changes are merged to `main` and Netlify deploys from GitHub automatically.

## Preconditions
- Netlify site linked to GitHub repository `jlsanzbreton/productivitree`.
- Netlify build settings read from `netlify.toml`.
- Environment variable configured in Netlify (server-side):
  - `GEMINI_API_KEY`

## Deployment steps
1. Push validated changes to `codex/dev`.
2. Open PR to `main`.
3. After merge, wait for Netlify auto-deploy from `main`.
4. Validate on deployed URL:
   - Onboarding flow and tree rendering.
   - Passion-test request through `/.netlify/functions/passion-test`.
   - Privacy modal controls.
5. Enable access control for early testing:
   - Netlify Site settings -> Access control -> Password protection.
   - Share password with selected testers only.

## Tester protocol
- Use the beta URL and shared password.
- Complete onboarding with at least one root, one trunk segment, and one project.
- Add/edit stages and verify leaf state changes.
- Submit feedback via the in-app feedback link.
