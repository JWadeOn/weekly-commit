# Deployment Guide: Weekly Commit Module

This document describes how to deploy the Weekly Commit Module to a production or staging environment. The app consists of: **PostgreSQL**, **Backend API** (Java 21), **Remote MFE** (React), and **Host** (React shell). Auth is OAuth 2.0; in production you use a real IdP (e.g. Okta, Auth0, Keycloak), not the mock server.

---

## 1. Deployment Options

### Option A: Single-domain reverse proxy (recommended)

Serve everything under one origin so the browser only talks to one hostname:

- **Origin:** `https://weekly-commit.example.com`
- **Routes:**
  - `/` → Host (SPA)
  - `/assets/remoteEntry.js` (and remote assets) → Remote MFE static files (or proxy to remote service)
  - `/api/*` → Backend API (proxy to Java app)

**Benefits:** No CORS; same-site cookies work; one SSL cert. The frontend can use relative URLs for the API (e.g. `/api/auth/me`), so you don’t need to configure API base URL per environment.

**Setup:** Run backend, remote, and host as separate services; put Nginx (or Traefik/Caddy) in front and proxy by path. Host and remote are built with the same public path (e.g. `/` and `/assets/` served from one or two static roots).

### Option B: Separate hosts (API + frontend on different domains)

- **API:** `https://api-weekly.example.com`
- **Host:** `https://app-weekly.example.com`
- **Remote:** `https://remote-weekly.example.com` (or same as host if you bundle remote into host build)

**Requirements:**

- Backend CORS must allow the host (and remote) origins.
- Cookie: backend sets JWT cookie for the API domain; host/remote must send `credentials: 'include'`. For cross-origin cookies to work, use **same-site=None; Secure** and ensure the IdP and API cookie domains are correct (often same parent domain or explicit domain).
- **API base URL** must be configurable: set `VITE_API_URL` (or equivalent) at build time for host and remote so they call `https://api-weekly.example.com` instead of localhost.

### Option C: Docker Compose on a single server

Run the full stack with Docker Compose; use a reverse proxy (Nginx or Traefik) on the host to terminate SSL and route to containers. Replace mock OAuth with real OAuth env vars and use a managed or containerized Postgres.

---

## 2. Production Checklist

### 2.1 Infrastructure

| Component | Notes |
|-----------|--------|
| **PostgreSQL** | 15+; persistent volume; run migrations via Flyway on backend startup (no separate migration step). |
| **Backend** | Java 21 JRE; needs `DB_*`, `OAUTH_*`, `JWT_SECRET`, `FRONTEND_URL`. |
| **Remote** | Static files (e.g. Nginx); must be reachable at `REMOTE_URL` (browser-facing) for Module Federation. |
| **Host** | Static files; build with `REMOTE_URL` = browser-facing URL of the remote (e.g. `https://weekly-commit.example.com/assets` if remote is served under same domain). |
| **OAuth** | Use a real OIDC provider; register redirect URI `https://<api-domain>/login/oauth2/code/oidc`. |

### 2.2 Environment variables

**Backend (required in production):**

| Variable | Description | Example |
|----------|-------------|---------|
| `DB_URL` | JDBC URL (or use `DATABASE_URL` on Railway; see below) | `jdbc:postgresql://postgres:5432/weeklycommit` |
| `DB_USERNAME` | DB user (or `PGUSER` on Railway) | — |
| `DB_PASSWORD` | DB password (or `PGPASSWORD` on Railway) | — |
| `OAUTH_CLIENT_ID` | From your IdP | — |
| `OAUTH_CLIENT_SECRET` | From your IdP | — |
| `OAUTH_ISSUER_URI` | OIDC issuer (discovery) | `https://auth.example.com/realms/myorg` |
| `OAUTH_AUTHORIZATION_URI` | Browser-facing auth URL | Same as issuer’s `authorization_endpoint` or override if different |
| `OAUTH_JWK_SET_URI` | JWK set for token validation | Same as issuer’s `jwks_uri` or override |
| `OAUTH_REDIRECT_URI` | Registered redirect URI | `https://api-weekly.example.com/login/oauth2/code/oidc` |
| `JWT_SECRET` | Strong secret for internal JWT (HS256) | Long random string |
| `JWT_EXPIRY_HOURS` | JWT lifetime | `24` |
| `FRONTEND_URL` | Origin of the host app (for redirects) | `https://app-weekly.example.com` |
| `CORS_ALLOWED_ORIGINS` | Comma-separated origins for CORS (host + remote in production) | `https://app-weekly.example.com,https://remote.example.com` |

