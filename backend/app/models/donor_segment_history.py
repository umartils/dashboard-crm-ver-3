from datetime import datetime
from zoneinfo import ZoneInfo

from sqlalchemy import DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class DonorSegmentHistory(Base):
    __tablename__ = "donor_segment_history"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    id_donor: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    old_segment: Mapped[str] = mapped_column(String(50), nullable=False)
    new_segment: Mapped[str] = mapped_column(String(50), nullable=False)

    # Sesuaikan "sync_runs" jika __tablename__ pada model SyncRun Anda berbeda.
    sync_run_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("sync_run.id"), nullable=True
    )

    changed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(ZoneInfo("Asia/Jakarta")),
        nullable=False,
    )

    def __repr__(self) -> str:
        return (
            f"<DonorSegmentHistory id_donor={self.id_donor} "
            f"{self.old_segment} -> {self.new_segment}>"
        )