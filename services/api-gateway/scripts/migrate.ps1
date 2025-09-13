param(
  [string]$Url = "postgres://postgres:postgres@localhost:5432/adc",
  [string]$Name = "init"
)
# Set env var so Prisma CLI can read it
$env:POSTGRES_URL = $Url

Write-Host "Using POSTGRES_URL = $env:POSTGRES_URL"

pnpm prisma:generate
npx prisma migrate dev --name $Name
