## `POST /api/transactions/webhook/cashfree`

Public endpoint for Cashfree PG webhooks. Processed **synchronously** (no queue).

**Configure in Cashfree dashboard:**

```text
https://<your-host>/api/transactions/webhook/cashfree
```

Or set `PUBLIC_API_BASE_URL` in `.env` — the purchase flow sends this as `order_meta.notify_url`.

### Local testing with ngrok

1. Add your ngrok authtoken to `.env`:

   ```text
   NGROK_AUTH_TOKEN=<your-token>
   ```

2. Start the API (`npm run dev`) in one terminal, then the tunnel in another:

   ```bash
   npm run tunnel
   ```

3. Copy the printed `PUBLIC_API_BASE_URL` into `.env` (or use the same URL in the Cashfree dashboard).

### Headers (from Cashfree)

| Header                | Purpose             |
| --------------------- | ------------------- |
| `x-webhook-signature` | HMAC signature      |
| `x-webhook-timestamp` | Signature timestamp |

Signature is verified against the **raw request body** (`src/middleware/cashfreeWebhookRawBody.js`).

### Handled events

| Event                          | Action                                                                                                      |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| `PAYMENT_SUCCESS_WEBHOOK`      | Mark transaction `SUCCESS`, activate company membership, apply coupon, generate PDF invoice, email customer |
| `PAYMENT_FAILED_WEBHOOK`       | Mark `FAILED`, send failure email                                                                           |
| `PAYMENT_USER_DROPPED_WEBHOOK` | Mark `FAILED` (user abandoned checkout)                                                                     |

### Success: `200`

```json
{
  "received": true,
  "processed": true,
  "type": "PAYMENT_SUCCESS_WEBHOOK",
  "orderId": "ech_a1b2c3d4...",
  "signatureValid": true
}
```
