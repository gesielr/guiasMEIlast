# Script PowerShell para testar com servidor rodando
# Uso: .\testar_com_servidor.ps1

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "TESTES DE INTEGRAÇÃO COM SERVIDOR" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar se servidor está rodando
Write-Host "Verificando se servidor está rodando..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8000/" -Method GET -TimeoutSec 2 -ErrorAction Stop
    Write-Host "✓ Servidor está rodando!" -ForegroundColor Green
} catch {
    Write-Host "⚠ Servidor não está rodando em http://localhost:8000" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Para iniciar o servidor, execute em outro terminal:" -ForegroundColor Yellow
    Write-Host "  cd apps/backend/inss" -ForegroundColor White
    Write-Host "  .venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000" -ForegroundColor White
    Write-Host ""
    $continuar = Read-Host "Deseja continuar mesmo assim? (S/N)"
    if ($continuar -ne "S" -and $continuar -ne "s") {
        exit 1
    }
}

Write-Host ""
Write-Host "Executando testes de integração..." -ForegroundColor Yellow
Write-Host ""

# Executar testes
.venv\Scripts\python.exe -m pytest tests/test_integracao_real.py -v -s --asyncio-mode=auto

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "TESTES CONCLUÍDOS" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

