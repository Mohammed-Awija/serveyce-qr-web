# CLAUDE.md — bambyce-serve-web

> Context for AI assistants (Claude Code, Cursor, etc.) working in this repository.

---

## What this repo is

This is the **frontend** for **Bambyce Serve**, the first product of the Bambyce platform (bambyce.com).

Bambyce Serve is a QR-code-based service portal for hospitality operators in Turkey: short-term rental hosts, small hotels, and hostels. The app has two surfaces:

1. **Public guest pages** at `/o/[slug]/l/[locationId]` — mobile-first, no auth, the QR-code-scan landing experience. This is the "money shot" of the product and should look polished.
2. **Authenticated dashboard** at `/dashboard/*` — for hotel admins and staff to configure their property, manage requests, capture KBS guest data.

The companion backend repository is `bambyce-serve-api` (NestJS + Prisma + Postgres, deployed on Railway).

### Brand context

Bambyce is a platform brand intended for multiple verticals over time:
- **Bambyce Serve** (this product, V1) — hospitality
- **Bambyce Order** (future) — restaurants, cafés, bars

The shared platform layer uses generic data names (`Organization`, `Location`, `OfferingType`, `Request`). The **UI in V1 is hospitality-specific** — copy says "Welcome to {hotel name}", not "Welcome to {organization name}". Don't add restaurant features.

---

## Tech stack

| Layer | Choice | Notes |
|-------|--------|-------|
| Language | TypeScript (strict mode) | No `any`, no untyped fetches |
| Framework | Next.js 16 (App Router) | Server Components by default |
| Styling | Tailwind CSS v4 | Use utility classes, not custom CSS |
| Components | shadcn/ui (planned) | Copy-paste components, own them |
| Forms | react-hook-form + zod (planned) | When forms get added in Session 9+ |
| Auth | Clerk (not yet wired) | For dashboard routes only — guest pages stay public |
| i18n | next-intl (planned) | English + Turkish + Arabic with RTL |
| Package manager | pnpm | Don't suggest npm or yarn |
| Deployment | Vercel | Auto-deploys from `main` |

### Hard rules

- **Server Components by default** — only mark `'use client'` when you actually need React hooks, browser APIs, or event handlers. Most pages and components should be server-rendered.
- **No `src/` directory** — this project uses the flat `app/` structure (the default in Next 16). Don't reorganize into `src/app/`.
- **Mobile-first for guest pages** — they're scanned on phones. Test at 375px width.
- **Tailwind v4 only** — don't downgrade to v3 even if you find a tutorial that does.

---

## Folder structure

```
bambyce-serve-web/
├── app/
│   ├── (dashboard)/              # (planned) authed admin/staff routes
│   │   ├── layout.tsx
│   │   ├── locations/            # (planned) manage rooms
│   │   ├── offerings/            # (planned) manage offering types
│   │   ├── requests/             # (planned) live request feed
│   │   ├── guests/               # (planned) KBS guest management
│   │   └── settings/
│   ├── o/[slug]/l/[locationId]/  # (planned) public guest page
│   ├── (auth)/                   # (planned) Clerk sign-in / sign-up
│   ├── layout.tsx                # Root layout
│   ├── page.tsx                  # Currently: health-check page
│   └── globals.css
├── components/                   # (planned) Shared UI
│   └── ui/                       # (planned) shadcn/ui generated components
├── lib/                          # (planned) API client, i18n helpers, utils
├── messages/                     # (planned) i18n translation JSONs
├── public/
├── CLAUDE.md                     # This file
├── README.md
└── .env.local                    # Local secrets (gitignored)
```

---

## Conventions

### Server vs Client Components

The big mental model for App Router. Default is **Server Component**:
- Can `await` directly inside the component
- Can read env vars (including server-only ones without `NEXT_PUBLIC_` prefix)
- Can call backend APIs at render time
- Cannot use hooks (`useState`, `useEffect`), event handlers, or browser APIs

