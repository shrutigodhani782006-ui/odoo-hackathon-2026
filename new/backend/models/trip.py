from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from enum import Enum

class TripStatus(str, Enum):
    draft = "Draft"
    dispatched = "Dispatched"
    completed = "Completed"
    cancelled = "Cancelled"

class TripCreate(BaseModel):
    vehicle_id: str
    driver_id: str
    origin: str
    destination: str
    cargo_weight_kg: float
    cargo_description: Optional[str] = None
    planned_date: Optional[datetime] = None
    revenue: Optional[float] = 0.0

class TripUpdate(BaseModel):
    status: Optional[TripStatus] = None
    final_odometer_km: Optional[float] = None
    actual_end_date: Optional[datetime] = None
    revenue: Optional[float] = None
    notes: Optional[str] = None

class Trip(TripCreate):
    id: Optional[str] = None
    status: TripStatus = TripStatus.draft
    start_odometer_km: Optional[float] = None
    final_odometer_km: Optional[float] = None
    distance_km: Optional[float] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    dispatched_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    cancelled_at: Optional[datetime] = None
    notes: Optional[str] = None
