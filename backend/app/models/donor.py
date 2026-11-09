from datetime import date, datetime
from decimal import Decimal
from app.core.timeutil import now_wib
from sqlalchemy import BigInteger, Date, DateTime, Integer, Numeric, String, Index
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base



class DonorSummary(Base):
    __tablename__ = "donor_summary"

    id_donor: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    nama: Mapped[str | None] = mapped_column(String(255))
    hp: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    email: Mapped[str | None] = mapped_column(String(255))

    first_donation_date: Mapped[date | None] = mapped_column(Date)
    last_donation_date: Mapped[date | None] = mapped_column(Date)
    recency_days: Mapped[int | None] = mapped_column(Integer)
    frequency: Mapped[int] = mapped_column(Integer, default=0)
    monetary: Mapped[Decimal] = mapped_column(Numeric(18, 2), default=0)
    last_donation: Mapped[Decimal | None] = mapped_column(Numeric(18, 2))
    min_donation: Mapped[Decimal | None] = mapped_column(Numeric(18, 2))
    max_donation: Mapped[Decimal | None] = mapped_column(Numeric(18, 2))
    median_donation: Mapped[Decimal | None] = mapped_column(Numeric(18, 2))
    avg_donation: Mapped[Decimal | None] = mapped_column(Numeric(18, 2))

    # recency_score: Mapped[int | None] = mapped_column(Integer)
    # frequency_score: Mapped[int | None] = mapped_column(Integer)
    # monetary_score: Mapped[int | None] = mapped_column(Integer)
    rfm_segment: Mapped[str | None] = mapped_column(String(50), index=True)

    program_favorit: Mapped[str | None] = mapped_column(String(255), index=True)
    program_favorit_count: Mapped[int | None] = mapped_column(Integer)
    payment_favorit: Mapped[str | None] = mapped_column(String(100), index=True)
    payment_favorit_count: Mapped[int | None] = mapped_column(Integer)
    campaign_favorit: Mapped[str | None] = mapped_column(String(500), index=True)
    campaign_favorit_count: Mapped[int | None] = mapped_column(Integer)
    
    jenis_donor: Mapped[str | None] = mapped_column(String(100))
    program_category: Mapped[str | None] = mapped_column(String(100))
    campaign_terakhir: Mapped[str | None] = mapped_column(String(500))

    tanggal_donasi_terakhir: Mapped[date | None] = mapped_column(Date)
    program_terakhir: Mapped[str | None] = mapped_column(String(255))
    payment_terakhir: Mapped[str | None] = mapped_column(String(100))
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now, onupdate=datetime.now)

    __table_args__ = (
        Index("idx_donor_segment_monetary", "rfm_segment", "monetary"),
        Index("idx_donor_last_donation", "last_donation_date"),
    )

 
class SyncRun(Base):
    __tablename__ = "sync_run"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    # started_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)
    started_at: Mapped[datetime] = mapped_column(DateTime, default=now_wib)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime)
    status: Mapped[str] = mapped_column(String(32), default="running")
    donor_count: Mapped[int | None] = mapped_column(Integer)
    message: Mapped[str | None] = mapped_column(String(500))
