
from typing import List, Literal
from pydantic import BaseModel, Field

class AnalyzeRequest(BaseModel):
    lines: List[str] = Field(default_factory=list)

Severity = Literal['CRITICAL','HIGH','MEDIUM','LOW']

class AnalyzeResponse(BaseModel):
    severity: Severity
    probable_causes: List[str]
    suggestions: List[str]
    postmortem_path: str
