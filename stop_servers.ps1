# Script para parar todos os servidores

Write-Host "Parando todos os servidores..." -ForegroundColor Yellow

# Parar processos uvicorn (Python FastAPI)
Write-Host "`nParando servidores Python (uvicorn)..." -ForegroundColor Cyan
Get-Process | Where-Object {$_.ProcessName -like "*python*" -and $_.CommandLine -like "*uvicorn*"} | ForEach-Object {
    Write-Host "  Parando processo Python (PID: $($_.Id))..." -ForegroundColor Gray
    Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
}

# Parar processos Node.js
Write-Host "`nParando servidores Node.js..." -ForegroundColor Cyan
Get-Process | Where-Object {$_.ProcessName -eq "node"} | ForEach-Object {
    Write-Host "  Parando processo Node.js (PID: $($_.Id))..." -ForegroundColor Gray
    Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
}

# Parar processos curl (comandos de teste)
Write-Host "`nParando comandos curl..." -ForegroundColor Cyan
Get-Process | Where-Object {$_.ProcessName -eq "curl"} | ForEach-Object {
    Write-Host "  Parando processo curl (PID: $($_.Id))..." -ForegroundColor Gray
    Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
}

Write-Host "`n✅ Todos os servidores foram parados!" -ForegroundColor Green
Write-Host "`nPara iniciar novamente:" -ForegroundColor Yellow
Write-Host "  Python: cd apps\backend\inss && .venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000" -ForegroundColor Gray
Write-Host "  Node.js: cd apps\backend && npm run dev" -ForegroundColor Gray
