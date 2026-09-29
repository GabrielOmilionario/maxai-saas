const https = require('https');

function postWebhook(body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const options = {
      hostname: 'www.maxai.website',
      path: '/api/webhooks/perfectpay',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body }));
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function run() {
  const payload = {
    token: 'd6100e5300cc1a075c5385ee0f323f8d',
    code: 'CONCTEST_SIM',
    sale_status_enum: 2,
    product: { code: 'PPLQQP6O0' },
    customer: { email: 'conctest@maxai.com' }
  };

  console.log('--- Sending two simultaneous requests ---');
  const [r1, r2] = await Promise.all([
    postWebhook(payload),
    postWebhook(payload)
  ]);

  console.log(`Request A: HTTP ${r1.status} -> ${r1.body}`);
  console.log(`Request B: HTTP ${r2.status} -> ${r2.body}`);

  // Determine which got 409
  const codes = [r1.status, r2.status].sort();
  const has200 = codes.includes(200);
  const has409 = codes.includes(409);
  const hasBoth200 = r1.status === 200 && r2.status === 200;

  if (hasBoth200) {
    console.log('\n❌ FAIL: Both requests returned 200. Possible duplicate processing risk.');
  } else if (has200 && has409) {
    console.log('\n✅ PASS: One request processed (200), the other was blocked (409) for retry.');
  } else if (has409 && !has200) {
    // Both blocked — shouldn't happen but not catastrophic
    console.log('\n⚠️  WARN: Both returned non-200. Event may not have been processed. Check processed_webhooks status.');
  } else {
    console.log('\n⚠️  Unexpected status combination:', r1.status, r2.status);
  }
}

run().catch(console.error);
