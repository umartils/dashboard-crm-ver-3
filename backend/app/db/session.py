from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.config import get_settings

settings = get_settings()

source_engine = create_engine(settings.source_database_url, pool_pre_ping=True, pool_recycle=3600)
dashboard_engine = create_engine(settings.dashboard_database_url, pool_pre_ping=True, pool_recycle=3600)

DashboardSessionLocal = sessionmaker(bind=dashboard_engine, autoflush=False, autocommit=False)


def get_dashboard_db():
    db = DashboardSessionLocal()
    try:
        yield db
    finally:
        db.close()
