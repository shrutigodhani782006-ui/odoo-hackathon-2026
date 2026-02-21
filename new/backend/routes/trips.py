from fastapi import APIRouter, HTTPException
from models.trip import TripCreate, TripUpdate
from database import get_db
from bson import ObjectId
from datetime import datetime, date
from typing import Optional, List

router = APIRouter(prefix="/trips", tags=["Trips"])

def doc_to_dict(doc) -> dict:
    doc["id"] = str(doc["_id"])
    del doc["_id"]
    for key in ["planned_date", "created_at", "dispatched_at", "completed_at", "cancelled_at"]:
        if doc.get(key) and isinstance(doc[key], datetime):
            doc[key] = doc[key].isoformat()
    return doc

@router.get("/", response_model=List[dict])
async def get_trips(status: Optional[str] = None, vehicle_id: Optional[str] = None, driver_id: Optional[str] = None):
    db = get_db()
    query = {}
    if status:
        query["status"] = status
    if vehicle_id:
        query["vehicle_id"] = vehicle_id
    if driver_id:
        query["driver_id"] = driver_id
    cursor = db.trips.find(query).sort("created_at", -1)
    trips = []
    async for doc in cursor:
        trips.append(doc_to_dict(doc))
    return trips

@router.get("/stats", response_model=dict)
async def get_trip_stats():
    db = get_db()
    total = await db.trips.count_documents({})
    dispatched = await db.trips.count_documents({"status": "Dispatched"})
    completed = await db.trips.count_documents({"status": "Completed"})
    draft = await db.trips.count_documents({"status": "Draft"})
    cancelled = await db.trips.count_documents({"status": "Cancelled"})
    return {"total": total, "dispatched": dispatched, "completed": completed, "draft": draft, "cancelled": cancelled}

