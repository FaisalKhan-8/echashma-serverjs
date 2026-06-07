# KYC (Know Your Customer)

Submit company address and an optional logo for KYC verification. When a logo file is provided, it is stored in **Amazon S3** under a public (or CDN-backed) URL. The **Company** row is updated with the address, optional logo URL, and **`kyc`** set to **`VERIFIED`** on success.

Implementation: `src/controllers/kyc.controller.js`, `src/middleware/kycUpload.js`, `src/utils/s3.js`. Route registration: `src/routes/companies.routes.js`.

---

## Endpoint

| Method | Path | Auth |
|--------|------|------|
| GET | `/api/company/me/verification-status` | `authenticateUser` (JWT) — see [COMPANY_VERIFICATION.md](./COMPANY_VERIFICATION.md#get-get-apicompanymeverification-status) |
| POST | `/api/company/kyc/submit` | `authenticateUser` (JWT) |

**Content-Type:** `multipart/form-data` (not JSON).

---

## Authorization

| Role | Allowed `companyId` in the request |
|------|--------------------------------------|
| **SUPER_ADMIN** | Any existing company id |
| **ADMIN**, **SUBADMIN**, **MANAGER** | Only their own `req.user.companyId` |

Other roles receive **403**.

---

## Form fields (text)

Send these as normal multipart fields (strings).

| Field | Required | Notes |
|-------|----------|--------|
| `companyId` | Yes | Integer company primary key (string or number in form data is fine). |
| `address` | Yes | Non-empty after trim. |

Aadhaar number, PAN number, and ID document uploads are **not** accepted on this endpoint.

---

## Files (multipart)

Multer uses **in-memory** buffers; max **8 MB** per file, up to **1** file.

| Field | Required | Allowed MIME types |
|-------|----------|--------------------|
| `companyLogo` | No | `image/png`, `image/jpeg`, `image/jpg`, `image/webp` |

If omitted, the existing `companyLogo` URL in the database is **not** cleared.

Unexpected file field names return **400**.

---

## Storage (S3)

- When `companyLogo` is uploaded, objects are stored under the key prefix **`kyc/{companyId}/`** (unique filenames; see `uploadPublicObject` in `src/utils/s3.js`).
- The server stores the **full public URL** on the company for `companyLogo`.

### Environment variables

| Variable | Purpose |
|----------|---------|
| `AWS_REGION` | S3 region (required for uploads). |
| `AWS_BUCKET_NAME` | Target bucket. |
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | Credentials when not using the default provider chain (e.g. local dev). |
| `AWS_S3_PUBLIC_BASE_URL` | Optional. Overrides the default `https://{bucket}.s3.{region}.amazonaws.com` base used in returned URLs (e.g. CloudFront). |
| `AWS_S3_OBJECT_ACL` | Optional. Set to `public-read` only if your bucket still uses object ACLs; many public buckets rely on **bucket policy** only. |

---

## Database updates

On success, **Company** is updated with:

- `address`
- **`kyc`** → **`VERIFIED`**
- `companyLogo` (S3 URL) **only** if a `companyLogo` file was uploaded

Existing `companyLogo`, Aadhaar, and PAN fields on the row are left unchanged when not included in the request.

---

## Success response

**HTTP 200**

```json
{
  "status": "success",
  "message": "KYC submitted successfully",
  "company": {
    "id": 1,
    "address": "123 Main Street, Mumbai",
    "companyLogo": "https://bucket.s3.region.amazonaws.com/kyc/1/logo.png",
    "kyc": "VERIFIED"
  }
}
```

| Field | Type | Notes |
|-------|------|--------|
| `status` | `"success"` | Always `"success"` on 200. |
| `message` | string | Human-readable confirmation. |
| `company.id` | number | Company primary key. |
| `company.address` | string | Saved address after trim. |
| `company.companyLogo` | string \| null | Public S3 URL, or `null` if the company has no logo. |
| `company.kyc` | `"VERIFIED"` | Set on every successful submit. |

---

## Errors

| Situation | Typical status |
|-----------|----------------|
| Missing / invalid JWT | 401 |
| Wrong role or `companyId` not allowed | 403 |
| Invalid `companyId`, missing address, bad `companyLogo` MIME type, file too large, unexpected file field | 400 |
| Company does not exist | 404 |
| S3 / configuration error | 500 |

Error JSON shape matches the global handler: `{ "status": "error", "message": "..." }` for operational errors.

---

## JWT and `kyc` in the client

The login response and JWT embed **`kyc`** at issue time. After a successful KYC submit, **`kyc`** in the database is **`VERIFIED`**, but existing tokens still carry the old claim until the user **logs in again**.

Prefer **`GET /api/company/me/verification-status`** for up-to-date KYC and contact verification state on the dashboard.

---

## Frontend alignment

Build **`FormData`** with required fields `companyId` and `address`, and optionally append a **`companyLogo`** file. POST to **`/api/company/kyc/submit`** with **`Authorization: Bearer <token>`**.

For general API conventions (base URL, auth header), see [API.md](./API.md).
