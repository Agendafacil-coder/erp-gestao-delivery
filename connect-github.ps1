# Conecta este projeto ao GitHub (execute após: gh auth login)
param(
  [string]$RepoName = "erp-gestao-delivery",
  [ValidateSet("public", "private")]
  [string]$Visibility = "public"
)

$ErrorActionPreference = "Stop"
$env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")

Set-Location $PSScriptRoot

Write-Host "Verificando login GitHub CLI..." -ForegroundColor Cyan
gh auth status
if ($LASTEXITCODE -ne 0) {
  Write-Host ""
  Write-Host "Faça login uma vez:" -ForegroundColor Yellow
  Write-Host "  gh auth login" -ForegroundColor Cyan
  Write-Host ""
  Write-Host "Depois rode novamente:" -ForegroundColor Yellow
  Write-Host "  .\connect-github.ps1" -ForegroundColor Cyan
  Write-Host "  .\connect-github.ps1 -RepoName meu-repo -Visibility private" -ForegroundColor DarkGray
  exit 1
}

$hasRemote = $false
try {
  git remote get-url origin 2>$null | Out-Null
  if ($LASTEXITCODE -eq 0) { $hasRemote = $true }
} catch {}

if ($hasRemote) {
  Write-Host "Remote 'origin' encontrado. Enviando branch main..." -ForegroundColor Cyan
  git push -u origin main
} else {
  Write-Host "Criando repositório '$RepoName' ($Visibility) e enviando código..." -ForegroundColor Cyan
  gh repo create $RepoName --$Visibility --source=. --remote=origin --push
}

if ($LASTEXITCODE -ne 0) {
  Write-Host ""
  Write-Host "Se o repositório já existir no GitHub (vazio), use:" -ForegroundColor Yellow
  Write-Host "  git remote add origin https://github.com/SEU_USUARIO/$RepoName.git" -ForegroundColor Cyan
  Write-Host "  git push -u origin main" -ForegroundColor Cyan
  exit 1
}

Write-Host ""
Write-Host "Pronto. Repositório remoto configurado." -ForegroundColor Green
gh repo view --web 2>$null
if ($LASTEXITCODE -ne 0) {
  $user = (gh api user -q .login 2>$null)
  if ($user) {
    Write-Host "  https://github.com/$user/$RepoName" -ForegroundColor Green
  }
}

Write-Host ""
Write-Host "Lembrete: nunca envie .env com senhas. Use swift-dispatch-main/.env.example como modelo." -ForegroundColor DarkGray
