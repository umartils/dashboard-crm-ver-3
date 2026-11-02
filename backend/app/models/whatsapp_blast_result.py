from datetime import datetime, date
from zoneinfo import ZoneInfo

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Date
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class WhatsappBlastResult(Base):
    __tablename__ = "whatsapp_blast_results"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    # Sesuaikan "import_logs" jika __tablename__ model ImportLog Anda berbeda.
    import_log_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("import_logs.id"), nullable=True
    )

    phone_raw: Mapped[str] = mapped_column(String(30), nullable=False)
    phone_clean: Mapped[str | None] = mapped_column(String(20), nullable=True, index=True)

    status_blast: Mapped[str] = mapped_column(String(20), nullable=False)  # delivered/read/failed

    id_donor: Mapped[str | None] = mapped_column(String(50), nullable=True, index=True)
    nama_donor: Mapped[str | None] = mapped_column(String(255), nullable=True)
    is_matched: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    
    tgl_prospek: Mapped[date | None] = mapped_column(Date)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(ZoneInfo("Asia/Jakarta")),
        nullable=False,
        index=True,
    )

    def __repr__(self) -> str:
        return f"<WhatsappBlastResult phone={self.phone_clean} status={self.status_blast}>"