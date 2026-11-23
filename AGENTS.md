# ErrandOS Agent Verification Commands

## Backend Verification

### Install dependencies
```bash
cd backend
pip install -r requirements.txt
```

### Run tests
```bash
cd backend
pytest
```

### Run lint (if ruff available)
```bash
cd backend
ruff check . 2>/dev/null || python -m compileall .
```

### Run typecheck (if mypy available)
```bash
cd backend
mypy . 2>/dev/null || echo "mypy not configured"
```

### Start backend server
```bash
cd backend
uvicorn main:app --reload --port 8000
```

## Frontend Verification

### Install dependencies
```bash
cd frontend
npm install
```

### Run typecheck
```bash
cd frontend
npx tsc --noEmit
```

### Run lint
```bash
cd frontend
npm run lint
```

### Run tests
```bash
cd frontend
npm test
```

### Start frontend dev server
```bash
cd frontend
npm run dev
```

## Full Dev Loop

Terminal 1 (backend):
```bash
cd backend
uvicorn main:app --reload --port 8000
```

Terminal 2 (frontend):
```bash
cd frontend
npm run dev
```

Open http://localhost:3000

## Environment Variables

Copy `.env.example` to `.env` and fill in optional values. The app works in demo mode without API keys.
