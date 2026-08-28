LONGEVITY ADMIN — SMART SELECT ALL / DESELECT ALL 43 BUILD

REPLACE:
- admin-sort.js

KEEP / REPLACE FROM PRIOR FIX:
- admin-bulk-edit-stability.js

ADD:
- admin-select-visible.js

NEW BEHAVIOR:
- Adds Select All and Deselect All to the Products toolbar.
- These controls ONLY affect product rows currently showing on screen.
- Live filter -> selects/deselects only Live products shown.
- Draft filter -> selects/deselects only Draft products shown.
- Archived filter -> selects/deselects only Archived products shown.
- All Status -> selects/deselects all currently shown products.
- Product search is also respected.
- A small counter shows how many of the currently visible products are selected.
- When the user changes Status or Search, selections from the previous result set are cleared BEFORE the rows change. This prevents invisible previously selected products from accidentally being included in Bulk Edit, Set Live/Draft, or Delete.
- Sorting does not clear selection because the same visible products remain in scope.
- Mobile layout is included.

No Shopify, API, database, scopes, product data, or environment changes.
