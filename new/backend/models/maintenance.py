from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, date
from enum import Enum

class ServiceType(str, Enum):
    oil_change = "Oil Change"
    tire_replacement = "Tire Replacement"
    brake_service = "Brake Service"
    engine_repair = "Engine Repair"
    transmission = "Transmission"
    electrical = "Electrical"
    bodywork = "Bodywork"
    inspection = "Inspection"
    other = "Other"

class MaintenanceCreate(BaseModel):
    vehicle_id: str
    service_type: ServiceType
    description: str
    cost: float
    service_date: date
    odometer_at_service: Optional[float] = None
    technician: Optional[str] = None
    next_service_date: Optional[date] = None
    next_service_km: Optional[float] = None

class MaintenanceUpdate(BaseModel):
    service_type: Optional[ServiceType] = None
    description: Optional[str] = None
    cost: Optional[float] = None
    service_date: Optional[date] = None
    odometer_at_service: Optional[float] = None
    technician: Optional[str] = None
    next_service_date: Optional[date] = None
    next_service_km: Optional[float] = None
    is_completed: Optional[bool] = None

class Maintenance(MaintenanceCreate):
    id: Optional[str] = None
    is_completed: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)
