#!/usr/bin/env node
/**
 * Code Club IMS — API Test Suite
 * ────────────────────────────────────────────────────────────
 * Plain Node script (no test framework) that exercises the live
 * backend API and prints a terminal PASS/FAIL report.
 *
 * Usage:
 *   node test-suite.js local   → tests http://localhost:5000 (default)
 *   node test-suite.js prod    → tests https://codeclub-ims-production.up.railway.app
 *
 * Requires (repo root .env, or backend/.env as a fallback):
 *   TEST_EMAIL=<email of a real, active user>
 *   TEST_PASSWORD=<that user's password>
 *
 * Section 2 (rate limiting) intentionally trips the login rate
 * limiter and will get this machine's IP blocked for ~15 minutes —
 * run it last, and don't run the suite repeatedly back-to-back.
 *
 * Exit code is 1 if any test failed, 0 if all passed.
 */

const path = require('path');

require('dotenv').config({ quiet: true });
if (!process.env.TEST_EMAIL || !process.env.TEST_PASSWORD) {
  require('dotenv').config({ path: path.join(__dirname, 'backend', '.env'), quiet: true });
}

const TEST_EMAIL = process.env.TEST_EMAIL;
const TEST_PASSWORD = process.env.TEST_PASSWORD;

const TARGETS = {
  local: 'http://127.0.0.1:5000',
  prod: 'https://codeclub-ims-production.up.railway.app',
};

const targetArg = (process.argv[2] || 'local').toLowerCase();
const BASE_URL = TARGETS[targetArg];

const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
};

if (!BASE_URL) {
  console.error(`Unknown target "${targetArg}". Use "local" or "prod" (or omit for local).`);
  process.exit(1);
}

if (typeof fetch !== 'function') {
  console.error('global fetch is not available — this script requires Node 18+.');
  process.exit(1);
}

if (!TEST_EMAIL || !TEST_PASSWORD) {
  console.error(
    'Missing TEST_EMAIL and/or TEST_PASSWORD.\n' +
    'Add them to a .env file at the repo root (or backend/.env):\n\n' +
    '  TEST_EMAIL=someone@example.com\n' +
    '  TEST_PASSWORD=theirRealPassword\n\n' +
    'These must belong to a real, active user in the database.'
  );
  process.exit(1);
}

// ── Report helpers ──────────────────────────────────────────

const results = [];

function printSection(n, title) {
  const label = ` ${n}. ${title} `;
  const dashes = '─'.repeat(Math.max(3, 44 - label.length));
  console.log(`\n───${label}${dashes}`);
}

function assert(cond, message) {
  if (!cond) throw new Error(message);
}

async function runTest(name, fn) {
  try {
    await fn();
    results.push({ name, pass: true });
    console.log(`  ${c.green}✅ PASS${c.reset}  ${name}`);
  } catch (err) {
    results.push({ name, pass: false, message: err.message });
    console.log(`  ${c.red}❌ FAIL${c.reset}  ${name} — ${err.message}`);
  }
}

// ── HTTP helpers ────────────────────────────────────────────

async function request(method, urlPath, { body, headers } = {}) {
  const url = `${BASE_URL}${urlPath}`;
  const options = {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  };
  let res;
  try {
    res = await fetch(url, options);
  } catch (err) {
    try {
      res = await fetch(url, options); // one automatic retry on network error only
    } catch (err2) {
      throw new Error(`could not reach ${url} — ${err2.message} (is the server running?)`);
    }
  }
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* not JSON */ }
  return { status: res.status, json, text };
}

const post = (urlPath, body, headers) => request('POST', urlPath, { body, headers });
const get = (urlPath, headers) => request('GET', urlPath, { headers });

