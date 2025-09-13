# policy-engine (Semgrep + Bandit wrapper)

Runs **Semgrep** (local rules) and optionally **Bandit** (if installed) against a target folder
and prints a normalized JSON report.

## Install (in your monorepo)
```powershell
cd C:\Projects\ai-devops-copilot\services\policy-engine
pnpm install
pnpm build
```

> This tool assumes you install the scanners on your machine (no network calls from the tool):
- Semgrep (CLI) available in PATH
- (Optional) Bandit available in PATH

## Run
```powershell
# basic
pnpm scan -- --path ..\..\web

# with explicit config and output file
pnpm scan -- --path ..\..\web --config .\config\defaults.json --out .\reports\report.json
```

Exit codes:
- `0` => success, no HIGH findings
- `1` => success, but HIGH findings present
- `2` => tool error (e.g., semgrep/bandit missing, invalid path, parse error)

## Config (config/defaults.json)
```json
{
  "semgrep": {
    "rulesFile": "./rules/owasp-top10.yml",
    "exclude": ["node_modules", "dist", "build", ".git"],
    "timeoutSeconds": 0
  },
  "bandit": { "enabled": true }
}
```

## Notes
- The included `rules/owasp-top10.yml` is a **minimal local subset** to avoid any network fetches.
- On Windows, you can install semgrep and bandit via `pipx` (Python), or other methods of your choice.
- If a tool is not found, you'll see a warning in the JSON and exit code `2` unless only HIGH detection policy triggers exit `1`.
