# Deploy backend + frontend to DigitalOcean App Platform

This monorepo is ready for DigitalOcean App Platform deployment:
- Backend service (`backend/`) using Docker
- Frontend static site (`frontend/`) using Vite build output

## Option A: Deploy from spec file (recommended)

1. In DigitalOcean, open **Apps** -> **Create App**.
2. Connect GitHub and select repository `ivan-vukasinovic-devinity/whisperstalk-monorepo`.
3. Choose **Use app spec** and point to `.do/app.yaml`.
4. Confirm and create the app.

DigitalOcean will:
- Build the backend from `backend/Dockerfile`
- Build the frontend static site from `frontend` (`npm ci && npm run build`)
- Provision a managed PostgreSQL database
- Inject `DATABASE_URL` into runtime env vars

Important:
- Keep `source_dir` as `backend` and `dockerfile_path` as `Dockerfile` in `.do/app.yaml` (no leading `/`), so App Platform detects the Docker component correctly.
- Frontend is configured as a **Static Site**. If created as a web service by mistake, App Platform fails with:
  `determine start command: when there is no default process a command is required`

## Option B: Configure in UI manually

If you prefer no spec file:
- **Source dir**: `backend`
- **Dockerfile path**: `backend/Dockerfile`
- **HTTP port**: `8080`
- **Plan**: `Basic XXS` (or higher)
- If you choose a Python buildpack component instead of Docker, this repo also includes `backend/Procfile` and `backend/.python-version` for compatibility.
- Add frontend as a **Static Site** component:
  - **Source dir**: `frontend`
  - **Build command**: `npm ci && npm run build`
  - **Output directory**: `dist`
  - **Build env var**: `VITE_API_URL=https://<your-backend-domain>/api/v1`

Create a managed PostgreSQL database (PostgreSQL 16) and set these runtime env vars:
- `APP_NAME=Whispers Backend`
- `API_V1_PREFIX=/api/v1`
- `CORS_ORIGINS=https://your-frontend-domain.com`
- `DATABASE_URL=<managed-postgres-connection-string>`

## Verify deployment

After deployment succeeds:
- Health/root check: `https://<your-app-domain>/`
- Swagger docs: `https://<your-app-domain>/docs`
- OpenAPI JSON: `https://<your-app-domain>/openapi.json`

## Important notes

- Replace `CORS_ORIGINS` with your real frontend domain(s), comma-separated if multiple.
- Replace frontend `VITE_API_URL` with your real backend domain (`https://<backend-domain>/api/v1`).
- Backend now retries DB startup initialization briefly to avoid crash loops while managed DB is becoming ready.
- `DATABASE_URL` values starting with `postgres://` or `postgresql://` are normalized automatically for SQLAlchemy.
- Current backend creates DB tables at startup, suitable for MVP. For production migrations, use Alembic later.
