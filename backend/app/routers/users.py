from __future__ import annotations

from fastapi import APIRouter, Depends, Query, HTTPException, Header, Response, UploadFile, File
from app.core.security import require_internal_key, require_admin
import logging 
from datetime import date, datetime
from app.db.session import get_dashboard_db, source_engine
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.services.users import list_users, create_user, getUser, updateUser, deleteUser, existEmail
from app.schemas.common import UserCreateRequest, UserResponse

from fastapi import HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/api", dependencies=[Depends(require_internal_key)])
logger = logging.getLogger(__name__)

# @router.get("/admin/users")
# def admin_list_users(
#     db: Session = Depends(get_dashboard_db),
#     x_user_email: str | None = Header(default=None),
# ):
#     require_admin(db, x_user_email)
#     users = list_users(db)
#     return {"data": [UserResponse.model_validate(u).model_dump() for u in users]}

class UserUpdate(BaseModel):
    email: str
    is_active: bool
    role: str


def _is_self(user: dict, x_user_email: str | None) -> bool:
    return user["email"].strip().lower() == (x_user_email or "").strip().lower()

@router.get("/admin/users")
def admin_list_users(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_dashboard_db),
    x_user_email: str | None = Header(default=None),
):
    require_admin(db, x_user_email)

    users, total = list_users(db, limit=page_size, offset=(page - 1) * page_size)

    return {
        "data": [UserResponse.model_validate(u).model_dump() for u in users],
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@router.post("/admin/users")
def admin_create_user(
    payload: UserCreateRequest,
    db: Session = Depends(get_dashboard_db),
    x_user_email: str | None = Header(default=None),
):
    require_admin(db, x_user_email)
    user = create_user(db, payload.email, added_by=x_user_email)
    return UserResponse.model_validate(user).model_dump()


@router.patch("/admin/users/{user_id}")
def admin_updateUser(
    user_id: int,
    payload: UserUpdate,
    db: Session = Depends(get_dashboard_db),
    x_user_email: str | None = Header(default=None),
):
    require_admin(db, x_user_email)

    email = payload.email.strip().lower()
    if not email or "@" not in email:
        raise HTTPException(status_code=400, detail="Email tidak valid")

    target = getUser(db, user_id)
    if not target:
        raise HTTPException(status_code=404, detail="User tidak ditemukan")

    # cegah admin mengunci dirinya sendiri
    if _is_self(target, x_user_email) and (email != target["email"].lower() or not payload.is_active):
        raise HTTPException(status_code=400, detail="Tidak bisa mengubah email atau menonaktifkan akun sendiri")

    if existEmail(db, email, user_id):
        raise HTTPException(status_code=409, detail="Email sudah terdaftar")
    
    if payload.role not in ["admin", "user"]:
        raise HTTPException(status_code=400, detail="Role tidak valid")

    updateUser(db, user_id, email, payload.is_active, role=payload.role)
    return {"data": UserResponse.model_validate(getUser(db, user_id)).model_dump()}


@router.delete("/admin/users/{user_id}")
def admin_delete_user(
    user_id: int,
    db: Session = Depends(get_dashboard_db),
    x_user_email: str | None = Header(default=None),
):
    require_admin(db, x_user_email)

    target = getUser(db, user_id)
    if not target:
        raise HTTPException(status_code=404, detail="User tidak ditemukan")

    if _is_self(target, x_user_email):
        raise HTTPException(status_code=400, detail="Tidak bisa menghapus akun sendiri")

    deleteUser(db, user_id)
    return {"ok": True}