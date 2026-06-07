# Company contact verification

Verify a company's **email** and **phone number** using one-time passwords (OTP). Email OTPs are sent via SMTP (Nodemailer). Phone OTPs are sent via **WhatsApp** using the [AiSensy](https://aisensy.com/) campaign API.

On successful verification, the **Company** row is updated with **`emailVerified`** or **`phoneVerified`** set to **`true`**.

Implementation: `src/controllers/companyVerification.controller.js`, `src/utils/otp.js`, `src/utils/aisensy.js`, `src/utils/sendEmail.js`. Route registration: `src/routes/companies.routes.js`.

---

## Endpoints

| Method | Path | Auth |
|--------|------|------|
| GET | `/api/company/me/verification-status` | `authenticateUser` (JWT) |
| POST | `/api/company/verification/email/send` | `authenticateUser` (JWT) |
| POST | `/api/company/verification/email/verify` | `authenticateUser` (JWT) |
| POST | `/api/company/verification/phone/send` | `authenticateUser` (JWT) |
| POST | `/api/company/verification/phone/verify` | `authenticateUser` (JWT) |

**Content-Type:** `application/json`

---

## Authorization

| Role | Allowed `companyId` in the request |
|------|--------------------------------------|
| **SUPER_ADMIN** | Any existing company id |
| **ADMIN**, **SUBADMIN**, **MANAGER** | Only their own `req.user.companyId` |

Other roles receive **403**.

---

## `GET /api/company/me/verification-status`

Returns **contact verification** (email / phone) and **KYC** state for the logged-in company admin dashboard. Use on load instead of stale JWT `kyc` claims.

### Request

No body. JWT required.

| Query (SUPER_ADMIN only) | Required | Notes |
|--------------------------|----------|--------|
| `companyId` | Yes* | Integer company primary key. *Required when the token has no `companyId`. |

Company users (`ADMIN`, `SUBADMIN`, `MANAGER`) read their own company from **`req.user.companyId`** — no query param.

### Success: `200`

```json
{
  "status": "success",
  "companyId": 1,
  "verification": {
    "email": "clinic@example.com",
    "phone": "9876543210",
    "emailVerified": true,
    "phoneVerified": false,
    "contactsVerified": false
  },
  "kyc": {
    "status": "UNVERIFIED",
    "verified": false,
    "address": null,
    "companyLogo": null
  },
  "isFullyVerified": false
}
```

| Field | Description |
|-------|-------------|
| `verification.contactsVerified` | `true` when both email and phone are verified |
| `kyc.status` | Same as `Company.kyc` (`UNVERIFIED` or `VERIFIED`) |
| `kyc.verified` | `true` when `kyc.status === "VERIFIED"` |
| `isFullyVerified` | `contactsVerified && kyc.verified` |

OTP hash columns are never returned.

### Errors

| Status | When |
|--------|------|
| `400` | No `companyId` on token (company user), or invalid / missing `companyId` query (super admin) |
| `401` | Missing / invalid token |
| `403` | Role not allowed |
| `404` | Company not found |

---

## Flow

Each channel follows the same two-step pattern:

1. **Send OTP** — generates a 6-digit code, stores a bcrypt hash and expiry on the company, then delivers the plain OTP to the contact on file.
2. **Verify OTP** — checks the code against the hash and expiry; on success sets the verified flag and clears OTP fields.

Email and phone verification are independent. Complete both if your product requires both contacts to be verified.

```
┌─────────────┐     send      ┌──────────────┐     verify     ┌─────────────────┐
│   Client    │ ────────────► │    Server    │ ─────────────► │ Company (DB)    │
│             │               │  (OTP hash)  │                │ emailVerified   │
└─────────────┘               └──────────────┘                │ phoneVerified   │
       │                              │                        └─────────────────┘
       │                              │
       ▼                              ▼
  Email: SMTP                   WhatsApp: AiSensy
  (company.email)               (company.phone → 91XXXXXXXXXX)
```

---

## Request bodies

### Send email OTP

`POST /api/company/verification/email/send`

| Field | Required | Notes |
|-------|----------|--------|
| `companyId` | Yes | Integer company primary key. |

