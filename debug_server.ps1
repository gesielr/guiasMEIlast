# debug_server.ps1
Write-Host "Parando servidores..."
.\stop_servers.ps1
Start-Sleep -Seconds 2
Write-Host "Iniciando servidor com logs..."
cd apps\backend\inss
$env:PYTHONPATH = "C:\Users\carlo\OneDrive\Área de Trabalho\Curso\Projetos Pessoais\Inss - Guias\guiasMEI02\apps\backend\inss"
# Iniciar servidor em background e redirecionar logs
Start-Process -FilePath ".venv\Scripts\python.exe" -ArgumentList "-m uvicorn app.main:app --reload --port 8000" -RedirectStandardOutput "..\..\..\server_debug.log" -RedirectStandardError "..\..\..\server_debug_err.log" -WindowStyle Minimized
Write-Host "Servidor iniciado. Aguardando 10 segundos para inicialização..."
Start-Sleep -Seconds 10
Write-Host "Pronto para teste."
