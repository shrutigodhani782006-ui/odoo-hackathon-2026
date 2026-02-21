from fastapi import APIRouter, HTTPException
from models.maintenance import MaintenanceCreate, MaintenanceUpdate
from database import get_db
from bson import ObjectId
from datetime import datetime, date
from typing import Optional, List

router = APIRouter(prefix="/maintenance", tags=["Maintenance"])

def doc_to_dict(doc) -> dict:
    doc["id"] = str(doc["_id"])
    del doc["_id"]
    for key in ["service_date", "next_service_date"]:
        if doc.get(key) and not isinstance(doc[key], str):
            doc[key] = str(doc[key])
    if doc.get("created_at"):
        doc["created_at"] = doc["created_at"].isoformat()
    return doc

@router.get("/", response_model=List[dict])
async def get_maintenance_logs(vehicle_id: Optional[str] = None, is_completed: Optional[bool] = None):
    db = get_db()
    query = {}
    if vehicle_id:
        query["vehicle_id"] = vehicle_id
    if is_completed is not None:
        query["is_completed"] = is_completed
    cursor = db.maintenance.find(query).sort("service_date", -1)
    logs = []
    async for doc in cursor:
        logs.append(doc_to_dict(doc))
    return logs

@router.get("/stats", response_model=dict)
async def get_maintenance_stats():
    db = get_db()
    total = await db.maintenance.count_documents({})
    # Sum all costs
    pipeline = [{"$group": {"_id": None, "total_cost": {"$sum": "$cost"}}}]
    cost_res = await db.maintenance.aggregate(pipeline).to_list(1)
    total_cost = cost_res[0]["total_cost"] if cost_res else 0
    active = await db.vehicles.count_documents({"status": "In Shop"})
    return {"total_logs": total, "total_cost": total_cost, "vehicles_in_shop": active}

@router.get("/{log_id}", response_model=dict)
async def get_maintenance_log(log_id: str):
    db = get_db()
    doc = await db.maintenance.find_one({"_id": ObjectId(log_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Maintenance log not found.")
    return doc_to_dict(doc)

@router.post("/", response_model=dict, status_code=201)
async def create_maintenance_log(log: MaintenanceCreate):
    db = get_db()

    # Verify vehicle exists
    vehicle = await db.vehicles.find_one({"_id": ObjectId(log.vehicle_id)})
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found.")

    log_doc = log.model_dump()
    for key in ["service_date", "next_service_date"]:
        if log_doc.get(key) and isinstance(log_doc[key], date):
            log_doc[key] = log_doc[key].isoformat()
    log_doc["is_completed"] = False
    log_doc["created_at"] = datetime.utcnow()
    log_doc["vehicle_name"] = vehicle.get("name", "")

    result = await db.maintenance.insert_one(log_doc)
    log_doc["id"] = str(result.inserted_id)
    del log_doc["_id"]

    # AUTO-LOGIC: Set vehicle status to "In Shop"
    await db.vehicles.update_one(
        {"_id": ObjectId(log.vehicle_id)},
        {"$set": {"status": "In Shop", "updated_at": datetime.utcnow()}}
    )

    return log_doc

@router.put("/{log_id}", response_model=dict)
async def update_maintenance_log(log_id: str, update: MaintenanceUpdate):
    db = get_db()
    # mode='json' serializes enums to string values
    update_data = {k: v for k, v in update.model_dump(mode='json').items() if v is not None}
    for key in ["service_date", "next_service_date"]:
        if update_data.get(key) and isinstance(update_data[key], date):
            update_data[key] = update_data[key].isoformat()
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update.")
    result = await db.maintenance.update_one({"_id": ObjectId(log_id)}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Log not found.")
    updated = await db.maintenance.find_one({"_id": ObjectId(log_id)})
    return doc_to_dict(updated)

@router.patch("/{log_id}/complete", response_model=dict)
async def complete_maintenance(log_id: str):
    db = get_db()
    log = await db.maintenance.find_one({"_id": ObjectId(log_id)})
    if not log:
        raise HTTPException(status_code=404, detail="Log not found.")
    await db.maintenance.update_one({"_id": ObjectId(log_id)}, {"$set": {"is_completed": True}})

    # Check if vehicle has any other open maintenance logs
    open_logs = await db.maintenance.count_documents({"vehicle_id": log["vehicle_id"], "is_completed": False, "_id": {"$ne": ObjectId(log_id)}})
    if open_logs == 0:
        # Return vehicle to Available
        await db.vehicles.update_one(
            {"_id": ObjectId(log["vehicle_id"])},
            {"$set": {"status": "Available", "updated_at": datetime.utcnow()}}
        )
    return {"message": "Maintenance completed. Vehicle returned to Available.", "id": log_id}

@router.delete("/{log_id}", response_model=dict)
async def delete_maintenance_log(log_id: str):
    db = get_db()
    result = await db.maintenance.delete_one({"_id": ObjectId(log_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Log not found.")
    return {"message": "Log deleted.", "id": log_id}
