
import os, re
from datetime import datetime
from typing import List

REDACTIONS = [
    re.compile(r'(api[_-]?key|token|secret|password)\s*[:=]\s*["\']?[A-Za-z0-9_\-]{8,}["\']?', re.I),
    re.compile(r'AKIA[0-9A-Z]{16}'),
    re.compile(r'eyJ[a-zA-Z0-9_\-]+\.[a-zA-Z0-9_\-]+\.[a-zA-Z0-9_\-]+'),
    re.compile(r'-----BEGIN (?:RSA|EC|DSA|OPENSSH) PRIVATE KEY-----[\s\S]*?-----END (?:RSA|EC|DSA|OPENSSH) PRIVATE KEY-----'),
]

def redact(s: str) -> str:
    for rx in REDACTIONS:
        s = rx.sub('[REDACTED]', s)
    return s

def extract_timestamps(lines: List[str]) -> List[str]:
    ts = []
    for ln in lines:
        m = re.search(r'(\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z)?)', ln)
        if m: ts.append(m.group(1))
    return ts

def write_postmortem(lines: List[str], severity: str, causes: List[str], suggestions: List[str]) -> str:
    safe_lines = [redact(l) for l in lines]
    ts = extract_timestamps(lines)
    first = ts[0] if ts else 'N/A'
    last = ts[-1] if ts else 'N/A'

    report_dir = os.path.abspath(os.path.join(os.getcwd(), 'reports', 'ops-healer'))
    os.makedirs(report_dir, exist_ok=True)
    stamp = datetime.utcnow().strftime('%Y-%m-%dT%H-%M-%SZ')
    path = os.path.join(report_dir, f'postmortem-{stamp}.md')

    content = (
        "# Postmortem (auto-generated)\n\n"
        f"**Severity:** {severity}\n"
        f"**Time window:** {first} -> {last}\n\n"
        "## Probable Causes\n"
        + ( "".join(f"- {c}\n" for c in causes) if causes else "- None detected\n" )
        + "\n## Suggestions / Runbook\n"
        + ( "".join(f"- {s}\n" for s in suggestions) if suggestions else "- None\n" )
        + "\n## Timeline (sample logs)\n```\n"
        + "\n".join(safe_lines[:100])
        + "\n```\n\n## Next Steps\n- Create a ticket for permanent fix and link this report.\n- Add alerting tests to catch recurrence.\n"
    )

    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    return path
