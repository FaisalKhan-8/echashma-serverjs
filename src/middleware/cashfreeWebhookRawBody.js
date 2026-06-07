/**
 * Captures raw body for Cashfree webhook signature verification.
 */
function cashfreeWebhookRawBody(req, res, next) {
  const chunks = [];
  req.on('data', (chunk) => chunks.push(chunk));
  req.on('end', () => {
    const raw = Buffer.concat(chunks);
    req.rawBody = raw.length ? raw.toString('utf8') : '';
    if (req.rawBody) {
      try {
        req.body = JSON.parse(req.rawBody);
      } catch {
        req.body = {};
      }
    } else {
      req.body = {};
    }
    next();
  });
  req.on('error', next);
}

module.exports = cashfreeWebhookRawBody;
