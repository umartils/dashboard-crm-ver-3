from datetime import datetime
from pydantic import BaseModel, EmailStr


class HealthResponse(BaseModel):
    status: str


class UserCreateRequest(BaseModel):
    email: EmailStr
    role: str


class UserResponse(BaseModel):
    id: int
    email: str
    role: str
    is_active: bool
    created_by: str | None = None
    created_at: datetime
    last_login_at: datetime | None = None

    model_config = {"from_attributes": True}

class UserUpdate(BaseModel):
    email: str
    is_active: bool
    role: str
    updated_by: str | None = None
    updated_at: datetime | None = None