**Host build (build-time only):**

| Variable | Description | Example |
|----------|-------------|---------|
| `REMOTE_URL` | Browser-facing URL of remote entry | `https://weekly-commit.example.com/assets` (no trailing slash) |
| `VITE_API_URL` | Optional; API base URL if not same origin | `https://api-weekly.example.com` |

**Remote build (build-time only):**

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_API_URL` | API base URL (origin + path to API) | `https://api-weekly.example.com` or leave empty for relative `/api` |

If you use **Option A** (single domain), set `VITE_API_URL` to empty or `/` so the app uses relative `/api` and you don’t need to change it per environment.

**Railway Postgres:** If you add the Postgres plugin and reference it from the backend service, Railway sets `DATABASE_URL` (e.g. `postgresql://user:pass@host:port/railway`). The backend accepts this: it normalizes any URL that does not start with `jdbc:` to `jdbc:postgresql://...` and uses `PGUSER` / `PGPASSWORD` when `DB_USERNAME` / `DB_PASSWORD` are not set. You do **not** need to set `DB_URL` manually when using Railway's Postgres reference.

**Railway — OAuth required:** The backend defaults to the **local mock OAuth server** (`http://localhost:8090`). In production you **must** set all OAuth variables to a real OIDC provider (Auth0, Okta, Keycloak, Google, etc.), otherwise the app will fail on startup with *"Unable to resolve Configuration with the provided Issuer of http://localhost:8090"*. In the Railway backend service, set at least:

- `OAUTH_ISSUER_URI` — your IdP’s issuer (e.g. `https://your-tenant.auth0.com/` or `https://your-domain.okta.com/oauth2/default`)
- `OAUTH_CLIENT_ID` and `OAUTH_CLIENT_SECRET` — from the IdP app
- `OAUTH_REDIRECT_URI` — `https://<your-backend>.up.railway.app/login/oauth2/code/oidc`
- `OAUTH_AUTHORIZATION_URI` and `OAUTH_JWK_SET_URI` — from your IdP’s OIDC discovery (often the same as issuer’s `authorization_endpoint` and `jwks_uri`)

