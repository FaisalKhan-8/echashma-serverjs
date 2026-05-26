# Membership plans & super admin API

Pricing catalog (`MembershipPlan`) and super-admin **demo trial** grants for companies.

**Base URL:** `http://localhost:3001/api` (port from `process.env.PORT`, default `3001`).

Implementation: `src/controllers/membershipPlan.controller.js`, `src/routes/membershipPlan.routes.js`, `src/schema/membershipPlan.js`.

---

## Authentication

| Route group | Auth |
|-------------|------|
| `GET /membership-plans`, `GET /membership-plans/:id` | **Public** — no header |
| `POST`, `PATCH`, `DELETE`, `POST .../demo-trial` | **`authorizeAdmin`** — JWT with role `SUPER_ADMIN` |

Protected routes:

```http
Authorization: Bearer <token>
```

Token from **`POST /api/auth/login`** (`user.role` must be `SUPER_ADMIN`).

---

## Routes overview

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/membership-plans` | Public | List **ACTIVE** plans (`order` asc) |
| GET | `/membership-plans/:id` | Public | One **ACTIVE** plan by id |
| POST | `/membership-plans` | SUPER_ADMIN | Create plan |
| PATCH | `/membership-plans/:id` | SUPER_ADMIN | Update plan |
| DELETE | `/membership-plans/:id` | SUPER_ADMIN | Delete plan |
| POST | `/membership-plans/demo-trial` | SUPER_ADMIN | Grant company trial |

Write routes: **`Content-Type: application/json`**.

---

## Shared types

### Membership plan object (success body)

Returned by create, update, delete, find-one, and each item in find-all. Features are **grouped by billing period** in the response (not the flat array sent on create/update).

| Field | Type | Notes |
|-------|------|--------|
| `id` | number | Primary key |
| `name` | string | Unique plan name |
| `description` | string \| `null` | |
| `monthlyPrice` | number | |
| `monthlyOldAmount` | number \| `null` | Omitted in DB → `null` |
| `threeMonthPrice` | number \| `null` | |
| `threeMonthOldAmount` | number \| `null` | |
| `sixMonthPrice` | number \| `null` | |
| `sixMonthOldAmount` | number \| `null` | |
| `annualPrice` | number \| `null` | |
| `annualOldAmount` | number \| `null` | |
| `gstPercentage` | number | Default **18** |
| `isPopular` | boolean | |
| `order` | number | Sort key (ascending on list) |
| `features` | object | See below |
| `status` | string | `ACTIVE` \| `INACTIVE` |
| `createdBy` | number \| `null` | User id (super admin on create/update) |
| `updatedBy` | number \| `null` | User id |

**`features` object:**

| Key | Contents |
|-----|----------|
| `monthly` | Features with `availability` `MONTHLY`, `ALL`, or legacy `BOTH` |
| `threeMonth` | `THREE_MONTH`, `ALL`, `BOTH` |
| `sixMonth` | `SIX_MONTH`, `ALL`, `BOTH` |
| `annual` | `ANNUAL`, `ALL`, `BOTH` |

Each feature entry:

```json
{ "name": "Inventory", "availability": "ALL" }
```

### Error body (`AppError` / most failures)

```json
{
  "status": "error",
  "message": "Membership plan not found"
}
```

### Validation error body (Zod — create, update, demo-trial)

```json
{
  "status": "error",
  "message": "Validation failed",
  "errors": [
    {
      "code": "too_small",
      "minimum": 0,
      "type": "number",
      "inclusive": true,
      "exact": false,
      "message": "Number must be greater than or equal to 0",
      "path": ["monthlyPrice"]
    }
  ]
}
```

`errors` is the standard [Zod issue](https://zod.dev) array (`path`, `message`, `code`, …).

---

## `GET /api/membership-plans` (public)

Lists plans where **`status === "ACTIVE"`**, sorted by **`order`** ascending.

### Request

No body. No `Authorization` header.

### Success `200`

**Non-empty:**

```json
{
  "data": [
    {
      "id": 1,
      "name": "Pro",
      "description": "For growing clinics",
      "monthlyPrice": 999,
      "monthlyOldAmount": 1299,
      "threeMonthPrice": 2697,
      "threeMonthOldAmount": 2997,
      "sixMonthPrice": 4999,
      "sixMonthOldAmount": null,
      "annualPrice": 9999,
      "annualOldAmount": 11999,
      "gstPercentage": 18,
      "isPopular": true,
      "order": 1,
      "features": {
        "monthly": [
          { "name": "Inventory", "availability": "ALL" },
          { "name": "Basic reports", "availability": "MONTHLY" }
        ],
        "threeMonth": [
          { "name": "Inventory", "availability": "ALL" }
        ],
        "sixMonth": [
          { "name": "Inventory", "availability": "ALL" }
        ],
        "annual": [
          { "name": "Inventory", "availability": "ALL" },
          { "name": "WhatsApp alerts", "availability": "ANNUAL" }
        ]
      },
      "status": "ACTIVE",
      "createdBy": 1,
      "updatedBy": 1
    },
    {
      "id": 2,
      "name": "Starter",
      "description": null,
      "monthlyPrice": 499,
      "monthlyOldAmount": null,
      "threeMonthPrice": null,
      "threeMonthOldAmount": null,
      "sixMonthPrice": null,
      "sixMonthOldAmount": null,
      "annualPrice": null,
      "annualOldAmount": null,
      "gstPercentage": 18,
      "isPopular": false,
      "order": 0,
      "features": {
        "monthly": [],
        "threeMonth": [],
        "sixMonth": [],
        "annual": []
      },
      "status": "ACTIVE",
      "createdBy": 1,
      "updatedBy": null
    }
  ]
}
```

**Empty catalog:**

```json
{
  "data": []
}
```

`INACTIVE` plans are **not** included.

---

## `GET /api/membership-plans/:id` (public)

### Path

| Param | Type | Description |
|-------|------|-------------|
| `id` | integer | Plan id |

### Success `200`

Single **membership plan object** (not wrapped in `data`):

```json
{
  "id": 1,
  "name": "Pro",
  "description": "For growing clinics",
  "monthlyPrice": 999,
  "monthlyOldAmount": 1299,
  "threeMonthPrice": 2697,
  "threeMonthOldAmount": 2997,
  "sixMonthPrice": 4999,
  "sixMonthOldAmount": null,
  "annualPrice": 9999,
  "annualOldAmount": 11999,
  "gstPercentage": 18,
  "isPopular": true,
  "order": 1,
  "features": {
    "monthly": [
      { "name": "Inventory", "availability": "ALL" },
      { "name": "Basic reports", "availability": "MONTHLY" }
    ],
    "threeMonth": [
      { "name": "Inventory", "availability": "ALL" }
    ],
    "sixMonth": [
      { "name": "Inventory", "availability": "ALL" }
    ],
    "annual": [
      { "name": "Inventory", "availability": "ALL" },
      { "name": "WhatsApp alerts", "availability": "ANNUAL" }
    ]
  },
  "status": "ACTIVE",
  "createdBy": 1,
  "updatedBy": 1
}
```

### Errors

**`400`** — invalid id (non-integer):

```json
{
  "status": "error",
  "message": "Invalid membership plan id"
}
```

**`404`** — missing id or plan is `INACTIVE`:

```json
{
  "status": "error",
  "message": "Membership plan not found"
}
```

---

## `POST /api/membership-plans` (SUPER_ADMIN)

### Body

| Field | Type | Required | Default |
|-------|------|----------|---------|
| `name` | string | Yes | — |
| `description` | string | No | `null` |
| `order` | number | No | `0` |
| `monthlyPrice` | number | Yes | — |
| `monthlyOldAmount` | number | No | `null` |
| `threeMonthPrice` | number | No | `null` |
| `sixMonthPrice` | number | No | `null` |
| `threeMonthOldAmount` | number | No | `null` |
| `sixMonthOldAmount` | number | No | `null` |
| `annualPrice` | number | No | `null` |
| `annualOldAmount` | number | No | `null` |
| `gstPercentage` | number | No | `18` |
| `isPopular` | boolean | No | `false` |
| `features` | array | No | `[]` |
| `status` | string | No | `ACTIVE` |

**Request `features` item:** `{ "name": string, "availability": "MONTHLY" | "THREE_MONTH" | "SIX_MONTH" | "ANNUAL" | "ALL" | "BOTH" }`

### Example request

```json
{
  "name": "Pro",
  "description": "For growing clinics",
  "order": 1,
  "monthlyPrice": 999,
  "monthlyOldAmount": 1299,
  "threeMonthPrice": 2697,
  "annualPrice": 9999,
  "gstPercentage": 18,
  "isPopular": true,
  "features": [
    { "name": "Inventory", "availability": "ALL" },
    { "name": "WhatsApp alerts", "availability": "ANNUAL" }
  ],
  "status": "ACTIVE"
}
```

### Success `201`

Membership plan object (same shape as [GET by id](#get-apimembership-plansid-public)):

```json
{
  "id": 3,
  "name": "Pro",
  "description": "For growing clinics",
  "monthlyPrice": 999,
  "monthlyOldAmount": 1299,
  "threeMonthPrice": 2697,
  "threeMonthOldAmount": null,
  "sixMonthPrice": null,
  "sixMonthOldAmount": null,
  "annualPrice": 9999,
  "annualOldAmount": null,
  "gstPercentage": 18,
  "isPopular": true,
  "order": 1,
  "features": {
    "monthly": [
      { "name": "Inventory", "availability": "ALL" }
    ],
    "threeMonth": [
      { "name": "Inventory", "availability": "ALL" }
    ],
    "sixMonth": [
      { "name": "Inventory", "availability": "ALL" }
    ],
    "annual": [
      { "name": "Inventory", "availability": "ALL" },
      { "name": "WhatsApp alerts", "availability": "ANNUAL" }
    ]
  },
  "status": "ACTIVE",
  "createdBy": 1,
  "updatedBy": 1
}
```

### Errors

**`400`** — validation (example):

```json
{
  "status": "error",
  "message": "Validation failed",
  "errors": [
    {
      "code": "invalid_type",
      "expected": "number",
      "received": "undefined",
      "path": ["monthlyPrice"],
      "message": "Required"
    }
  ]
}
```

**`401`** — no/invalid token:

```json
{
  "status": "error",
  "message": "Unauthorized User"
}
```

**`403`** — not super admin:

```json
{
  "status": "error",
  "message": "Forbidden: Access denied."
}
```

**`409`** — duplicate name:

```json
{
  "status": "error",
  "message": "Membership plan with name \"Pro\" already exists"
}
```

---

## `PATCH /api/membership-plans/:id` (SUPER_ADMIN)

Partial update. Only sent fields are changed. **`updatedBy`** is set from the JWT user id.

### Example request

```json
{
  "monthlyPrice": 1099,
  "isPopular": false
}
```

### Success `200`

Full updated membership plan object (same shape as create response).

### Errors

**`400`** — invalid id:

```json
{
  "status": "error",
  "message": "Invalid membership plan id"
}
```

**`400`** — empty body (no fields to update):

```json
{
  "status": "error",
  "message": "No fields to update"
}
```

**`404`**:

```json
{
  "status": "error",
  "message": "Membership plan not found"
}
```

**`409`** — name clash:

```json
{
  "status": "error",
  "message": "Membership plan with name \"Enterprise\" already exists"
}
```

---

## `DELETE /api/membership-plans/:id` (SUPER_ADMIN)

### Success `200`

Returns the **deleted** plan (last snapshot, same object shape):

```json
{
  "id": 3,
  "name": "Pro",
  "description": "For growing clinics",
  "monthlyPrice": 999,
  "monthlyOldAmount": 1299,
  "threeMonthPrice": 2697,
  "threeMonthOldAmount": null,
  "sixMonthPrice": null,
  "sixMonthOldAmount": null,
  "annualPrice": 9999,
  "annualOldAmount": null,
  "gstPercentage": 18,
  "isPopular": true,
  "order": 1,
  "features": {
    "monthly": [
      { "name": "Inventory", "availability": "ALL" }
    ],
    "threeMonth": [
      { "name": "Inventory", "availability": "ALL" }
    ],
    "sixMonth": [
      { "name": "Inventory", "availability": "ALL" }
    ],
    "annual": [
      { "name": "Inventory", "availability": "ALL" },
      { "name": "WhatsApp alerts", "availability": "ANNUAL" }
    ]
  },
  "status": "ACTIVE",
  "createdBy": 1,
  "updatedBy": 1
}
```

### Errors

**`400`** / **`404`** — same messages as [GET by id](#errors-1).

---

## `POST /api/membership-plans/demo-trial` (SUPER_ADMIN)

Updates **`Company`**: `membership` → `TRIAL`, `membershipStartDate` → now, `membershipEndDate` → now + `days`.

### Body

| Field | Type | Required |
|-------|------|----------|
| `companyId` | number | Yes |
| `days` | number (int, > 0) | Yes |

### Example request

```json
{
  "companyId": 12,
  "days": 30
}
```

### Success `200`

```json
{
  "message": "Demo trial of 30 day(s) granted successfully",
  "membership": "TRIAL",
  "membershipStartDate": "2026-05-26T10:15:30.123Z",
  "membershipEndDate": "2026-06-25T10:15:30.123Z",
  "membershipEndDateFormatted": "6/25/2026, 10:15:30 AM",
  "days": 30,
  "companyId": 12
}
```

`membershipEndDateFormatted` uses the server locale (`toLocaleString()`).

### Errors

**`400`** — validation (example):

```json
{
  "status": "error",
  "message": "Validation failed",
  "errors": [
    {
      "code": "too_small",
      "minimum": 0,
      "type": "number",
      "inclusive": false,
      "exact": false,
      "message": "Number must be greater than 0",
      "path": ["days"]
    }
  ]
}
```

**`404`**:

```json
{
  "status": "error",
  "message": "Company not found"
}
```

---

## Enums (request body)

### Plan `status`

| Value | Meaning |
|-------|---------|
| `ACTIVE` | Visible on public list / get-by-id |
| `INACTIVE` | Hidden from public endpoints |

### Feature `availability` (request)

| Value | Grouped into response keys |
|-------|----------------------------|
| `MONTHLY` | `features.monthly` |
| `THREE_MONTH` | `features.threeMonth` |
| `SIX_MONTH` | `features.sixMonth` |
| `ANNUAL` | `features.annual` |
| `ALL` | All four groups |
| `BOTH` | Legacy; grouped like `ALL` |

---

## Database

Table **`MembershipPlan`** — run migrations before use:

```bash
npx prisma migrate deploy
```

---

## Related docs

- [MEMBERSHIP_USER_API.md](./MEMBERSHIP_USER_API.md) — company user trial & status
- [API.md](./API.md) — general API index
