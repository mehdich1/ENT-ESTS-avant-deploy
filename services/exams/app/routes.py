from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from app.rabbitmq_publisher import publish_notification
from fastapi.responses import Response
from app.database import get_session
from app.auth import get_current_user, require_role
from app.minio_client import get_minio_client, EXAMS_BUCKET, DEVOIRS_BUCKET
from app.models import GradeUpdate
import uuid, io, mimetypes
from datetime import datetime, timezone

router = APIRouter(prefix="/exams", tags=["Exams"], redirect_slashes=False)

ALLOWED_TYPES = [
    "application/pdf", "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/zip", "image/jpeg", "image/png",
]
MAX_FILE_SIZE = 50 * 1024 * 1024


def validate_file(file, data):
    if len(data) > MAX_FILE_SIZE:
        raise HTTPException(400, "Fichier trop volumineux. Maximum : 50 Mo")
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(400, f"Format non accepté : {file.content_type}")


def stream_from_minio(bucket, object_name):
    """Télécharge un fichier MinIO et retourne une Response"""
    minio = get_minio_client()
    filename = object_name.split("/")[-1]
    content_type, _ = mimetypes.guess_type(filename)
    content_type = content_type or "application/octet-stream"
    try:
        resp = minio.get_object(bucket, object_name)
        data = resp.read()
        resp.close()
        resp.release_conn()
        return Response(
            content=data,
            media_type=content_type,
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"',
                "Access-Control-Allow-Origin": "*"
            }
        )
    except Exception as e:
        raise HTTPException(500, f"Erreur téléchargement: {e}")


@router.get("")
async def list_exams(
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=50),
    current_user=Depends(get_current_user)
):
    session = get_session()
    try:
        roles = current_user.get("realm_access", {}).get("roles", [])
        rows = list(session.execute("SELECT * FROM exams"))
        if "enseignant" in roles and "admin" not in roles:
            teacher_id = uuid.UUID(current_user["sub"])
            rows = [r for r in rows if r.teacher_id == teacher_id]
        rows.sort(key=lambda x: x.created_at if x.created_at else datetime.min)
        total = len(rows)
        paginated = rows[(page-1)*size: page*size]
        return {
            "total": total, "page": page, "size": size,
            "pages": (total+size-1)//size if total > 0 else 0,
            "items": [
                {
                    "id": str(r.id), "title": r.title,
                    "description": r.description or "",
                    "course_id": str(r.course_id) if r.course_id else "",
                    "teacher_id": str(r.teacher_id),
                    "file_url": r.file_url if hasattr(r, 'file_url') else "",
                    "deadline": str(r.deadline),
                    "created_at": str(r.created_at)
                }
                for r in paginated
            ]
        }
    except Exception as e:
        raise HTTPException(500, str(e))


@router.post("")
async def create_exam(
    title: str = Form(...),
    description: str = Form(""),
    course_id: str = Form(...),
    deadline: str = Form(...),
    file: UploadFile = File(...),
    current_user=Depends(require_role("enseignant"))
):
    session = get_session()
    minio = get_minio_client()
    exam_id = uuid.uuid4()
    teacher_id = uuid.UUID(current_user["sub"])
    now = datetime.now(timezone.utc)
    try:
        deadline_dt = datetime.fromisoformat(deadline)
    except Exception:
        raise HTTPException(400, "Format de date invalide")
    file_data = await file.read()
    validate_file(file, file_data)
    file_name = f"{exam_id}/{file.filename}"
    minio.put_object(EXAMS_BUCKET, file_name, io.BytesIO(file_data),
                     length=len(file_data), content_type=file.content_type)
    file_url = f"{EXAMS_BUCKET}/{file_name}"
    session.execute("""
        INSERT INTO exams (id, title, description, course_id, teacher_id, file_url, deadline, created_at)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
    """, (exam_id, title, description, uuid.UUID(course_id), teacher_id, file_url, deadline_dt, now))
    publish_notification("new_exam", {
        "title": title,
        "teacher_id": str(teacher_id),
        "deadline": str(deadline_dt),
        "description": description
    })
    return {"id": str(exam_id), "title": title, "description": description,
            "course_id": course_id, "teacher_id": str(teacher_id),
            "file_url": file_url, "deadline": str(deadline_dt), "created_at": str(now)}


