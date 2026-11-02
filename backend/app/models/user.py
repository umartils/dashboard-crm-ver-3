from datetime import datetime
from zoneinfo import ZoneInfo

from sqlalchemy import Boolean, DateTime, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class CrmUser(Base):
    __tablename__ = "crm_users"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        autoincrement=True,
    )

    email: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        nullable=False,
        index=True,
    )

    role: Mapped[str] = mapped_column(
        String(20),
        default="user",
    )

    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=lambda: datetime.now(ZoneInfo("Asia/Jakarta")),
        nullable=False,
    )

    created_by: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )