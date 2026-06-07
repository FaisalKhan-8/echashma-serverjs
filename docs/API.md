# API reference

All HTTP routes are mounted under **`/api`**. The server also uses `express.json()` and `express.urlencoded({ extended: true })` for bodies.

**Example base URL:** `http://localhost:3001/api` (port comes from `process.env.PORT`, default `3001` in `src/server.js`).

---

## Authentication

Protected routes expect a JWT in the header:

```http
Authorization: Bearer <token>
```

| Middleware | Who can access |
|------------|----------------|
| **None** | Public (no header) |
| `requireMembership` | Global gate on `/api` — active trial or paid membership for company users (see [MEMBERSHIP_MIDDLEWARE.md](./MEMBERSHIP_MIDDLEWARE.md)) |
| `authenticateUser` | Any logged-in user (valid JWT) |
| `authorizeAdmin` | **SUPER_ADMIN** only (see `src/middleware/authorizeAdmin.js`) |

Tokens are issued by **`POST /api/auth/login`** (see below).

---

## Auth (`/api/auth`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/login` | Public | Sign in; returns JWT and user payload. |
| POST | `/auth/admin/first` | Public | Bootstrap first admin (see controller). |
| POST | `/auth/createUser` | `authenticateUser` | Create user (multipart if files); behavior depends on caller role (`SUPER_ADMIN` can create company + user in one flow). |
| POST | `/auth/forgot-password` | Public | Request password reset. |
| POST | `/auth/reset-password` | Public | Complete password reset. |
| GET | `/auth/getAllUser` | `authenticateUser` | List users. |
| GET | `/auth/profile` | `authenticateUser` | Current user profile. |
| GET | `/auth/recent-users` | `authenticateUser` | Recent users. |
| PUT | `/auth/update/:id` | `authenticateUser` | Update user. |
| DELETE | `/auth/delete/:id` | `authenticateUser` | Delete user. |

### `POST /api/auth/login`

**Content-Type:** `application/json`

**Body:**

| Field | Type | Required | Notes |
|-------|------|----------|--------|
| `email` | string | Yes | Valid email. |
| `password` | string | Yes | Min 8 characters (Zod). |

**Example:**

```json
{
  "email": "user@example.com",
  "password": "yourpassword"
}
```

**Success:** `200` — JSON shape:

| Key | Description |
|-----|-------------|
| `status` | `"success"` |
| `user` | `{ "id", "email", "role", "company", "branchId" }`. **`company`** is the full company row from the database when the user has a `companyId` (includes `kyc`, `membership`, `membershipStartDate`, `membershipEndDate`, and other company fields), or **`null`** if there is no company (e.g. typical `SUPER_ADMIN`). **`branchId`** is the first linked branch’s id, or `null`. |
| `membership` | Always present. **`null`** if `user.company` is `null`. Otherwise `{ "membership", "membershipStartDate", "membershipEndDate" }`. `membership` is `TRIAL` \| `TRIAL_EXPIRED` \| `EXPIRED` \| `ACTIVE`. Dates are ISO strings. |
| `kyc` | Always present. **`null`** if no company; otherwise `UNVERIFIED` \| `VERIFIED` (same value as `user.company.kyc`). |
| `token` | JWT. Use as `Authorization: Bearer <token>`. |

**JWT payload** (decoded, for reference): `userId`, `role`, `companyId`, `branchId`, **`membership`** (same object as in the JSON body, or `null`), and **`kyc`** (same as the JSON `kyc` field).

**Errors:** `400` validation (Zod), `401` wrong password, `404` unknown email.

---

## Company (`/api/company`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/company/registerCompany` | **Public** | Register a new company and its first **ADMIN** user (atomic transaction). |
| POST | `/company/createCompany` | `authorizeAdmin` (SUPER_ADMIN) | Create company; multipart for documents/logo. |
| GET | `/company/getAllCompany` | `authenticateUser` | Paginated company list (scoped by role). |
| GET | `/company/getCompanyDetails/:companyId` | `authenticateUser` | Company by ID (roles: SUPER_ADMIN, ADMIN, SUBADMIN). |
| PUT | `/company/updateCompany` | `authorizeAdmin` | Update company; multipart optional. |
| PATCH | `/company/updateDocument/:companyId` | `authenticateUser` | Update PAN / Aadhaar / logo files only. |
| DELETE | `/company/deleteCompany/:id` | `authorizeAdmin` | Delete company (blocked if branches exist). |
| POST | `/company/whatsapp` | `authorizeAdmin` | Set WhatsApp credentials for a company. |

---

### `POST /api/company/registerCompany`

Public self-service signup. Creates **Company** and **User** in a single database transaction (all-or-nothing).

**Content-Type:** `application/json`

**Body:**

| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|--------|
| `companyName` | string | Yes | — | Unique. |
| `email` | string | Yes | — | Valid email; unique for company and must not already exist as a user. |
| `phone` | string | Yes | — | Must not be in use by another company (if provided). |
| `contactPerson` | string | Yes | — | Stored as company contact and user `name`. |
| `password` | string | Yes | — | Hashed before save; not returned in full. |
| `address` | string | No | `null` | |
| `gst` | string | No | `null` | If set, must not duplicate another company’s GST. |

`kyc`, `membership`, `membershipStartDate`, and `membershipEndDate` are **not** accepted on this route. The server sets **`kyc`** to `UNVERIFIED`, **`membership`** to `TRIAL`, and the membership window (**start** = request time, **end** = start + **14 days**).

See also: [MEMBERSHIP_USER_API.md](./MEMBERSHIP_USER_API.md), [MEMBERSHIP_TRANSACTIONS_API.md](./MEMBERSHIP_TRANSACTIONS_API.md), [MEMBERSHIP_SUPER_ADMIN_API.md](./MEMBERSHIP_SUPER_ADMIN_API.md).

