from datetime import datetime
from pydantic import BaseModel, EmailStr


class HealthResponse(BaseModel):
    status: str


class UserCreateRequest(BaseModel):
    email: EmailStr


class UserResponse(BaseModel):
    id: int
    email: str
    role: str
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}
