# Reusable Deltas Catalog

## Source branches reviewed
- `origin/feature/organic-tree-visualization`
- `origin/feature/indexeddb-implementation`

## Reused concepts in codex/dev
- Organic rendering direction (curved trunk/branch flow and leaf clusters).
- Hover/click interaction model by node type.
- Trunk/roots visual separation.

## Deliberately not merged wholesale
- Branches included mixed scaffolding and partial integration artifacts.
- Some files depended on additional types not present on `main`.
- Security posture still exposed API flow from client in previous approach.

## Integration approach used
- Selective functional porting into fresh `main`-based architecture.
- Explicitly rebuilt persistence + health engine + onboarding semantics.
- Kept implementation focused on reliable MVP and early-access deployment.
