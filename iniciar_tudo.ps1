# Script PowerShell para iniciar todos os serviços
# Uso: .\iniciar_tudo.ps1

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "INICIANDO TODOS OS SERVIÇOS - GUIAS MEI" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar se estamos na raiz do projeto
if (-not (Test-Path "apps")) {
    Write-Host "❌ Erro: Execute este script na raiz do projeto!" -ForegroundColor Red
    exit 1
}

# Terminal 1: Backend Node.js (WhatsApp + NFSe)
Write-Host "[1/3] Iniciando Backend Node.js (porta 3333)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\apps\backend'; Write-Host 'Backend Node.js iniciando...' -ForegroundColor Green; npm run dev"

# Aguardar um pouco
Start-Sleep -Seconds 3

# Terminal 2: Backend Python (INSS GPS)
Write-Host "[2/3] Iniciando Backend Python INSS (porta 8000)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\apps\backend\inss'; Write-Host 'Backend Python INSS iniciando...' -ForegroundColor Green; .venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000"

# Aguardar um pouco
Start-Sleep -Seconds 3

# Terminal 3: Frontend React
Write-Host "[3/3] Iniciando Frontend React (porta 5173)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\apps\web'; Write-Host 'Frontend iniciando...' -ForegroundColor Green; npm run dev"

Write-Host ""
Write-Host "✅ Todos os serviços iniciados em terminais separados!" -ForegroundColor Green
Write-Host ""
Write-Host "📍 URLs dos serviços:" -ForegroundColor Cyan
Write-Host "  • Backend Node.js:  http://localhost:3333" -ForegroundColor White
Write-Host "  • Backend Python:   http://localhost:8000" -ForegroundColor White
Write-Host "  • Frontend:         http://localhost:5173" -ForegroundColor White
Write-Host "  • Docs Python:     http://localhost:8000/docs" -ForegroundColor White
Write-Host ""
Write-Host "⏳ Aguarde alguns segundos para os serviços iniciarem completamente..." -ForegroundColor Yellow
Write-Host ""
Write-Host "Pressione qualquer tecla para continuar..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

