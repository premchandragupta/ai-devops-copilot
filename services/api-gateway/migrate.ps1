param(
  [string]$Url = "postgres://postgres:postgres@localhost:5432/adc",
  [string]$Name = "init"
)
$env:POSTGRES_URL = $Url
Write-Host "Using POSTGRES_URL=$env:POSTGRES_URL"
npx prisma generate
npx prisma migrate dev --name $Name
