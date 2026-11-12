# Moa-Gwa FE

Next.js (App Router) / TypeScript / Tailwind.

## Run
```bash
cp .env.example .env.local
npm install
npm run dev     # http://localhost:3000
npm run lint && npm run build
```

## Screens
Student: `/home` `/explore` `/notices/[source]/[id]` `/schedule` `/my` `/my/interests` `/notifications`.
Admin: `/admin/dashboard` `/admin/notices` `/admin/notices/new` `/admin/notices/[id]/edit` `/admin/schedule` `/admin/organization`.
Notice changes arrive over SSE (`/api/stream`) and refresh the open page without a reload.
Local login: admin `student-council` / `moagwa1234`; students use the dev login (nickname).

Branching and commit rules: see [CONTRIBUTING.md](CONTRIBUTING.md).
