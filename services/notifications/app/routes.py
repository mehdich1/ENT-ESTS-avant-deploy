from fastapi import APIRouter, Depends, HTTPException, Query
from app.database import get_session
from app.auth import get_current_user
import uuid

router = APIRouter(prefix="/notifications", tags=["Notifications"], redirect_slashes=False)


@router.get("")
async def get_notifications(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    current_user=Depends(get_current_user)
):
    session = get_session()
    user_id = uuid.UUID(current_user["sub"])
    try:
        rows = list(session.execute(
            "SELECT * FROM notifications WHERE user_id = %s ALLOW FILTERING", (user_id,)
        ))
        rows.sort(key=lambda x: x.created_at, reverse=True)
        total = len(rows)
        unread = sum(1 for r in rows if not r.is_read)
        paginated = rows[(page-1)*size: page*size]
        return {
            "total": total, "unread": unread, "page": page, "size": size,
            "items": [
                {
                    "id": str(r.id),
                    "event_type": r.event_type,
                    "title": r.title,
                    "message": r.message,
                    "link": r.link,
                    "is_read": r.is_read,
                    "created_at": str(r.created_at)
                }
                for r in paginated
            ]
        }
    except Exception as e:
        raise HTTPException(500, str(e))


@router.put("/{notif_id}/read")
async def mark_read(notif_id: str, current_user=Depends(get_current_user)):
    session = get_session()
    try:
        session.execute(
            "UPDATE notifications SET is_read = true WHERE id = %s",
            (uuid.UUID(notif_id),)
        )
        return {"message": "Marquée comme lue"}
    except Exception as e:
        raise HTTPException(500, str(e))


@router.put("/read-all")
async def mark_all_read(current_user=Depends(get_current_user)):
    session = get_session()
    user_id = uuid.UUID(current_user["sub"])
    try:
        rows = list(session.execute(
            "SELECT id FROM notifications WHERE user_id = %s AND is_read = false ALLOW FILTERING",
            (user_id,)
        ))
        for row in rows:
            session.execute(
                "UPDATE notifications SET is_read = true WHERE id = %s", (row.id,)
            )
        return {"message": f"{len(rows)} notification(s) marquée(s) comme lues"}
    except Exception as e:
        raise HTTPException(500, str(e))


@router.delete("/{notif_id}")
async def delete_notification(notif_id: str, current_user=Depends(get_current_user)):
    session = get_session()
    try:
        session.execute(
            "DELETE FROM notifications WHERE id = %s", (uuid.UUID(notif_id),)
        )
        return {"message": "Notification supprimée"}
    except Exception as e:
        raise HTTPException(500, str(e))


@router.get("/health")
async def health():
    return {"status": "ok", "service": "notifications"}