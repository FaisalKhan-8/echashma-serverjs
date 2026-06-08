const crypto = require('crypto');
const { AppError } = require('../errors/AppError');

const CASHFREE_API_VERSION = '2025-01-01';

function readEnv(key) {
  const value = process.env[key];
  if (value != null && String(value).trim() !== '') {
    return String(value).trim();
  }
  return '';
}

function getCashfreeClientId() {
  return readEnv('CASHFREE_CLIENT_ID');
}

function getCashfreeClientSecret() {
  return readEnv('CASHFREE_CLIENT_SECRET');
}

function getBaseUrl() {
  const env = readEnv('CASHFREE_ENV').toLowerCase() || 'sandbox';
  return env === 'production'
    ? 'https://api.cashfree.com/pg'
    : 'https://sandbox.cashfree.com/pg';
}

function getClientId() {
  return getCashfreeClientId();
}

function getCashfreeCredentials() {
  const clientId = getCashfreeClientId();
  const clientSecret = getCashfreeClientSecret();
  if (!clientId || !clientSecret) {
    throw new AppError(
      'Cashfree is not configured. Set CASHFREE_CLIENT_ID and CASHFREE_CLIENT_SECRET in .env and restart the server.',
      500
    );
  }
  return { clientId, clientSecret };
}

function getCashfreeHeaders(clientId, clientSecret, withJson = false) {
  return {
    ...(withJson ? { 'Content-Type': 'application/json' } : {}),
    'x-api-version': CASHFREE_API_VERSION,
    'x-client-id': clientId,
    'x-client-secret': clientSecret,
  };
}

async function cashfreeRequest(path, options = {}) {
  const { clientId, clientSecret } = getCashfreeCredentials();
  const url = `${getBaseUrl()}${path}`;
  const headers = getCashfreeHeaders(clientId, clientSecret, options.method === 'POST');
  const maxAttempts = 3;
  let lastNetworkError = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const res = await fetch(url, {
        method: options.method || 'GET',
        headers: { ...headers, ...(options.headers || {}) },
        body: options.body,
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const msg =
          data?.message ||
          data?.error?.message ||
          JSON.stringify(data) ||
          res.statusText;
        throw new AppError(`Cashfree request failed: ${msg}`, 500);
      }

      return data;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      lastNetworkError = error;
      const cause = error.cause?.code || error.cause?.message || error.cause;
      const detail = cause ? ` (${cause})` : '';
      const isLastAttempt = attempt === maxAttempts;

      if (!isLastAttempt) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 500));
        continue;
      }

      throw new AppError(
        `Cashfree request failed: could not reach ${getBaseUrl()}${detail}. Check your internet connection and DNS, then retry.`,
        500
      );
    }
  }

  throw lastNetworkError;
}

function normalizeCustomerPhone(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  if (digits.length >= 10) {
    return digits.slice(-10);
  }
  throw new AppError(
    'Billing phone must contain at least 10 digits for Cashfree checkout',
    400
  );
}

async function getOrder(orderId) {
  return cashfreeRequest(`/orders/${encodeURIComponent(orderId)}`);
}

async function getOrderPayments(orderId) {
  return cashfreeRequest(`/orders/${encodeURIComponent(orderId)}/payments`);
}

async function createOrder(params) {
  const amount = Number(Number(params.orderAmount).toFixed(2));
  if (amount < 1) {
    throw new AppError('Order amount must be at least 1 INR for Cashfree', 400);
  }

  const body = {
    order_id: params.orderId,
    order_amount: amount,
    order_currency: params.orderCurrency || 'INR',
    customer_details: {
      customer_id: params.customerReferenceId.slice(0, 50),
      customer_name: params.customerName.slice(0, 100),
      customer_email: params.customerEmail,
      customer_phone: params.customerPhone,
    },
    order_meta: {
      return_url: params.returnUrl,
      ...(params.notifyUrl ? { notify_url: params.notifyUrl } : {}),
    },
  };

  if (params.orderNote) {
    body.order_note = params.orderNote.slice(0, 200);
  }

  return cashfreeRequest('/orders', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

function verifyWebhookSignature(signatureHeader, rawBody, timestampHeader) {
  if (!signatureHeader || !timestampHeader) {
    return false;
  }
  const secret = getCashfreeClientSecret();
  if (!secret) {
    return false;
  }
  const signStr = `${timestampHeader}${rawBody}`;
  const generated = crypto
    .createHmac('sha256', secret)
    .update(signStr)
    .digest('base64');
  return generated === signatureHeader;
}

function getCashfreePaymentFailedMessageFromWebhookData(data) {
  if (!data || typeof data !== 'object') {
    return 'Cashfree payment failed';
  }

  const payment = data.payment;

  const fromErrorDetails = (details) => {
    if (!details || typeof details !== 'object') return null;
    if (typeof details.error_reason === 'string' && details.error_reason.trim()) {
      return details.error_reason.trim();
    }
    if (typeof details.error_description === 'string' && details.error_description.trim()) {
      return details.error_description.trim();
    }
    return null;
  };

  const fromDetails =
    fromErrorDetails(payment?.error_details) ||
    fromErrorDetails(data.error_details) ||
    null;
  if (fromDetails) return fromDetails;

  if (typeof payment?.error_reason === 'string' && payment.error_reason.trim()) {
    return payment.error_reason.trim();
  }

  if (typeof payment?.payment_message === 'string' && payment.payment_message.trim()) {
    return payment.payment_message.trim();
  }

  return 'Cashfree payment failed';
}

module.exports = {
  createOrder,
  getOrder,
  getOrderPayments,
  verifyWebhookSignature,
  normalizeCustomerPhone,
  getClientId,
  getCashfreePaymentFailedMessageFromWebhookData,
};
