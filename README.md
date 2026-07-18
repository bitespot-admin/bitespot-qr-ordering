# BiteSpot — Multi-Tenant QR Table Ordering System

A production-ready, multi-tenant QR table ordering platform. A platform (super) admin onboards restaurants; each restaurant runs its own menu, tables, kitchen workflow, and image hosting. Customers scan a table's QR code, browse the menu, order, and track their order live — no accounts, no app download.

Every feature below has been exercised against a real MariaDB instance and a running server during development (not just written and assumed to work) — registration flows, order lifecycle, real-time push, encryption round-trips, and per-tenant credential isolation were all verified live.

## Stack

- **Frontend (customer + admin + super admin):** HTML / CSS / vanilla JS — dark "ember" theme by default (Fraunces + Manrope + Space Mono), with a light theme toggle (the original white/orange look) persisted per browser
- **Backend:** Node.js + Express, MVC structure
- **Database:** MariaDB (parameterized queries via `mysql2`, no ORM)
- **Real-time:** Socket.IO — order updates and waiter calls push instantly to open admin dashboards and the customer's order-tracking page, no polling required (a slow fallback poll still runs as a safety net for dropped connections)
- **Auth:** JWT in HttpOnly cookies + `bcryptjs` (never localStorage). `bcryptjs` is used instead of `bcrypt` deliberately — pure JS, no native build step, which matters on Termux/Android where node-gyp compilation is a headache
- **Images:** Cloudinary — **per restaurant**, not shared (see below)
- **QR flyers:** each table gets a branded flyer — a real QR code + the restaurant's name composited onto artwork via `jimp` (pure JS, no native deps — see the note below on why this isn't `sharp`)
- **Printable receipts:** browser-native print (`window.print()`) with a thermal-receipt-style layout — works with any printer the browser already sees, no vendor SDK needed

## Multi-tenancy: how restaurants get created

