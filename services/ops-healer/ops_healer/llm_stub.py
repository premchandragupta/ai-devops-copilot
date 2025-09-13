
from typing import List

def llm_stub_suggestions(lines: List[str], causes: List[str]) -> List[str]:
    out: List[str] = []
    if any('Database connectivity issue' in c for c in causes):
        out.append('Runbook: Validate DB DNS, port 5432 reachability, and connection pool saturation.')
    if any('Out of memory' in c for c in causes):
        out.append('Runbook: Capture heap/profile; roll back high-memory features; add memory limits.')
    if not out and lines:
        out.append('Runbook: Correlate log timestamps with deploy/infra timeline; check dashboards.')
    seen = set()
    dedup = []
    for s in out:
        if s not in seen:
            dedup.append(s)
            seen.add(s)
    return dedup
