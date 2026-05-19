# Conecta este projeto ao GitHub (execute após: gh auth login)
$ErrorActionPreference = "Stop"
$env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")

gh auth status
if ($LASTEXITCODE -ne 0) {
  Write-Host ""
  Write-Host "Primeiro faça login:" -ForegroundColor Yellow
  Write-Host "  gh auth login" -ForegroundColor Cyan
  exit 1
}

$repoName = "erp-gestao-delivery"
Set-Location $PSScriptRoot

if (git remote get-url origin 2>$null) {
  Write-Host "Remote 'origin' já existe. Enviando commits..."
  git push -u origin main
} else {
  gh repo create $repoName --public --source=. --remote=origin --push
}

Write-Host ""
Write-Host "Pronto. Repositório:" -ForegroundColor Green
gh repo view --web 2>$null
if ($LASTEXITCODE -ne 0) {
  Write-Host "  https://github.com/SEU_USUARIO/$repoName"
}
