# CivicFix Backend

City Complaint & Service Request Platform — production-ready REST API.

> Full documentation will be completed in Phase 9. Setup notes below are enough to run Phase 2.

## Quick start

```bash
cp .env.example .env
npm install
npx prisma migrate dev --name init
npm run prisma:seed
npm run dev
```

Health check: `GET /api/v1/health`