OTP is sent to the company's existing **`email`** column. The request does not accept a different email address.

### Verify email OTP

`POST /api/company/verification/email/verify`

| Field | Required | Notes |
|-------|----------|--------|
| `companyId` | Yes | Integer company primary key. |
| `otp` | Yes | Exactly **6 digits** (string or number in JSON is fine). |

### Send phone OTP

`POST /api/company/verification/phone/send`

| Field | Required | Notes |
|-------|----------|--------|
| `companyId` | Yes | Integer company primary key. |

OTP is sent via WhatsApp to the company's existing **`phone`** column, normalized for AiSensy as **`91` + 10-digit mobile** (see [Phone normalization](#phone-normalization)).

### Verify phone OTP

`POST /api/company/verification/phone/verify`

| Field | Required | Notes |
|-------|----------|--------|
| `companyId` | Yes | Integer company primary key. |
| `otp` | Yes | Exactly **6 digits**. |

---

## OTP rules

| Rule | Value |
|------|--------|
| Length | 6 digits |
| Expiry | **10 minutes** from send |
| Storage | Bcrypt hash on **Company** (`emailOtp` / `phoneOtp` + expiry columns) |
| After verify | Hash and expiry cleared; `emailVerified` or `phoneVerified` set to `true` |

If the contact is **already verified**, send and verify endpoints return **200** with an informational message and do not send a new OTP (send) or change the flag again (verify).

---

## Phone normalization

The server reads **`company.phone`** and converts it to AiSensy **`destination`** format (digits only, country code `91`):

| Input example | Normalized destination |
|---------------|------------------------|
| `9876543210` | `919876543210` |
| `919876543210` | `919876543210` |
| `09876543210` | `919876543210` |

Invalid lengths or formats return **400**.

---

## Database fields

On **Company** (see `prisma/schema.prisma`):

| Column | Type | Purpose |
|--------|------|---------|
| `emailVerified` | Boolean | `true` after email OTP verified (default `false`) |
| `phoneVerified` | Boolean | `true` after phone OTP verified (default `false`) |
| `emailOtp` | String? | Bcrypt hash while email OTP is pending |
| `emailOtpExpires` | DateTime? | Email OTP expiry |
| `phoneOtp` | String? | Bcrypt hash while phone OTP is pending |
| `phoneOtpExpires` | DateTime? | Phone OTP expiry |

OTP columns are **never** returned in API responses.

Migration: `prisma/migrations/20260607120000_add_company_contact_verification/migration.sql`

---

## Success responses

All successful responses use **`status: "success"`** and include a **`company`** object:

```json
{
  "id": 1,
  "email": "clinic@example.com",
  "phone": "9876543210",
  "emailVerified": false,
  "phoneVerified": false
}
```

### Send email OTP — **HTTP 200**

```json
{
  "status": "success",
  "message": "OTP sent to company email",
  "company": {
    "id": 1,
    "email": "clinic@example.com",
    "phone": "9876543210",
    "emailVerified": false,
    "phoneVerified": false
  }
}
```

### Verify email OTP — **HTTP 200**

```json
{
  "status": "success",
  "message": "Email verified successfully",
  "company": {
    "id": 1,
    "email": "clinic@example.com",
    "phone": "9876543210",
    "emailVerified": true,
    "phoneVerified": false
  }
}
```

### Send phone OTP — **HTTP 200**

```json
{
  "status": "success",
  "message": "OTP sent to company phone via WhatsApp",
  "company": {
    "id": 1,
    "email": "clinic@example.com",
    "phone": "9876543210",
    "emailVerified": true,
    "phoneVerified": false
  }
}
```

### Verify phone OTP — **HTTP 200**

```json
{
  "status": "success",
  "message": "Phone number verified successfully",
  "company": {
    "id": 1,
    "email": "clinic@example.com",
    "phone": "9876543210",
    "emailVerified": true,
    "phoneVerified": true
  }
}
```

### Already verified — **HTTP 200**

When sending or verifying a contact that is already verified:

```json
{
  "status": "success",
  "message": "Email is already verified",
  "company": {
    "id": 1,
    "email": "clinic@example.com",
    "phone": "9876543210",
    "emailVerified": true,
    "phoneVerified": false
  }
}
```

