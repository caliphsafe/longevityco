LONGEVITY CO. — TEMPORARY PASSWORD + COUNTDOWN — 43 BUILD

ADD:
- middleware.js
- password.html
- password.css
- password.js
- api/site-gate-login.js

PUBLIC LAUNCH
Thursday, October 8, 2026
7:00 PM America/New_York (EDT)

PASSWORD
continuation

BEHAVIOR
- Before launch, the public storefront is blocked before its static pages are served.
- Visitors are redirected to the Longevity countdown/password screen.
- The correct password grants access through an HttpOnly cookie.
- The site automatically becomes public at 7:00 PM EDT on October 8, 2026.
- The countdown automatically redirects into the site at zero.
- Direct visits to Shop, Uniform, Product, About, Contact, Lookbook and Cart are gated too.
- The existing Admin remains accessible because it already has its own login.
- No password is present in browser-side JavaScript; password validation happens server-side.
- No new environment variables are required.

DESIGN
- Existing Longevity home background video.
- Existing Longevity logo.
- Black minimal styling matching the current homepage.
- Responsive desktop/mobile countdown.

This is a temporary launch gate. After the timestamp, middleware automatically stops blocking public traffic.
