# ErrandOS

**Your day. Optimized.** ErrandOS turns a plain-language list of errands into a time-aware itinerary. Add stops and constraints, optimize their order, and review the schedule, route, and estimated savings.

## Screenshots

Screenshots are stored in [`docs/screenshots/`](docs/screenshots/). Add current captures there and embed them below when available.

<!-- Screenshots: landing, planner, and optimized itinerary -->

## What it does

- Extract errands from natural language, including locations, duration, priority, and time constraints.
- Optimize stop order around departure time, deadlines, and opening/closing windows.
- Compare the optimized route with a baseline and estimate travel time, distance, and fuel cost savings.
- Review the itinerary on a Leaflet map and in a stop-by-stop schedule.
- Run in demo mode without provider keys; fallback extraction and simulated optimization are available.

## Stack

- Frontend: Next.js 14, React 18, TypeScript, Tailwind CSS, Leaflet
- Backend: FastAPI, Python, Pydantic, OR-Tools with a fallback optimizer

## Run locally

Prerequisites: Node.js 18+ and Python 3.10+.

In terminal one, start the backend:

```bash
cd backend
python -m venv .venv
# Windows: .venv\\Scripts\\activate
# macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

In terminal two, start the frontend:

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The backend API is at [http://localhost:8000](http://localhost:8000). Optional provider configuration is documented in [`.env.example`](.env.example); the app supports demo/fallback behavior without API keys.

## API

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `POST` | `/api/errands/extract` | Parse errands from text |
| `POST` | `/api/optimize` | Build an itinerary and baseline/savings comparison |
| `GET` | `/api/geocode?q=...` | Find coordinates for a location |
| `GET` | `/api/health` | Backend health check |

See [`SPEC.md`](SPEC.md) for request and response schemas.

## Project layout

```text
backend/     FastAPI routes, schemas, services, and tests
frontend/    Next.js pages, components, and API client
docs/        Project documentation and screenshots
SPEC.md      API and interface contracts
```

## Verification

```bash
cd backend
pytest
```

```bash
cd frontend
npx tsc --noEmit
npm run lint
npm test
npm run build
```

## Configuration

See [`.env.example`](.env.example) for optional AI, geocoding, routing, and vehicle settings. Keep real credentials out of version control. Defaults support local demo use; routing and map display can use OSRM and Leaflet/OpenStreetMap.

## License

MIT