(Similar messages: `"Phone number is already verified"`.)

| Field | Type | Notes |
|-------|------|--------|
| `status` | `"success"` | Always `"success"` on 200. |
| `message` | string | Outcome description. |
| `company.id` | number | Company primary key. |
| `company.email` | string | Email on the company row. |
| `company.phone` | string \| null | Phone on the company row. |
| `company.emailVerified` | boolean | Email verification state. |
| `company.phoneVerified` | boolean | Phone verification state. |

---

## Errors

| Situation | Typical status |
|-----------|----------------|
| Missing / invalid JWT | 401 |
| Wrong role or `companyId` not allowed | 403 |
| Invalid `companyId`, invalid OTP format, expired OTP, wrong OTP | 400 |
| Company email or phone not set on row | 400 |
| Invalid phone format | 400 |
| Company does not exist | 404 |
| AiSensy / WhatsApp send failure | 502 |
| Missing `AISENSY_API_KEY` or email SMTP misconfiguration | 500 |

Error JSON shape matches the global handler: `{ "status": "error", "message": "..." }` for operational errors.

Common messages:

- `"companyId is required and must be a number"`
- `"otp must be exactly 6 digits"`
- `"OTP has expired. Request a new one."`
- `"Invalid OTP"`
- `"Company email is not set"` / `"Company phone number is not set"`
- `"Failed to send WhatsApp OTP"`

---

## Environment variables

### Email (Nodemailer / Gmail SMTP)

| Variable | Purpose |
|----------|---------|
| `EMAIL_USER` | SMTP username (sender address). |
| `EMAIL_PASS` | SMTP password or app password. |

### WhatsApp OTP (AiSensy)

| Variable | Purpose |
|----------|---------|
| `AISENSY_API_KEY` | **Required** for phone OTP. AiSensy API JWT. |
| `AISENSY_OTP_CAMPAIGN` | Optional. **Must be an Authentication OTP API campaign** live in AiSensy (default: `discount_otp_verification`). |
| `AISENSY_USER_NAME` | Optional. Display name in payload (default: `Echashma`). |
| `AISENSY_API_URL` | Optional. API base URL (default: `https://backend.aisensy.com/campaign/t1/api/v2`). |
| `AISENSY_OTP_BUTTON_SUB_TYPE` | Optional. Button subtype in payload (default: `url`). Use the value from your AiSensy **Test Campaign** cURL. |
| `AISENSY_DEBUG` | Optional. Set to `true` to log request/response details to the server console. |

The OTP is sent in **`templateParams`**, **`paramsFallbackValue.FirstName`**, and the **button `parameters`** (same value in all three), as required by AiSensy authentication templates.

**Important:** The campaign must use a **WhatsApp Authentication** template (OTP / copy-code), not a marketing or discount template. In AiSensy: **Campaigns → Launch → API Campaign**, pick your approved auth template, set live, then set `AISENSY_OTP_CAMPAIGN` to that exact campaign name.

If the API returns success but no message arrives:

1. Open **AiSensy → Campaigns** and check delivery status for the `submitted_message_id`.
2. Confirm the destination number has **opted in** to your WhatsApp Business account.
3. In **Test Campaign**, copy the exact `templateParams` and `buttons` format from AiSensy and align env vars / code if they differ.
4. In development, the server logs the OTP to the console when `NODE_ENV` is not `production`.

---

## Frontend alignment

Typical client sequence:

1. Ensure **`company.email`** and **`company.phone`** are saved on the company (registration or profile update).
2. `POST /api/company/verification/email/send` with `{ "companyId": 1 }`.
3. User enters OTP → `POST /api/company/verification/email/verify` with `{ "companyId": 1, "otp": "123456" }`.
4. Repeat for phone with `/verification/phone/send` and `/verification/phone/verify`.

All requests need **`Authorization: Bearer <token>`**.

Verification status is available on **`company.emailVerified`** and **`company.phoneVerified`** in these responses and on full company fetches (e.g. `GET /api/company/getCompanyDetails/:companyId`).

For KYC submission after contact verification, see [KYC.md](./KYC.md).

For general API conventions (base URL, auth header), see [API.md](./API.md).
