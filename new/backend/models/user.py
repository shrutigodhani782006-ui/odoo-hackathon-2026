from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime
from enum import Enum

class UserRole(str, Enum):
    manager = "Fleet Manager"
    dispatcher = "Dispatcher"
    safety_officer = "Safety Officer"
    financial_analyst = "Financial Analyst"

class UserCreate(BaseModel):
    name: str
    email: str
    password: str
    role: UserRole = UserRole.dispatcher

class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    password: Optional[str] = None

class UserLogin(BaseModel):
    email: str
    password: str

class User(BaseModel):
    id: Optional[str] = None
    name: str
    email: str
    role: UserRole
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: User
