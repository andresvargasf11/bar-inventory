# Bar Inventory Management System

A mobile-first, fully featured bar inventory management web app built with Next.js 14, Turso (LibSQL), and Tailwind CSS.

## Features

- **PIN authentication** — 4–6 digit PIN, auto-lock after inactivity
- **Product management** — add, edit, delete, duplicate; CSV bulk import
- **Inventory counting** — per-location counts, barcode scanner support, keyboard navigation
- **Current inventory view** — color-coded low/warning items, inline editing, search/filter/sort
- **Order list** — auto-generated, grouped by distributor, CSV export + email draft
- **Inventory history** — session comparison, usage/depletion report with cost tracking
- **Dashboard** — summary stats, inventory health chart, quick actions
- **Storage locations** — multiple named locations (Back Bar, Walk-in Cooler, etc.)
- **Custom fields** — user-defined fields on all products
- **Cost tracking** — value per product/location and totals
- **Settings** — manage locations, custom fields, PIN, app defaults, data reset

## Quick Start

```bash
npm install
cp .env.example .env.local   # Edit with your Turso credentials (or keep file:./dev.db for local)
npm run init-db               # Create tables + seed sample data
npm run dev                   # Start at http://localhost:3000
```

Visit http://localhost:3000 and set your PIN on first launch.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `TURSO_DATABASE_URL` | Yes | `file:./dev.db` locally, or Turso remote URL for production |
| `TURSO_AUTH_TOKEN` | Production only | Turso auth token |
| `SESSION_SECRET` | Yes | Random 32+ char string for JWT signing |

## Turso Setup (Production)

```bash
# Install Turso CLI
curl -sSfL https://get.tur.so/install.sh | bash

# Create database
turso db create bar-inventory

# Get credentials
turso db show bar-inventory --url     # → TURSO_DATABASE_URL
turso db tokens create bar-inventory  # → TURSO_AUTH_TOKEN
```

## Vercel Deployment

1. Push to GitHub
2. Import repo in Vercel
3. Add environment variables: `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `SESSION_SECRET`
4. Deploy (Next.js is auto-detected)
5. Run `npm run init-db` with production env to initialize the remote DB

## Database Schema

```sql
app_settings         -- PIN hash, defaults, timeout settings
storage_locations    -- Named inventory locations
products             -- Bar products with thresholds and costs
custom_fields        -- User-defined product fields
product_custom_values
inventory_sessions   -- Counting sessions per location
inventory_counts     -- Quantity per product per session
```

See `scripts/init-db.js` for the full schema SQL and sample data.

## CSV Import Template

Headers: `name, category, unit, distributor, cost_per_unit, low_threshold, warning_threshold, sku`

Download from **Products → Import CSV → Download Template**.

---

## Original create-next-app notes

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
