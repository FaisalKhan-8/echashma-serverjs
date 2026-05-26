# Coupons API

Discount coupons for membership purchases. Ported from the NestJS/Mongo implementation; **company** replaces **institute** in this stack.

**Base URL:** `http://localhost:3001/api`

Implementation: `src/controllers/coupon.controller.js`, `src/routes/coupon.routes.js`, `src/schema/coupon.js`.

---

## Authentication

| Route | Auth |
|-------|------|
| `POST /coupons/verify` | `authenticateUser` — JWT with `companyId` |
| `GET`, `POST`, `PATCH`, `DELETE /coupons` | `authorizeAdmin` — `SUPER_ADMIN` only |

```http
Authorization: Bearer <token>
```

---

## Routes

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/coupons/verify` | User | Validate coupon and compute discount |
| GET | `/coupons` | SUPER_ADMIN | List all coupons (newest first) |
| GET | `/coupons/:id` | SUPER_ADMIN | Get one coupon |
| POST | `/coupons` | SUPER_ADMIN | Create coupon |
| PATCH | `/coupons/:id` | SUPER_ADMIN | Update coupon |
| DELETE | `/coupons/:id` | SUPER_ADMIN | Delete coupon |

---

## Enums

**`discountType`:** `PERCENTAGE` \| `FIXED`

**`status`:** `ACTIVE` \| `INACTIVE` \| `EXPIRED`

**`billingPeriod` (verify + restrictions):** `MONTHLY` \| `THREE_MONTH` \| `SIX_MONTH` \| `ANNUAL`

---

## Coupon object

| Field | Type | Notes |
|-------|------|--------|
| `id` | number | Primary key |
| `code` | string | Uppercased, unique |
| `description` | string | |
| `discountType` | string | `PERCENTAGE` or `FIXED` |
| `discountValue` | number | % or fixed amount |
| `expiryDate` | string \| `null` | ISO date |
| `usageLimit` | number \| `null` | Global max uses; `null` = unlimited |
| `usedCount` | number | Global usage count |
| `usageLimitPerCompany` | number \| `null` | Per-company max; `null` = unlimited |
| `companyUsage` | array | `{ companyId, count }[]` |
| `minPurchaseAmount` | number \| `null` | |
| `maxDiscountAmount` | number \| `null` | Cap for percentage discounts |
| `applicableMembershipPlans` | number[] \| `null` | Plan ids; `null` = all plans |
| `applicableBillingPeriods` | string[] \| `null` | `null` = all periods |
| `isPublic` | boolean | Default `false` |
| `status` | string | |
| `createdAt` | string | |
| `updatedAt` | string | |

---

## `POST /coupons` (create)

**Body (example):**

```json
{
  "code": "WELCOME20",
  "description": "20% off first purchase",
  "discountType": "PERCENTAGE",
  "discountValue": 20,
  "expiryDate": "2026-12-31T23:59:59.000Z",
  "usageLimit": 100,
  "usageLimitPerCompany": 1,
  "minPurchaseAmount": 500,
  "maxDiscountAmount": 2000,
  "applicableMembershipPlans": [1, 2],
  "applicableBillingPeriods": ["MONTHLY", "ANNUAL"],
  "isPublic": true,
  "status": "ACTIVE"
}
```

**Success:** `201` — coupon object.

**Errors:** `409` duplicate code, `400` validation (e.g. percentage &gt; 100).

---

## `POST /coupons/verify`

**Body:**

```json
{
  "code": "WELCOME20",
  "purchaseAmount": 1500,
  "membershipPlanId": 1,
  "billingPeriod": "MONTHLY"
}
```

| Field | Required | Notes |
|-------|----------|--------|
| `code` | Yes | |
| `purchaseAmount` | Yes | Amount before discount |
| `membershipPlanId` | If coupon is plan-restricted | |
| `billingPeriod` | If coupon is period-restricted | |

**Success:** `200`

```json
{
  "data": {
    "valid": true,
    "discount": 300,
    "coupon": { "...": "..." },
    "errors": {},
    "companyUsageCount": 0,
    "companyUsageLimit": 1
  }
}
```

When invalid, `valid` is `false`, `discount` is `0`, `coupon` is `null`, and `errors` maps field names to message arrays (same shape as the Nest service).

---

## Applying usage after payment

Call `applyCoupon(code, companyId)` from `coupon.controller.js` after a successful transaction (not exposed as HTTP). It increments global and per-company usage counts.

---

## Database

Run migration:

```bash
npx prisma migrate deploy
```

Models: `Coupon`, `CouponCompanyUsage`, `CouponMembershipPlan`.
