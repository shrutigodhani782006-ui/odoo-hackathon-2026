from fastapi import APIRouter
from database import get_db
from typing import List
from datetime import datetime

router = APIRouter(prefix="/analytics", tags=["Analytics"])

@router.get("/overview", response_model=dict)
async def get_overview():
    db = get_db()
    # Vehicles
    total_vehicles = await db.vehicles.count_documents({})
    active_vehicles = await db.vehicles.count_documents({"status": "On Trip"})
    in_shop = await db.vehicles.count_documents({"status": "In Shop"})
    available = await db.vehicles.count_documents({"status": "Available"})
    utilization = round(active_vehicles / total_vehicles * 100, 1) if total_vehicles > 0 else 0

    # Drivers
    total_drivers = await db.drivers.count_documents({})
    active_drivers = await db.drivers.count_documents({"status": {"$in": ["On Trip", "On Duty"]}})

    # Trips
    total_trips = await db.trips.count_documents({})
    completed_trips = await db.trips.count_documents({"status": "Completed"})

    # Pending cargo (Draft trips)
    pending_cargo = await db.trips.count_documents({"status": "Draft"})

    # Revenue
    rev_pipeline = [{"$match": {"status": "Completed"}}, {"$group": {"_id": None, "total": {"$sum": "$revenue"}}}]
    rev_res = await db.trips.aggregate(rev_pipeline).to_list(1)
    total_revenue = rev_res[0]["total"] if rev_res else 0

    # Fuel & Maintenance Cost
    fuel_pipeline = [{"$group": {"_id": None, "total": {"$sum": "$total_cost"}}}]
    fuel_res = await db.fuel_logs.aggregate(fuel_pipeline).to_list(1)
    total_fuel_cost = fuel_res[0]["total"] if fuel_res else 0

    maint_pipeline = [{"$group": {"_id": None, "total": {"$sum": "$cost"}}}]
    maint_res = await db.maintenance.aggregate(maint_pipeline).to_list(1)
    total_maint_cost = maint_res[0]["total"] if maint_res else 0

    return {
        "total_vehicles": total_vehicles,
        "active_fleet": active_vehicles,
        "maintenance_alerts": in_shop,
        "available_vehicles": available,
        "utilization_rate": utilization,
        "pending_cargo": pending_cargo,
        "total_drivers": total_drivers,
        "active_drivers": active_drivers,
        "total_trips": total_trips,
        "completed_trips": completed_trips,
        "total_revenue": total_revenue,
        "total_fuel_cost": total_fuel_cost,
        "total_maintenance_cost": total_maint_cost,
        "total_operational_cost": total_fuel_cost + total_maint_cost,
        "net_profit": total_revenue - (total_fuel_cost + total_maint_cost),
    }

@router.get("/vehicle-roi", response_model=List[dict])
async def get_vehicle_roi():
    db = get_db()
    cursor = db.vehicles.find({})
    result = []
    async for vehicle in cursor:
        vehicle_id = str(vehicle["_id"])

        # Revenue from completed trips
        rev_pipeline = [
            {"$match": {"vehicle_id": vehicle_id, "status": "Completed"}},
            {"$group": {"_id": None, "total": {"$sum": "$revenue"}}}
        ]
        rev_res = await db.trips.aggregate(rev_pipeline).to_list(1)
        revenue = rev_res[0]["total"] if rev_res else 0

        # Fuel Cost
        fuel_pipeline = [{"$match": {"vehicle_id": vehicle_id}}, {"$group": {"_id": None, "total": {"$sum": "$total_cost"}}}]
        fuel_res = await db.fuel_logs.aggregate(fuel_pipeline).to_list(1)
        fuel_cost = fuel_res[0]["total"] if fuel_res else 0

        # Maintenance Cost
        maint_pipeline = [{"$match": {"vehicle_id": vehicle_id}}, {"$group": {"_id": None, "total": {"$sum": "$cost"}}}]
        maint_res = await db.maintenance.aggregate(maint_pipeline).to_list(1)
        maint_cost = maint_res[0]["total"] if maint_res else 0

        ops_cost = fuel_cost + maint_cost
        acquisition = vehicle.get("acquisition_cost", 1) or 1
        roi = round((revenue - ops_cost) / acquisition * 100, 2) if acquisition > 0 else 0

        # Trips count
        trips_count = await db.trips.count_documents({"vehicle_id": vehicle_id, "status": "Completed"})

        # Odometer
        odometer = vehicle.get("odometer_km", 0)

        result.append({
            "vehicle_id": vehicle_id,
            "name": vehicle.get("name", ""),
            "license_plate": vehicle.get("license_plate", ""),
            "vehicle_type": vehicle.get("vehicle_type", ""),
            "status": vehicle.get("status", ""),
            "acquisition_cost": acquisition,
            "revenue": revenue,
            "fuel_cost": fuel_cost,
            "maintenance_cost": maint_cost,
            "total_operational_cost": ops_cost,
            "roi_percent": roi,
            "trips_completed": trips_count,
            "odometer_km": odometer,
        })
    return result

