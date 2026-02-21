from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from enum import Enum

class VehicleType(str, Enum):
    truck = "Truck"
    van = "Van"
    bike = "Bike"

class VehicleStatus(str, Enum):
    available = "Available"
    on_trip = "On Trip"
    in_shop = "In Shop"
    retired = "Retired"

class VehicleCreate(BaseModel):
    name: str
    license_plate: str
    vehicle_type: VehicleType
    max_capacity_kg: float
    odometer_km: float = 0.0
    region: Optional[str] = None
    acquisition_cost: Optional[float] = 0.0
    year: Optional[int] = None

class VehicleUpdate(BaseModel):
    name: Optional[str] = None
    vehicle_type: Optional[VehicleType] = None
    max_capacity_kg: Optional[float] = None
    odometer_km: Optional[float] = None
    status: Optional[VehicleStatus] = None
    region: Optional[str] = None
    acquisition_cost: Optional[float] = None
    year: Optional[int] = None

class Vehicle(VehicleCreate):
    id: Optional[str] = None
    status: VehicleStatus = VehicleStatus.available
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
