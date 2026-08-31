LONGEVITY CO. — ADMIN OPERATIONS FIXED V2 — 43 BUILD

WHY THE PREVIOUS BUILD DID NOT SHOW
The repo still loads admin-sort.js as admin-sort.css/admin-sort.js ?v=1 from admin.html.
The expansion was chained through admin-sort.js, which then dynamically injected admin-ops.js/admin-ops.css.
That made the whole expansion dependent on the browser/Vercel receiving the latest cached admin-sort.js and on the addon initialization timing.

THIS FIX
- Replaces admin-sort.js with a more robust loader.
- Bumps the dynamically loaded addon assets to ?v=2.
- Makes admin-ops.js initialize whether it loads before or after DOMContentLoaded.
- Retries until the admin navigation/main area actually exists.
- Rebuilds the sidebar only after the admin structure is present.
- Keeps the existing Shop Editor, mobile UX, sorting, visible selection, and bulk stability loaders.
- Restores api/admin-merchandising.js, which is REQUIRED for Uniform Editor and Drops to work.

REPLACE
- admin-sort.js
- admin-ops.js
- admin-ops.css

ADD / RESTORE
- api/admin-merchandising.js

IMPORTANT
Do NOT delete api/admin-merchandising.js. The navigation can display without it, but Uniform Editor and Drops need that API.
No revert folder is included.
No GitHub files were changed automatically.
No new environment variables or Shopify scopes are required.
