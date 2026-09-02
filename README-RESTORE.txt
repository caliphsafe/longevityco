LONGEVITY CO. — FULL ADMIN RESTORE
PRE-SEPTEMBER 2, 2026 VERSION

SOURCE OF TRUTH
Repository: caliphsafe/longevityco
Exact commit:
b4beaf7ef0a43329dc888d952a25060040ca66bc

This was the repository HEAD immediately before the three September 2, 2026 commits.

VERIFIED
All 42 admin files in this ZIP match the Git blob SHA values from that exact commit.
This is not an approximation or a reverse-engineered rollback.

INCLUDED
- admin.html
- every root-level admin*.css file
- every root-level admin*.js file
- api/_admin-auth.js
- api/_shopify-admin.js
- every api/admin-*.js route from that commit

TODAY'S ADMIN CHANGES ARE NOT INCLUDED
- admin-bulk-plus.js
- admin-bulk-plus.css
- the Sept 2 admin-sort.js changes that load those files

RESTORE DIRECTIONS
1. Replace the matching root admin files with this ZIP.
2. Replace the matching admin files inside /api with this ZIP's /api files.
3. Delete these two files from GitHub if they are currently present:
   admin-bulk-plus.js
   admin-bulk-plus.css

No storefront files are included. This package is the full ADMIN section only.