async function waitForServer() {
  const healthUrl = `${BASE_URL}/api/health`;
  for (let i = 1; i <= 10; i++) {
    try {
      await fetch(healthUrl);
      console.log(`${c.dim}Server is up — starting tests${c.reset}`);
      return;
    } catch {
      if (i < 10) await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  console.error(`Server unreachable at ${BASE_URL} — is it running?`);
  process.exit(1);
}

// ── Main ─────────────────────────────────────────────────────

(async () => {
  console.log(`${c.bold}Code Club IMS — API Test Suite${c.reset}`);
  console.log(`Target: ${BASE_URL}`);
  console.log(`Test data prefix: "TEST-"`);

  await waitForServer();

  // ── Section 1: Auth ──────────────────────────────────────
  printSection(1, 'AUTH');

  let wrongPasswordMessage = null;

  await runTest('Login success', async () => {
    const { status, json } = await post('/api/auth/login', { email: TEST_EMAIL, password: TEST_PASSWORD });
    assert(status === 200, `expected 200 but got ${status}`);
    assert(
      json && typeof json.token === 'string' && json.token.length > 0,
      `expected a token in the response but got ${JSON.stringify(json)}`
    );
  });

  await runTest('Login wrong password rejected', async () => {
    const { status, json } = await post('/api/auth/login', {
      email: TEST_EMAIL,
      password: `${TEST_PASSWORD}-wrong`,
    });
    assert(status !== 200, `expected rejection but got 200 (login succeeded with a wrong password!)`);
    assert(status !== 500, `expected 401/400 but got 500 — server error instead of a clean rejection`);
    assert(status === 401 || status === 400, `expected 401 or 400 but got ${status}`);
    wrongPasswordMessage = (json && (json.error || json.message)) || '';
  });

  await runTest('Login with non-existent email rejected', async () => {
    const fakeEmail = `TEST-nonexistent-${Date.now()}@example.com`;
    const { status, json } = await post('/api/auth/login', { email: fakeEmail, password: 'SomePassword123!' });
    assert(status !== 500, `expected 401/400 but got 500 — server error`);
    assert(status === 401 || status === 400, `expected 401 or 400 but got ${status}`);
    const message = (json && (json.error || json.message)) || '';
    const revealing = /not (found|exist)|no (such )?(user|account)|does(n't| not) exist/i.test(message);
    assert(!revealing, `error message may reveal that the email doesn't exist — got "${message}"`);
    if (wrongPasswordMessage) {
      assert(
        message === wrongPasswordMessage,
        `expected the same generic message as the wrong-password case (no email enumeration) but got "${message}" vs "${wrongPasswordMessage}"`
      );
    }
  });

  await runTest('Protected route without token rejected', async () => {
    const { status } = await get('/api/schools');
    assert(status === 401, `expected 401 but got ${status}`);
  });

  await runTest('Protected route with garbage token rejected', async () => {
    const { status } = await get('/api/schools', { Authorization: 'Bearer abc123' });
    assert(status !== 500, `expected 401 but got 500 — server error on an invalid token`);
    assert(status === 401, `expected 401 but got ${status}`);
  });

  // ── Section 2: Rate limiting (must run LAST) ────────────
  printSection(2, 'RATE LIMITING');
  console.log(
    `${c.yellow}⚠  Warning: this section sends repeated failed logins and will get this ` +
    `IP rate-limited for ~15 minutes once it trips.${c.reset}`
  );

  let rateLimited = false;
  let rateLimitBody = '';
  let rateLimitAttempt = null;
  const statusesSeen = [];

  await runTest('Repeated failed logins trigger rate limiting (429)', async () => {
    const fakeEmail = `TEST-ratelimit-${Date.now()}@example.com`;
    for (let i = 1; i <= 15; i++) {
      const { status, text } = await post('/api/auth/login', { email: fakeEmail, password: 'WrongPassword123!' });
      statusesSeen.push(status);
      if (status === 429) {
        rateLimited = true;
        rateLimitBody = text;
        rateLimitAttempt = i;
        break;
      }
      assert(
        status === 401 || status === 400,
        `attempt ${i}: expected 401 (or 429 once rate-limited) but got ${status}`
      );
    }
    assert(
      rateLimited,
      `sent 15 failed logins, all returned 401/400 and no 429 ever appeared — rate limiting does not ` +
      `appear to be active (statuses: ${statusesSeen.join(', ')})`
    );
  });

  if (rateLimited) {
    console.log(`${c.dim}      (429 received on attempt ${rateLimitAttempt}/15)${c.reset}`);
  }

  await runTest('429 response is clean JSON with no stack trace or internal paths', async () => {
    assert(rateLimited, `skipped — no 429 response was captured (previous test failed)`);
    let parsed;
    try {
      parsed = JSON.parse(rateLimitBody);
    } catch {
      throw new Error(`429 response body is not valid JSON: ${rateLimitBody.slice(0, 200)}`);
    }
    const hasMessage = typeof parsed.error === 'string' || typeof parsed.message === 'string';
    assert(hasMessage, `expected an error/message field in the 429 body but got ${JSON.stringify(parsed)}`);
    assert(
      !/\bat\s+.+\(.+:\d+:\d+\)/.test(rateLimitBody),
      `429 response body appears to contain a stack trace`
    );
    assert(
      !/[A-Za-z]:\\|\/(home|Users|src|node_modules)\//.test(rateLimitBody),
      `429 response body appears to leak an internal file path`
    );
  });

  // ── Summary ──────────────────────────────────────────────
  const passed = results.filter(r => r.pass).length;
  const failed = results.length - passed;

  console.log('\n' + '─'.repeat(44));
  console.log(
    `${c.bold}Summary:${c.reset} ${c.green}${passed} passed${c.reset}, ` +
    `${failed > 0 ? c.red : c.green}${failed} failed${c.reset} (${results.length} total)`
  );

  if (failed > 0) {
    process.exitCode = 1;
  }
})();
