# ops-healer (Python 3.11)

A small FastAPI service + CLI that ingests logs (stdin or HTTP), runs heuristics + a local LLM stub, and writes a short postmortem.

## Windows 11 — Setup & Run
```powershell
cd C:\Projects\ai-devops-copilot\services\ops-healer
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt

# Start API (port 4002)
python -m uvicorn ops_healer.api:app --host 0.0.0.0 --port 4002
```

### Call the API (PowerShell)
```powershell
$body = @{
  lines = @(
    "2025-09-07T10:00:00Z ERROR DB connection refused on tcp://db:5432",
    "2025-09-07T10:00:05Z WARN retrying request",
    "2025-09-07T10:00:10Z ERROR Failed to run migration step"
  )
} | ConvertTo-Json
Invoke-RestMethod -Method POST http://localhost:4002/analyze -ContentType 'application/json' -Body $body
```

### CLI (stdin)
```powershell
@"
2025-09-07 12:00:00 ERROR OutOfMemoryError: Java heap space
2025-09-07 12:00:02 ERROR HTTP/1.1" 500 GET /api/items
2025-09-07 12:00:05 WARN retrying request
"@ | Out-File -Encoding utf8 .\sample.log

Get-Content .\sample.log | python -m ops_healer.cli
```
