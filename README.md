# IDSFlow

IDS automation tool. Monorepo: Flask backend + React frontend, single Docker image, single Render web service.

## Structure

```
idsflow/
├── backend/         Flask app, EPO OPS client, PDF tooling, SB/08 generation
│   └── static/      <-- built frontend bundle (gitignored)
├── frontend/        Vite + React + TypeScript + Tailwind + shadcn/ui
├── Dockerfile       Multi-stage: Node builds frontend, Python serves
└── render.yaml      Render service definition
```

## Local development

```bash
# Frontend (hot-reload, talks to backend at /api/*)
cd frontend
npm install
npm run dev          # http://localhost:8080

# Backend (separate terminal)
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python app.py        # http://localhost:5555
```

In dev, Vite proxies `/api/*` to the backend (configured in `vite.config.ts`).

## Production build (what Docker does)

```bash
cd frontend && npm install && npm run build   # outputs to ../backend/static
cd ../backend && gunicorn app:app -b 0.0.0.0:$PORT
```

Flask serves the React bundle from `backend/static` and falls through to `index.html` for any non-`/api` route (client-side routing).

## Environment

See `.env.example`. EPO OPS credentials are optional — without them the backend runs in demo mode.
