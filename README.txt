LONGEVITY ADMIN — BULK EDIT OPEN FIX 43 BUILD

ADD:
- admin-bulk-edit-stability.js

REPLACE:
- admin-sort.js

WHAT WAS WRONG:
The Shop Editor integration has a MutationObserver that watches the Admin DOM.
When selected products were placed into the Bulk Edit queue, the observer could
continually call renderBulkProducts(). Each render changed the DOM, which
triggered the observer again. The result is a render loop/freeze that makes it
look like the Bulk Edit screen never opens.

FIX:
- Adds a stability layer around renderBulkProducts().
- The Bulk screen renders when the selected product data changes.
- Repeated renders of the exact same state are ignored, breaking the loop.
- Bulk Edit is forced to get one fresh render every time the button is clicked.
- Existing Shop Editor categories, Bulk Upload, product selection, status tools,
  Shopify data, and save behavior remain intact.

No Shopify API, scopes, database, product data, or environment changes.
