from datetime import datetime, timezone
from sqlalchemy import Boolean, Column, DateTime, Integer, String, UniqueConstraint
from app.database import Base


class DeviceSubscription(Base):
    """
    Tabla unificada de suscripciones push.

    Un dispositivo (device_id) puede tener hasta dos filas: una por user_key
    ("van" / "martin" para notificaciones de outfit personalizadas, o "ambos"
    para suscripciones genéricas sin preferencia de outfit).

    Todas las notificaciones globales (calendario, cartitas) se envían a
    todos los endpoints únicos donde enabled=True, sin importar user_key.
    """
    __tablename__ = "device_subscriptions"

    id          = Column(Integer, primary_key=True, autoincrement=True)
    device_id   = Column(String(100), nullable=False)   # UUID de localStorage
    user_key    = Column(String(20), nullable=False)    # "van" | "martin" | "ambos"
    endpoint    = Column(String(500), nullable=False)
    p256dh      = Column(String(200), nullable=False)
    auth        = Column(String(100), nullable=False)
    device_label = Column(String(100), nullable=True)   # "Chrome en Mac"
    timezone    = Column(String(60), nullable=False, default="America/Argentina/Buenos_Aires")
    enabled     = Column(Boolean, nullable=False, default=True)  # master on/off

    # Campos específicos de outfits (NULL = outfits no configurados en este dispositivo)
    outfit_notif_enabled    = Column(Boolean, nullable=True)
    outfit_notif_time       = Column(String(5), nullable=True)   # "HH:MM"
    outfit_last_sent_at     = Column(DateTime, nullable=True)

    # Campos específicos de calendario (NULL = activado por defecto — opt-out)
    calendar_notif_enabled  = Column(Boolean, nullable=True)

    # Horas de silencio: en ese rango (hora local del dispositivo) no se envían
    # pushes, pero las notificaciones quedan igual en el historial in-app.
    # NULL en cualquiera de los dos = sin horas de silencio.
    quiet_start = Column(String(5), nullable=True)   # "HH:MM"
    quiet_end   = Column(String(5), nullable=True)   # "HH:MM"

    created_at  = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at  = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        UniqueConstraint("device_id", "user_key", name="uq_device_subscription_device_user"),
    )
