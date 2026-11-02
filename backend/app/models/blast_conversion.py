from datetime import date, datetime
from zoneinfo import ZoneInfo

from sqlalchemy import (
    DECIMAL,
    Boolean,
    Date,
    DateTime,
    Integer,
    String,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class BlastConversion(Base):
    __tablename__ = "blast_conversions"
    __table_args__ = (
        UniqueConstraint("id_donor", "blast_month", name="uq_blast_conversions_donor_month"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    id_donor: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    nama_donor: Mapped[str | None] = mapped_column(String(255), nullable=True)
    phone_clean: Mapped[str | None] = mapped_column(String(20), nullable=True)

    # Selalu tanggal 1 di bulannya (mis. 2026-10-01 mewakili "Oktober 2026"),
    # supaya gampang di-GROUP BY / filter per bulan.
    blast_month: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    first_blast_date: Mapped[date] = mapped_column(Date, nullable=False)
    blast_count: Mapped[int] = mapped_column(Integer, nullable=False, default=1)

    donated: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, index=True)
    donation_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    donation_amount: Mapped[float] = mapped_column(DECIMAL(15, 2), nullable=False, default=0)

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(ZoneInfo("Asia/Jakarta")),
        nullable=False,
    )

    def __repr__(self) -> str:
        return (
            f"<BlastConversion id_donor={self.id_donor} month={self.blast_month} "
            f"donated={self.donated}>"
        )