from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


PLACEHOLDER_VALUES = {
    "cambiar_esto",
    "cambiar_esto_por_clave_segura",
    "cambiar_por_clave_segura_generada",
    "cambia_esto_por_una_clave_muy_larga_y_aleatoria",
    "cambiar_por_clave_muy_larga_y_aleatoria",
    "nuestra_clave_secreta",
    "la_contraseña_que_van_a_usar",
    "una_clave_larga_y_aleatoria",
}


class Settings(BaseSettings):
    # Base de datos
    DB_HOST: str = "db"
    DB_PORT: int = 3306
    DB_USER: str = "mapita"
    DB_PASSWORD: str = ""
    DB_NAME: str = "nuestro_mapita"

    # Autenticación
    APP_PASSWORD: str
    SECRET_KEY: str

    # Cloudinary
    CLOUDINARY_CLOUD_NAME: str = ""
    CLOUDINARY_API_KEY: str = ""
    CLOUDINARY_API_SECRET: str = ""

    # CORS: lista separada por comas de orígenes permitidos
    ALLOWED_ORIGINS: str = "http://localhost:5173,http://localhost:80"

    # Cookie segura (True en producción HTTPS, False en dev HTTP)
    COOKIE_SECURE: bool = True

    @property
    def DATABASE_URL(self) -> str:
        return (
            f"mysql+pymysql://{self.DB_USER}:{self.DB_PASSWORD}"
            f"@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"
        )

    @property
    def origins_list(self) -> list[str]:
        return [o.strip() for o in self.ALLOWED_ORIGINS.split(",") if o.strip()]

    @field_validator("APP_PASSWORD")
    @classmethod
    def app_password_must_be_safe(cls, value: str) -> str:
        password = value.strip()
        if len(password) < 8 or password in PLACEHOLDER_VALUES:
            raise ValueError("APP_PASSWORD debe tener al menos 8 caracteres y no puede ser un valor de ejemplo")
        return password

    @field_validator("SECRET_KEY")
    @classmethod
    def secret_key_must_be_safe(cls, value: str) -> str:
        secret_key = value.strip()
        if len(secret_key) < 32 or secret_key in PLACEHOLDER_VALUES:
            raise ValueError("SECRET_KEY debe tener al menos 32 caracteres y no puede ser un valor de ejemplo")
        return secret_key

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
