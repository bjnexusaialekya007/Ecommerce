# Master Upgrade Guide

1. `git fetch upstream --tags`
2. `git merge v1.0.1` (resolve conflicts only inside client-boundary files)
3. Run `npm ci && npm run typecheck && npm run lint && npm test && npm run check:boundaries && CLIENT_STRICT=1 npm run check:client && npm run build:seo && npm run check:budget`.
