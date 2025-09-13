
import sys, json
from ops_healer.heuristics import analyze_lines
from ops_healer.llm_stub import llm_stub_suggestions
from ops_healer.postmortem import write_postmortem

def main():
    data = sys.stdin.read()
    lines = [ln for ln in data.splitlines() if ln.strip()]
    if not lines:
        print(json.dumps({"error": "No input lines on stdin"}, indent=2))
        sys.exit(2)
    severity, causes, suggestions = analyze_lines(lines)
    extra = llm_stub_suggestions(lines, causes)
    all_suggestions = list(dict.fromkeys([*suggestions, *extra]))
    path = write_postmortem(lines, severity, causes, all_suggestions)
    out = {
        "severity": severity,
        "probable_causes": causes,
        "suggestions": all_suggestions,
        "postmortem_path": path,
    }
    print(json.dumps(out, indent=2))
    sys.exit(1 if severity in ("CRITICAL","HIGH") else 0)

if __name__ == "__main__":
    main()
