# Frontend

Next.js 14 (App Router) + React + TypeScript + Tailwind. Preserves the
navy/gold premium design language from the existing NyayaAI prototype.

## Run locally

```bash
npm install --legacy-peer-deps
cp .env.example .env.local   # set NEXT_PUBLIC_API_URL
npm run dev
```

Open <http://localhost:3000>.

## Folder map

```
src/
├── app/                Next.js App Router pages
│   ├── auth/           login, register
│   ├── dashboard/      home dashboard with charts
│   ├── cases/          list, detail, new
│   ├── ai-search/      RAG-powered precedent search
│   ├── schedule/       calendar of hearings
│   ├── documents/      document library
│   └── admin/          (admin-only) user management
├── components/
│   ├── layout/         Sidebar, TopBar, ProtectedRoute, DashboardLayout
│   └── ui/             Reusable bits — StatCard, StatusBadge, RoleSelector
├── lib/                api client, auth store, utils
├── hooks/
├── types/              TS interfaces mirroring backend Pydantic schemas
└── styles/             globals.css with the design tokens
```

## Design tokens

Defined in `tailwind.config.ts`. Carries the same palette as the prototype:

| Token  | Value      | Purpose |
|--------|------------|---------|
| navy   | `#0a0f1e`  | Background |
| gold   | `#c9a84c`  | Primary accent |
| accent | `#1abc9c`  | Secondary highlights |
| ivory  | `#f5f0e8`  | Foreground text |

Typography:
- `font-display` — Playfair Display (headings)
- `font-sans`    — DM Sans (body)
- `font-mono`    — JetBrains Mono (labels, code-feel UI)

## Useful component classes (from `globals.css`)

`nyaya-card`, `nyaya-btn-primary`, `nyaya-btn-secondary`,
`nyaya-input`, `nyaya-label`, `badge`.
