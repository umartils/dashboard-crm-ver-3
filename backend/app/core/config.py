from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_env: str = "development"
    internal_api_key: str = "change-me-internal-key"
    # NOTE: no real credentials default here on purpose — always set these via .env / secrets manager.
    source_database_url: str = "mysql+pymysql://user:password@localhost:3306/source_db"
    dashboard_database_url: str = "mysql+pymysql://user:password@localhost:3306/summary_donor"
    rfm_cron_hour: int = 2
    rfm_cron_minute: int = 0
    cors_origins: str = "http://localhost:3000"

    # Domain diperbolehkan untuk penambahan user baru (email internal/Google Workspace).
    internal_email_domain: str = "masjidnusantara.org"
    # Email tambahan di luar domain internal yang tetap diizinkan (comma separated), untuk demo/akun khusus.
    allowed_extra_emails: str = ""
    # Admin pertama yang otomatis di-seed saat tabel crm_users masih kosong (mengatasi masalah "siapa yang menambahkan admin pertama").
    bootstrap_admin_email: str = ""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @property
    def allowed_extra_email_list(self) -> list[str]:
        return [x.strip().lower() for x in self.allowed_extra_emails.split(",") if x.strip()]

    @property
    def cors_origin_list(self) -> list[str]:
        return [x.strip() for x in self.cors_origins.split(",") if x.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
