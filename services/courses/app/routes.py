import os, uuid, io
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from app.rabbitmq_publisher import publish_notification
from fastapi.responses import StreamingResponse
from app.database import get_session
from app.auth import get_current_user, require_role
from app.minio_client import get_minio_client, BUCKET_NAME

router = APIRouter(prefix="/courses", tags=["Courses"], redirect_slashes=False)

ALLOWED_TYPES = [
    "application/pdf", "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/zip", "image/jpeg", "image/png",
]
MAX_FILE_SIZE = 50 * 1024 * 1024

def validate_file(file, data):
    if len(data) > MAX_FILE_SIZE:
        raise HTTPException(400, "Fichier trop volumineux. Maximum : 50 Mo")
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(400, f"Format non accepté : {file.content_type}")


@router.get("")
async def list_courses(page: int = Query(1, ge=1), size: int = Query(10, ge=1, le=50),
                       current_user=Depends(get_current_user)):
    session = get_session()
    try:
        roles = current_user.get("realm_access", {}).get("roles", [])
        rows = list(session.execute("SELECT * FROM courses"))
        if "enseignant" in roles and "admin" not in roles:
            teacher_id = uuid.UUID(current_user["sub"])
            rows = [r for r in rows if r.teacher_id == teacher_id]
        rows.sort(key=lambda x: x.created_at if x.created_at else datetime.min, reverse=True)
        total = len(rows)
        paginated = rows[(page-1)*size: page*size]
        return {"total": total, "page": page, "size": size,
                "pages": (total+size-1)//size if total > 0 else 0,
                "items": [{"id": str(r.id), "title": r.title, "description": r.description or "",
                            "teacher_id": str(r.teacher_id), "file_url": r.file_url,
                            "created_at": str(r.created_at)} for r in paginated]}
    except Exception as e:
        raise HTTPException(500, str(e))


@router.post("")
async def create_course(title: str = Form(...), description: str = Form(""),
                        file: UploadFile = File(...),
                        current_user=Depends(require_role("enseignant"))):
    session = get_session()
    minio = get_minio_client()
    course_id = uuid.uuid4()
    teacher_id = uuid.UUID(current_user["sub"])
    now = datetime.now(timezone.utc)
    file_data = await file.read()
    validate_file(file, file_data)
    file_name = f"{course_id}/{file.filename}"
    minio.put_object(BUCKET_NAME, file_name, io.BytesIO(file_data),
                     length=len(file_data), content_type=file.content_type)
    file_url = f"{BUCKET_NAME}/{file_name}"
    session.execute("""
        INSERT INTO courses (id, title, description, teacher_id, file_url, created_at)
        VALUES (%s, %s, %s, %s, %s, %s)
    """, (course_id, title, description, teacher_id, file_url, now))
    publish_notification("new_course", {
        "title": title,
        "teacher_id": str(teacher_id),
        "description": description
    })
    return {"id": str(course_id), "title": title, "description": description,
            "teacher_id": str(teacher_id), "file_url": file_url, "created_at": str(now)}


@router.get("/{course_id}/download")
async def download_course(course_id: str, current_user=Depends(get_current_user)):
    """Stream le fichier via le backend — évite les problèmes de presigned URL"""
    session = get_session()
    try:
        row = session.execute(
            "SELECT * FROM courses WHERE id = %s", (uuid.UUID(course_id),)
        ).one()
    except Exception:
        raise HTTPException(404, "Cours non trouvé")
    if not row:
        raise HTTPException(404, "Cours non trouvé")

    minio = get_minio_client()
    object_name = row.file_url.replace(f"{BUCKET_NAME}/", "")
    filename = object_name.split("/")[-1]

    try:
        response = minio.get_object(BUCKET_NAME, object_name)
        return StreamingResponse(
            response,
            media_type="application/octet-stream",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    except Exception as e:
        raise HTTPException(500, f"Erreur téléchargement: {e}")


@router.delete("/{course_id}")
async def delete_course(course_id: str, current_user=Depends(get_current_user)):
    session = get_session()
    roles = current_user.get("realm_access", {}).get("roles", [])
    try:
        row = session.execute(
            "SELECT * FROM courses WHERE id = %s", (uuid.UUID(course_id),)
        ).one()
    except Exception:
        raise HTTPException(404, "Cours non trouvé")
    if not row:
        raise HTTPException(404, "Cours non trouvé")
    if "admin" not in roles and str(row.teacher_id) != current_user["sub"]:
        raise HTTPException(403, "Accès refusé")
    session.execute("DELETE FROM courses WHERE id = %s", (uuid.UUID(course_id),))
    return {"message": "Cours supprimé"}


@router.get("/health")
async def health():
    return {"status": "ok", "service": "courses"}