# BiteSpot — QR Table Ordering System

A production-ready QR table ordering system for Nigerian restaurants. Customers scan a table's QR code, browse the menu, order, and track their order status live. Restaurant owners manage everything from a desktop dashboard with a simplified kitchen workflow.

Tested end-to-end during development: registration/login, category & menu CRUD, table + branded QR flyer generation, public menu resolution by QR, order placement with server-side price validation, live order-status polling, and the full kitchen workflow.

## Stack

- **Frontend (customer):** HTML / CSS / vanilla JS — mobile-first, dark "ember" theme (Fraunces + Manrope + Space Mono)
- **Frontend (admin):** HTML / CSS / vanilla JS — desktop-first, same visual theme, responsive down to tablet/mobile
- **Backend:** Node.js + Express, MVC structure
- **Database:** MariaDB (parameterized queries via `mysql2`, no ORM)
- **Auth:** JWT in HttpOnly cookies + `bcryptjs` (never localStorage). Using `bcryptjs` instead of `bcrypt` deliberately — it's pure JS with no native build step, which matters if you're developing in Termux/Android where node-gyp compilation is a headache.
- **Images:** Cloudinary (menu photos, logos, generated QR flyers)
- **QR flyers:** each table gets a branded flyer — a real QR code + the restaurant's name composited onto artwork via `sharp`, uploaded to Cloudinary

### ⚠️ A note on `sharp` and Termux

`sharp` is a native module, same category of problem as the original `bcrypt`. Its prebuilt binaries target standard Linux/macOS/Windows and are **not guaranteed to install cleanly on Termux/Android** (different libc, no matching prebuild). If `npm install` fails on `sharp` specifically:
- Try running the backend on a regular Linux server/VPS instead of directly on-device, or
- Tell me and I'll swap `backend/utils/flyerGenerator.js` to use `jimp` (pure JS, no native deps) instead — slightly less refined text rendering (bitmap fonts instead of arbitrary TTF/SVG), but it'll install anywhere `bcryptjs` does.

## Project structure

```
backend/
  assets/
    flyer-template.png   # branded table-flyer artwork (QR + restaurant name composited in at runtime)
  config/        # db.js (MariaDB pool), cloudinary.js
  controllers/    # one per resource
  middleware/     # auth guard, multer upload, error handler
  models/         # raw parameterized SQL, no ORM
  routes/         # REST endpoints, mounted in app.js
  utils/          # JWT signing, slugify, order numbers, flyer generation
  database/
    schema.sql    # full MariaDB schema with foreign keys
  app.js
  server.js
public/
  customer/       # menu.html, cart.html, success.html, order-status.html (mobile-first)
  admin/          # login, register, dashboard, menu, orders, tables, settings (desktop-first)
```

## Setup

1. **Install MariaDB** and create the database:
   ```
   mysql -u root -p < backend/database/schema.sql
   ```

2. **Configure environment variables**
   ```
   cd backend
   cp .env.example .env
   ```
   Fill in `.env` with your MariaDB credentials, a long random `JWT_SECRET`, and your Cloudinary credentials (free tier is fine — https://cloudinary.com).

3. **Install dependencies and run**
   ```
   npm install
   npm run dev      # nodemon, for development
   # or
   npm start         # plain node, for production
   ```

4. **Register a restaurant**
   Visit `http://localhost:5000/admin/register.html`, create an account, then go to **Tables & QR** to add your first table — its branded QR flyer is generated and uploaded automatically. Add categories and menu items under **Menu**.

5. **Try the customer flow**
   Download a table's flyer from the dashboard, or just visit the URL it encodes directly:
   `http://localhost:5000/menu/<restaurant-slug>/<table-slug>`

## How the QR flow works

Each table gets a unique URL like `/menu/bella-kitchen/table-1`. The backend resolves the restaurant and table straight from that URL — the customer never types a table number. Scanning the code, browsing, adding items, placing an order, and tracking it on `order-status.html` all happen with zero login.

## Kitchen workflow (simplified)

Orders move through exactly three states: **New → Preparing → Served** (plus Cancelled). There's no separate "Ready" stage — staff hit **Accept** to start preparing, then **Mark as Served** when it's delivered. The `ready` enum value still exists in the database schema for backward compatibility, but the app never transitions into it.

## Notes on scope

Per the brief, this deliberately excludes: online payments, customer accounts/order history, delivery, coupons, loyalty, reservations, reviews, inventory management, multi-language support, and push notifications. It's built to be extended into a multi-restaurant SaaS platform later without a rewrite (each resource is already scoped by `restaurant_id`).

One deviation worth flagging: the brief's tech-stack section specifies vanilla JS for the frontend, but the closing "Development Philosophy" paragraph mentions React components for the admin dashboard. I built both the customer and admin UIs in vanilla HTML/CSS/JS for consistency, simplicity, and to keep the codebase approachable — the admin dashboard is just as componentized (shared `admin-api.js`, per-page modules) so migrating pieces to React later would be straightforward if you want that.

