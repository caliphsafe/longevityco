LONGEVITY CO. — MODELS ADMIN — 43 BUILD

REPLACE / ADD THESE WEBSITE FILES
REPLACE:
- admin.html
- admin-sort.js
- admin-ops.js

ADD:
- admin-models.css
- admin-models.js
- api/admin-models.js

GOOGLE APPS SCRIPT — REQUIRED ONCE
- Open the Google Sheet > Extensions > Apps Script.
- Replace the current Code.gs with: google-apps-script/Code.gs from this ZIP.
- Confirm Apps Script Project Settings > Script Properties contains MODELS_API_SECRET with the SAME value as Vercel.
- Deploy > Manage deployments > Edit existing Web App > select New version > Deploy.
- Keep access configured the same way the current casting form already uses it.
- If you edit the existing deployment, the /exec URL stays the same.

VERCEL VARIABLES EXPECTED
- MODELS_SCRIPT_URL = existing Apps Script /exec URL
- MODELS_API_SECRET = same private value stored in Apps Script Script Properties

WHAT THE NEW ADMIN MODELS PAGE DOES
- Reads the existing Casting Submissions Google Sheet.
- Search models by name, email, Instagram, sizing or notes.
- Filter by Applicant / Roster / Hold / Archived.
- Sort by newest, oldest, name or status.
- Shows total / roster / applicant / archived counts.
- Edit name, email, height, pants size, shirt size, shoe size, Instagram, status and notes.
- Add models manually from the admin.
- Archive models without deleting their row.
- Writes changes directly back to the same Google Sheet.
- All Google Sheet read/write traffic is server-side through /api/admin-models.
- The browser never receives MODELS_API_SECRET.

EXISTING CASTING FORM
- Continues working with the same form fields and POST endpoint.
- New public submissions automatically receive a Model ID and Applicant status.
- Existing rows are automatically given Model IDs and Applicant status the first time the upgraded API reads the sheet.
- New columns are appended automatically if missing: Model ID, Status, Notes, Last Updated.

SECURITY
- /api/admin-models uses the existing Longevity admin session authentication.
- Google Apps Script admin actions also require MODELS_API_SECRET.
- doGet remains harmless and does not expose model data.

NO GOOGLE CLOUD PROJECT / SERVICE ACCOUNT / OAUTH IS REQUIRED.
