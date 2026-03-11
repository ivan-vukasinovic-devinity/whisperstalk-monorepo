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

## Option B: Configure in UI manually

If you prefer no spec file:
- **Source dir**: `backend`
- **Dockerfile path**: `backend/Dockerfile`
- **HTTP port**: `8080`
- **Plan**: `Basic XXS` (or higher)

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
- Current backend creates DB tables at startup (`Base.metadata.create_all(bind=engine)`), suitable for MVP. For production migrations, use Alembic later.