@router.get("/{exam_id}/download")
async def download_exam_file(exam_id: str, current_user=Depends(get_current_user)):
    """Télécharger le sujet de l'examen — accessible à tous"""
    session = get_session()
    try:
        row = session.execute(
            "SELECT * FROM exams WHERE id = %s", (uuid.UUID(exam_id),)
        ).one()
    except Exception:
        raise HTTPException(404, "Examen non trouvé")
    if not row or not row.file_url:
        raise HTTPException(404, "Fichier non trouvé")
    object_name = row.file_url.replace(f"{EXAMS_BUCKET}/", "")
    return stream_from_minio(EXAMS_BUCKET, object_name)


@router.post("/{exam_id}/submit")
async def submit_exam(
    exam_id: str,
    file: UploadFile = File(...),
    current_user=Depends(get_current_user)
):
    session = get_session()
    minio = get_minio_client()
    try:
        exam = session.execute(
            "SELECT * FROM exams WHERE id = %s", (uuid.UUID(exam_id),)
        ).one()
    except Exception:
        raise HTTPException(404, "Examen non trouvé")
    if not exam:
        raise HTTPException(404, "Examen non trouvé")
    if exam.deadline and datetime.now(timezone.utc) > exam.deadline.replace(tzinfo=timezone.utc):
        raise HTTPException(400, "La deadline est dépassée")
    submission_id = uuid.uuid4()
    student_id = uuid.UUID(current_user["sub"])
    now = datetime.now(timezone.utc)
    file_data = await file.read()
    validate_file(file, file_data)
    file_name = f"{exam_id}/{student_id}/{file.filename}"
    minio.put_object(DEVOIRS_BUCKET, file_name, io.BytesIO(file_data),
                     length=len(file_data), content_type=file.content_type)
    file_url = f"{DEVOIRS_BUCKET}/{file_name}"
    session.execute("""
        INSERT INTO submissions (id, exam_id, student_id, file_url, submitted_at)
        VALUES (%s, %s, %s, %s, %s)
    """, (submission_id, uuid.UUID(exam_id), student_id, file_url, now))
    # Notifier l'enseignant
    publish_notification("submission_received", {
        "teacher_id": str(exam.teacher_id),
        "student_username": current_user.get("preferred_username", ""),
        "exam_title": exam.title,
        "exam_id": exam_id,
        "submission_id": str(submission_id)
    })
    return {"id": str(submission_id), "exam_id": exam_id,
            "student_id": str(student_id), "file_url": file_url, "submitted_at": str(now)}


@router.get("/submissions/{submission_id}/download")
async def download_submission(submission_id: str, current_user=Depends(get_current_user)):
    """Télécharger le rendu d'un étudiant — étudiant (le sien) ou enseignant/admin"""
    session = get_session()
    roles = current_user.get("realm_access", {}).get("roles", [])
    try:
        row = session.execute(
            "SELECT * FROM submissions WHERE id = %s ALLOW FILTERING",
            (uuid.UUID(submission_id),)
        ).one()
    except Exception:
        raise HTTPException(404, "Rendu non trouvé")
    if not row:
        raise HTTPException(404, "Rendu non trouvé")
    # Étudiant ne peut voir que son propre rendu
    if "admin" not in roles and "enseignant" not in roles:
        if str(row.student_id) != current_user["sub"]:
            raise HTTPException(403, "Accès refusé")
    object_name = row.file_url.replace(f"{DEVOIRS_BUCKET}/", "")
    return stream_from_minio(DEVOIRS_BUCKET, object_name)




@router.get("/{exam_id}/my-submission")
async def get_my_submission(exam_id: str, current_user=Depends(get_current_user)):
    """Étudiant consulte son propre rendu"""
    session = get_session()
    student_id = uuid.UUID(current_user["sub"])
    rows = list(session.execute(
        "SELECT * FROM submissions WHERE exam_id = %s ALLOW FILTERING",
        (uuid.UUID(exam_id),)
    ))
    mine = [r for r in rows if r.student_id == student_id]
    if not mine:
        return {"found": False, "submission": None}
    row = mine[0]
    return {
        "found": True,
        "submission": {
            "id": str(row.id),
            "exam_id": str(row.exam_id),
            "student_id": str(row.student_id),
            "file_url": row.file_url,
            "grade": row.grade if hasattr(row, 'grade') else None,
            "submitted_at": str(row.submitted_at)
        }
    }

