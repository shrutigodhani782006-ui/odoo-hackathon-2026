from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from models.user import UserCreate, UserLogin, UserUpdate, User, Token, UserRole
from database import get_db
from config import settings
from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta
from bson import ObjectId

router = APIRouter(prefix="/auth", tags=["Authentication"])
pwd_context = CryptContext(schemes=["sha256_crypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

def doc_to_user(doc) -> dict:
    doc["id"] = str(doc["_id"])
    del doc["_id"]
    doc.pop("password", None)
    return doc

@router.post("/register", response_model=dict)
async def register(user: UserCreate):
    db = get_db()
    if db is None:
        raise HTTPException(status_code=503, detail="Database not connected.")
    existing = await db.users.find_one({"email": user.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered.")
    # mode='json' ensures enums are serialized to their string values
    user_doc = user.model_dump(mode='json')
    user_doc["password"] = hash_password(user.password)
    user_doc["created_at"] = datetime.utcnow()
    result = await db.users.insert_one(user_doc)
    return {"message": "User registered successfully", "id": str(result.inserted_id)}

@router.post("/login", response_model=Token)
async def login(form: UserLogin):
    db = get_db()
    user_doc = await db.users.find_one({"email": form.email})
    if not user_doc or not verify_password(form.password, user_doc["password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password.")
    token = create_access_token({"sub": str(user_doc["_id"]), "role": user_doc["role"]})
    user = doc_to_user(user_doc)
    return Token(access_token=token, user=User(**user))

async def get_current_user(token: str = Depends(oauth2_scheme)):
    db = get_db()
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token.")
        user_doc = await db.users.find_one({"_id": ObjectId(user_id)})
        if not user_doc:
            raise HTTPException(status_code=401, detail="User not found.")
        return doc_to_user(user_doc)
    except JWTError:
        raise HTTPException(status_code=401, detail="Could not validate token.")

@router.get("/me", response_model=User)
async def get_me(current_user: dict = Depends(get_current_user)):
    return User(**current_user)

@router.put("/profile", response_model=dict)
async def update_profile(updates: UserUpdate, current_user: dict = Depends(get_current_user)):
    db = get_db()
    patch = {}
    if updates.name:  patch["name"] = updates.name
    if updates.email:
        taken = await db.users.find_one({"email": updates.email})
        if taken and str(taken["_id"]) != current_user["id"]:
            raise HTTPException(status_code=400, detail="Email already in use.")
        patch["email"] = updates.email
    if updates.password:
        if len(updates.password) < 6:
            raise HTTPException(status_code=400, detail="Password must be at least 6 characters.")
        patch["password"] = hash_password(updates.password)
    if not patch:
        raise HTTPException(status_code=400, detail="No fields to update.")
    from bson import ObjectId
    await db.users.update_one({"_id": ObjectId(current_user["id"])}, {"$set": patch})
    updated = await db.users.find_one({"_id": ObjectId(current_user["id"])})
    return doc_to_user(updated)

@router.post("/seed-admin", response_model=dict)
async def seed_admin():
    """Seed a default admin/manager account for demo use."""
    db = get_db()
    users_to_seed = [
        {"name": "Fleet Manager", "email": "manager@fleetflow.io", "password": "manager123", "role": "Fleet Manager"},
        {"name": "Dispatcher Dan", "email": "dispatcher@fleetflow.io", "password": "dispatch123", "role": "Dispatcher"},
        {"name": "Safety Sam", "email": "safety@fleetflow.io", "password": "safety123", "role": "Safety Officer"},
        {"name": "Finance Fiona", "email": "finance@fleetflow.io", "password": "finance123", "role": "Financial Analyst"},
    ]
    created = []
    for u in users_to_seed:
        existing = await db.users.find_one({"email": u["email"]})
        if not existing:
            u["password"] = hash_password(u["password"])
            u["is_active"] = True
            u["created_at"] = datetime.utcnow()
            await db.users.insert_one(u)
            created.append(u["email"])
    return {"seeded": created, "message": "Demo accounts ready."}


@router.post("/seed-data", response_model=dict)
async def seed_demo_data():
    """Seed full demo fleet data: vehicles, drivers, trips, maintenance, fuel logs."""
    db = get_db()
    now = datetime.utcnow()

    # ── Skip if already seeded ───────────────────────────────────────────────
    if await db.vehicles.count_documents({}) >= 6:
        return {"message": "Demo data already exists.", "skipped": True}

    # ── 1. VEHICLES ──────────────────────────────────────────────────────────
    vehicles_data = [
        {"name": "Truck-01 Bharat",    "license_plate": "TN-01-AB-1234", "vehicle_type": "Truck", "max_capacity_kg": 5000,  "odometer_km": 45200, "status": "Available",  "region": "Tamil Nadu",  "acquisition_cost": 1800000, "year": 2021},
        {"name": "Van-02 Swift",        "license_plate": "MH-12-CD-5678", "vehicle_type": "Van",   "max_capacity_kg": 1500,  "odometer_km": 28400, "status": "Available",  "region": "Maharashtra", "acquisition_cost":  750000, "year": 2022},
        {"name": "Truck-03 Hercules",   "license_plate": "DL-05-EF-9012", "vehicle_type": "Truck", "max_capacity_kg": 8000,  "odometer_km": 62100, "status": "On Trip",    "region": "Delhi",       "acquisition_cost": 2400000, "year": 2020},
        {"name": "Van-04 Cargo King",   "license_plate": "KA-03-GH-3456", "vehicle_type": "Van",   "max_capacity_kg": 2000,  "odometer_km": 15800, "status": "In Shop",   "region": "Karnataka",   "acquisition_cost":  820000, "year": 2023},
        {"name": "Bike-05 Flash",       "license_plate": "MH-02-IJ-7890", "vehicle_type": "Bike",  "max_capacity_kg": 100,   "odometer_km":  8500, "status": "Available",  "region": "Maharashtra", "acquisition_cost":   95000, "year": 2023},
        {"name": "Truck-06 Titan",      "license_plate": "RJ-14-KL-1122", "vehicle_type": "Truck", "max_capacity_kg": 6000,  "odometer_km": 78300, "status": "Available",  "region": "Rajasthan",   "acquisition_cost": 2100000, "year": 2019},
        {"name": "Van-07 Express",      "license_plate": "GJ-01-MN-3344", "vehicle_type": "Van",   "max_capacity_kg": 1800,  "odometer_km": 33600, "status": "On Trip",    "region": "Gujarat",     "acquisition_cost":  780000, "year": 2022},
        {"name": "Bike-08 Speedster",   "license_plate": "UP-16-OP-5566", "vehicle_type": "Bike",  "max_capacity_kg":  80,   "odometer_km": 120000,"status": "Retired",   "region": "Uttar Pradesh","acquisition_cost":  85000,  "year": 2017},
    ]
    for v in vehicles_data:
        v["created_at"] = now
        v["updated_at"] = now
    v_result = await db.vehicles.insert_many(vehicles_data)
    v_ids = [str(i) for i in v_result.inserted_ids]
    # map name -> id
    v_map = {vehicles_data[i]["name"]: v_ids[i] for i in range(len(v_ids))}

    # ── 2. DRIVERS ───────────────────────────────────────────────────────────
    drivers_data = [
        {"name": "Raj Kumar",       "employee_id": "EMP-001", "phone": "9876543210", "license_number": "TN2018001", "license_expiry": "2028-06-30", "license_categories": ["Truck","Van","All"], "status": "On Duty",    "trips_completed": 42, "trips_total": 45, "safety_score": 94.0},
        {"name": "Priya Singh",     "employee_id": "EMP-002", "phone": "9823456780", "license_number": "MH2019002", "license_expiry": "2027-03-15", "license_categories": ["All"],               "status": "On Trip",    "trips_completed": 31, "trips_total": 33, "safety_score": 88.5},
        {"name": "Arjun Mehta",     "employee_id": "EMP-003", "phone": "9812345670", "license_number": "DL2020003", "license_expiry": "2026-06-10", "license_categories": ["Truck"],             "status": "Off Duty",   "trips_completed": 18, "trips_total": 20, "safety_score": 80.0},
        {"name": "Deepa Nair",      "employee_id": "EMP-004", "phone": "9756432100", "license_number": "KA2017004", "license_expiry": "2025-11-01", "license_categories": ["Van"],               "status": "Off Duty",   "trips_completed": 27, "trips_total": 30, "safety_score": 72.0},
        {"name": "Suresh Patel",    "employee_id": "EMP-005", "phone": "9898989898", "license_number": "GJ2021005", "license_expiry": "2027-09-20", "license_categories": ["Van","Truck","All"], "status": "On Trip",    "trips_completed": 55, "trips_total": 57, "safety_score": 97.5},
        {"name": "Kavya Reddy",     "employee_id": "EMP-006", "phone": "9900112233", "license_number": "AP2022006", "license_expiry": "2026-03-05", "license_categories": ["Van","Bike"],        "status": "Off Duty",   "trips_completed": 10, "trips_total": 11, "safety_score": 85.0},
        {"name": "Mohan Das",       "employee_id": "EMP-007", "phone": "9911223344", "license_number": "UP2018007", "license_expiry": "2026-08-14", "license_categories": ["Truck"],             "status": "Suspended",  "trips_completed":  8, "trips_total": 15, "safety_score": 41.0},
        {"name": "Anita Sharma",    "employee_id": "EMP-008", "phone": "9922334455", "license_number": "RJ2023008", "license_expiry": "2029-12-01", "license_categories": ["All"],               "status": "On Duty",    "trips_completed": 22, "trips_total": 23, "safety_score": 96.0},
    ]
    for d in drivers_data:
        d["created_at"] = now
        d["updated_at"] = now
    d_result = await db.drivers.insert_many(drivers_data)
    d_ids = [str(i) for i in d_result.inserted_ids]
    d_map = {drivers_data[i]["name"]: d_ids[i] for i in range(len(d_ids))}

    # ── 3. TRIPS ──────────────────────────────────────────────────────────────
    from datetime import timedelta
    trips_data = [
        # Completed trips
        {"vehicle_id": v_map["Truck-01 Bharat"],  "driver_id": d_map["Raj Kumar"],    "vehicle_name": "Truck-01 Bharat",  "driver_name": "Raj Kumar",    "origin": "Mumbai", "destination": "Pune",     "cargo_weight_kg": 3200, "cargo_description": "Electronics",  "revenue": 28000, "status": "Completed", "start_odometer_km": 42000, "final_odometer_km": 45200, "distance_km": 3200, "planned_date": now - timedelta(days=10), "dispatched_at": now - timedelta(days=10), "completed_at": now - timedelta(days=9)},
        {"vehicle_id": v_map["Van-02 Swift"],      "driver_id": d_map["Anita Sharma"], "vehicle_name": "Van-02 Swift",     "driver_name": "Anita Sharma", "origin": "Chennai","destination": "Bengaluru","cargo_weight_kg":  900, "cargo_description": "Medical Supplies","revenue": 14500,"status": "Completed", "start_odometer_km": 26800, "final_odometer_km": 28400, "distance_km": 1600, "planned_date": now - timedelta(days=7),  "dispatched_at": now - timedelta(days=7),  "completed_at": now - timedelta(days=6)},
        {"vehicle_id": v_map["Truck-06 Titan"],    "driver_id": d_map["Raj Kumar"],    "vehicle_name": "Truck-06 Titan",   "driver_name": "Raj Kumar",    "origin": "Jaipur", "destination": "Delhi",    "cargo_weight_kg": 5100, "cargo_description": "Textiles",     "revenue": 35000, "status": "Completed", "start_odometer_km": 76000, "final_odometer_km": 78300, "distance_km": 2300, "planned_date": now - timedelta(days=5),  "dispatched_at": now - timedelta(days=5),  "completed_at": now - timedelta(days=4)},
        {"vehicle_id": v_map["Bike-05 Flash"],     "driver_id": d_map["Kavya Reddy"],  "vehicle_name": "Bike-05 Flash",    "driver_name": "Kavya Reddy",  "origin": "Pune",   "destination": "Nashik",   "cargo_weight_kg":   55, "cargo_description": "Documents",    "revenue":  3200, "status": "Completed", "start_odometer_km":  8200, "final_odometer_km":  8500, "distance_km":  300, "planned_date": now - timedelta(days=3),  "dispatched_at": now - timedelta(days=3),  "completed_at": now - timedelta(days=3)},
        # Dispatched (active)
        {"vehicle_id": v_map["Truck-03 Hercules"], "driver_id": d_map["Priya Singh"],  "vehicle_name": "Truck-03 Hercules","driver_name": "Priya Singh",  "origin": "Delhi",  "destination": "Agra",     "cargo_weight_kg": 6400, "cargo_description": "Auto Parts",   "revenue": 42000, "status": "Dispatched","start_odometer_km": 62100, "final_odometer_km": None,  "distance_km": None, "planned_date": now - timedelta(days=1),  "dispatched_at": now - timedelta(days=1),  "completed_at": None},
        {"vehicle_id": v_map["Van-07 Express"],    "driver_id": d_map["Suresh Patel"], "vehicle_name": "Van-07 Express",   "driver_name": "Suresh Patel", "origin": "Ahmedabad","destination": "Surat",  "cargo_weight_kg": 1400, "cargo_description": "Garments",     "revenue": 11000, "status": "Dispatched","start_odometer_km": 33600, "final_odometer_km": None,  "distance_km": None, "planned_date": now,                      "dispatched_at": now,                      "completed_at": None},
        # Draft
        {"vehicle_id": v_map["Truck-01 Bharat"],   "driver_id": d_map["Arjun Mehta"],  "vehicle_name": "Truck-01 Bharat",  "driver_name": "Arjun Mehta",  "origin": "Chennai","destination": "Coimbatore","cargo_weight_kg": 4200,"cargo_description":"Machinery",     "revenue": 32000, "status": "Draft",     "start_odometer_km": None,  "final_odometer_km": None,  "distance_km": None, "planned_date": now + timedelta(days=2),  "dispatched_at": None,                     "completed_at": None},
        # Cancelled
        {"vehicle_id": v_map["Van-02 Swift"],      "driver_id": d_map["Deepa Nair"],   "vehicle_name": "Van-02 Swift",     "driver_name": "Deepa Nair",   "origin": "Kochi",  "destination": "Trivandrum","cargo_weight_kg": 700,"cargo_description":"Perishables",   "revenue":  7500, "status": "Cancelled", "start_odometer_km": None,  "final_odometer_km": None,  "distance_km": None, "planned_date": now - timedelta(days=8),  "dispatched_at": None,                     "completed_at": None, "notes": "Customer cancelled order."},
    ]
    for t in trips_data:
        t["created_at"] = now
    await db.trips.insert_many(trips_data)

    # ── 4. MAINTENANCE LOGS ──────────────────────────────────────────────────
    maintenance_data = [
        # Open log for Van-04 (In Shop)
        {"vehicle_id": v_map["Van-04 Cargo King"], "vehicle_name": "Van-04 Cargo King", "service_type": "Engine Repair",     "description": "Complete engine rebuild due to coolant leak and power loss. Parts ordered.",  "cost": 45000, "service_date": str((now - timedelta(days=3)).date()),  "odometer_at_service": 15800, "technician": "Ravi Auto Works",   "next_service_date": str((now + timedelta(days=30)).date()), "next_service_km": 18000, "is_completed": False,  "created_at": now},
        # Completed logs
        {"vehicle_id": v_map["Truck-01 Bharat"],   "vehicle_name": "Truck-01 Bharat",   "service_type": "Oil Change",         "description": "Regular 10,000km oil change with filter replacement.",                          "cost":  2500, "service_date": str((now - timedelta(days=20)).date()), "odometer_at_service": 40000, "technician": "FleetCare Garage",  "next_service_date": str((now + timedelta(days=60)).date()), "next_service_km": 50000, "is_completed": True,   "created_at": now - timedelta(days=20)},
        {"vehicle_id": v_map["Truck-06 Titan"],    "vehicle_name": "Truck-06 Titan",    "service_type": "Tire Replacement",   "description": "All four rear tyres replaced due to excessive wear.",                           "cost": 18000, "service_date": str((now - timedelta(days=15)).date()), "odometer_at_service": 75000, "technician": "TyreFit Jaipur",    "next_service_date": str((now + timedelta(days=90)).date()), "next_service_km": 95000, "is_completed": True,   "created_at": now - timedelta(days=15)},
        {"vehicle_id": v_map["Van-02 Swift"],      "vehicle_name": "Van-02 Swift",      "service_type": "Brake Service",      "description": "Front brake pads and rotors replaced. Brake fluid flushed.",                    "cost":  6500, "service_date": str((now - timedelta(days=12)).date()), "odometer_at_service": 27000, "technician": "QuickBrake Mumbai",  "next_service_date": str((now + timedelta(days=45)).date()), "next_service_km": 35000, "is_completed": True,   "created_at": now - timedelta(days=12)},
        {"vehicle_id": v_map["Truck-03 Hercules"], "vehicle_name": "Truck-03 Hercules", "service_type": "Inspection",         "description": "Annual safety inspection — passed. Minor wiper replacement done.",               "cost":  1200, "service_date": str((now - timedelta(days=30)).date()), "odometer_at_service": 60000, "technician": "RTO Certified Tech","next_service_date": str((now + timedelta(days=365)).date()),"next_service_km": 85000, "is_completed": True,   "created_at": now - timedelta(days=30)},
    ]
    await db.maintenance.insert_many(maintenance_data)

    # ── 5. FUEL LOGS ─────────────────────────────────────────────────────────
    fuel_data = [
        {"vehicle_id": v_map["Truck-01 Bharat"],  "vehicle_name": "Truck-01 Bharat",  "liters": 120, "cost_per_liter": 96.5,  "total_cost": 11580, "date": str((now - timedelta(days=9)).date()),  "odometer_km": 45200, "notes": "HP Petrol Pune highway"},
        {"vehicle_id": v_map["Truck-01 Bharat"],  "vehicle_name": "Truck-01 Bharat",  "liters": 100, "cost_per_liter": 95.8,  "total_cost":  9580, "date": str((now - timedelta(days=20)).date()), "odometer_km": 40200, "notes": "Bharat Petro Chennai"},
        {"vehicle_id": v_map["Van-02 Swift"],     "vehicle_name": "Van-02 Swift",     "liters":  55, "cost_per_liter": 96.2,  "total_cost":  5291, "date": str((now - timedelta(days=6)).date()),  "odometer_km": 28400, "notes": "Reliance fuel depot"},
        {"vehicle_id": v_map["Truck-03 Hercules"],"vehicle_name": "Truck-03 Hercules","liters": 180, "cost_per_liter": 95.5,  "total_cost": 17190, "date": str((now - timedelta(days=1)).date()),  "odometer_km": 62100, "notes": "Delhi bypass IOCL"},
        {"vehicle_id": v_map["Truck-06 Titan"],   "vehicle_name": "Truck-06 Titan",   "liters": 160, "cost_per_liter": 97.0,  "total_cost": 15520, "date": str((now - timedelta(days=4)).date()),  "odometer_km": 78300, "notes": "Rajasthan state road pump"},
        {"vehicle_id": v_map["Van-07 Express"],   "vehicle_name": "Van-07 Express",   "liters":  70, "cost_per_liter": 96.8,  "total_cost":  6776, "date": str(now.date()),                        "odometer_km": 33600, "notes": "Ahmedabad city pump"},
        {"vehicle_id": v_map["Bike-05 Flash"],    "vehicle_name": "Bike-05 Flash",    "liters":  12, "cost_per_liter": 105.5, "total_cost":  1266, "date": str((now - timedelta(days=3)).date()),  "odometer_km":  8500, "notes": "Petrol bunk Nashik road"},
        {"vehicle_id": v_map["Truck-06 Titan"],   "vehicle_name": "Truck-06 Titan",   "liters": 140, "cost_per_liter": 96.0,  "total_cost": 13440, "date": str((now - timedelta(days=14)).date()), "odometer_km": 76000, "notes": "Jaipur main highway pump"},
    ]
    for f in fuel_data:
        f["created_at"] = now
    await db.fuel_logs.insert_many(fuel_data)

    return {
        "message": "Demo data seeded successfully!",
        "vehicles": len(vehicles_data),
        "drivers": len(drivers_data),
        "trips": len(trips_data),
        "maintenance_logs": len(maintenance_data),
        "fuel_logs": len(fuel_data),
    }
