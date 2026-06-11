from sqlalchemy import Column, DateTime, Index, Integer, String, Text, func

from app.database import Base


class Notification(Base):
    """Historial de notificaciones in-app (campanita).

    Cada registro es una notificación dirigida a un usuario (van/martin/ambos).
    Es la fuente de verdad del estado leído/no-leído, compartida entre dispositivos.
    """

    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    user_key = Column(String(10), nullable=False)        # "van" | "martin" | "ambos"
    type = Column(String(30), nullable=False)            # calendar_reminder | outfit_daily | cartita_new | system | ...
    title = Column(String(200), nullable=False)
    body = Column(Text, nullable=True)
    url = Column(String(300), nullable=True)             # deep-link interno, ej. "/calendario"

    # Asociación opcional con el recurso que la originó (para cancelar/recalcular)
    source_type = Column(String(30), nullable=True)      # ej. "calendar_event"
    source_id = Column(Integer, nullable=True)

    # Clave de deduplicación: evita doble envío de la misma notificación programada
    dedupe_key = Column(String(120), nullable=True, unique=True)

    priority = Column(String(10), nullable=False, server_default="normal")  # low | normal | high

    read_at = Column(DateTime, nullable=True)
    dismissed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)

    __table_args__ = (
        Index("ix_notifications_user_read", "user_key", "read_at"),
        Index("ix_notifications_source", "source_type", "source_id"),
    )
