from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class EventCreate(BaseModel):
    title: str
    description: str
    start_time: datetime
    end_time: datetime

class EventResponse(BaseModel):
    id: str
    title: str
    description: str
    start_time: str
    end_time: str
    created_by: str
    created_at: Optional[str] = None