**Example:**

```json
{
  "companyName": "Acme Optics",
  "email": "admin@acme.com",
  "phone": "+919876543210",
  "contactPerson": "Jane Doe",
  "password": "SecurePass1",
  "address": "123 Main St",
  "gst": "22AAAAA0000A1Z5"
}
```

**Success:** `201`

```json
{
  "message": "Company registered successfully.",
  "company": { "...": "company fields including kyc, membership" },
  "user": { "...": "user without password fields" }
}
```

**Common errors:**

- `400` — validation (Zod), duplicate company name/email/phone/GST, or user email already exists.
- `400` with Prisma `P2002` — unique constraint on a field.

---

### `POST /api/company/createCompany`

**Auth:** `Authorization: Bearer <super_admin_token>`

**Content-Type:** `multipart/form-data`

**Text fields** (same names as JSON keys where applicable):

| Field | Required | Notes |
|-------|----------|--------|
| `companyName` | Yes | |
| `address` | Yes | |
| `contactPerson` | Yes | |
| `phone` | Yes | |
| `email` | Yes | |
| `gst` | No | |
| `membership` | No | Defaults to `TRIAL` if omitted. |
| `membershipStartDate` | No | ISO datetime string; default from DB / 14-day rule same as register. |
| `membershipEndDate` | No | ISO datetime string. |
| `userId` | No | Repeat field or array as supported by client; each value is a user id string → connected to company. |

**File fields** (optional, images only per multer config):

| Field name | Max files | Purpose |
|------------|-----------|---------|
| `pancard` | 1 | PAN document image (filename stored). |
| `adharcard` | 1 | Aadhaar document image (note spelling **`adharcard`**). |
| `companyLogo` | 1 | Logo image. |

**Success:** `201` — `{ "message": "Company created successfully!", "company": { ... } }`

---

### `GET /api/company/getAllCompany`

**Auth:** `authenticateUser`

**Query parameters:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | number | `1` | Page index. |
| `pageSize` | number | `10` | Page size. |
| `searchTerm` | string | `""` | Filter `companyName` contains. |

**Behavior:** `SUPER_ADMIN` sees all matching companies; `ADMIN` / `SUBADMIN` / `MANAGER` are limited to their `companyId`.

**Success:** `200` — `{ "companies": [...], "pagination": { "page", "pageSize", "totalRecords", "totalPages" } }`

---

### `GET /api/company/getCompanyDetails/:companyId`

**Auth:** `authenticateUser`

**Path:** `companyId` — numeric company id.

**Allowed roles:** `SUPER_ADMIN`, `ADMIN`, `SUBADMIN`.

**Success:** `200` — `{ "company": { ..., "users": [...], "branches": [...] } }`

---

### `PUT /api/company/updateCompany`

**Auth:** `authorizeAdmin` (SUPER_ADMIN)

**Content-Type:** `multipart/form-data`

**Body fields** (all optional except logic may require `companyId` — schema allows `companyId` as string → number):

| Field | Notes |
|-------|--------|
| `companyId` | Target company id. |
| `companyName`, `address`, `contactPerson`, `phone`, `email`, `gst` | Partial updates use “keep existing” style where implemented. |
| `membership` | Only updated if sent. |
| `membershipStartDate`, `membershipEndDate` | ISO datetime strings; if either is sent, the other may be filled using the 14-day rule. |
| `userId` | Connect listed user ids to company when provided. |

**Files:** same field names as create (`pancard`, `adharcard`, `companyLogo`) when updating assets.

---

### `PATCH /api/company/updateDocument/:companyId`

**Auth:** `authenticateUser`

**Content-Type:** `multipart/form-data`

**Path:** `companyId`

**Files:** at least one of `pancard`, `adharcard`, `companyLogo`.

---

### `DELETE /api/company/deleteCompany/:id`

**Auth:** `authorizeAdmin`

**Path:** `id` — company id.

Fails with `400` if the company still has branches.

---

### `POST /api/company/whatsapp`

**Auth:** `authorizeAdmin`

**Content-Type:** `application/json`

**Body:**

```json
{
  "companyId": 1,
  "whatsappPhoneId": "...",
  "whatsappToken": "..."
}
```

All three fields are required.

---

## Other route prefixes (quick map)

These are mounted under `/api` as in `src/routes/index.js`:

| Prefix | Area |
|--------|------|
| `/branch` | Branches |
| `/product` | Products |
| `/supplier` | Suppliers |
| `/frame`, `/shape`, `/vision`, `/coating` | Catalog types |
| `/purchase` | Purchases |
| `/expences`, `/expence-category` | Expenses |
| `/customer-invoice` | Customer invoices |
| `/prescriptions` | Prescriptions |
| `/brand` | Brands |
| `/inventory` | Inventory |
| `/whatsapp` | WhatsApp (separate router) |
| `/membership-plans` | Membership pricing catalog |
| `/membership` | Company membership status / trial |
| `/transactions` | Membership purchase & Cashfree payments ([detail](./MEMBERSHIP_TRANSACTIONS_API.md)) |
| `/coupons` | Discount coupons ([detail](./COUPONS_API.md)) |

For request/response shapes, refer to the matching `src/routes/*.routes.js` and controller or Zod schemas in `src/schema/`.

---

## Error shape

Validation and many controllers return JSON such as:

```json
{
  "status": "error",
  "message": "Human-readable message"
}
```

Zod validation may include an `errors` array with `field` / `message` / `value` depending on the endpoint.

The global `errorHandler` (`src/middleware/errors.js`) formats `AppError` and `ZodError` for other routes.
