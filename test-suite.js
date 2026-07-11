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
 * Optional (enables Section 3, DB SECURITY / RLS — skipped if absent):
 *   SUPABASE_URL=<https://xxxx.supabase.co>
 *   SUPABASE_ANON_KEY=<the project's anon/public API key — legacy JWT-style
 *                       or new "sb_publishable_..." format, both work>
 *
 * Section 6 (rate limiting) intentionally trips the login rate
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
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

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

function assertCleanBody(text) {
  assert(!/\bat\s+.+\(.+:\d+:\d+\)/.test(text), `response body appears to contain a stack trace`);
  assert(!/[A-Za-z]:\\|\/(home|Users|src|node_modules)\//.test(text), `response body appears to leak an internal file path`);
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

async function request(method, urlPath, { body, raw, headers } = {}) {
  const url = `${BASE_URL}${urlPath}`;
  const options = {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
    // `raw` sends a literal string body unstringified — needed to send
    // deliberately-malformed JSON, which JSON.stringify(body) could never
    // produce since it only ever emits valid JSON.
    body: raw !== undefined ? raw : (body !== undefined ? JSON.stringify(body) : undefined),
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
  return { status: res.status, json, text, poweredBy: res.headers.get('x-powered-by') };
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
  let authToken = null;

  await runTest('Login success', async () => {
    const { status, json } = await post('/api/auth/login', { email: TEST_EMAIL, password: TEST_PASSWORD });
    assert(status === 200, `expected 200 but got ${status}`);
    assert(
      json && typeof json.token === 'string' && json.token.length > 0,
      `expected a token in the response but got ${JSON.stringify(json)}`
    );
    authToken = json.token;
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

  // ── Section 2: Input validation ─────────────────────────
  // Rate-limit budget: authLimiter (max=10/15min) is shared by IP across
  // both /api/auth/login and /api/auth/forgot-password, and counts every
  // non-2xx response — so every request in this section (all designed to
  // fail with 400) eats into the same budget Section 3 needs intact.
  // Section 1 already spent 2 failed logins. This section sends at most
  // 4 more requests to /login and routes the rest to /forgot-password,
  // keeping the running total well under 10 before Section 3 starts.
  printSection(2, 'INPUT VALIDATION');

  await runTest('Login with missing email field → 400', async () => {
    const { status, json, text } = await post('/api/auth/login', { password: 'somePassword123' });
    assert(status !== 500, `expected 400 but got 500 — server error on missing field`);
    assert(status === 400, `expected 400 but got ${status}`);
    assert(json && typeof json.error === 'string', `expected a JSON error field but got ${JSON.stringify(json)}`);
    assertCleanBody(text);
  });

  await runTest('Login with email as an object → 400', async () => {
    const { status, json, text } = await post('/api/auth/login', { email: { a: 1 }, password: 'x' });
    assert(status !== 500, `expected 400 but got 500 — server error on malformed email type`);
    assert(status === 400, `expected 400 but got ${status}`);
    assert(json && typeof json.error === 'string', `expected a JSON error field but got ${JSON.stringify(json)}`);
    assertCleanBody(text);
  });

  await runTest('Login with a 200KB password → 400', async () => {
    const hugePassword = 'a'.repeat(200 * 1024);
    const { status, json, text } = await post('/api/auth/login', { email: TEST_EMAIL, password: hugePassword });
    assert(status !== 500, `expected 400 but got 500 — server error on oversized password`);
    assert(status === 400, `expected 400 but got ${status}`);
    assert(json && typeof json.error === 'string', `expected a JSON error field but got ${JSON.stringify(json)}`);
    assertCleanBody(text);
  });

  await runTest('Login with invalid email format → 400', async () => {
    const { status, json, text } = await post('/api/auth/login', { email: 'notanemail', password: 'somePassword123' });
    assert(status !== 500, `expected 400 but got 500 — server error on invalid email format`);
    assert(status === 400, `expected 400 but got ${status}`);
    assert(json && typeof json.error === 'string', `expected a JSON error field but got ${JSON.stringify(json)}`);
    assertCleanBody(text);
  });

  await runTest('Forgot-password with missing email → 400', async () => {
    const { status, json, text } = await post('/api/auth/forgot-password', {});
    assert(status !== 500, `expected 400 but got 500 — server error on missing field`);
    assert(status === 400, `expected 400 but got ${status}`);
    assert(json && typeof json.error === 'string', `expected a JSON error field but got ${JSON.stringify(json)}`);
    assertCleanBody(text);
  });

  // The tests below are authenticated (reuse the token from "Login success"
  // above) and hit non-auth write routes (schools/visits/device-audits/
  // users), so — unlike everything above — they do NOT touch
  // /api/auth/login or /api/auth/forgot-password and do NOT consume any of
  // the authLimiter budget Section 3 needs. Every payload here is invalid
  // by construction (that's what's under test) and the Phase-2 validate()
  // middleware runs before the handler, so nothing should ever reach the
  // DB — each test still explicitly checks for a stray 2xx and fails loudly
  // with the response body (which would carry a TEST-prefixed identifier)
  // if the DB write wasn't actually blocked.
  const authHeader = () => ({ Authorization: `Bearer ${authToken}` });

  function assertNeverWritten(status, json, text) {
    if (status >= 200 && status < 300) {
      throw new Error(
        `SECURITY: invalid payload unexpectedly returned ${status} and likely created a record — ` +
        `response: ${JSON.stringify(json)}`
      );
    }
    assert(status !== 500, `expected 400 but got 500 — server error on invalid input`);
    assert(status === 400, `expected 400 but got ${status}`);
    assert(json && typeof json.error === 'string', `expected a JSON error field but got ${JSON.stringify(json)}`);
    assertCleanBody(text);
  }

  await runTest('Create school with missing required field → 400', async () => {
    const { status, json, text } = await post('/api/schools', { type: 'school', county: 'Kiambu' }, authHeader());
    assertNeverWritten(status, json, text);
  });

  await runTest('Create school with a 200KB string in a text field → 400', async () => {
    const { status, json, text } = await post('/api/schools', {
      official_name: 'TEST-huge-notes',
      type: 'school',
      county: 'Kiambu',
      notes: 'a'.repeat(200 * 1024),
    }, authHeader());
    assertNeverWritten(status, json, text);
  });

  await runTest('Create session observation with invalid pathway value → 400', async () => {
    const { status, json, text } = await post('/api/visits', {
      school_id: '00000000-0000-4000-8000-000000000000',
      date_of_visit: '2026-01-01',
      pathway_id: 'basket_weaving',
    }, authHeader());
    assertNeverWritten(status, json, text);
  });

  await runTest('Session observation with engagement_rating: "" does not produce a NaN error → 400', async () => {
    // engagement_rating: '' is what the frontend sends whenever the rating
    // dropdown is left unselected — it must be silently accepted (treated
    // as "not rated"), not rejected. Pair it with an unrelated invalid
    // field (bad pathway_id, missing school_id) so the request still 400s
    // overall without ever reaching the DB — the point of this test is
    // narrowly that engagement_rating itself contributes no error and the
    // response never mentions "NaN".
    const { status, json, text } = await post('/api/visits', {
      date_of_visit: '2026-01-01',
      engagement_rating: '',
      pathway_id: 'basket_weaving',
    }, authHeader());
    assert(!text.includes('NaN'), `response should never mention NaN for an empty engagement_rating — got: ${text}`);
    assert(
      !(json && json.details && json.details.some((d) => d.startsWith('engagement_rating'))),
      `engagement_rating: "" should not itself produce a validation error — got details: ${JSON.stringify(json && json.details)}`
    );
    assertNeverWritten(status, json, text);
  });

  await runTest('Create device audit with functioning_devices: -5 → 400', async () => {
    const { status, json, text } = await post('/api/device-audits', {
      school_id: 'TEST-fake-school',
      device_type: 'TEST-laptop',
      functioning_devices: -5,
    }, authHeader());
    assertNeverWritten(status, json, text);
  });

  await runTest('Create device audit with functioning_devices: "many" → 400', async () => {
    const { status, json, text } = await post('/api/device-audits', {
      school_id: 'TEST-fake-school',
      device_type: 'TEST-laptop',
      functioning_devices: 'many',
    }, authHeader());
    assertNeverWritten(status, json, text);
  });

  await runTest('Create user with role "superhacker" → 400', async () => {
    const { status, json, text } = await post('/api/users', {
      full_name: 'TEST-fake-user',
      email: `TEST-fake-user-${Date.now()}@example.com`,
      password: 'password123',
      role: 'superhacker',
    }, authHeader());
    assertNeverWritten(status, json, text);
  });

  // ── Section 3: DB security (RLS) ────────────────────────
  // These hit the Supabase REST API (PostgREST) directly, not our backend
  // — so they're unrelated to and don't touch the authLimiter budget.
  printSection(3, 'DB SECURITY (RLS)');

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.log(
      `${c.yellow}  SKIPPED — set SUPABASE_URL and SUPABASE_ANON_KEY in .env to enable ` +
      `(Supabase dashboard → Settings → API for this project).${c.reset}`
    );
  } else {
    // Supabase is retiring legacy JWT-based API keys in favor of new-format
    // publishable/secret keys (e.g. "sb_publishable_..."), which are opaque
    // tokens, not JWTs — no decoding/inspection of the key happens here,
    // just a plain prefix check. Legacy keys still work with both the
    // apikey and Authorization: Bearer headers, but a non-JWT sb_ key sent
    // as "Bearer <token>" risks PostgREST trying (and failing) to parse it
    // as a JWT, so Authorization is only attached for the legacy format.
    const isNewFormatKey = SUPABASE_ANON_KEY.startsWith('sb_');

    const supabaseRequest = async (method, table, query, body) => {
      const url = `${SUPABASE_URL}/rest/v1/${table}${query || ''}`;
      const headers = {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON_KEY,
      };
      if (!isNewFormatKey) {
        headers.Authorization = `Bearer ${SUPABASE_ANON_KEY}`;
      }
      let res;
      try {
        res = await fetch(url, {
          method,
          headers,
          body: body !== undefined ? JSON.stringify(body) : undefined,
        });
      } catch (err) {
        throw new Error(`could not reach ${url} — ${err.message}`);
      }
      const text = await res.text();
      let json = null;
      try { json = JSON.parse(text); } catch { /* not JSON */ }
      return { status: res.status, json, text };
    };

    const assertNoRowsExposed = async (table) => {
      const { status, json, text } = await supabaseRequest('GET', table, '?select=*');
      if (status === 401 || status === 403) return; // denied — RLS holding
      assert(status === 200, `expected 401/403 (denied) or 200 with [] but got ${status} — ${text.slice(0, 200)}`);
      assert(Array.isArray(json), `expected a JSON array for a 200 response but got ${JSON.stringify(json).slice(0, 200)}`);
      assert(
        json.length === 0,
        `SECURITY: ${table} exposed ${json.length} row(s) to an anonymous request — ${JSON.stringify(json).slice(0, 300)}`
      );
    };

    await runTest('Anonymous REST API cannot read users', async () => {
      await assertNoRowsExposed('users');
    });

    await runTest('Anonymous REST API cannot read password_reset_tokens', async () => {
      await assertNoRowsExposed('password_reset_tokens');
    });

    await runTest('Anonymous REST API cannot read chat_messages', async () => {
      await assertNoRowsExposed('chat_messages');
    });

    await runTest('Anonymous REST API cannot insert into device_audits', async () => {
      const { status, text } = await supabaseRequest('POST', 'device_audits', '', {
        school_id: 'TEST-rls-check',
        device_type: 'TEST-rls-junk',
        total_devices: 0,
      });
      if (status >= 200 && status < 300) {
        throw new Error(`SECURITY: anonymous insert into device_audits succeeded (${status}) — response: ${text.slice(0, 300)}`);
      }
      assert(
        status === 401 || status === 403,
        `expected 401 or 403 (denied) but got ${status} — ${text.slice(0, 200)}`
      );
    });
  }

  // ── Section 4: Performance ──────────────────────────────
  // Catching regressions, not micro-benchmarking — 2000ms is deliberately
  // generous because prod runs Kenya-to-EU (Railway/Supabase Stockholm)
  // over variable 4G. A single sample on that path is noisy enough to
  // false-alarm on its own (observed 1.1s-5s for the same unchanged route
  // across separate runs), so each test takes up to 3 sequential attempts
  // and passes on the first one under threshold (best-of-3), stopping as
  // soon as one lands. A genuine regression (N+1, giant payload) is slow
  // in a way that doesn't depend on network jitter, so it fails all 3
  // consistently — only transient noise gets the retries. Status is
  // checked on every attempt regardless (a wrong status is a real bug,
  // not jitter, and fails immediately without burning more attempts).
  printSection(4, 'PERFORMANCE');

  const PERF_THRESHOLD_MS = 2000;
  const PERF_MAX_ATTEMPTS = 3;

  const timedGet = async (urlPath, headers) => {
    const start = performance.now();
    const result = await get(urlPath, headers);
    const ms = Math.round(performance.now() - start);
    return { ...result, ms };
  };

  const runTimedGet = async (name, urlPath) => {
    const attempts = [];
    await runTest(name, async () => {
      for (let i = 1; i <= PERF_MAX_ATTEMPTS; i++) {
        const result = await timedGet(urlPath, authHeader());
        attempts.push(result.ms); // record timing before the status assert can throw
        assert(result.status === 200, `expected 200 but got ${result.status} (attempt ${i})`);
        if (result.ms < PERF_THRESHOLD_MS) break; // stop early on first pass
      }
      const best = Math.min(...attempts);
      assert(
        best < PERF_THRESHOLD_MS,
        `all ${attempts.length} attempt(s) exceeded ${PERF_THRESHOLD_MS}ms: ${attempts.join(', ')}ms`
      );
    });
    if (attempts.length > 0) {
      const best = Math.min(...attempts);
      console.log(`${c.dim}      (best ${best}ms of ${attempts.length}: ${attempts.join(', ')})${c.reset}`);
    }
  };

  await runTimedGet('GET /api/schools responds within 2000ms', '/api/schools');
  await runTimedGet('GET /api/teachers responds within 2000ms', '/api/teachers');
  await runTimedGet('GET /api/visits (session observations) responds within 2000ms', '/api/visits');
  await runTimedGet('GET /api/audit-logs responds within 2000ms', '/api/audit-logs');

  // ── Section 5: Error responses ──────────────────────────
  // Both tests here hit a non-auth route with the existing auth token
  // rather than /api/auth/login — sending malformed JSON to a route body-
  // parser rejects before any handler runs works identically on any route,
  // and this way neither test touches /api/auth/login or
  // /api/auth/forgot-password, so — like Section 4 — this section spends
  // nothing from the authLimiter budget Section 6 needs intact.
  printSection(5, 'ERROR RESPONSES');

  await runTest('Malformed JSON body → clean 400, not the body-parser HTML page', async () => {
    const { status, json, text, poweredBy } = await request('POST', '/api/schools', {
      raw: '{bad json',
      headers: authHeader(),
    });
    assert(status === 400, `expected 400 but got ${status}`);
    assert(!text.trim().startsWith('<'), `expected a JSON response but got HTML: ${text.slice(0, 120)}`);
    assert(json && typeof json.error === 'string', `expected a JSON error field but got ${JSON.stringify(json)}`);
    assertCleanBody(text);
    assert(!poweredBy, `expected no X-Powered-By header but got "${poweredBy}"`);
  });

  await runTest('GET nonexistent route → clean 404 JSON, not HTML', async () => {
    const { status, json, text, poweredBy } = await get('/api/route-that-does-not-exist', authHeader());
    assert(status === 404, `expected 404 but got ${status}`);
    assert(!text.trim().startsWith('<'), `expected a JSON response but got HTML: ${text.slice(0, 120)}`);
    assert(json && typeof json.error === 'string', `expected a JSON error field but got ${JSON.stringify(json)}`);
    assertCleanBody(text);
    assert(!poweredBy, `expected no X-Powered-By header but got "${poweredBy}"`);
  });

  // ── Section 6: Rate limiting (must run LAST) ────────────
  printSection(6, 'RATE LIMITING');
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