@router.get("/{trip_id}", response_model=dict)
async def get_trip(trip_id: str):
    db = get_db()
    doc = await db.trips.find_one({"_id": ObjectId(trip_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Trip not found.")
    return doc_to_dict(doc)

@router.post("/", response_model=dict, status_code=201)
async def create_trip(trip: TripCreate):
    db = get_db()

    # Fetch vehicle
    vehicle = await db.vehicles.find_one({"_id": ObjectId(trip.vehicle_id)})
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found.")
    if vehicle["status"] not in ["Available"]:
        raise HTTPException(status_code=400, detail=f"Vehicle is not available. Current status: {vehicle['status']}")

    # Validate cargo weight
    if trip.cargo_weight_kg > vehicle["max_capacity_kg"]:
        raise HTTPException(
            status_code=400,
            detail=f"Cargo weight ({trip.cargo_weight_kg}kg) exceeds vehicle max capacity ({vehicle['max_capacity_kg']}kg)."
        )

    # Fetch driver
    driver = await db.drivers.find_one({"_id": ObjectId(trip.driver_id)})
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found.")
    if driver["status"] == "Suspended":
        raise HTTPException(status_code=400, detail="Driver is suspended and cannot be assigned.")
    if driver["status"] == "On Trip":
        raise HTTPException(status_code=400, detail="Driver is already on a trip.")

    # Validate license expiry
    try:
        expiry = date.fromisoformat(str(driver["license_expiry"]))
        if date.today() > expiry:
            raise HTTPException(status_code=400, detail="Driver's license has expired. Cannot assign trip.")
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid license expiry date for driver.")

    trip_doc = trip.model_dump(mode='json')
    if trip_doc.get("planned_date") and isinstance(trip_doc["planned_date"], datetime):
        trip_doc["planned_date"] = trip_doc["planned_date"].isoformat()
    trip_doc["status"] = "Draft"
    trip_doc["start_odometer_km"] = vehicle.get("odometer_km", 0)
    trip_doc["vehicle_name"] = vehicle.get("name", "")
    trip_doc["driver_name"] = driver.get("name", "")
    trip_doc["created_at"] = datetime.utcnow()

    result = await db.trips.insert_one(trip_doc)
    trip_doc["id"] = str(result.inserted_id)
    del trip_doc["_id"]
    return trip_doc

@router.patch("/{trip_id}/dispatch", response_model=dict)
async def dispatch_trip(trip_id: str):
    db = get_db()
    trip = await db.trips.find_one({"_id": ObjectId(trip_id)})
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found.")
    if trip["status"] != "Draft":
        raise HTTPException(status_code=400, detail="Only Draft trips can be dispatched.")

    # Update statuses
    await db.vehicles.update_one({"_id": ObjectId(trip["vehicle_id"])}, {"$set": {"status": "On Trip", "updated_at": datetime.utcnow()}})
    await db.drivers.update_one({"_id": ObjectId(trip["driver_id"])}, {"$set": {"status": "On Trip", "updated_at": datetime.utcnow()}})
    await db.trips.update_one({"_id": ObjectId(trip_id)}, {"$set": {"status": "Dispatched", "dispatched_at": datetime.utcnow()}})
    return {"message": "Trip dispatched.", "id": trip_id}

@router.patch("/{trip_id}/complete", response_model=dict)
async def complete_trip(trip_id: str, update: TripUpdate):
    db = get_db()
    trip = await db.trips.find_one({"_id": ObjectId(trip_id)})
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found.")
    if trip["status"] != "Dispatched":
        raise HTTPException(status_code=400, detail="Only Dispatched trips can be completed.")

    final_km = update.final_odometer_km
    start_km = trip.get("start_odometer_km", 0)
    distance = round(final_km - start_km, 2) if final_km else None

    # Update vehicle odometer & status
    vehicle_update = {"status": "Available", "updated_at": datetime.utcnow()}
    if final_km:
        vehicle_update["odometer_km"] = final_km
    await db.vehicles.update_one({"_id": ObjectId(trip["vehicle_id"])}, {"$set": vehicle_update})

    # Update driver stats & status
    await db.drivers.update_one(
        {"_id": ObjectId(trip["driver_id"])},
        {"$set": {"status": "On Duty", "updated_at": datetime.utcnow()}, "$inc": {"trips_completed": 1, "trips_total": 1}}
    )

    # Update trip
    trip_update = {
        "status": "Completed",
        "completed_at": datetime.utcnow(),
        "final_odometer_km": final_km,
        "distance_km": distance,
    }
    if update.revenue is not None:
        trip_update["revenue"] = update.revenue
    if update.notes:
        trip_update["notes"] = update.notes
    await db.trips.update_one({"_id": ObjectId(trip_id)}, {"$set": trip_update})
    return {"message": "Trip completed.", "id": trip_id, "distance_km": distance}

@router.patch("/{trip_id}/cancel", response_model=dict)
async def cancel_trip(trip_id: str):
    db = get_db()
    trip = await db.trips.find_one({"_id": ObjectId(trip_id)})
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found.")
    if trip["status"] == "Completed":
        raise HTTPException(status_code=400, detail="Cannot cancel a completed trip.")

    # Free up vehicle and driver if dispatched
    if trip["status"] == "Dispatched":
        await db.vehicles.update_one({"_id": ObjectId(trip["vehicle_id"])}, {"$set": {"status": "Available", "updated_at": datetime.utcnow()}})
        await db.drivers.update_one(
            {"_id": ObjectId(trip["driver_id"])},
            {"$set": {"status": "On Duty", "updated_at": datetime.utcnow()}, "$inc": {"trips_total": 1}}
        )

    await db.trips.update_one({"_id": ObjectId(trip_id)}, {"$set": {"status": "Cancelled", "cancelled_at": datetime.utcnow()}})
    return {"message": "Trip cancelled.", "id": trip_id}

@router.delete("/{trip_id}", response_model=dict)
async def delete_trip(trip_id: str):
    db = get_db()
    result = await db.trips.delete_one({"_id": ObjectId(trip_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Trip not found.")
    return {"message": "Trip deleted.", "id": trip_id}
