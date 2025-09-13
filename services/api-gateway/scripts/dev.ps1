param(
  [string]$Url = "postgres://postgres:postgres@localhost:5432/adc",
  [int]$Port = 3001
)
$env:POSTGRES_URL = $Url
$env:PORT = $Port

Write-Host "Starting api-gateway with POSTGRES_URL=$env:POSTGRES_URL PORT=$env:PORT"
pnpm dev
