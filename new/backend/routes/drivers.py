from fastapi import APIRouter, HTTPException, Query
from models.driver import DriverCreate, DriverUpdate
from database import get_db
from bson import ObjectId
from datetime import datetime, date
from typing import Optional, List

router = APIRouter(prefix="/drivers", tags=["Drivers"])

def doc_to_dict(doc) -> dict:
    doc["id"] = str(doc["_id"])
    del doc["_id"]
    if "license_expiry" in doc and isinstance(doc["license_expiry"], datetime):
        doc["license_expiry"] = doc["license_expiry"].date().isoformat()
    elif "license_expiry" in doc and isinstance(doc["license_expiry"], date):
        doc["license_expiry"] = doc["license_expiry"].isoformat()
    today = date.today()
    expiry_str = doc.get("license_expiry", "")
    try:
        expiry = date.fromisoformat(str(expiry_str))
        doc["is_license_valid"] = today <= expiry
        doc["days_until_expiry"] = (expiry - today).days
    except:
        doc["is_license_valid"] = False
        doc["days_until_expiry"] = -1
    trips_total = doc.get("trips_total", 0)
    trips_completed = doc.get("trips_completed", 0)
    doc["completion_rate"] = round((trips_completed / trips_total * 100), 1) if trips_total > 0 else 0.0
    return doc

@router.get("/", response_model=List[dict])
async def get_drivers(
    status: Optional[str] = None,
    license_category: Optional[str] = None,
):
    db = get_db()
    query = {}
    if status:
        query["status"] = status
    if license_category:
        query["license_categories"] = {"$in": [license_category]}
    cursor = db.drivers.find(query).sort("created_at", -1)
    drivers = []
    async for doc in cursor:
        drivers.append(doc_to_dict(doc))
    return drivers

@router.get("/available", response_model=List[dict])
async def get_available_drivers():
    db = get_db()
    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    cursor = db.drivers.find({
        "status": {"$in": ["On Duty", "Off Duty"]},
    })
    drivers = []
    async for doc in cursor:
        d = doc_to_dict(doc)
        if d.get("is_license_valid", False) and d.get("status") != "Suspended":
            drivers.append(d)
    return drivers

@router.get("/expiring-licenses", response_model=List[dict])
async def get_expiring_licenses(days: int = 30):
    db = get_db()
    cursor = db.drivers.find({})
    expiring = []
    async for doc in cursor:
        d = doc_to_dict(doc)
        if 0 <= d.get("days_until_expiry", -1) <= days:
            expiring.append(d)
    return expiring

@router.get("/stats", response_model=dict)
async def get_driver_stats():
    db = get_db()
    total = await db.drivers.count_documents({})
    on_duty = await db.drivers.count_documents({"status": "On Duty"})
    on_trip = await db.drivers.count_documents({"status": "On Trip"})
    off_duty = await db.drivers.count_documents({"status": "Off Duty"})
    suspended = await db.drivers.count_documents({"status": "Suspended"})
    return {
        "total": total,
        "on_duty": on_duty,
        "on_trip": on_trip,
        "off_duty": off_duty,
        "suspended": suspended,
    }

@router.get("/{driver_id}", response_model=dict)
async def get_driver(driver_id: str):
    db = get_db()
    doc = await db.drivers.find_one({"_id": ObjectId(driver_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Driver not found.")
    return doc_to_dict(doc)

@router.post("/", response_model=dict, status_code=201)
async def create_driver(driver: DriverCreate):
    db = get_db()
    existing = await db.drivers.find_one({"employee_id": driver.employee_id})
    if existing:
        raise HTTPException(status_code=400, detail="Employee ID already registered.")
    driver_doc = driver.model_dump(mode='json')
    if isinstance(driver_doc.get("license_expiry"), date):
        driver_doc["license_expiry"] = driver_doc["license_expiry"].isoformat()
    driver_doc["trips_completed"] = 0
    driver_doc["trips_total"] = 0
    driver_doc["safety_score"] = 100.0
    driver_doc["created_at"] = datetime.utcnow()
    driver_doc["updated_at"] = datetime.utcnow()
    result = await db.drivers.insert_one(driver_doc)
    driver_doc["id"] = str(result.inserted_id)
    del driver_doc["_id"]
    return driver_doc

@router.put("/{driver_id}", response_model=dict)
async def update_driver(driver_id: str, update: DriverUpdate):
    db = get_db()
    update_data = {k: v for k, v in update.model_dump(mode='json').items() if v is not None}
    if "license_expiry" in update_data and isinstance(update_data["license_expiry"], date):
        update_data["license_expiry"] = update_data["license_expiry"].isoformat()
    update_data["updated_at"] = datetime.utcnow()
    result = await db.drivers.update_one(
        {"_id": ObjectId(driver_id)}, {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Driver not found.")
    return {"message": "Driver updated.", "id": driver_id}

@router.patch("/{driver_id}/status", response_model=dict)
async def update_driver_status(driver_id: str, status: str):
    db = get_db()
    valid = ["On Duty", "Off Duty", "Suspended", "On Trip"]
    if status not in valid:
        raise HTTPException(status_code=400, detail=f"Invalid status.")
    result = await db.drivers.update_one(
        {"_id": ObjectId(driver_id)},
        {"$set": {"status": status, "updated_at": datetime.utcnow()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Driver not found.")
    return {"message": "Status updated.", "id": driver_id, "status": status}

@router.delete("/{driver_id}", response_model=dict)
async def delete_driver(driver_id: str):
    db = get_db()
    result = await db.drivers.delete_one({"_id": ObjectId(driver_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Driver not found.")
    return {"message": "Driver deleted.", "id": driver_id}
