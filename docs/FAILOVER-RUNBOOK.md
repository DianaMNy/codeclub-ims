# Failover Runbook — Code Club IMS

Switch the frontend from the Railway backend to the Render standby during
a Railway outage, and back again once Railway recovers. Read top to
bottom, execute in order.

## Backends

- **Primary (Railway):** https://codeclub-ims-production.up.railway.app
- **Standby (Render):** https://codeclub-ims.onrender.com
- Both run identical code from `main` and share the same Supabase database
  and the same `JWT_SECRET` — users stay logged in across a switch, no
  re-auth needed.

## 1. Confirm Railway is actually down

- Check `https://codeclub-ims-production.up.railway.app/api/health`
  (curl or browser). **Down** = no response, timeout, or 5xx.
- Confirm the live app (codeclub-ims.vercel.app) shows connection errors.
- Rule out a false alarm: is it just rate limiting (**429**)? That is
  **not** an outage — do not fail over for a 429.

## 2. Wake the standby first

- Hit `https://codeclub-ims.onrender.com/api/health`.
- The first request after idle takes **~50s** (free-tier cold start) —
  wait for the `{"status":"ok"}` response before failing over, so real
  users land on an already-warm server instead of eating the cold start
  themselves.

## 3. Fail over (Vercel)

1. Vercel dashboard → `codeclub-ims` project → **Settings** →
   **Environment Variables**.
2. Find **`VITE_API_URL`** — the only frontend API base URL variable
   (used in 19 files via `import.meta.env.VITE_API_URL`).
3. Change its value to:
   ```
   https://codeclub-ims.onrender.com
   ```
   No trailing slash and no `/api` suffix — the app appends `/api` itself.
4. Redeploy the frontend: **Deployments** → latest → **Redeploy** (or push
   a commit to trigger one). Vite bakes env vars in at build time, so a
   redeploy is required — changing the variable alone does nothing until
   the next build.
5. Wait for the Vercel deploy to finish (~1–2 min).

## 4. Verify failover

- Load `codeclub-ims.vercel.app`, log in, open **Schools**, submit a test
  action (e.g. edit and save a `TEST-`-prefixed record).
- Optional, for full confirmation: `node test-suite.js standby`

## 5. Recovery (when Railway is back)

1. Confirm the Railway health endpoint returns `ok` again.
2. Reverse step 3: set `VITE_API_URL` back to
   `https://codeclub-ims-production.up.railway.app`.
3. Redeploy the frontend.
4. Verify with `node test-suite.js prod`.

## Notes

- Render's free tier sleeps after ~15 min of inactivity; the first
  request after idle is slow (~50s). Acceptable for emergency standby
  use, not for steady-state traffic.
- `TRUST_PROXY_HOPS` differs by platform — **Railway = 1** (default,
  unset), **Render = 3** (Cloudflare + Render's own proxy chain in front
  of the app, confirmed via the `/api/debug-ip` diagnosis). Do not copy
  env vars blindly between platforms — a wrong hop count either breaks
  per-IP rate limiting or opens an IP-spoofing hole.
