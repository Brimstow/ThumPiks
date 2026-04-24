/**
 * Debug mertguvencli/face-swap-with-indexes output format
 */
const REPLICATE_API_KEY = process.env.REPLICATE_API_KEY;
const MODEL_VERSION = '518f2116425c40acb5c234031c55daf843c1357eff784370fe9489e57b65c150';

async function main() {
  const res = await fetch('https://api.replicate.com/v1/predictions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${REPLICATE_API_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'wait',
    },
    body: JSON.stringify({
      version: MODEL_VERSION,
      input: {
        execution_type: 'face_index',
        source_face_image: 'https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?w=400',
        destination_image: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?w=1280',
        source_face_index: 0,
        destination_face_index: 0,
      },
    }),
  });

  let p = await res.json();
  console.log('Initial status:', p.status);

  // Poll
  let polls = 0;
  while (p.status !== 'succeeded' && p.status !== 'failed' && p.status !== 'canceled') {
    await new Promise(r => setTimeout(r, 2000));
    polls++;
    const pollUrl = p.urls?.get ?? `https://api.replicate.com/v1/predictions/${p.id}`;
    const pollRes = await fetch(pollUrl, { headers: { Authorization: `Bearer ${REPLICATE_API_KEY}` } });
    p = await pollRes.json();
    process.stdout.write(`Poll ${polls}: ${p.status}\r`);
    if (polls > 120) { console.error('Timeout'); process.exit(1); }
  }

  console.log('\n=== FULL RESPONSE ===');
  console.log('Status:', p.status);
  console.log('Output type:', typeof p.output);
  console.log('Output:', JSON.stringify(p.output, null, 2));
  console.log('Logs:', p.logs);
}

main().catch(e => console.error(e.message));
