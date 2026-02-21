from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, date

class FuelLogCreate(BaseModel):
    vehicle_id: str
    trip_id: Optional[str] = None
    liters: float
    cost_per_liter: float
    total_cost: float
    date: date
    odometer_km: float
    station: Optional[str] = None

class FuelLogUpdate(BaseModel):
    liters: Optional[float] = None
    cost_per_liter: Optional[float] = None
    total_cost: Optional[float] = None
    odometer_km: Optional[float] = None
    station: Optional[str] = None

class FuelLog(FuelLogCreate):
    id: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
