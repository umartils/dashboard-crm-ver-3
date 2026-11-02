from fastapi import HTTPException, status
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.security import is_internal_email
from app.models.user import CrmUser


# def list_users(db: Session) -> list[CrmUser]:
#     return (
#         db.query(CrmUser)
#         .order_by(CrmUser.created_at.desc())
#         .all()
#     )

 
def list_users(db: Session, limit: int, offset: int) -> tuple[list[dict], int]:
    total = db.execute(text("SELECT COUNT(*) FROM crm_users")).scalar_one()

    rows = db.execute(
        text(
            """
            SELECT id, email, role, is_active, created_at
            FROM crm_users
            ORDER BY created_at DESC, id DESC
            LIMIT :limit OFFSET :offset
            """
        ),
        {"limit": limit, "offset": offset},
    ).mappings().all()

    return [dict(r) for r in rows], int(total)

def create_user(db: Session, email: str, added_by: str | None) -> CrmUser:
    email = email.strip().lower()

    # Validasi domain email
    if not is_internal_email(email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Hanya email internal (@masjidnusantara.org) yang dapat ditambahkan",
        )

    # Cek apakah email sudah terdaftar
    existing = (
        db.query(CrmUser)
        .filter(CrmUser.email == email)
        .first()
    )

    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email sudah terdaftar",
        )

    user = CrmUser(
        email=email,
        role="user",
        is_active=True,
        created_by=added_by,
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    return user
 
def existEmail(db: Session, email: str, exclude_id: int):
    row = db.execute(
        text("SELECT 1 FROM crm_users WHERE email = :email AND id <> :id LIMIT 1 "),
        {"email": email, "id": exclude_id}
    ).first()
    return row is not None
    
def getUser(db: Session, user_id: int):
    row = db.execute(
        text("SELECT id, email, role, is_active, created_at FROM crm_users WHERE id = :id"),
        {"id": user_id}
    ).mappings().first()    
    return dict(row) if row else None

def updateUser(db: Session, user_id: int, email: str, is_active: bool):
    db.execute(text("UPDATE crm_users SET email = :email, is_active = :is_active WHERE id = :id"),
               { "email": email, "id": user_id, "is_active": 1 if is_active else 0 } )
    db.commit()

def deleteUser(db:Session, user_id: int):
    db.execute(text("DELETE FROM crm_users WHERE id = :id"),
               {"id": user_id})
    db.commit()