# Profile_Saleh_AI

Portfolio technique orienté Architecte IA (frontend Next.js + backend FastAPI).

## Arborescence

```
Profile_Saleh_AI/
	frontend/
		package.json
		next.config.js
		src/
			app/
				[locale]/
					(pages)
				layout.tsx
				page.tsx
			components/
			i18n/
			middleware.ts

	backend/
		requirements.txt
		app/
			main.py
			core/
				config.py
			api/
				router.py
				routes/
					health.py
					chat.py
			schemas/
				chat.py
```

## Setup & commandes

### Frontend (Next.js, App Router, TypeScript)

Prérequis: Node.js (actuellement compatible avec Node 18 via Next 14).

```bash
cd Profile_Saleh_AI/frontend
npm install
npm run dev
```

Configuration (local dev):

```bash
cd Profile_Saleh_AI/frontend
cp .env.local.example .env.local
```

Build production:

```bash
cd Profile_Saleh_AI/frontend
npm run build
npm run start
```

Notes i18n:
- Langue par défaut: `/` redirige vers `/fr`
- Locales supportées: `/fr` et `/en`
- Dictionnaires JSON: `src/i18n/dictionaries/fr.json` et `src/i18n/dictionaries/en.json`
- Switch langue via bouton (conserve le path)

### Backend (FastAPI)

Prérequis: Python 3.10+ conseillé.

```bash
cd Profile_Saleh_AI/backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Endpoints:
- `GET /health`
- `POST /chat` (stub)

## Docker Compose (recommandé pour un run local propre)

Prérequis: Docker + Docker Compose.

```bash
cd Profile_Saleh_AI
docker compose up --build
```

Arrêter proprement:

```bash
cd Profile_Saleh_AI
docker compose down
```

Logs:

```bash
cd Profile_Saleh_AI
docker compose logs -f --tail=200
```

Rebuild clean (si dépendances / cache incohérents):

```bash
cd Profile_Saleh_AI
docker compose build --no-cache
docker compose up
```

### Option Makefile

Si tu préfères des commandes courtes:

```bash
cd Profile_Saleh_AI
make up
```

Autres:

```bash
make down
make logs
make ps
```

Accès:
- Frontend: `http://localhost:3000`
- Backend: `http://localhost:8000/health`

Notes:
- En mode Docker, le frontend appelle le backend via `http://backend:8000` (service name Compose).

Troubleshooting (classique):
- Ports déjà utilisés: stoppe les serveurs locaux (Next/Uvicorn) ou fais `docker compose down`, puis relance.