Add `'use client'` to the top of a file only when you need those things. Even then, keep client components small and leaf-level — parent layouts and pages should stay server components.

Example: a page that renders a form. The page itself is a Server Component; the form is a small Client Component imported into it. Don't make the whole page a Client Component just because part of it is interactive.

### Fetching data

In Server Components:
```tsx
const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/something`, {
  cache: 'no-store',  // for dynamic data
});
```

Use `cache: 'no-store'` for request feeds, dashboards, anything live. Use the default cache or `next: { revalidate: <seconds> }` for stable data.

In Client Components, fetching follows normal React patterns (React Query if we add it later; for now, simple `useEffect` is acceptable).

### Styling

- Tailwind utility classes only
- No inline `style` attributes unless absolutely necessary
- Component classes go inline; if a className string gets long, extract to a `cn()` helper later
- Mobile-first: write base styles for mobile, use `md:` / `lg:` for larger screens

### Forms

When forms get added (Session 9+):
- `react-hook-form` for state
- `zod` for validation, with schemas in `lib/validation/`
- Server Actions for submission where possible (App Router native pattern)
- Loading and error states are mandatory, not optional

### i18n

When added in Session 13:
- `next-intl` with translations in `messages/en.json`, `messages/tr.json`, `messages/ar.json`
- Arabic requires RTL: set `dir="rtl"` on `<html>` when locale is `ar`
- Translation keys go in `messages/*.json` — never inline strings in JSX once i18n is wired

---

## Local development

### Common commands

```bash
# Dev server (Turbopack)
pnpm dev                   # serves on http://localhost:3000

# Production build (occasionally run to catch build errors)
pnpm build
pnpm start

# Linting
pnpm lint
```

### Critical env vars (in `.env.local`)

```
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

When you call the backend from a Server Component, this points at `localhost:3001/api`. In production (Vercel), the env var points at the Railway URL.

`.env.local` is gitignored. `.env.example` is committed.

### Running the full stack locally

Both servers must run together:

1. In `bambyce-serve-api`: `docker compose up -d` then `pnpm start:dev`
2. In `bambyce-serve-web`: `pnpm dev`

Open `http://localhost:3000` to see the app.

---

## Production

Deployed to **Vercel**. Connected to the `main` branch on GitHub — every push auto-deploys.

Env vars set in Vercel dashboard:
- `NEXT_PUBLIC_API_URL` — production Railway URL + `/api`
- (Future) `CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`

---

## Commit conventions

Use Conventional Commits:
- `feat:` — new feature
- `fix:` — bug fix
- `refactor:` — restructure without behavior change
- `chore:` — config, deps, tooling
- `docs:` — docs only
- `style:` — formatting, no code change

Example:
```
feat: add guest page route at /o/[slug]/l/[locationId]
fix: handle 404 from API gracefully in admin dashboard
refactor: extract API client into lib/api.ts
chore: add shadcn/ui setup
```

---

## Things NOT to do

- Don't add a `src/` directory — the project uses flat `app/` structure
- Don't mark every component `'use client'` — Server Components are the default for a reason
- Don't fetch data inside `useEffect` if a Server Component can do it at render time
- Don't add a UI library other than shadcn/ui (no Material UI, Chakra, etc.)
- Don't add restaurant features in V1
- Don't hardcode the API URL — always use `process.env.NEXT_PUBLIC_API_URL`
- Don't add localStorage or sessionStorage for state that should live in the database
- Don't write tests yet — Phase 7
- Don't commit `.env.local`, `.next/`, `node_modules/`

---

## Reference

- **Backend repo:** `bambyce-serve-api` (separate, deployed on Railway)
- **Full product spec:** lives in `bambyce-serve-api/SPEC.md` (single source of truth — eventually moves to a docs repo)
- **Brand site (planned):** bambyce.com
- **Production frontend:** Vercel-hosted (see Vercel dashboard for URL)
