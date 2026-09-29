const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || 'http://localhost:3000';

async function fetchJson(url) {
  const response = await fetch(url, { headers: { accept: 'application/json' } });
  const text = await response.text();
  let payload;

  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    payload = { raw: text };
  }

  return { response, payload };
}

async function main() {
  const checks = [
    { name: 'health', url: `${appUrl}/api/health` },
    { name: 'benchmark', url: `${appUrl}/api/benchmark` },
  ];

  const results = [];

  for (const check of checks) {
    const { response, payload } = await fetchJson(check.url);
    const ok =
      response.ok ||
      (response.status === 503 &&
        payload &&
        typeof payload === 'object' &&
        'status' in payload &&
        typeof payload.status === 'string');
    results.push({ name: check.name, ok, status: response.status, payload });
  }

  const hasFailures = results.some((result) => !result.ok);

  console.log(`Production smoke check for ${appUrl}`);
  for (const result of results) {
    console.log(`${result.name}: ${result.ok ? 'PASS' : 'FAIL'} (${result.status})`);
  }

  if (hasFailures) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error('Production smoke check failed unexpectedly:', error);
  process.exit(1);
});