@router.get("/fuel-efficiency", response_model=List[dict])
async def get_fuel_efficiency():
    db = get_db()
    pipeline = [
        {"$group": {
            "_id": "$vehicle_id",
            "total_liters": {"$sum": "$liters"},
            "total_cost": {"$sum": "$total_cost"},
            "max_odometer": {"$max": "$odometer_km"},
            "min_odometer": {"$min": "$odometer_km"},
            "entries": {"$sum": 1},
        }}
    ]
    result = []
    async for row in db.fuel_logs.aggregate(pipeline):
        distance = row["max_odometer"] - row["min_odometer"]
        efficiency = round(distance / row["total_liters"], 2) if row["total_liters"] > 0 else 0
        vehicle = await db.vehicles.find_one({"_id": __import__('bson').ObjectId(row["_id"])})
        result.append({
            "vehicle_id": row["_id"],
            "vehicle_name": vehicle.get("name", "") if vehicle else "",
            "license_plate": vehicle.get("license_plate", "") if vehicle else "",
            "total_liters": row["total_liters"],
            "total_fuel_cost": row["total_cost"],
            "distance_km": round(distance, 2),
            "fuel_efficiency_km_per_l": efficiency,
        })
    return result

@router.get("/monthly-costs", response_model=List[dict])
async def get_monthly_costs():
    db = get_db()
    pipeline = [
        {"$addFields": {
            "month": {"$dateToString": {"format": "%Y-%m", "date": "$created_at"}}
        }},
        {"$group": {
            "_id": "$month",
            "fuel_cost": {"$sum": "$total_cost"},
            "entries": {"$sum": 1}
        }},
        {"$sort": {"_id": 1}}
    ]
    fuel_monthly = []
    async for row in db.fuel_logs.aggregate(pipeline):
        fuel_monthly.append({"month": row["_id"], "fuel_cost": row["fuel_cost"]})

    maint_pipeline = [
        {"$addFields": {"month": {"$dateToString": {"format": "%Y-%m", "date": "$created_at"}}}},
        {"$group": {"_id": "$month", "maint_cost": {"$sum": "$cost"}}},
        {"$sort": {"_id": 1}}
    ]
    maint_monthly = {}
    async for row in db.maintenance.aggregate(maint_pipeline):
        maint_monthly[row["_id"]] = row["maint_cost"]

    combined = {}
    for entry in fuel_monthly:
        m = entry["month"]
        combined[m] = {"month": m, "fuel_cost": entry["fuel_cost"], "maintenance_cost": maint_monthly.get(m, 0)}
        combined[m]["total"] = combined[m]["fuel_cost"] + combined[m]["maintenance_cost"]

    for m, cost in maint_monthly.items():
        if m not in combined:
            combined[m] = {"month": m, "fuel_cost": 0, "maintenance_cost": cost, "total": cost}

    return sorted(combined.values(), key=lambda x: x["month"])

@router.get("/trip-performance", response_model=dict)
async def get_trip_performance():
    db = get_db()
    total = await db.trips.count_documents({})
    completed = await db.trips.count_documents({"status": "Completed"})
    cancelled = await db.trips.count_documents({"status": "Cancelled"})
    dispatched = await db.trips.count_documents({"status": "Dispatched"})
    draft = await db.trips.count_documents({"status": "Draft"})
    completion_rate = round(completed / total * 100, 1) if total > 0 else 0
    cancellation_rate = round(cancelled / total * 100, 1) if total > 0 else 0
    return {
        "total": total,
        "completed": completed,
        "cancelled": cancelled,
        "dispatched": dispatched,
        "draft": draft,
        "completion_rate": completion_rate,
        "cancellation_rate": cancellation_rate,
    }
