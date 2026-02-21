# FleetFlow — Modular Fleet & Logistics Management System

A full-stack fleet management system built with React.js, FastAPI (Python), and MongoDB Atlas.

---

## Prerequisites

- **Node.js** 18+ and npm
- **Python** 3.11+
- Internet connection (MongoDB Atlas)

---

## Project Structure

```
new/
├── backend/
│   ├── main.py
│   ├── config.py
│   ├── database.py
│   ├── requirements.txt
│   ├── .env
│   ├── models/
│   └── routes/
└── frontend/
    ├── package.json
    ├── public/
    └── src/
        ├── App.js
        ├── index.js
        ├── index.css
        ├── components/
        ├── context/
        ├── pages/
        └── utils/
```

---

## Setup & Run

### Option A — Using batch scripts (Windows)

**Terminal 1 — Backend:**
```
cd backend
start_backend.bat
```

**Terminal 2 — Frontend:**
```
cd frontend
start_frontend.bat
```

### Option B — Manual

**Backend:**
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

**Frontend:**
```bash
cd frontend
npm install
npm start
```

---

## Access

| Service  | URL                        |
|----------|----------------------------|
| Frontend | http://localhost:3000       |
| Backend  | http://localhost:8000       |
| API Docs | http://localhost:8000/docs  |

---

## Demo Accounts

Seed demo data by clicking **"Seed Demo Accounts"** on the login page, then log in with:

| Role              | Email                         | Password      |
|-------------------|-------------------------------|---------------|
| Fleet Manager     | manager@fleetflow.io          | manager123    |
| Dispatcher        | dispatcher@fleetflow.io       | dispatch123   |
| Safety Officer    | safety@fleetflow.io           | safety123     |
| Financial Analyst | finance@fleetflow.io          | finance123    |

---

## Features

| Page | Description |
|------|-------------|
| **Dashboard** | Command center — live KPIs, vehicle status, active trips, license alerts |
| **Vehicle Registry** | Full CRUD for fleet vehicles, status management, cargo capacity |
| **Trip Dispatcher** | Create and dispatch trips with cargo validation and trip lifecycle (Draft→Dispatched→Completed/Cancelled) |
| **Maintenance Logs** | Service scheduling — auto-sets vehicle to "In Shop"; releases on completion |
| **Fuel & Expenses** | Fuel log entry with auto-cost calculation and per-vehicle operational summaries |
| **Driver Profiles** | Driver CRUD, safety scores, license expiry tracking, status management |
| **Analytics** | ROI analysis, fuel efficiency charts, monthly cost trends, CSV export |

---

## Business Logic

- **Cargo Validation**: Trips blocked if cargo weight exceeds vehicle max capacity
- **License Guard**: Trips blocked if assigned driver's license is expired
- **In Shop Logic**: Adding any maintenance record auto-sets vehicle status to "In Shop"; completing the last open record restores to "Available"
- **Trip Lifecycle**: Draft → Dispatched → Completed or Cancelled; vehicle and driver statuses updated accordingly
