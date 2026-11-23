from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    AI_API_KEY: Optional[str] = None
    AI_PROVIDER: str = "anakin"
    AI_MODEL: str = "default"
    AI_BASE_URL: Optional[str] = None

    GEOCODING_API_KEY: Optional[str] = None

    OSRM_BASE_URL: str = "http://router.project-osrm.org"

    MAPBOX_ACCESS_TOKEN: Optional[str] = None

    DEFAULT_MPG: float = 25.0
    DEFAULT_FUEL_PRICE: float = 3.50

    @property
    def demo_mode(self) -> bool:
        return not (self.AI_API_KEY or self.GEOCODING_API_KEY or self.MAPBOX_ACCESS_TOKEN)


settings = Settings()
