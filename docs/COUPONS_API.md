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

**`billingPeriod` (verify + restrictions):** `monthly` \| `threeMonth` \| `sixMonth` \| `annual` — or legacy `MONTHLY` \| `THREE_MONTH` \| `SIX_MONTH` \| `ANNUAL`

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
| `usageLimit` | number \| `null` | Global max uses; `null` or `0` = unlimited |
| `usedCount` | number | Global usage count |
| `usageLimitPerCompany` | number \| `null` | Per-company max; `null` or `0` = unlimited |
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

Validate a coupon **before checkout** (same behaviour as NestJS `verifyCouponWithDetails`). Does **not** increment usage — that happens on successful payment via internal `applyCoupon`.

**Auth:** JWT with `companyId` (maps to **institute** in the NestJS API).

**Body:**

```json
{
  "code": "WELCOME20",
  "purchaseAmount": 9999,
  "membershipPlanId": 1,
  "billingPeriod": "annual"
}
```

| Field | Required | Notes |
|-------|----------|--------|
| `code` | Yes | Case-insensitive; stored uppercased |
| `purchaseAmount` | Yes | Base plan price before discount (≥ 0) |
| `membershipPlanId` | If coupon is plan-restricted | Integer plan id |
| `billingPeriod` | If coupon is period-restricted | See billing period formats below |

### Billing period formats (both accepted)

Transaction-style: `monthly`, `threeMonth`, `sixMonth`, `annual`  
Legacy/admin-style: `MONTHLY`, `THREE_MONTH`, `SIX_MONTH`, `ANNUAL`

**Success:** `200`

```json
{
  "data": {
    "valid": true,
    "discount": 500,
    "coupon": { "id": 1, "code": "WELCOME20", "...": "..." },
    "errors": {},
    "companyUsageCount": 0,
    "companyUsageLimit": 1,
    "instituteUsageCount": 0,
    "instituteUsageLimit": 1
  }
}
```

When invalid:

```json
{
  "data": {
    "valid": false,
    "discount": 0,
    "coupon": null,
    "errors": {
      "minPurchaseAmount": ["Minimum purchase amount of ₹500 is required. Your purchase amount is ₹100."]
    },
    "companyUsageCount": 0,
    "companyUsageLimit": null,
    "instituteUsageCount": 0,
    "instituteUsageLimit": null
  }
}
```

`instituteUsageCount` / `instituteUsageLimit` mirror the NestJS response; **company** fields are the same values in this stack.

**Errors (HTTP):** `400` if JWT has no `companyId`.

---

## Applying usage after payment

`applyCoupon(code, companyId)` runs automatically inside `confirmPayment` after Cashfree success. **Not exposed as HTTP** — prevents abuse before payment completes.

---

## Database

Run migration:

```bash
npx prisma migrate deploy
```

Models: `Coupon`, `CouponCompanyUsage`, `CouponMembershipPlan`.