Register the redirect URI in your IdP. See [§6 Troubleshooting](#6-troubleshooting) for the "Unable to resolve Configuration" error.

---

## Implementation plan: Production OAuth (Auth0)

Use this as a step-by-step checklist to enable production login with Auth0 (or any OIDC IdP). No code changes are required in this repo; the backend already supports OIDC via environment variables.

### Phase 1: Auth0 setup (external)

1. **Create an Auth0 account** (if needed) at [auth0.com](https://auth0.com).
2. **Create an Application** in the Auth0 Dashboard: Applications → Create Application → choose **Regular Web Application** → Create.
3. **Note the Application credentials:** Client ID and Client Secret (from the Application’s Settings tab).
4. **Set the callback URL:** In the Application → Settings → Application URIs, set **Allowed Callback URLs** to:
   ```text
   https://<your-backend-host>/login/oauth2/code/oidc
   ```
   Use your real backend URL (e.g. `https://your-service.up.railway.app/login/oauth2/code/oidc`). No trailing slash.
5. **Note your Auth0 issuer:** It is `https://<your-tenant>.auth0.com/` (tenant name is in the Auth0 Dashboard URL or under Settings → Tenant).

### Phase 2: Backend environment variables (e.g. Railway)

A production env template is in the repo root [`.env.example`](../.env.example) (see the “Production (e.g. Auth0)” section). Use it as a checklist.

6. **Set these variables** on the **backend** service (Railway → your backend service → Variables):

   | Variable | Value |
   |----------|--------|
   | `OAUTH_ISSUER_URI` | `https://<your-tenant>.auth0.com/` |
   | `OAUTH_CLIENT_ID` | From Auth0 Application |
   | `OAUTH_CLIENT_SECRET` | From Auth0 Application |
   | `OAUTH_REDIRECT_URI` | `https://<your-backend-host>/login/oauth2/code/oidc` |
   | `JWT_SECRET` | Long random string (for the app’s own JWT cookie) |
   | `FRONTEND_URL` | URL of your host app (e.g. `https://your-host.up.railway.app`) |
   | `CORS_ALLOWED_ORIGINS` | Comma-separated host (and remote) origins |

   Also set the following so the backend does not use localhost defaults:
   - `OAUTH_AUTHORIZATION_URI` = `https://<your-tenant>.auth0.com/authorize`
   - `OAUTH_JWK_SET_URI` = `https://<your-tenant>.auth0.com/.well-known/jwks.json`

7. **Redeploy the backend** so it picks up the new variables. The app should start and use Auth0 instead of `localhost:8090`.

### Phase 3: User mapping (choose one approach)

8. **Option A — findOrCreate only (simplest):**  
   Any user who signs in via Auth0 will be created in the app’s database with the default org and **EMPLOYEE** role (`OAuthUserService`). To test manager flows, add the **MANAGER** role for that user in the database (e.g. insert into `user_roles` or run a one-off SQL script).

9. **Option B — Align with seed users (optional):**  
   To use the same personas as local dev (e.g. manager@acme.com, employee@acme.com):
   - Create users in Auth0 with those emails and note the Auth0 user IDs (Auth0 Dashboard → User Management → Users; the ID is the `sub` claim, e.g. `auth0|xxxxxxxx`).
   - Update the seed users in the database so their `oauth_subject` matches the Auth0 subject. A template script is in [`docs/scripts/link-auth0-users.sql.example`](scripts/link-auth0-users.sql.example)—copy it, replace the placeholders with your Auth0 user IDs, then run it against your production DB. The next login will find the existing user and keep their roles (MANAGER, EMPLOYEE, etc.).

### Phase 4: Frontend and CORS

10. **Ensure the host (and remote) are built** with the correct `VITE_API_URL` (your backend URL) if they are on a different domain than the backend. See [Sign-in redirects to the host URL and gets stuck](#sign-in-redirects-to-the-host-url-and-gets-stuck) if Sign In does not redirect to the IdP.
11. **Verify CORS:** `CORS_ALLOWED_ORIGINS` must include the exact origin(s) of your host and remote (e.g. `https://your-host.up.railway.app`).

### Phase 5: Verify

12. **Open the host app** in a browser, click Sign In, and complete the Auth0 login. You should be redirected back to the app with a session (JWT cookie). Check that you can hit protected endpoints (e.g. `/api/auth/me`) and that the app shows the correct view (IC vs manager) based on roles.

### Summary checklist

- [ ] Auth0 application created (Regular Web Application)
- [ ] Allowed Callback URL set in Auth0 to backend `/login/oauth2/code/oidc`
- [ ] Backend env: `OAUTH_ISSUER_URI`, `OAUTH_CLIENT_ID`, `OAUTH_CLIENT_SECRET`, `OAUTH_REDIRECT_URI`, `JWT_SECRET`, `FRONTEND_URL`, `CORS_ALLOWED_ORIGINS`
- [ ] Backend redeployed
- [ ] User mapping decided (findOrCreate only vs. aligning seed users)
- [ ] Host/remote built with correct API URL and CORS; Sign In flow tested

---

### 2.3 Build order

1. **Backend:** `docker build ./backend -t weekly-commit-backend` (or build JAR and run on a Java 21 runtime).
2. **Remote:** `docker build ./remote -t weekly-commit-remote` (or `npm run build` with `VITE_API_URL` set if needed).
3. **Host:** `docker build ./host --build-arg REMOTE_URL=<browser-url-to-remote> -t weekly-commit-host` (and optional `VITE_API_URL`). Host must know where to load `remoteEntry.js`; that URL is fixed at build time.

### 2.4 Runtime order

1. Start **PostgreSQL** and wait until healthy.
2. Start **Backend** (Flyway runs on startup; DB must be up).
3. Start **Remote** (serve static files).
4. Start **Host** (serve static files).
5. If using a reverse proxy, route `/api` to backend, `/` to host, and `/assets/` (or remote subpath) to remote.

---

## 3. Example: Docker Compose for production-like staging

Use this as a template. Replace placeholders with your OAuth provider and secrets. **Do not use mock OAuth in production.**

```yaml
# docker-compose.prod.yml (example — adapt to your OAuth and URLs)
services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: weeklycommit
      POSTGRES_USER: ${DB_USERNAME}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USERNAME} -d weeklycommit"]
      interval: 5s
      timeout: 5s
      retries: 10
    # Expose only internally or via reverse proxy

  backend:
    build: ./backend
    depends_on:
      postgres:
        condition: service_healthy
    environment:
      DB_URL: jdbc:postgresql://postgres:5432/weeklycommit
      DB_USERNAME: ${DB_USERNAME}
      DB_PASSWORD: ${DB_PASSWORD}
      OAUTH_CLIENT_ID: ${OAUTH_CLIENT_ID}
      OAUTH_CLIENT_SECRET: ${OAUTH_CLIENT_SECRET}
      OAUTH_ISSUER_URI: ${OAUTH_ISSUER_URI}
      OAUTH_JWK_SET_URI: ${OAUTH_JWK_SET_URI}
      OAUTH_AUTHORIZATION_URI: ${OAUTH_AUTHORIZATION_URI}
      OAUTH_REDIRECT_URI: ${OAUTH_REDIRECT_URI}
      JWT_SECRET: ${JWT_SECRET}
      JWT_EXPIRY_HOURS: ${JWT_EXPIRY_HOURS:-24}
      FRONTEND_URL: ${FRONTEND_URL}
    # Expose 8080 to reverse proxy

  remote:
    build: ./remote
    # Optional: build-arg VITE_API_URL for cross-origin API
    # Expose 3001 to reverse proxy or serve static from proxy

  host:
    build:
      context: ./host
      args:
        REMOTE_URL: ${REMOTE_URL}
        # VITE_API_URL: ${VITE_API_URL}  # if API on different domain
    depends_on:
      - remote
    # Expose 3000 to reverse proxy

volumes:
  postgres_data:
```

**Example `.env.prod` (never commit real secrets):**

```env
DB_USERNAME=weeklycommit
DB_PASSWORD=<strong-password>

OAUTH_CLIENT_ID=<from-idp>
OAUTH_CLIENT_SECRET=<from-idp>
OAUTH_ISSUER_URI=https://auth.example.com/realms/myorg
OAUTH_JWK_SET_URI=https://auth.example.com/realms/myorg/protocol/openid-connect/certs
OAUTH_AUTHORIZATION_URI=https://auth.example.com/realms/myorg/protocol/openid-connect/auth
OAUTH_REDIRECT_URI=https://api-weekly.example.com/login/oauth2/code/oidc

JWT_SECRET=<long-random-secret>
FRONTEND_URL=https://app-weekly.example.com
REMOTE_URL=https://app-weekly.example.com/assets
```

---

## 4. Reverse proxy (Option A: single domain)

Example Nginx config so the browser sees one origin:

```nginx
# Upstreams
upstream backend { server backend:8080; }
upstream host   { server host:3000; }
upstream remote { server remote:3001; }

server {
  listen 443 ssl;
  server_name weekly-commit.example.com;
  ssl_certificate     /etc/ssl/certs/weekly-commit.crt;
  ssl_certificate_key /etc/ssl/private/weekly-commit.key;

  # API
  location /api/ {
    proxy_pass http://backend/api/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cookie_path / /;
  }

  # OAuth callback and login
  location /oauth2/ { proxy_pass http://backend/oauth2/; proxy_set_header Host $host; proxy_set_header X-Forwarded-Proto $scheme; }
  location /login/  { proxy_pass http://backend/login/; proxy_set_header Host $host; proxy_set_header X-Forwarded-Proto $scheme; }

  # Remote MFE assets (Module Federation)
  location /assets/ {
    proxy_pass http://remote/assets/;
    add_header Cache-Control "public, max-age=0, must-revalidate";
  }

  # Host SPA
  location / {
    proxy_pass http://host/;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
  }
}
```

Then:

- `FRONTEND_URL=https://weekly-commit.example.com`
- `REMOTE_URL=https://weekly-commit.example.com/assets`
- `OAUTH_REDIRECT_URI=https://weekly-commit.example.com/login/oauth2/code/oidc`

Build host with `REMOTE_URL=https://weekly-commit.example.com/assets`. If frontend and API are on the same origin, use relative `/api` so no `VITE_API_URL` is needed.

---

## 5. Database migrations

- **Flyway** runs automatically when the backend starts (`spring.flyway.enabled: true`).
- Ensure PostgreSQL is up and reachable before starting the backend.
- Do **not** edit existing migration files; add new `V{n}__description.sql` for schema changes.

---

## 6. Troubleshooting

### Backend fails: "URL must start with 'jdbc'"

Spring Boot’s datasource expects a JDBC URL (e.g. `jdbc:postgresql://host:5432/db`). If you see this error, the value used for the database URL does not start with `jdbc:`.

- **Railway:** Use the Postgres service reference so the backend gets `DATABASE_URL` (and `PGUSER`, `PGPASSWORD`). The app normalizes `postgresql://` or `postgres://` to `jdbc:postgresql://` automatically. Ensure the backend service has the Postgres plugin linked and **do not** override `DB_URL` with a non-JDBC value.
- **Manual:** Set `DB_URL` to a full JDBC URL: `jdbc:postgresql://<host>:<port>/<database>` and set `DB_USERNAME` and `DB_PASSWORD` (or use the same variables your platform provides, e.g. `PGUSER` / `PGPASSWORD`).

### Backend fails: "The Issuer ... provided in the configuration metadata did not match the requested issuer"

Auth0’s discovery document returns an issuer **with** a trailing slash (e.g. `https://tenant.us.auth0.com/`). Spring compares that to your `OAUTH_ISSUER_URI`. They must match exactly.

**Fix:** Set `OAUTH_ISSUER_URI` **with** the trailing slash, e.g. `https://dev-z33frvwxypyb8hix.us.auth0.com/` (not `...auth0.com`). Redeploy the backend.

### Backend fails: "Unable to resolve Configuration with the provided Issuer of http://localhost:8090"

The backend is still using the **local dev** OAuth issuer (mock server at `localhost:8090`). In production that server does not exist, so Spring cannot fetch OIDC discovery and the app fails to start.

**Fix:** Set **production OAuth environment variables** on the backend service (e.g. in Railway → your backend service → Variables). You must use a real OIDC provider (Auth0, Okta, Keycloak, Google, etc.):

| Variable | Example |
|----------|---------|
| `OAUTH_ISSUER_URI` | `https://your-tenant.auth0.com/` or your IdP’s issuer URL |
| `OAUTH_CLIENT_ID` | Client ID from your IdP application |
| `OAUTH_CLIENT_SECRET` | Client secret from your IdP application |
| `OAUTH_REDIRECT_URI` | `https://<your-backend>.up.railway.app/login/oauth2/code/oidc` |
| `OAUTH_AUTHORIZATION_URI` | Your IdP’s authorization endpoint (from OIDC discovery or IdP docs) |
| `OAUTH_JWK_SET_URI` | Your IdP’s JWK set URI (for token validation) |

In your IdP, register an application and add `OAUTH_REDIRECT_URI` as an allowed redirect/callback URL. Then redeploy the backend so it picks up the new variables.

### Sign-in redirects to the host URL and gets stuck

If clicking "Sign In" sends the browser to `https://<host-domain>/oauth2/authorization/oidc` and the page never leaves the sign-in screen, the frontend is using the **host** origin as the backend. That happens when the host (and/or remote) was built with `VITE_API_URL` set to a relative value (e.g. `/api`) or left unset — so `BACKEND_ORIGIN` becomes `window.location.origin` (the host). The host is a static app and has no `/oauth2` or `/login` routes, so the OAuth flow never starts.

**Fix:** Set **`VITE_API_URL`** on the **host** (and **remote**) Railway service to the **full backend API URL**, e.g. `https://<your-backend-service>.up.railway.app/api`. Redeploy the host and remote so they are rebuilt with the correct value. Then "Sign In" will redirect to the backend, which will redirect to your OAuth provider.

### CORS blocking requests from the host/remote

If the browser reports that the request to the backend was "blocked by CORS policy" and "No 'Access-Control-Allow-Origin' header is present", the backend is not allowing your frontend origin. Set **`CORS_ALLOWED_ORIGINS`** on the **backend** service to a comma-separated list of the host and remote URLs (exact origins, with `https://`), e.g.:

`https://faithful-intuition-production-2773.up.railway.app,https://<your-remote-service>.up.railway.app`

Redeploy the backend so it picks up the new value. No trailing slashes.

---

## 7. Security reminders

- Use a **strong, random `JWT_SECRET`** in production.
- Run OAuth over HTTPS; register only HTTPS redirect URIs.
- Restrict CORS to your frontend origins if using Option B.
- Prefer httpOnly, Secure, SameSite cookies (backend already sets these; ensure reverse proxy doesn’t strip them).
- Keep `.env.prod` (or equivalent) out of version control; use a secrets manager or platform env for production.

---

## 8. PaaS / cloud options

- **Railway / Render / Fly.io:** Deploy backend, host, and remote as separate services; add Postgres (managed or container). Set env vars in the dashboard; build host with correct `REMOTE_URL` and optional `VITE_API_URL`.
- **Kubernetes:** Run backend as Deployment + Service; host and remote as static serving Deployments or Ingress; use Ingress to implement the single-domain proxy pattern above.
- **AWS / GCP / Azure:** Use managed Postgres, run backend on App Runner/Cloud Run/App Service, host/remote on S3+Gatsby/Cloud Storage + CDN, and put an ALB/Cloud Load Balancer or API Gateway in front with path-based routing to match Option A.

The same principles apply: **one origin and relative `/api`** simplifies configuration; otherwise set **API base URL** at build time and configure CORS and cookies for cross-origin.
