from fastapi import APIRouter, HTTPException
from models.fuel import FuelLogCreate, FuelLogUpdate
from database import get_db
from bson import ObjectId
from datetime import datetime, date
from typing import Optional, List

router = APIRouter(prefix="/fuel", tags=["Fuel & Expenses"])

def doc_to_dict(doc) -> dict:
    doc["id"] = str(doc["_id"])
    del doc["_id"]
    if doc.get("date") and not isinstance(doc["date"], str):
        doc["date"] = str(doc["date"])
    if doc.get("created_at"):
        doc["created_at"] = doc["created_at"].isoformat()
    return doc

@router.get("/", response_model=List[dict])
async def get_fuel_logs(vehicle_id: Optional[str] = None, trip_id: Optional[str] = None):
    db = get_db()
    query = {}
    if vehicle_id:
        query["vehicle_id"] = vehicle_id
    if trip_id:
        query["trip_id"] = trip_id
    cursor = db.fuel_logs.find(query).sort("date", -1)
    logs = []
    async for doc in cursor:
        logs.append(doc_to_dict(doc))
    return logs

@router.get("/stats", response_model=dict)
async def get_fuel_stats():
    db = get_db()
    pipeline = [
        {"$group": {"_id": None, "total_cost": {"$sum": "$total_cost"}, "total_liters": {"$sum": "$liters"}, "count": {"$sum": 1}}}
    ]
    res = await db.fuel_logs.aggregate(pipeline).to_list(1)
    if res:
        return {"total_cost": res[0]["total_cost"], "total_liters": res[0]["total_liters"], "total_logs": res[0]["count"]}
    return {"total_cost": 0, "total_liters": 0, "total_logs": 0}

@router.get("/vehicle/{vehicle_id}/summary", response_model=dict)
async def get_vehicle_fuel_summary(vehicle_id: str):
    db = get_db()
    pipeline = [
        {"$match": {"vehicle_id": vehicle_id}},
        {"$group": {
            "_id": "$vehicle_id",
            "total_fuel_cost": {"$sum": "$total_cost"},
            "total_liters": {"$sum": "$liters"},
            "entries": {"$sum": 1},
            "max_odometer": {"$max": "$odometer_km"},
            "min_odometer": {"$min": "$odometer_km"},
        }}
    ]
    res = await db.fuel_logs.aggregate(pipeline).to_list(1)
    # Maintenance costs for vehicle
    maint_pipeline = [
        {"$match": {"vehicle_id": vehicle_id}},
        {"$group": {"_id": None, "total_maintenance_cost": {"$sum": "$cost"}}}
    ]
    maint_res = await db.maintenance.aggregate(maint_pipeline).to_list(1)
    total_maintenance = maint_res[0]["total_maintenance_cost"] if maint_res else 0

    if res:
        r = res[0]
        total_fuel = r["total_fuel_cost"]
        total_ops = total_fuel + total_maintenance
        distance = r["max_odometer"] - r["min_odometer"] if r["max_odometer"] > r["min_odometer"] else 0
        fuel_efficiency = round(distance / r["total_liters"], 2) if r["total_liters"] > 0 else 0
        cost_per_km = round(total_ops / distance, 2) if distance > 0 else 0
        return {
            "vehicle_id": vehicle_id,
            "total_fuel_cost": total_fuel,
            "total_maintenance_cost": total_maintenance,
            "total_operational_cost": total_ops,
            "total_liters": r["total_liters"],
            "distance_km": distance,
            "fuel_efficiency_km_per_l": fuel_efficiency,
            "cost_per_km": cost_per_km,
        }
    return {
        "vehicle_id": vehicle_id,
        "total_fuel_cost": 0,
        "total_maintenance_cost": total_maintenance,
        "total_operational_cost": total_maintenance,
        "total_liters": 0,
        "distance_km": 0,
        "fuel_efficiency_km_per_l": 0,
        "cost_per_km": 0,
    }

@router.get("/{log_id}", response_model=dict)
async def get_fuel_log(log_id: str):
    db = get_db()
    doc = await db.fuel_logs.find_one({"_id": ObjectId(log_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Fuel log not found.")
    return doc_to_dict(doc)

@router.post("/", response_model=dict, status_code=201)
async def create_fuel_log(log: FuelLogCreate):
    db = get_db()
    vehicle = await db.vehicles.find_one({"_id": ObjectId(log.vehicle_id)})
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found.")
    log_doc = log.model_dump(mode='json')
    if isinstance(log_doc.get("date"), date):
        log_doc["date"] = log_doc["date"].isoformat()
    log_doc["vehicle_name"] = vehicle.get("name", "")
    log_doc["created_at"] = datetime.utcnow()
    result = await db.fuel_logs.insert_one(log_doc)
    log_doc["id"] = str(result.inserted_id)
    del log_doc["_id"]
    return log_doc

@router.put("/{log_id}", response_model=dict)
async def update_fuel_log(log_id: str, update: FuelLogUpdate):
    db = get_db()
    update_data = {k: v for k, v in update.model_dump(mode='json').items() if v is not None}
    result = await db.fuel_logs.update_one({"_id": ObjectId(log_id)}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Not found.")
    return {"message": "Updated.", "id": log_id}

@router.delete("/{log_id}", response_model=dict)
async def delete_fuel_log(log_id: str):
    db = get_db()
    result = await db.fuel_logs.delete_one({"_id": ObjectId(log_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Not found.")
    return {"message": "Deleted.", "id": log_id}
