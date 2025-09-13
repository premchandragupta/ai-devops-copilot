
import re
from typing import List, Tuple

SEVERITY_ORDER = ['LOW','MEDIUM','HIGH','CRITICAL']

RULES = [
    (re.compile(r'\b(OutOfMemory|OOMKilled|oom-kill|heap space)\b', re.I),
     'Out of memory / memory pressure', 'CRITICAL',
     ['Rollback the last deploy or reduce workload while investigating memory usage.',
      'Increase container memory limits or JVM heap if appropriate.',
      'Add heap dump on OOM and examine allocations.']),
    (re.compile(r'\b(connection refused|could not connect|ECONNREFUSED|database is down|timeout.*db)\b', re.I),
     'Database connectivity issue', 'HIGH',
     ['Check DB service health and network routes/security groups.',
      'Verify credentials / rotate secrets if recently changed.',
      'Fail over to replica if available.']),
    (re.compile(r'\b(ETIMEDOUT|ECONNRESET|timeout|TLS handshake timeout)\b', re.I),
     'Network timeout / instability', 'HIGH',
     ['Check recent infrastructure changes (load balancer, firewall, DNS).',
      'Add client-side timeouts/retries with backoff; validate upstream SLAs.',
      'Correlate with latency graphs in monitoring.']),
    (re.compile(r'\b5\d{2}\b'),
     'Spike in 5xx responses', 'CRITICAL',
     ['Rollback the last deployment if errors began right after it.',
      'Enable circuit breakers or serve static fallback where possible.',
      'Check dependency health (DB/cache/queue)']),
    (re.compile(r'\b(migration|alembic|liquibase|flyway|prisma.*migrate)\b', re.I),
     'Application/database migration failure', 'HIGH',
     ['Rollback/mark migration as failed; restore from backup if necessary.',
      'Re-run migration in maintenance window after fix.',
      'Add pre-deploy migration dry-run to CI.']),
    (re.compile(r'\b(CrashLoopBackOff|Back-off restarting failed container)\b', re.I),
     'Container crash loop', 'HIGH',
     ['Inspect container logs from previous attempts; compare resource limits.',
      'Temporarily scale out a stable version while investigating.']),
    (re.compile(r'\b(ENOSPC|No space left on device)\b', re.I),
     'Disk full', 'HIGH',
     ['Clear logs/temp files; increase volume size.',
      'Set up log rotation and disk usage alerts.']),
    (re.compile(r'\b(panic|segfault|fatal error)\b', re.I),
     'Crash / fatal error', 'CRITICAL',
     ['Rollback to last known good build.',
      'Collect core dumps / stack traces for root-cause.']),
    (re.compile(r'\b(denied|unauthorized|forbidden|invalid credentials)\b', re.I),
     'Auth / permission issue', 'MEDIUM',
     ['Confirm token scopes/roles; rotate keys if compromised.',
      'Audit recent permission changes.']),
]

def worst_severity(a: str, b: str) -> str:
    return a if SEVERITY_ORDER.index(a) > SEVERITY_ORDER.index(b) else b

def analyze_lines(lines: List[str]) -> Tuple[str, List[str], List[str]]:
    found_causes = []
    suggestions = []
    worst = 'LOW'
    five_xx_hits = 0

    for ln in lines:
        for rx, cause, base_sev, sugg in RULES:
            if rx.search(ln):
                if cause not in found_causes:
                    found_causes.append(cause)
                    for s in sugg:
                        if s not in suggestions:
                            suggestions.append(s)
                worst = worst_severity(worst, base_sev)
        if re.search(r'\b(5\d{2})\b', ln):
            five_xx_hits += 1

    if five_xx_hits >= 3:
        worst = worst_severity(worst, 'CRITICAL')

    if not found_causes and any('error' in ln.lower() for ln in lines):
        found_causes.append('General error pattern detected')
        if 'Check recent changes and roll back if errors align with a deploy.' not in suggestions:
            suggestions.append('Check recent changes and roll back if errors align with a deploy.')
        worst = worst_severity(worst, 'MEDIUM')

    return worst, found_causes, suggestions
