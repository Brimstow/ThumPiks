/**
 * Quick smoke test for the new face swap pipeline.
 * Run: node test-face-swap.mjs
 */

// Use two real public human face photos (royalty-free)
const SOURCE_FACE = 'https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?w=400';
const TARGET_THUMBNAIL = 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?w=1280';

const REPLICATE_API_KEY = process.env.REPLICATE_API_KEY;
const BASE_URL = 'https://api.replicate.com/v1';

if (!REPLICATE_API_KEY) {
  console.error('❌ REPLICATE_API_KEY not set');
  process.exit(1);
}

// mertguvencli/face-swap-with-indexes — InsightFace, index-based multi-face targeting
const MODEL_NAME = 'mertguvencli/face-swap-with-indexes';
const MODEL_VERSION = '518f2116425c40acb5c234031c55daf843c1357eff784370fe9489e57b65c150';

async function runModelPrediction(version, input) {
  const endpoint = `${BASE_URL}/predictions`;
  console.log(`\n📤 POST ${endpoint}`);
  console.log('   Input keys:', Object.keys(input).join(', '));

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${REPLICATE_API_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'wait',
    },
    body: JSON.stringify({ version, input }),
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Replicate error (${res.status}): ${text}`);
  }

  let prediction = JSON.parse(text);
  console.log(`   Status: ${prediction.status}`);

  let polls = 0;
  while (prediction.status !== 'succeeded' && prediction.status !== 'failed' && prediction.status !== 'canceled') {
    await new Promise(r => setTimeout(r, 2000));
    polls++;
    const pollUrl = prediction.urls?.get ?? `${BASE_URL}/predictions/${prediction.id}`;
    const pollRes = await fetch(pollUrl, { headers: { Authorization: `Bearer ${REPLICATE_API_KEY}` } });
    prediction = await pollRes.json();
    process.stdout.write(`   Polling... (${polls}) status=${prediction.status}\r`);
    if (polls > 90) throw new Error('Timeout after 180s');
  }

  if (prediction.status === 'failed') throw new Error(prediction.error || 'Prediction failed');
  return prediction;
}

async function main() {
  console.log('🧪 Face Swap Pipeline Smoke Test');
  console.log('='.repeat(50));
  console.log(`   Key: ${REPLICATE_API_KEY.slice(0, 8)}...`);

  try {
    // Step 1: mertguvencli/face-swap-with-indexes
    console.log('\n── Step 1: InsightFace swap ──');
    const t1 = Date.now();
    const swap = await runModelPrediction(MODEL_VERSION, {
      execution_type:         'face_index',
      source_face_image:      SOURCE_FACE,
      destination_image:      TARGET_THUMBNAIL,
      source_face_index:      0,
      destination_face_index: 0,
    });
    const elapsed1 = ((Date.now() - t1) / 1000).toFixed(1);
    const swappedUrl = Array.isArray(swap.output) ? swap.output[0] : swap.output;
    console.log(`\n✅ InsightFace done in ${elapsed1}s`);
    console.log(`   Output URL: ${swappedUrl}`);

    console.log('\n🎉 Pipeline test PASSED');
    console.log('='.repeat(50));
    console.log('Result:', swappedUrl);

  } catch (err) {
    console.error('\n❌ Test FAILED:', err.message);
    process.exit(1);
  }
}

main();
