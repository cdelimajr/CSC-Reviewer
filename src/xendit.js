// Online payments through Xendit (GCash, Maya, cards, bank transfer, and more).
// We create a Xendit Invoice, the user pays on Xendit's checkout page, and Xendit
// calls our webhook when it is paid. Turned on when XENDIT_SECRET_KEY is set.
const crypto = require('node:crypto');

const SECRET = process.env.XENDIT_SECRET_KEY || '';
const CALLBACK_TOKEN = process.env.XENDIT_CALLBACK_TOKEN || '';
// Optional: limit the payment options, e.g. "GCASH,PAYMAYA,CREDIT_CARD,BPI". Empty shows every option turned on in Xendit.
const METHODS = (process.env.XENDIT_PAYMENT_METHODS || '').split(',').map((s) => s.trim()).filter(Boolean);

async function call(method, path, body) {
  const api = (process.env.XENDIT_API_URL || 'https://api.xendit.co').replace(/\/$/, '');
  const r = await fetch(api + path, {
    method,
    headers: { Authorization: 'Basic ' + Buffer.from(SECRET + ':').toString('base64'), 'Content-Type': 'application/json' },
    body: body && JSON.stringify(body),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    const e = new Error(`Xendit ${r.status}: ${data.message || data.error_code || 'error'}`);
    e.status = r.status;
    throw e;
  }
  return data;
}

module.exports = {
  enabled: !!SECRET,
  webhookReady: !!SECRET && !!CALLBACK_TOKEN,

  // https://docs.xendit.co/apidocs/create-invoice
  createInvoice({ externalId, amount, email, name, description, returnUrl }) {
    return call('POST', '/v2/invoices', {
      external_id: externalId,
      amount,
      currency: 'PHP',
      description,
      payer_email: email,
      customer: { given_names: name, email },
      invoice_duration: 24 * 3600,
      success_redirect_url: returnUrl,
      failure_redirect_url: returnUrl,
      ...(METHODS.length ? { payment_methods: METHODS } : {}),
    });
  },

  getInvoice: (id) => call('GET', '/v2/invoices/' + encodeURIComponent(id)),

  // Xendit sends the account's callback token in the x-callback-token header.
  checkToken(token) {
    if (!CALLBACK_TOKEN || typeof token !== 'string') return false;
    const a = Buffer.from(token), b = Buffer.from(CALLBACK_TOKEN);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  },
};
