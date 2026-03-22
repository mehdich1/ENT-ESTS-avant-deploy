from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class ExamCreate(BaseModel):
    title: str
    description: str
    course_id: str
    deadline: datetime

class ExamResponse(BaseModel):
    id: str
    title: str
    description: str
    course_id: str
    teacher_id: str
    deadline: str
    created_at: Optional[str] = None

class GradeUpdate(BaseModel):
    grade: float

class SubmissionResponse(BaseModel):
    id: str
    exam_id: str
    student_id: str
    file_url: str
    grade: Optional[float] = None
    submitted_at: Optional[str] = None