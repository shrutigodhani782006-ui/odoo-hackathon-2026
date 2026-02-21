from fastapi import APIRouter, HTTPException, Query
from models.vehicle import VehicleCreate, VehicleUpdate, VehicleStatus
from database import get_db
from bson import ObjectId
from datetime import datetime
from typing import Optional, List

router = APIRouter(prefix="/vehicles", tags=["Vehicles"])

def doc_to_dict(doc) -> dict:
    doc["id"] = str(doc["_id"])
    del doc["_id"]
    return doc

@router.get("/", response_model=List[dict])
async def get_vehicles(
    status: Optional[str] = None,
    vehicle_type: Optional[str] = None,
    region: Optional[str] = None,
):
    db = get_db()
    query = {}
    if status:
        query["status"] = status
    if vehicle_type:
        query["vehicle_type"] = vehicle_type
    if region:
        query["region"] = region
    cursor = db.vehicles.find(query).sort("created_at", -1)
    vehicles = []
    async for doc in cursor:
        vehicles.append(doc_to_dict(doc))
    return vehicles

@router.get("/available", response_model=List[dict])
async def get_available_vehicles():
    db = get_db()
    cursor = db.vehicles.find({"status": "Available"})
    vehicles = []
    async for doc in cursor:
        vehicles.append(doc_to_dict(doc))
    return vehicles

@router.get("/stats", response_model=dict)
async def get_vehicle_stats():
    db = get_db()
    total = await db.vehicles.count_documents({})
    on_trip = await db.vehicles.count_documents({"status": "On Trip"})
    in_shop = await db.vehicles.count_documents({"status": "In Shop"})
    available = await db.vehicles.count_documents({"status": "Available"})
    retired = await db.vehicles.count_documents({"status": "Retired"})
    utilization = round((on_trip / total * 100), 1) if total > 0 else 0
    return {
        "total": total,
        "on_trip": on_trip,
        "in_shop": in_shop,
        "available": available,
        "retired": retired,
        "utilization_rate": utilization
    }

@router.get("/{vehicle_id}", response_model=dict)
async def get_vehicle(vehicle_id: str):
    db = get_db()
    doc = await db.vehicles.find_one({"_id": ObjectId(vehicle_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Vehicle not found.")
    return doc_to_dict(doc)

@router.post("/", response_model=dict, status_code=201)
async def create_vehicle(vehicle: VehicleCreate):
    db = get_db()
    existing = await db.vehicles.find_one({"license_plate": vehicle.license_plate})
    if existing:
        raise HTTPException(status_code=400, detail="License plate already registered.")
    vehicle_doc = vehicle.model_dump(mode='json')
    vehicle_doc["status"] = "Available"
    vehicle_doc["created_at"] = datetime.utcnow()
    vehicle_doc["updated_at"] = datetime.utcnow()
    result = await db.vehicles.insert_one(vehicle_doc)
    vehicle_doc["id"] = str(result.inserted_id)
    del vehicle_doc["_id"]
    return vehicle_doc

@router.put("/{vehicle_id}", response_model=dict)
async def update_vehicle(vehicle_id: str, update: VehicleUpdate):
    db = get_db()
    update_data = {k: v for k, v in update.model_dump(mode='json').items() if v is not None}
    update_data["updated_at"] = datetime.utcnow()
    result = await db.vehicles.update_one(
        {"_id": ObjectId(vehicle_id)}, {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Vehicle not found.")
    return {"message": "Vehicle updated.", "id": vehicle_id}

@router.patch("/{vehicle_id}/retire", response_model=dict)
async def retire_vehicle(vehicle_id: str):
    db = get_db()
    result = await db.vehicles.update_one(
        {"_id": ObjectId(vehicle_id)},
        {"$set": {"status": "Retired", "updated_at": datetime.utcnow()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Vehicle not found.")
    return {"message": "Vehicle retired.", "id": vehicle_id}

@router.patch("/{vehicle_id}/status", response_model=dict)
async def update_vehicle_status(vehicle_id: str, status: str):
    db = get_db()
    valid = ["Available", "On Trip", "In Shop", "Retired"]
    if status not in valid:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid}")
    result = await db.vehicles.update_one(
        {"_id": ObjectId(vehicle_id)},
        {"$set": {"status": status, "updated_at": datetime.utcnow()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Vehicle not found.")
    return {"message": "Status updated.", "id": vehicle_id, "status": status}

@router.delete("/{vehicle_id}", response_model=dict)
async def delete_vehicle(vehicle_id: str):
    db = get_db()
    result = await db.vehicles.delete_one({"_id": ObjectId(vehicle_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Vehicle not found.")
    return {"message": "Vehicle deleted.", "id": vehicle_id}
