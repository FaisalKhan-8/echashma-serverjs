# KYC (Know Your Customer)

Submit company KYC data and document scans. Files are stored in **Amazon S3** under a public (or CDN-backed) URL; the **Company** row is updated with addresses, ID numbers, document URLs, and **`kyc`** set to **`VERIFIED`** on success.

Implementation: `src/controllers/kyc.controller.js`, `src/middleware/kycUpload.js`, `src/utils/s3.js`. Route registration: `src/routes/companies.routes.js`.

---

## Endpoint

| Method | Path | Auth |
|--------|------|------|
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
| `aadhaarNo` | Yes | Must normalize to **exactly 12 digits** (non-digits are stripped before check). |
| `panNo` | No | Omit, empty, or literal `null` → stored as `null`. If present: **AAAAA9999A** (uppercased server-side). |

---

## Files (multipart)

Multer uses **in-memory** buffers; max **8 MB** per file, up to **3** files.

| Field | Required | Allowed MIME types |
|-------|----------|--------------------|
| `companyLogo` | Yes | `image/png`, `image/jpeg`, `image/jpg`, `image/webp` |
| `adharcard` | Yes | Same images, or `application/pdf` |
| `pancard` | No | Same as `adharcard`. If omitted, existing `pancard` URL in the database is **not** cleared. |

Unexpected file field names return **400**.

---

## Storage (S3)

- Objects are uploaded under the key prefix **`kyc/{companyId}/`** (unique filenames; see `uploadPublicObject` in `src/utils/s3.js`).
- The server stores **full public URLs** on the company for `companyLogo`, `aadhaarcard`, and optionally `pancard`.

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

- `address`, `aadhaarNo`, `panNo`
- `companyLogo`, `aadhaarcard` (S3 URLs)
- `pancard` (S3 URL) **only** if a `pancard` file was uploaded
- **`kyc`** → **`VERIFIED`**

Schema fields include `aadhaarNo` and `panNo` on **Company**; document columns support long URLs (see `prisma/schema.prisma`).

---

## Success response

**HTTP 200**

```json
{
  "status": "success",
  "message": "KYC submitted successfully",
  "company": {
    "id": 1,
    "address": "...",
    "aadhaarNo": "123456789012",
    "panNo": "ABCDE1234F",
    "companyLogo": "https://...",
    "aadhaarcard": "https://...",
    "pancard": "https://...",
    "kyc": "VERIFIED"
  }
}
```

`pancard` in the payload reflects the database row (may be an older value if no new PAN file was sent).

---

## Errors

| Situation | Typical status |
|-----------|----------------|
| Missing / invalid JWT | 401 |
| Wrong role or `companyId` not allowed | 403 |
| Invalid `companyId`, missing address, bad Aadhaar/PAN, missing required files, bad MIME type, file too large | 400 |
| Company does not exist | 404 |
| S3 / configuration error | 500 |

Error JSON shape matches the global handler: `{ "status": "error", "message": "..." }` for operational errors.

---

## JWT and `kyc` in the client

The login response and JWT embed **`kyc`** at issue time. After a successful KYC submit, **`kyc`** in the database is **`VERIFIED`**, but existing tokens still carry the old claim until the user **logs in again** (or your app refreshes the token from a profile endpoint that reads the DB).

---

## Frontend alignment

The web app can build the same payload as described in the product spec: `companyId`, formatted `address`, stripped `aadhaarNo`, optional `panNo`, and files keyed **`companyLogo`**, **`adharcard`** (spelling matches this API), and optional **`pancard`**. Append fields and files to **`FormData`** and `POST` to **`/api/company/kyc/submit`** with **`Authorization: Bearer &lt;token&gt;`**.

For general API conventions (base URL, auth header), see [API.md](./API.md).
