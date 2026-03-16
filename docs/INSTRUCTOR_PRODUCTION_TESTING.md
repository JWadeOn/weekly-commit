# Instructor Guide: Testing in Production

What you need to test the Weekly Commit app in the **deployed (production)** environment.

---

## 1. URLs you need

| What | Example | Notes |
|------|---------|--------|
| **App (host)** | `https://your-app.up.railway.app` | **This is the frontend URL.** Open this in the browser. Sign In / Sign Up live here. The remote MFE is loaded by the host; you don’t open the remote URL directly. |
| **API** | Same origin `/api/*` or separate URL | If the host is behind a reverse proxy, `/api` may be proxied; otherwise the deployer will give you the API URL. |

**Current production (Railway):**

| What | URL |
|------|-----|
| **Host (frontend)** | https://lavish-integrity-production-4e45.up.railway.app |
| **Remote** | https://faithful-intuition-production-2773.up.railway.app |
| **Backend (API)** | https://weekly-commit-production.up.railway.app |

Instructors open the **host** URL. **FRONTEND_URL** and Auth0 **Allowed Logout URLs** must be set to the host URL above (not the remote).

---

## 2. Demo users (must exist in Auth0 / IdP)

The app has **no built-in passwords**. All sign-in goes through the identity provider (e.g. Auth0). For the demo flow you need these **users created in the IdP** with known passwords:

| Role | Email | Use in demo |
|------|--------|-------------|
| Team 1 Manager | `team1-manager@example.com` | Strategy, My Team, Outcome Pulse |
| Team 1 Employee 1 | `team1-e1@example.com` | My Week, add items, lock, reconcile |
| Admin | `admin@example.com` | Admin step (optional) |

Full list for import/reference: [`docs/demo-users-import.json`](demo-users-import.json) (Team 1 & 2 manager + employees, admin).

**You need:**  
- These users created in Auth0 (or the same IdP the production app uses).  
- **Passwords** for at least `team1-manager@example.com` and `team1-e1@example.com` so you can sign in during the demo.

The deployer may provide a table of **email + password** for instructors, or you create the users in Auth0 and set passwords yourself.

---

## 3. Auth0 / IdP setup (for deployer; good to verify)

If **Sign In** or **Sign Out** misbehaves, the deployer should confirm:

| Item | Where | What |
|------|--------|------|
| **Allowed Callback URLs** | Auth0 Application → Settings | Must include the **redirect URI** the backend uses, e.g. `https://your-api.up.railway.app/login/oauth2/code/oidc`. |
| **Allowed Logout URLs** | Auth0 Application → Settings | Must include the **exact host URL** (the app users open in the browser), e.g. `https://your-app.up.railway.app` (no trailing slash unless the app uses one). **Not** the remote URL — the host is the frontend. If this is missing, **Sign Out** returns 400. |
| **CORS / FRONTEND_URL** | Backend env | Backend must have **`FRONTEND_URL`** set to the **host** URL (same as above). The backend redirects after login and uses this for logout `returnTo`. Do **not** use the remote URL here. Otherwise you can get **401** after Sign In. |

Details: [Deployment Guide §6 Troubleshooting](DEPLOYMENT.md#6-troubleshooting).

---

## 4. Quick test flow (production)

1. Open the **host URL** in a browser.
2. Click **Sign In** → log in as `team1-e1@example.com` (or the test user you have a password for).
3. Go to **My Week** (or The Board → My Week). You should see the current week’s commit (or “Plan next week” on weekends).
4. Add a commit item: pick an Outcome and a Chess piece, save. Submit the week so it shows **LOCKED**.
5. Click **Start Early Reconciliation** → set completion status on items → **Complete reconciliation**.
6. **Sign Out** → sign in as `team1-manager@example.com`. Go to **My Team** and confirm you see the employee and their commit; check **Outcome Pulse** and alignment.

Full script and talking points: [Demo Workflow](DEMO_WORKFLOW.md).

---

## 5. Common issues

| Symptom | Likely cause | Who fixes |
|--------|----------------|-----------|
| **401** right after Sign In | Cookie not sent cross-origin; wrong or missing `FRONTEND_URL` / CORS | Deployer: set `FRONTEND_URL` and `CORS_ALLOWED_ORIGINS` |
| **Sign Out** gives 400 | Auth0 **Allowed Logout URLs** does not include the app URL | Deployer: add app URL in Auth0 |
| “No users” / empty Strategy | DB not seeded or different IdP; users must exist in IdP and (after first login) in app DB | Deployer: run migrations + seed; ensure demo users exist in IdP |
| Can’t log in | User not in IdP or wrong password | Create user in Auth0 and set password; or get credentials from deployer |

---

## 6. Optional: automated smoke / E2E

- **HTTP smoke:** [`scripts/smoke-test-deployed.sh`](../scripts/smoke-test-deployed.sh) — health, auth/me 401, remote entry, host. Set `BACKEND_URL`, `HOST_URL`, (optional) `REMOTE_URL`.
- **Playwright E2E:** [`e2e/`](../e2e/) — full browser tests with login. Requires `BASE_URL`, `E2E_TEST_USER_EMAIL`, `E2E_TEST_USER_PASSWORD`. See [Production Testing](PRODUCTION_TESTING.md).

---

**Summary for instructors:** Get the **production app URL** and **demo user emails + passwords** (for Auth0). Open the app → Sign In → run through My Week (add items, lock, reconcile) and My Team (manager view). If Sign Out returns 400, the deployer must add the app URL to Auth0 Allowed Logout URLs.
