/**
 * End-to-end test: login → face-swap endpoint → verify response
 */
import http from 'http';

function post(path, body, cookies) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const opts = {
      hostname: 'localhost',
      port: 8550,
      path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        ...(cookies ? { Cookie: cookies } : {}),
      },
    };
    const req = http.request(opts, res => {
      let buf = '';
      res.on('data', d => buf += d);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, headers: res.headers, body: JSON.parse(buf) }); }
        catch { resolve({ status: res.statusCode, headers: res.headers, body: buf }); }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function main() {
  // 1. Login
  console.log('1️⃣  Logging in as tester1...');
  const login = await post('/api/auth/login', {
    email: 'tester1@example.com',
    password: 'Test123!',
  });
  console.log('   Status:', login.status);
  if (login.status !== 200) {
    console.error('   ❌ Login failed:', login.body);
    process.exit(1);
  }
  const cookies = login.headers['set-cookie']?.map(c => c.split(';')[0]).join('; ') || '';
  console.log('   ✅ Logged in, cookies:', cookies.slice(0, 40) + '...');

  // 2. Face swap (fofr/face-swap-with-ideogram)
  console.log('\n2️⃣  Calling /api/thumbnails/ai/face-swap...');
  const t = Date.now();
  const swap = await post('/api/thumbnails/ai/face-swap', {
    sourceImage: 'https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?w=400',
    targetImage: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?w=1280',
    targetFaceIndex: 0,
  }, cookies);
  const elapsed = ((Date.now() - t) / 1000).toFixed(1);

  console.log(`   Status: ${swap.status} (${elapsed}s)`);
  console.log('   Body:', JSON.stringify(swap.body, null, 2));

  if (swap.status === 200 && swap.body.success) {
    console.log('\n✅ END-TO-END TEST PASSED');
    console.log('   Pipeline:', swap.body.pipeline);
    console.log('   Image URL:', swap.body.images?.[0]);
  } else {
    console.error('\n❌ TEST FAILED');
    process.exit(1);
  }
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
