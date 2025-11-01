# Script para executar testes E2E do frontend
Write-Host "================================" -ForegroundColor Cyan
Write-Host "  FRONTEND E2E - PASSO 4" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "[1/2] Verificando frontend..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:5173" -Method Get -TimeoutSec 2 -ErrorAction Stop
    Write-Host "  ✓ Frontend rodando em http://localhost:5173" -ForegroundColor Green
} catch {
    Write-Host "  ✗ Frontend não está rodando" -ForegroundColor Red
    Write-Host "  ℹ Inicie manualmente: cd apps\web ; npm run dev" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "[2/2] Executando testes E2E..." -ForegroundColor Yellow
Write-Host ""

Set-Location "c:\Users\carlo\OneDrive\Área de Trabalho\Curso\Projetos Pessoais\Inss - Guias\guiasMEI\apps\backend\inss"
C:/Users/carlo/AppData/Local/Programs/Python/Python313/python.exe test_frontend_e2e.py

Write-Host ""
Write-Host "================================" -ForegroundColor Cyan
Write-Host "  TESTES CONCLUÍDOS" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
