# Deploy backend to DigitalOcean App Platform

This backend is now ready for container-based deployment on DigitalOcean App Platform.

## Option A: Deploy from spec file (recommended)

1. In DigitalOcean, open **Apps** -> **Create App**.
2. Connect GitHub and select repository `ivan-vukasinovic-devinity/whisperstalk-monorepo`.
3. Choose **Use app spec** and point to `.do/app.yaml`.
4. Confirm and create the app.

DigitalOcean will:
- Build the backend from `backend/Dockerfile`
- Provision a managed PostgreSQL database
- Inject `DATABASE_URL` into runtime env vars

Important:
- Keep `source_dir` as `backend` and `dockerfile_path` as `Dockerfile` in `.do/app.yaml` (no leading `/`), so App Platform detects the Docker component correctly.

## Option B: Configure in UI manually

If you prefer no spec file:
- **Source dir**: `backend`
- **Dockerfile path**: `backend/Dockerfile`
- **HTTP port**: `8080`
- **Plan**: `Basic XXS` (or higher)
- If you choose a Python buildpack component instead of Docker, this repo also includes `backend/Procfile` and `backend/.python-version` for compatibility.

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
- Backend now retries DB startup initialization briefly to avoid crash loops while managed DB is becoming ready.
- `DATABASE_URL` values starting with `postgres://` or `postgresql://` are normalized automatically for SQLAlchemy.
- Current backend creates DB tables at startup, suitable for MVP. For production migrations, use Alembic later.
