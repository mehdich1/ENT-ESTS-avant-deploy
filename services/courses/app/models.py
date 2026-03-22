from pydantic import BaseModel
from typing import Optional

class CourseCreate(BaseModel):
    title: str
    description: str

class CourseResponse(BaseModel):
    id: str
    title: str
    description: str
    teacher_id: str
    file_url: Optional[str] = None
    created_at: Optional[str] = None