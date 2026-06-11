from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.notification import Notification
from app.schemas.notification import NotificationResponse, UnreadCountResponse

router = APIRouter(prefix="/notifications", tags=["Notifications"])

# Las notificaciones de más de 60 días se purgan automáticamente
RETENTION_DAYS = 60


def _purge_old(db: Session) -> None:
    cutoff = datetime.now(timezone.utc) - timedelta(days=RETENTION_DAYS)
    db.query(Notification).filter(Notification.created_at < cutoff).delete()


def _base_query(db: Session, user_key: Optional[str]):
    q = db.query(Notification).filter(Notification.dismissed_at.is_(None))
    if user_key:
        # Las dirigidas a "ambos" siempre se incluyen
        q = q.filter(Notification.user_key.in_([user_key, "ambos"]))
    return q


@router.get("", response_model=list[NotificationResponse])
def list_notifications(
    user_key: Optional[str] = None,
    unread_only: bool = False,
    limit: int = Query(default=30, le=100),
    offset: int = 0,
    db: Session = Depends(get_db),
    _: bool = Depends(get_current_user),
):
    _purge_old(db)
    db.commit()
    q = _base_query(db, user_key)
    if unread_only:
        q = q.filter(Notification.read_at.is_(None))
    return (
        q.order_by(Notification.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )


@router.get("/unread-count", response_model=UnreadCountResponse)
def unread_count(
    user_key: Optional[str] = None,
    db: Session = Depends(get_db),
    _: bool = Depends(get_current_user),
):
    count = _base_query(db, user_key).filter(Notification.read_at.is_(None)).count()
    return {"count": count}


@router.post("/{notification_id}/read", response_model=NotificationResponse)
def mark_read(
    notification_id: int,
    db: Session = Depends(get_db),
    _: bool = Depends(get_current_user),
):
    notif = db.get(Notification, notification_id)
    if not notif:
        raise HTTPException(status_code=404, detail="Notificación no encontrada")
    if notif.read_at is None:
        notif.read_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(notif)
    return notif


@router.post("/read-all", status_code=204)
def mark_all_read(
    user_key: Optional[str] = None,
    db: Session = Depends(get_db),
    _: bool = Depends(get_current_user),
):
    _base_query(db, user_key).filter(Notification.read_at.is_(None)).update(
        {Notification.read_at: datetime.now(timezone.utc)},
        synchronize_session=False,
    )
    db.commit()


@router.post("/{notification_id}/dismiss", status_code=204)
def dismiss(
    notification_id: int,
    db: Session = Depends(get_db),
    _: bool = Depends(get_current_user),
):
    notif = db.get(Notification, notification_id)
    if not notif:
        raise HTTPException(status_code=404, detail="Notificación no encontrada")
    now = datetime.now(timezone.utc)
    notif.dismissed_at = now
    if notif.read_at is None:
        notif.read_at = now
    db.commit()


@router.delete("/{notification_id}", status_code=204)
def delete_notification(
    notification_id: int,
    db: Session = Depends(get_db),
    _: bool = Depends(get_current_user),
):
    notif = db.get(Notification, notification_id)
    if not notif:
        raise HTTPException(status_code=404, detail="Notificación no encontrada")
    db.delete(notif)
    db.commit()
