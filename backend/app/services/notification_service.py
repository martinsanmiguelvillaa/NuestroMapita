"""Servicio central de notificaciones.

Punto de entrada único para crear notificaciones in-app (campanita).
Cualquier feature que quiera notificar debe pasar por acá: así el historial,
la deduplicación y (a futuro) las preferencias y canales quedan centralizados.
"""

from typing import Optional

from sqlalchemy.orm import Session

from app.models.notification import Notification


def create_notification(
    db: Session,
    *,
    user_key: str,
    type: str,
    title: str,
    body: Optional[str] = None,
    url: Optional[str] = None,
    source_type: Optional[str] = None,
    source_id: Optional[int] = None,
    dedupe_key: Optional[str] = None,
    priority: str = "normal",
    commit: bool = True,
) -> Optional[Notification]:
    """Crea una notificación in-app. Devuelve None si la dedupe_key ya existe.

    Con commit=False el llamador es responsable de hacer db.commit()
    (útil dentro de los schedulers que ya manejan su propia transacción).
    """
    if dedupe_key:
        existing = (
            db.query(Notification)
            .filter(Notification.dedupe_key == dedupe_key)
            .first()
        )
        if existing:
            return None

    notif = Notification(
        user_key=user_key,
        type=type,
        title=title,
        body=body,
        url=url,
        source_type=source_type,
        source_id=source_id,
        dedupe_key=dedupe_key,
        priority=priority,
    )
    db.add(notif)
    if commit:
        db.commit()
        db.refresh(notif)
    return notif
