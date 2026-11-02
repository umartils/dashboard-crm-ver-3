from fastapi import Header, HTTPException, status
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.core.config import get_settings


def require_internal_key(x_internal_key: str | None = Header(default=None)) -> None:
    expected = get_settings().internal_api_key
    if not x_internal_key or x_internal_key != expected:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid internal API key")


def is_internal_email(email: str) -> bool:
    """Hanya izinkan email dari domain Google Workspace internal, kecuali ada di allowlist tambahan."""
    settings = get_settings()
    email = email.strip().lower()
    if email in settings.allowed_extra_email_list:
        return True
    domain = settings.internal_email_domain.strip().lower()
    return bool(domain) and email.endswith(f"@{domain}")


def require_admin(db: Session, x_user_email: str | None = Header(default=None)) -> None:
    """Defense-in-depth: verifikasi ulang di backend bahwa pemanggil adalah admin aktif,
    selain pengecekan role yang sudah dilakukan di sisi Next.js (frontend BFF)."""
    if not x_user_email:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing X-User-Email header")

    row = db.execute(
        text("SELECT role, is_active FROM crm_users WHERE LOWER(email)=:email LIMIT 1"),
        {"email": x_user_email.strip().lower()},
    ).mappings().first()

    if not row or not row["is_active"] or row["role"] != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
