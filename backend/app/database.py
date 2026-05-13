from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from app.config import settings

# Motor de base de datos (sync, con pool de conexiones)
engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,       # verifica conexión antes de usarla
    pool_recycle=3600,        # recicla conexiones cada hora
)

# Fábrica de sesiones
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


# Clase base para todos los modelos
class Base(DeclarativeBase):
    pass


# Dependency de FastAPI: abre una sesión por request y la cierra al terminar
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
