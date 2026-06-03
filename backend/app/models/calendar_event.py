from datetime import datetime, timezone
from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text
from app.database import Base


class CalendarEvent(Base):
    __tablename__ = "calendar_events"

    id            = Column(Integer, primary_key=True, autoincrement=True)
    title         = Column(String(200), nullable=False)
    description   = Column(Text, nullable=True)
    date          = Column(String(10), nullable=False)        # YYYY-MM-DD (start date)
    start_time    = Column(String(5), nullable=True)          # HH:MM
    end_time      = Column(String(5), nullable=True)          # HH:MM
    all_day       = Column(Boolean, default=True, nullable=False)
    type_id       = Column(Integer, ForeignKey("event_types.id", ondelete="SET NULL"), nullable=True)
    participants  = Column(String(20), nullable=False, default="ambos")  # "martin"|"van"|"ambos"
    created_by    = Column(String(20), nullable=False)                   # "van"|"martin"
    notif_enabled = Column(Boolean, default=False, nullable=False)
    notif_minutes = Column(Integer, nullable=True)            # minutos antes del evento
    recurrence    = Column(Text, nullable=True)               # JSON: {freq,interval,days,end_date,occurrences}
    series_id     = Column(String(36), nullable=True)         # UUID agrupa serie recurrente
    created_at    = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at    = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