There's no public "sign up your restaurant" page. A **super admin** creates every restaurant tenant from `/super-admin/dashboard.html`, which also hands back that restaurant's login credentials once (copy them somewhere safe — they're not shown again).

Your first super admin account is created automatically on first boot from `SUPER_ADMIN_USERNAME` / `SUPER_ADMIN_PASSWORD` in `.env` (see Setup below). There's no self-service super-admin signup either — that's intentional.

Super admin can also suspend/reactivate a restaurant at any time; a suspended restaurant's owner can't log in and its public menu stops accepting orders.

## Cloudinary: one account per restaurant, not shared

Each restaurant hosts its own menu photos, logo, and QR flyers on **its own** Cloudinary account — there is no shared/global Cloudinary account. This is set at creation time (the super admin form requires a cloud name, API key, and API secret before it'll create the restaurant) and can be changed later by the restaurant owner under **Settings → Cloudinary Account**.

The API secret is encrypted at rest (AES-256-GCM) using `CREDENTIALS_ENCRYPTION_KEY` from `.env` — never stored in plaintext. See Setup below for how to generate that key.

Technical note for anyone extending this: the Cloudinary Node SDK holds config as global mutable state, not per-instance. `backend/config/cloudinary.js` handles this safely for concurrent multi-tenant requests by calling `cloudinary.config(...)` and starting the upload in the same synchronous tick (no `await` between them) — see the comments there before changing upload code.

### ⚠️ A note on `jimp` vs `sharp`

The flyer generator originally used `sharp`, a native module. That caused real install failures on Termux/Android (same category of problem as the original `bcrypt`), so it was swapped for `jimp` — pure JS, installs anywhere `bcryptjs` does. The tradeoff: `jimp`'s built-in fonts are a handful of fixed bitmap sizes rather than continuously-scalable TTF/SVG text, so very long restaurant names snap to the next-smaller preset instead of shrinking smoothly. Still always centered, never overflows.

## Project structure

```
backend/
  assets/
    flyer-template.png     # default branded flyer artwork (QR + restaurant name composited in at runtime)
  bootstrap.js              # creates the first super admin on boot, if none exists
  realtime.js               # Socket.IO room/auth wiring
  config/                   # db.js (MariaDB pool), cloudinary.js (per-restaurant config helper)
  controllers/               # one per resource, incl. superAdminController.js
  middleware/                # authMiddleware (restaurant), superAdminMiddleware, upload, error handler
  models/                    # raw parameterized SQL, no ORM
  routes/                    # REST endpoints, mounted in app.js
  utils/                      # JWT signing, slugify, flyer generation, crypto (credential encryption)
  database/
    schema.sql               # fresh-install schema
    migrations/               # incremental migrations for upgrading an existing database
  app.js
  server.js
public/
  customer/       # menu.html, cart.html, success.html, order-status.html (mobile-first)
  admin/          # per-restaurant dashboard: login, dashboard, menu, orders, tables, settings (desktop-first)
  super-admin/    # platform admin: login, dashboard (create/suspend restaurants)
  shared/         # theme-toggle.js, used by all three apps above
```

## Setup

1. **Install MariaDB** and create the database:
   ```
   mysql -u root -p < backend/database/schema.sql
   ```
   Upgrading an existing database instead of starting fresh? Run the migrations in order:
   ```
   mysql -u root -p qr_ordering < backend/database/migrations/002_multi_tenant_and_flyer.sql
   mysql -u root -p qr_ordering < backend/database/migrations/003_per_restaurant_cloudinary.sql
   ```

2. **Configure environment variables**
   ```
   cd backend
   cp .env.example .env
   ```
   Fill in MariaDB credentials and a long random `JWT_SECRET`. Then generate the credentials encryption key:
   ```
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
   and put it in `CREDENTIALS_ENCRYPTION_KEY`. Also set `SUPER_ADMIN_USERNAME` / `SUPER_ADMIN_PASSWORD` (used once, on first boot, to create your platform admin account).

3. **Install dependencies and run**
   ```
   npm install
   npm run dev      # nodemon, for development
   # or
   npm start         # plain node, for production
   ```
   On first boot you'll see `✅ Created first super admin account: <username>` in the console.

4. **Onboard your first restaurant**
   Visit `http://localhost:5000/super-admin/login.html`, log in with your bootstrap credentials, and click **Create Restaurant**. You'll need a Cloudinary account for that restaurant first (free tier is fine — https://cloudinary.com) to fill in its cloud name/API key/API secret. The form shows you the restaurant's login credentials once — copy them to hand to the owner.

5. **Restaurant owner logs in**
   `http://localhost:5000/admin/login.html` with the credentials from step 4. Add categories/menu items under **Menu**, then add tables under **Tables & QR** — each table's branded QR flyer generates automatically.

6. **Try the customer flow**
   Download a table's flyer from the dashboard, or visit the URL it encodes directly: `http://localhost:5000/menu/<restaurant-slug>/<table-slug>`.

## Kitchen workflow (simplified)

Orders move through exactly three states: **New → Preparing → Served** (plus Cancelled). Staff hit **Accept** to start preparing, then **Mark as Served** when it's delivered — no separate "Ready" stage. The kitchen board updates via Socket.IO push the instant an order is placed or changes status; a slow fallback poll (30s) covers dropped connections. The "Served" column only shows today's orders — it's a same-day log, not an unbounded archive.

Each order card has a **Print Receipt** button that opens a clean, thermal-receipt-styled print view via the browser's native print dialog.

## Custom flyer option

Under **Settings → Table Flyer**, a restaurant can switch from the default branded artwork to their own uploaded design. In custom mode, only the QR code is composited on (centered, on a white backdrop for scan reliability) — restaurant name text is never auto-overlaid on custom artwork, since there's no way to know where a safe/readable area is on an arbitrary image.

## How the QR flow works

Each table gets a unique URL like `/menu/bella-kitchen/table-1`. The backend resolves the restaurant and table straight from that URL — the customer never types a table number. Scanning the code, browsing, ordering, and tracking status on `order-status.html` all happen with zero login, and status updates arrive live via Socket.IO.

## Notes on scope

Per the original brief, this deliberately excludes: online payments, customer accounts/order history, delivery, coupons, loyalty, reservations, reviews, inventory management, multi-language support, and push notifications.

Feature ideas not yet built, worth considering next: order history/analytics, table-visit bill grouping, menu item modifiers (extra cheese, spice level, etc. as structured options), multiple staff logins per restaurant (not just one owner account), bulk "print all flyers" PDF sheet, WhatsApp/SMS order-ready notifications.
