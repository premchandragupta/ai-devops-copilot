
from fastapi import FastAPI, HTTPException
from ops_healer.models import AnalyzeRequest, AnalyzeResponse
from ops_healer.heuristics import analyze_lines
from ops_healer.llm_stub import llm_stub_suggestions
from ops_healer.postmortem import write_postmortem

app = FastAPI(title="ops-healer", version="0.1.0")

@app.post("/analyze", response_model=AnalyzeResponse)
def analyze(req: AnalyzeRequest):
    if not req.lines:
        raise HTTPException(status_code=400, detail="lines[] is required")
    severity, causes, suggestions = analyze_lines(req.lines)
    extra = llm_stub_suggestions(req.lines, causes)
    all_suggestions = list(dict.fromkeys([*suggestions, *extra]))
    path = write_postmortem(req.lines, severity, causes, all_suggestions)
    return AnalyzeResponse(
        severity=severity,
        probable_causes=causes,
        suggestions=all_suggestions,
        postmortem_path=path,
    )
