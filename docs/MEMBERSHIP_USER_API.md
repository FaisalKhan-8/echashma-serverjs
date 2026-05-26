# Membership — Company User API

Endpoints for **logged-in company users** (dashboard, paywall, trial). The JWT must include a **`companyId`** (typical roles: `ADMIN`, `SUBADMIN`, `MANAGER`).

Implementation: `src/controllers/membership.controller.js`, `src/routes/membership.routes.js`.

**Base URL:** `http://localhost:3001/api` (or your deployed host + `/api`).

Super-admin plan management and demo trials: [MEMBERSHIP_SUPER_ADMIN_API.md](./MEMBERSHIP_SUPER_ADMIN_API.md).

**Public pricing catalog:** `GET /api/membership-plans` and `GET /api/membership-plans/:id` (no auth) — see [MEMBERSHIP_SUPER_ADMIN_API.md](./MEMBERSHIP_SUPER_ADMIN_API.md#get-get-apimembership-plans-public).

---

## Authentication

```http
Authorization: Bearer <token>
```

Obtain a token from **`POST /api/auth/login`**.

| Middleware | Access |
|------------|--------|
| `authenticateUser` | Any valid JWT (`src/middleware/authenticateUser.js`) |

### Company ID requirement

Both routes read **`companyId`** from the JWT (`req.user.companyId`). Users **without** a company (e.g. most `SUPER_ADMIN` accounts) receive:

**`400`**

```json
{
  "status": "error",
  "message": "Validation failed",
  "errors": {
    "authorization": ["Company ID is missing from token"]
  }
}
```

---

## Trial length

Self-service and registration trials use **`MEMBERSHIP_TRIAL_DAYS = 14`** (`src/utils/membershipDates.js`):

- `POST /membership/me/start-trial` → 14-day window
- `POST /company/registerCompany` → initial trial is also 14 days (server-set)

---

## Company membership model

Stored on the **`Company`** row:

| Field | Description |
|-------|-------------|
| `membership` | `TRIAL` \| `TRIAL_EXPIRED` \| `EXPIRED` \| `ACTIVE` |
| `membershipStartDate` | Trial or paid period start |
| `membershipEndDate` | Trial end (`TRIAL`) or paid expiry (`ACTIVE`) |

### Access flags (computed)

| Flag | Meaning |
|------|---------|
| `hasAccess` | `true` if active trial **or** active paid membership |
| `isInTrial` | `membership === TRIAL` and `membershipEndDate` is in the future |
| `requiresPurchase` | `!hasAccess` — show paywall / upgrade UI |

---

## Routes overview

| Method | Path | Description |
|--------|------|-------------|
| GET | `/membership/me/status` | Current company membership / trial state |
| POST | `/membership/me/start-trial` | Start (or acknowledge) a 14-day trial |

---

## `GET /api/membership/me/status`

Use on dashboard load and paywall checks.

### Request

No body. JWT required.

### Success: `200`

```json
{
  "membershipStatus": "TRIAL",
  "membershipPlanId": null,
  "membershipName": null,
  "membershipExpiryDate": null,
  "trialEndsAt": "2026-06-09T12:00:00.000Z",
  "membershipStartDate": "2026-05-26T12:00:00.000Z",
  "hasAccess": true,
  "isInTrial": true,
  "requiresPurchase": false
}
```

| Field | Description |
|-------|-------------|
| `membershipStatus` | Same as `Company.membership` |
| `membershipPlanId` | Reserved; currently always `null` |
| `membershipName` | Reserved; currently always `null` |
| `membershipExpiryDate` | End date when status is `ACTIVE`; otherwise `null` |
| `trialEndsAt` | End date when status is `TRIAL`; otherwise `null` |
| `membershipStartDate` | Period start |
| `hasAccess` | See table above |
| `isInTrial` | See table above |
| `requiresPurchase` | See table above |

Date fields are ISO `DateTime` values from the database (JSON serialization may vary by client).

### Errors

| Status | When |
|--------|------|
| `400` | No `companyId` on token |
| `401` | Missing / invalid token |
| `404` | Company not found |

---

## `POST /api/membership/me/start-trial`

Starts a **14-day** trial for the token’s company.

### Rules

1. If `membership` is `ACTIVE` and `membershipEndDate` is still in the future → **`400`**  
   `"You already have an active membership. No trial needed."`
2. If `membership` is `TRIAL` and trial has not expired → **`200`** idempotent response (does not extend trial):

```json
{
  "message": "Trial already active",
  "trialEndsAt": "2026-06-09T12:00:00.000Z",
  "trialEndsAtFormatted": "6/9/2026, 12:00:00 PM",
  "daysRemaining": 14
}
```

3. Otherwise → sets `membership` to `TRIAL`, `membershipStartDate` to now, `membershipEndDate` to now + 14 days.

### Request

No body. JWT required.

### Success: `200` (new trial)

```json
{
  "message": "14-day trial started successfully",
  "trialEndsAt": "2026-06-09T12:00:00.000Z",
  "trialEndsAtFormatted": "6/9/2026, 12:00:00 PM",
  "daysRemaining": 14
}
```

### Errors

| Status | When |
|--------|------|
| `400` | No `companyId`, or active paid membership |
| `401` | Missing / invalid token |
| `404` | Company not found |

---

## JWT reference

After login, the token payload includes:

```json
{
  "userId": 1,
  "role": "ADMIN",
  "companyId": 12,
  "branchId": 3,
  "membership": {
    "membership": "TRIAL",
    "membershipStartDate": "...",
    "membershipEndDate": "..."
  },
  "kyc": "UNVERIFIED"
}
```

For up-to-date paywall logic, prefer **`GET /membership/me/status`** over stale JWT `membership` claims.

---

## Related docs

- Super admin plans & demo trial: [MEMBERSHIP_SUPER_ADMIN_API.md](./MEMBERSHIP_SUPER_ADMIN_API.md)
- Login and general auth: [API.md](./API.md)
