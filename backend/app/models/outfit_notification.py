from datetime import datetime
from sqlalchemy import Boolean, Column, DateTime, Integer, String, UniqueConstraint
from app.database import Base


class OutfitNotificationSubscription(Base):
    __tablename__ = "outfit_notification_subscriptions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_key = Column(String(20), nullable=False)        # "van" | "martin"
    device_id = Column(String(100), nullable=False)      # UUID guardado en localStorage
    endpoint = Column(String(500), nullable=False)
    p256dh = Column(String(200), nullable=False)
    auth = Column(String(100), nullable=False)
    notification_time = Column(String(5), nullable=False, default="09:00")   # "HH:MM"
    timezone = Column(String(60), nullable=False, default="America/Argentina/Buenos_Aires")
    enabled = Column(Boolean, nullable=False, default=True)
    device_label = Column(String(100), nullable=True)    # "Chrome en Mac", etc.
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_sent_at = Column(DateTime, nullable=True)

    __table_args__ = (
        UniqueConstraint("user_key", "device_id", name="uq_outfit_notif_user_device"),
    )
