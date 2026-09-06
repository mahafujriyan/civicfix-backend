# CivicFix Backend

Production-ready REST API for a **City Complaint & Service Request Platform**.

Citizens report city problems, staff process assigned complaints, and admins manage departments, categories, workflow, payments, and analytics.

---

## Features

- Email/password authentication + Google ID token login
- JWT auth with strict RBAC (`CITIZEN`, `STAFF`, `ADMIN`)
- Complaint lifecycle with validated status transitions
- Department / category management
- Staff assignment with Prisma transactions
- Status history, comments, citizen feedback
- Stripe Checkout + webhook signature verification
- Redis caching + rate limiting (with in-memory fallback)
- Pagination, filtering, sorting
- Swagger/OpenAPI docs + Postman collection
- Centralized error handling and Zod validation

---

## Tech Stack

| Layer | Technology |
|------|------------|
| Runtime | Node.js 20+ |
| Language | TypeScript (strict) |
| Framework | Express.js |
| Database | PostgreSQL |
| ORM | Prisma |
| Auth | JWT + bcrypt + Google Auth Library |
| Validation | Zod |
| Cache / rate limit | Redis (ioredis) |
| Payments | Stripe |
| Docs | Swagger UI + OpenAPI |
| Tests | Vitest + Supertest |

---

## Architecture

```text
Route → Middleware → Controller → Service → Prisma → PostgreSQL
```

```text
src/
├── app.ts / server.ts
├── config/          # env + database
├── lib/             # prisma + redis clients
├── modules/         # auth, user, department, category, complaint, payment, analytics...
├── middleware/      # auth, role, validation, rate-limit, errors
├── utils/           # jwt, password, response, pagination, api-error
├── routes/
├── types/
└── docs/            # OpenAPI + Swagger setup
```

---

## Database Overview

Core entities:

`User`, `Department`, `Category`, `Location`, `Complaint`, `ComplaintAssignment`, `ComplaintStatusHistory`, `Comment`, `Feedback`, `Payment`, `Notification`, `AuditLog`

### Complaint statuses

`SUBMITTED → UNDER_REVIEW → ASSIGNED → IN_PROGRESS → RESOLVED → CLOSED`

Exceptional: `REJECTED`, `CANCELLED`

Invalid jumps (example): `SUBMITTED → RESOLVED` is rejected.

---

## Setup

### 1. Clone & install

```bash
npm install
cp .env.example .env
```

### 2. Configure `.env`

Required:

- `DATABASE_URL`
- `JWT_SECRET`
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- Stripe / Google keys when testing those flows

### 2.1 Redis (Upstash REST)

This project uses **Upstash Redis REST API** (not local `redis://` TCP).

Set in `.env`:

```env
UPSTASH_REDIS_REST_URL=https://YOUR_ENDPOINT.upstash.io
UPSTASH_REDIS_REST_TOKEN=YOUR_UPSTASH_REST_TOKEN
```

Health check should show `"redis": "ok"` at `/api/v1/health`.

### 3. Migrate & seed

```bash
npx prisma migrate dev --name init
npm run prisma:seed
```

### 4. Run

```bash
npm run dev
```

API: `http://localhost:5000`  
Swagger: `http://localhost:5000/api/docs`  
Health: `http://localhost:5000/api/v1/health`

---

## Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| ADMIN | `admin@civicfix.local` | `Admin@12345` |
| STAFF | `staff1@civicfix.local` | `Staff@12345` |
| STAFF | `staff2@civicfix.local` | `Staff@12345` |
| CITIZEN | `citizen1@civicfix.local` | `Citizen@12345` |
| CITIZEN | `citizen2@civicfix.local` | `Citizen@12345` |

---

## Roles & Permissions

### CITIZEN
Register/login, manage own profile, create/view own complaints, comment, submit feedback after resolution, create payments for own complaints.

### STAFF
Login, work on assigned complaints, update allowed statuses (`IN_PROGRESS`, `RESOLVED`), add comments.

### ADMIN
Manage users/departments/categories/complaints, assign staff, analytics, payments oversight.

Unauthorized role access returns **403**. Missing/invalid token returns **401**.

---

## Important API Examples

```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "citizen1@civicfix.local",
  "password": "Citizen@12345"
}
```

```http
POST /api/v1/complaints
Authorization: Bearer <citizenToken>
Content-Type: application/json

{
  "title": "Blocked drain causing flooding",
  "description": "Heavy rain flooded the street due to a blocked drain.",
  "categoryId": "<category-uuid>",
  "priority": "HIGH",
  "location": {
    "address": "88 Market Road",
    "city": "Dhaka",
    "area": "Motijheel"
  }
}
```

```http
PATCH /api/v1/complaints/:id/status
Authorization: Bearer <adminOrStaffToken>

{
  "status": "UNDER_REVIEW",
  "note": "Accepted for review"
}
```

---

## Payment Flow

1. Citizen calls `POST /api/v1/payments/create-session`
2. API creates a Payment (`PENDING`) + Stripe Checkout Session
3. Citizen pays on Stripe Checkout
4. Stripe calls `POST /api/v1/payments/webhook`
5. API verifies webhook signature and marks payment `PAID`

Never trust client-side payment success alone.

---

## Postman

Import:

`postman/CivicFix.postman_collection.json`

Collection variables:

- `baseUrl`
- `accessToken`
- `adminToken`
- `staffToken`
- `citizenToken`

Suggested walkthrough order: Auth login scripts → Categories → Create complaint → Workflow → Feedback → Analytics.

Assignable staff helper:

```http
GET /api/v1/assignments/staff
Authorization: Bearer <adminToken>
```

---

## Scripts

```bash
npm run dev
npm run build
npm start
npm run typecheck
npm run lint
npm test
npm run prisma:migrate
npm run prisma:seed
```

---

## Deployment (Vercel)

This API is configured for **Vercel serverless** (`api/index.ts` + `vercel.json`).

### 1. Install Vercel CLI

```bash
npm i -g vercel
```

### 2. Login & link project

```bash
vercel login
vercel link
```

### 3. Add environment variables in Vercel Dashboard (or CLI)

Required:

- `DATABASE_URL`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- `CORS_ORIGIN` (use `*` or your frontend URL)
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` (if using Google login)
- `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET`
- `STRIPE_SUCCESS_URL` / `STRIPE_CANCEL_URL` (your Vercel URL)

### 4. Run migrations against Neon (once)

```bash
npx prisma migrate deploy
npm run prisma:seed
```

### 5. Deploy

```bash
vercel          # preview
vercel --prod   # production
```

After deploy:

- Health: `https://<your-app>.vercel.app/api/v1/health`
- Docs: `https://<your-app>.vercel.app/api/docs`

### Stripe webhook

Point Stripe webhook to:

`https://<your-app>.vercel.app/api/v1/payments/webhook`

---

## Deployment (Render)

Alternative PaaS option (`render.yaml` included).

---

## Environment Variables

See `.env.example` for:

`NODE_ENV`, `PORT`, `DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`, Google OAuth, Stripe keys, `REDIS_URL`, `CORS_ORIGIN`.

Never commit real secrets.

---

## License

MIT
