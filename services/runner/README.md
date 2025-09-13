# runner (diff → static checks → mock LLM → PR comments)

CLI to analyze a git diff, run the local policy-engine, call a mock LLM, and write a JSON report.

## Install & build
```powershell
cd C:\Projects\ai-devops-copilot\services\runner
pnpm install
pnpm build
```

## Prereqs
- **Git** installed and repo path points to a real git repo (`.git` folder exists)
- **policy-engine** built, or set the CLI path for this session:
  ```powershell
  # one-time build
  cd C:\Projects\ai-devops-copilot\services\policy-engine
  pnpm install
  pnpm build
  # OR drop in the prebuilt dist as provided earlier and set env var:
  $env:POLICY_ENGINE_CLI="C:\Projects\ai-devops-copilot\services\policy-engine\dist\cli.js"
  ```

## Usage
From the runner folder:
```powershell
# Get two SHAs (example: last 2 commits)
cd C:\path\to\your\repo
git log --oneline -2
# copy SHA1 (older) as --base, SHA2 (newer) as --head

# Run analysis
cd C:\Projects\ai-devops-copilot\services\runner
pnpm run analyze -- --repo C:\path\to\your\repo --base <sha1> --head <sha2>
```

Output:
- Writes a JSON report to `services/runner/reports/analysis-<timestamp>.json`
- Prints a short summary and sample **[PR COMMENT]** lines to the console.
- **Exit code** is `1` if policy-engine reports HIGH findings, else `0`.

## Notes
- Binary files are skipped (detected via `git diff --numstat`).
- Large diffs are truncated per file to ~200KB for speed.
- Prompt text sent to the mock LLM is **sanitized** (keys, JWTs, emails redacted) even though no network call is made.
- `--pr` is accepted but not implemented yet; use `--base` and `--head` for now.
