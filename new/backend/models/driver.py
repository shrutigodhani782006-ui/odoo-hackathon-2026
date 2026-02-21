from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, date
from enum import Enum

class DriverStatus(str, Enum):
    on_duty = "On Duty"
    off_duty = "Off Duty"
    suspended = "Suspended"
    on_trip = "On Trip"

class LicenseCategory(str, Enum):
    truck = "Truck"
    van = "Van"
    bike = "Bike"
    all_vehicles = "All"

class DriverCreate(BaseModel):
    name: str
    employee_id: str
    phone: Optional[str] = None
    license_number: str
    license_expiry: date
    license_categories: List[LicenseCategory] = []
    status: DriverStatus = DriverStatus.off_duty

class DriverUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    license_number: Optional[str] = None
    license_expiry: Optional[date] = None
    license_categories: Optional[List[LicenseCategory]] = None
    status: Optional[DriverStatus] = None
    safety_score: Optional[float] = None

class Driver(DriverCreate):
    id: Optional[str] = None
    trips_completed: int = 0
    trips_total: int = 0
    safety_score: float = 100.0
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    @property
    def completion_rate(self):
        if self.trips_total == 0:
            return 0.0
        return round((self.trips_completed / self.trips_total) * 100, 2)

    @property
    def is_license_valid(self):
        return date.today() <= self.license_expiry
