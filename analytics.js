// ChromeTones — Google Analytics 4 (Measurement Protocol)
// Lightweight, privacy-friendly analytics — no cookies, no PII.

const GA_MEASUREMENT_ID = 'G-BCJM8WY8KS';
const GA_API_SECRET = '0ivXPY8QSLqhuzHOMCr_aA';
const GA_ENDPOINT = `https://www.google-analytics.com/mp/collect?measurement_id=${GA_MEASUREMENT_ID}&api_secret=${GA_API_SECRET}`;

async function getOrCreateClientId() {
  const { ga_client_id } = await chrome.storage.local.get('ga_client_id');
  if (ga_client_id) return ga_client_id;
  const id = crypto.randomUUID();
  await chrome.storage.local.set({ ga_client_id: id });
  return id;
}

async function trackEvent(eventName, params = {}) {
  try {
    const clientId = await getOrCreateClientId();
    await fetch(GA_ENDPOINT, {
      method: 'POST',
      body: JSON.stringify({
        client_id: clientId,
        events: [{ name: eventName, params }],
      }),
    });
  } catch (e) {
    // Analytics should never break the extension
  }
}
