# Script para mover .env de src/.env para a raiz
if (Test-Path "src\.env") {
    Copy-Item "src\.env" ".env" -Force
    Write-Host "✅ Arquivo .env copiado de src/.env para apps/web/.env"
    Write-Host "Agora reinicie o servidor Vite (npm run dev) para carregar as variáveis."
} else {
    Write-Host "❌ Arquivo src/.env não encontrado"
}


