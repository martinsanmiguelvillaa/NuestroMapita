from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Base de datos
    DB_HOST: str = "db"
    DB_PORT: int = 3306
    DB_USER: str = "mapita"
    DB_PASSWORD: str = ""
    DB_NAME: str = "nuestro_mapita"

    # Autenticación
    APP_PASSWORD: str = "cambiar_esto"
    SECRET_KEY: str = "cambiar_esto_por_clave_segura"

    # Cloudinary
    CLOUDINARY_CLOUD_NAME: str = ""
    CLOUDINARY_API_KEY: str = ""
    CLOUDINARY_API_SECRET: str = ""

    # CORS: lista separada por comas de orígenes permitidos
    ALLOWED_ORIGINS: str = "http://localhost:5173,http://localhost:80"

    @property
    def DATABASE_URL(self) -> str:
        return (
            f"mysql+pymysql://{self.DB_USER}:{self.DB_PASSWORD}"
            f"@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"
        )

    @property
    def origins_list(self) -> list[str]:
        return [o.strip() for o in self.ALLOWED_ORIGINS.split(",") if o.strip()]

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
