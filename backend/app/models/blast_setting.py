from datetime import datetime
from zoneinfo import ZoneInfo

from sqlalchemy import DECIMAL, DateTime, Integer
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class BlastSetting(Base):
    __tablename__ = "blast_settings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    rate_per_message: Mapped[float] = mapped_column(DECIMAL(12, 2), nullable=False)

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(ZoneInfo("Asia/Jakarta")),
        onupdate=lambda: datetime.now(ZoneInfo("Asia/Jakarta")),
        nullable=False,
    )