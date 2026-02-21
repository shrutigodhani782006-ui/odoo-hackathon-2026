# odoo-hackathon-2026
🚛 FleetFlow-Modular Fleet & Logistics Management System

FleetFlow is a centralized, rule-based fleet management platform designed to replace manual logbooks with a scalable digital system.
The system manages vehicles, drivers, trips, maintenance, and using a modern full-stack architecture.


📁 Project Structure
fleetflow/
├── frontend/                     
│   ├── src/
│   │   ├── components/
│   │   │   ├── dashboard/
│   │   │   ├── vehicles/
│   │   │   ├── drivers/
│   │   │   ├── trips/
│   │   │   ├── maintenance/
│   │   │   └── analytics/
│   │   │
│   │   ├── pages/
│   │   │   ├── Login.tsx
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Vehicles.tsx
│   │   │   ├── Drivers.tsx
│   │   │   ├── Trips.tsx
│   │   │   ├── Maintenance.tsx
│   │   │   └── Reports.tsx
│   │   │
│   │   ├── context/
│   │   ├── services/
│   │   ├── utils/
│   │   └── App.tsx
│   │
│   └── package.json
│
├── backend/                      # Python Backend API
│   ├── app/
│   │   ├── config/
│   │   ├── models/
│   │   │   ├── vehicle.py
│   │   │   ├── driver.py
│   │   │   ├── trip.py
│   │   │   ├── maintenance.py
│   │   │   └── expense.py
│   │   │
│   │   ├── schemas/
│   │   ├── routes/
│   │   │   ├── auth.py
│   │   │   ├── vehicles.py
│   │   │   ├── drivers.py
│   │   │   ├── trips.py
│   │   │   ├── maintenance.py
│   │   │   └── reports.py
│   │   │
│   │   ├── services/
│   │   └── main.py
│   │
│   ├── requirements.txt
│   └── .env
│
├── database/
│   └── schema.sql
│
└── README.md

🚀 Quick Start
Prerequisites
Node.js (v18+)
Python (3.10+)
PostgreSQL (v14+)
npm

🔹 Installation
1️⃣ Clone Repository
git clone <repository-url>
cd fleetflow
🔹 Setup Backend (Python API)
cd backend
pip install -r requirements.txt

Create .env file:

DATABASE_URL=postgresql://postgres:password@localhost:5432/fleetflow_db
SECRET_KEY=your_secret_key

Run backend server:
uvicorn app.main:app --reload
Backend runs at:

http://localhost:8000
🔹 Setup Frontend 
cd frontend
npm install
npm run dev

Frontend runs at:

http://localhost:5173
👥 User Roles
Fleet Manager
Dispatcher
Safety Officer
Financial Analyst
Role-based access is enforced at the backend API level.

✨ Features
🔐 Authentication & Authorization

✅ JWT-based authentication
✅ Role-based access control
✅ Secure password hashing
✅ Protected API routes

🚘 Vehicle Management

✅ Add / Update / Delete vehicles
✅ Unique license plate validation
✅ Track load capacity & odometer
✅ Status control (Available, On Trip, In Shop, Retired)

Business Rule:
Vehicle under maintenance cannot be dispatched.

🚚 Trip Management

Trip Lifecycle:
Draft → Dispatched → Completed → Cancelled

Validation Rules:
Cargo weight must not exceed vehicle capacity
Driver license must be valid
Vehicle must be available
Driver must not be suspended
Automatic status updates on dispatch and completion.

🔧 Maintenance Management

✅ Create service logs
✅ Auto-change vehicle status to "In Shop"
✅ Remove vehicle from dispatcher selection
✅ Restore status after maintenance

⛽ Expense & Fuel Tracking

✅ Fuel entry per vehicle
✅ Maintenance cost logging
✅ Automatic cost-per-km calculation
✅ Total operational cost per vehicle

👮 Driver Performance & Safety

✅ License expiry tracking
✅ Driver status (On Duty / Off Duty / Suspended)
✅ Trip completion rate
✅ Safety score calculation

System blocks assignment if license expired.

📊 Dashboard & Analytics

✅ Active fleet count
✅ Maintenance alerts
✅ Utilization rate
✅ Fuel efficiency (km/L)
✅ Vehicle ROI calculation
✅ Financial export reports

📊 Database Schema (PostgreSQL)
Tables
users
vehicles
drivers
trips
maintenance_logs
expenses

Relationships
One vehicle → Many trips
One driver → Many trips
One vehicle → Many expenses
One vehicle → Many maintenance logs

🔐 API Endpoints
Authentication
POST   /api/auth/register
POST   /api/auth/login
GET    /api/auth/profile

Vehicles
GET    /api/vehicles
POST   /api/vehicles
PUT    /api/vehicles/{id}
DELETE /api/vehicles/{id}

Drivers
GET    /api/drivers
POST   /api/drivers
PUT    /api/drivers/{id}

Trips
POST   /api/trips
PUT    /api/trips/{id}/dispatch
PUT    /api/trips/{id}/complete
GET    /api/trips

Maintenance
POST   /api/maintenance
PUT    /api/maintenance/{id}/complete

Reports
GET    /api/reports/dashboard
GET    /api/reports/financial

🛠️ Technology Stack

Frontend
React (MERN)
TypeScript
Vite
Tailwind CSS
Axios

Backend
Python
FastAPI
SQLAlchemy
JWT Authentication
Database
PostgreSQL

🧠 Core Business Logic

Capacity validation before dispatch
License validation before assignment
Automatic vehicle & driver state updates
Real-time cost calculation
ROI computation per asset

🧪 Development
Run Backend:
uvicorn app.main:app --reload
Run Frontend:
npm run dev

📈 Future Enhancements
GPS tracking integration
Predictive maintenance using ML
SMS notifications
Multi-branch fleet support