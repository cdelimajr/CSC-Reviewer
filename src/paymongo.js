// Online payments through PayMongo Checkout (GCash, Maya, cards, GrabPay, QR Ph for bank apps, and more).
// We create a Checkout Session, the user pays on PayMongo's page, and PayMongo calls our
// webhook when it is paid. Turned on when PAYMONGO_SECRET_KEY is set.
const crypto = require('node:crypto');

const SECRET = process.env.PAYMONGO_SECRET_KEY || '';
const WEBHOOK_SECRET = process.env.PAYMONGO_WEBHOOK_SECRET || '';
// Payment options on the checkout page. Each one must be activated on your PayMongo account,
// or PayMongo refuses the checkout. QR Ph works with most bank and e-wallet apps.
const METHODS = (process.env.PAYMONGO_PAYMENT_METHODS || 'gcash,paymaya,card,grab_pay,qrph')
  .split(',').map((s) => s.trim()).filter(Boolean);
const SIGNATURE_MAX_AGE = 10 * 60; // seconds

async function call(method, path, body) {
  const api = (process.env.PAYMONGO_API_URL || 'https://api.paymongo.com').replace(/\/$/, '');
  const r = await fetch(api + path, {
    method,
    headers: { Authorization: 'Basic ' + Buffer.from(SECRET + ':').toString('base64'), 'Content-Type': 'application/json', Accept: 'application/json' },
    body: body && JSON.stringify(body),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    const detail = (data.errors || []).map((e) => e.detail || e.code).join('; ');
    const e = new Error(`PayMongo ${r.status}: ${detail || 'error'}`);
    e.status = r.status;
    throw e;
  }
  return data.data;
}

module.exports = {
  enabled: !!SECRET,
  webhookReady: !!SECRET && !!WEBHOOK_SECRET,

  // https://developers.paymongo.com/reference/create-a-checkout
  createCheckout({ reference, amount, email, name, description, returnUrl }) {
    return call('POST', '/v1/checkout_sessions', {
      data: {
        attributes: {
          line_items: [{ currency: 'PHP', amount: Math.round(amount * 100), name: description, quantity: 1 }],
          payment_method_types: METHODS,
          description,
          reference_number: reference,
          billing: { name, email },
          send_email_receipt: true,
          show_description: true,
          show_line_items: true,
          success_url: returnUrl,
          cancel_url: returnUrl,
          metadata: { reference },
        },
      },
    });
  },

  getCheckout: (id) => call('GET', '/v1/checkout_sessions/' + encodeURIComponent(id)),

  // Paymongo-Signature: t=<time>,te=<test signature>,li=<live signature>
  // The signature is HMAC-SHA256 of "<time>.<raw body>" with the webhook's secret key.
  checkSignature(header, rawBody) {
    if (!WEBHOOK_SECRET || typeof header !== 'string' || !Buffer.isBuffer(rawBody)) return false;
    const parts = Object.fromEntries(header.split(',').map((kv) => kv.trim().split('=')));
    const t = Number(parts.t);
    if (!t || Math.abs(Date.now() / 1000 - t) > SIGNATURE_MAX_AGE) return false;
    const expected = crypto.createHmac('sha256', WEBHOOK_SECRET).update(parts.t + '.').update(rawBody).digest();
    return [parts.te, parts.li].some((sig) => {
      if (!sig || !/^[0-9a-f]+$/i.test(sig)) return false;
      const got = Buffer.from(sig, 'hex');
      return got.length === expected.length && crypto.timingSafeEqual(got, expected);
    });
  },
};
