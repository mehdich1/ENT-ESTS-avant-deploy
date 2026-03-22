from fastapi import APIRouter, Depends, HTTPException, Query
from app.database import get_session
from app.auth import get_current_user, require_role
from app.rabbitmq_publisher import publish_notification
from app.models import EventCreate
import uuid
from datetime import datetime, timezone

router = APIRouter(prefix="/calendar", tags=["Calendar"], redirect_slashes=False)


@router.post("/events")
async def create_event(
    event: EventCreate,
    current_user=Depends(require_role("enseignant"))
):
    session = get_session()
    try:
        event_id = uuid.uuid4()
        created_by = uuid.UUID(current_user["sub"])
        now = datetime.now(timezone.utc)

        session.execute("""
            INSERT INTO events (id, title, description, start_time, end_time, created_by)
            VALUES (%s, %s, %s, %s, %s, %s)
        """, (event_id, event.title, event.description,
              event.start_time, event.end_time, created_by))

        publish_notification("new_event", {
            "title": event.title,  # ← fix : event.title au lieu de title
            "creator_username": current_user.get("preferred_username", "")
        })

        return {
            "id": str(event_id), "title": event.title,
            "description": event.description or "",
            "start_time": str(event.start_time),
            "end_time": str(event.end_time),
            "created_by": str(created_by)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/events")
async def list_events(
    page: int = Query(default=1, ge=1),
    size: int = Query(default=10, ge=1, le=50),
    current_user=Depends(get_current_user)
):
    session = get_session()
    try:
        roles = current_user.get("realm_access", {}).get("roles", [])
        rows = list(session.execute("SELECT * FROM events"))

        if "enseignant" in roles and "admin" not in roles:
            teacher_id = uuid.UUID(current_user["sub"])
            rows = [r for r in rows if r.created_by == teacher_id]

        rows.sort(key=lambda x: x.start_time if x.start_time else datetime.min)
        total = len(rows)
        paginated = rows[(page - 1) * size: page * size]
        return {
            "total": total, "page": page, "size": size,
            "pages": (total + size - 1) // size if total > 0 else 0,
            "items": [
                {
                    "id": str(row.id),
                    "title": row.title,
                    "description": row.description or "",
                    "start_time": str(row.start_time),
                    "end_time": str(row.end_time),
                    "created_by": str(row.created_by)
                }
                for row in paginated
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/events/{event_id}")
async def delete_event(
    event_id: str,
    current_user=Depends(get_current_user)  # ← fix: admin peut aussi supprimer
):
    session = get_session()
    roles = current_user.get("realm_access", {}).get("roles", [])
    row = session.execute(
        "SELECT * FROM events WHERE id = %s", (uuid.UUID(event_id),)
    ).one()

    if not row:
        raise HTTPException(status_code=404, detail="Événement non trouvé")

    if "admin" not in roles and str(row.created_by) != current_user["sub"]:
        raise HTTPException(status_code=403, detail="Accès refusé")

    session.execute("DELETE FROM events WHERE id = %s", (uuid.UUID(event_id),))
    return {"message": "Événement supprimé"}


@router.get("/health")
async def health():
    return {"status": "ok", "service": "calendar"}