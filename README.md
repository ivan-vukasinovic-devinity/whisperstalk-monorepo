# Whispers Full App (Monorepo)

Privacy-focused text chat MVP with:
- **Peer-to-peer text messaging** (WebRTC data channel)
- **QR-only contact onboarding** with explicit acceptance
- **12-hour disappearing messages** (local ephemeral storage)
- **Backend in Python + PostgreSQL**
- **Frontend in React**
- **Mobile app scaffold in React Native**

## Folder Structure

- `backend` - FastAPI + SQLAlchemy + PostgreSQL REST API
- `frontend` - React + Vite web client
- `mobile` - React Native (Expo) scaffold for next phase

## Backend (FastAPI + PostgreSQL)

### 1) Start Postgres

```bash
docker compose up -d
```

### 2) Run backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --port 8000
```

Swagger/OpenAPI:
- [http://localhost:8000/docs](http://localhost:8000/docs)

Deployment (DigitalOcean):
- See `backend/DEPLOY_DIGITALOCEAN.md`

Key routes (all under `/api/v1`):
- `POST /auth/signup` - create account with username/password
- `POST /auth/login` - login with username/password
- `POST /contacts/requests` - send contact request using scanned QR token
- `POST /contacts/requests/{request_id}/accept` - accept contact request
- `GET /contacts/{user_id}` - list accepted contacts
- `GET /contacts/requests/pending/{user_id}` - list pending incoming requests
- `POST /signaling` - store WebRTC signaling message
- `GET /signaling/inbox/{recipient_id}` - consume pending signaling messages

## Frontend (React)

```bash
cd frontend
npm install
npm run dev
```

Optional env file (`frontend/.env`):

```bash
VITE_API_URL=http://localhost:8000/api/v1
```

## Mobile (React Native Scaffold)

```bash
cd mobile
npm install
npm start
```

## Security Model (MVP)

- Chat payload is sent browser-to-browser over WebRTC data channel.
- Backend stores only contact metadata and WebRTC signaling messages (offer/answer/candidates), not chat content.
- Messages are stored locally on device and pruned after 12 hours.
- V1 supports **text only**.

## Notes

- This MVP uses app-level identity without full cryptographic identity verification.
- For production, add device keypair generation and signature checks, transport hardening, auth, and audited message retention controls.