@router.get("/{exam_id}/submissions")
async def list_submissions(
    exam_id: str,
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=50),
    current_user=Depends(require_role("enseignant"))
):
    session = get_session()
    try:
        rows = list(session.execute(
            "SELECT * FROM submissions WHERE exam_id = %s ALLOW FILTERING",
            (uuid.UUID(exam_id),)
        ))
        rows.sort(key=lambda x: x.submitted_at if x.submitted_at else datetime.min)
        total = len(rows)
        paginated = rows[(page-1)*size: page*size]
        return {
            "total": total, "page": page, "size": size,
            "pages": (total+size-1)//size if total > 0 else 0,
            "items": [
                {
                    "id": str(r.id), "exam_id": str(r.exam_id),
                    "student_id": str(r.student_id), "file_url": r.file_url,
                    "grade": r.grade if hasattr(r, 'grade') else None,
                    "submitted_at": str(r.submitted_at)
                }
                for r in paginated
            ]
        }
    except Exception as e:
        raise HTTPException(500, str(e))


@router.put("/submissions/{submission_id}/grade")
async def grade_submission(
    submission_id: str,
    grade_data: GradeUpdate,
    current_user=Depends(require_role("enseignant"))
):
    if not (0 <= grade_data.grade <= 20):
        raise HTTPException(400, "La note doit être entre 0 et 20")
    session = get_session()
    session.execute(
        "UPDATE submissions SET grade = %s WHERE id = %s",
        (grade_data.grade, uuid.UUID(submission_id))
    )
    # Récupérer la soumission pour notifier l'étudiant
    try:
        sub = session.execute(
            "SELECT * FROM submissions WHERE id = %s ALLOW FILTERING",
            (uuid.UUID(submission_id),)
        ).one()
        if sub:
            publish_notification("exam_graded", {
                "student_id": str(sub.student_id),
                "exam_id": str(sub.exam_id),
                "grade": grade_data.grade
            })
    except Exception:
        pass
    return {"message": "Note attribuée", "grade": grade_data.grade}


@router.delete("/{exam_id}/submit")
async def cancel_submission(exam_id: str, current_user=Depends(get_current_user)):
    """Étudiant annule son propre rendu si deadline pas dépassée et pas encore noté"""
    session = get_session()
    student_id = uuid.UUID(current_user["sub"])
    try:
        exam = session.execute(
            "SELECT * FROM exams WHERE id = %s", (uuid.UUID(exam_id),)
        ).one()
    except Exception:
        raise HTTPException(404, "Examen non trouvé")
    if not exam:
        raise HTTPException(404, "Examen non trouvé")
    if exam.deadline and datetime.now(timezone.utc) > exam.deadline.replace(tzinfo=timezone.utc):
        raise HTTPException(400, "Impossible d'annuler après la deadline")
    rows = list(session.execute(
        "SELECT * FROM submissions WHERE exam_id = %s ALLOW FILTERING",
        (uuid.UUID(exam_id),)
    ))
    mine = [r for r in rows if r.student_id == student_id]
    if not mine:
        raise HTTPException(404, "Aucun rendu trouvé")
    for row in mine:
        if row.grade is not None:
            raise HTTPException(400, "Impossible d'annuler un rendu déjà noté")
        session.execute("DELETE FROM submissions WHERE id = %s", (row.id,))
    return {"message": "Rendu annulé"}


@router.delete("/{exam_id}")
async def delete_exam(exam_id: str, current_user=Depends(get_current_user)):
    session = get_session()
    roles = current_user.get("realm_access", {}).get("roles", [])
    try:
        row = session.execute(
            "SELECT * FROM exams WHERE id = %s", (uuid.UUID(exam_id),)
        ).one()
    except Exception:
        raise HTTPException(404, "Examen non trouvé")
    if not row:
        raise HTTPException(404, "Examen non trouvé")
    if "admin" not in roles and str(row.teacher_id) != current_user["sub"]:
        raise HTTPException(403, "Accès refusé")
    session.execute("DELETE FROM exams WHERE id = %s", (uuid.UUID(exam_id),))
    return {"message": "Examen supprimé"}


@router.get("/health")
async def health():
    return {"status": "ok", "service": "exams"}
