param(
  [string]$Cli = "C:\Projects\ai-devops-copilot\services\policy-engine\dist\cli.js",
  [string]$ApiDir = "C:\Projects\ai-devops-copilot\services\api-gateway"
)
if (-not (Test-Path $Cli)) {
  Write-Error "CLI not found at $Cli. Build policy-engine first: pnpm install && pnpm build"
  exit 1
}
$env:POLICY_ENGINE_CLI = $Cli
Write-Host "POLICY_ENGINE_CLI set to $env:POLICY_ENGINE_CLI"
Set-Location $ApiDir
pnpm dev
