LONGEVITY — MODEL FILTERS + CASTING SORTING — 43 BUILD

REPLACE:
- admin.html
- admin-sort.js
- admin-models.js
- admin-models.css
- api/admin-models.js

GOOGLE APPS SCRIPT:
- Replace the current Apps Script Code.gs with:
  google-apps-script/Code.gs
- Save.
- Run initializeModels once.
- Then Deploy > Manage deployments > Edit > New version > Deploy.

NEW MODEL DATA
- Adds a Gender column to the existing Casting Submissions sheet.
- Existing rows remain intact.
- Existing models will have Gender blank until you assign Male or Female in Admin.
- Gender is NEVER inferred from a name, photo, email, or Instagram.

NEW FILTERS
- Status
- Gender: Male only / Female only / Not set
- Top size
- Bottom size
- Shoe size
- Profile data:
  - Complete sizing
  - Missing sizing
  - Has Instagram
  - No Instagram
- Reset Filters button

NEW SORTING
- Newest applicant
- Recently updated
- Oldest applicant
- Name A-Z
- Status
- Gender
- Height: tallest / shortest
- Top size: small / large
- Bottom size: small / large
- Shoe size: small / large

SIZE / HEIGHT BEHAVIOR
- Top sizes understand common apparel ordering: XS, S, M, L, XL, 2XL, 3XL, etc.
- Numeric bottom sizes sort numerically.
- Shoe sizes sort numerically, including decimals.
- Height sorting understands common feet/inches and centimeter formats.
- Blank/unreadable measurements are kept at the bottom of measurement sorts.

NO NEW VERCEL ENVIRONMENT VARIABLES ARE REQUIRED.
