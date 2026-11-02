from datetime import datetime, date
from zoneinfo import ZoneInfo

from sqlalchemy import DateTime, ForeignKey, Integer, String, Date
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class ImportLog(Base):
    __tablename__ = "import_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    file_name: Mapped[str] = mapped_column(String(255), nullable=False)

    total_rows: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    updated_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    not_found_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    # skipped_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    tgl_prospek: Mapped[date | None] = mapped_column(Date)

    # Sesuaikan nama tabel "users" & tipe kolom id jika berbeda di project Anda.
    # Jika belum ada relasi user, hapus ForeignKey dan cukup gunakan Integer biasa.
    # uploaded_by: Mapped[int | None] = mapped_column(
    #     Integer, ForeignKey("crm_users.id"), nullable=True
    # )
    uploaded_by: Mapped[int | None] = mapped_column(
        Integer, nullable=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(ZoneInfo("Asia/Jakarta")),
        nullable=False,
    )

    def __repr__(self) -> str:
        return (
            f"<ImportLog id={self.id} file_name={self.file_name} "
            f"updated={self.updated_count} not_found={self.not_found_count}>"
        )