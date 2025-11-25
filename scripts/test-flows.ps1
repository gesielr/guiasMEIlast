# scripts/test-flows.ps1
# Script PowerShell para facilitar testes de integração

Write-Host "🧪 Configuração de Ambiente de Testes - GuiasMEI" -ForegroundColor Cyan
Write-Host ""

# 1. Verificar se está no diretório correto
$currentDir = Get-Location
Write-Host "📁 Diretório atual: $currentDir" -ForegroundColor Yellow

# 2. Verificar variáveis de ambiente
Write-Host "`n🔍 Verificando variáveis de ambiente..." -ForegroundColor Cyan

$requiredVars = @(
    "SICOOB_PIX_CHAVE",
    "SICOOB_CLIENT_ID",
    "SICOOB_CLIENT_SECRET",
    "SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY"
)

$missingVars = @()
foreach ($var in $requiredVars) {
    if (-not (Get-Item "Env:$var" -ErrorAction SilentlyContinue)) {
        $missingVars += $var
    }
}

if ($missingVars.Count -gt 0) {
    Write-Host "❌ Variáveis de ambiente faltando:" -ForegroundColor Red
    foreach ($var in $missingVars) {
        Write-Host "   - $var" -ForegroundColor Red
    }
    Write-Host "`n⚠️  Configure as variáveis antes de continuar!" -ForegroundColor Yellow
} else {
    Write-Host "✅ Todas as variáveis de ambiente configuradas" -ForegroundColor Green
}

# 3. Configurar valores de teste no banco
Write-Host "`n💰 Configurando valores de teste (R$ 0,10)..." -ForegroundColor Cyan

Write-Host "   Execute no Supabase SQL Editor:" -ForegroundColor Yellow
Write-Host "   `n   UPDATE public.system_config" -ForegroundColor Gray
Write-Host "   SET config_value = '0.10', updated_at = NOW()" -ForegroundColor Gray
Write-Host "   WHERE config_key IN ('valor_ativacao_autonomo', 'valor_certificado_mei');" -ForegroundColor Gray

# 4. Instruções de teste
Write-Host "`n📋 Próximos Passos:" -ForegroundColor Cyan
Write-Host "   1. Configure valores de teste no banco (SQL acima)" -ForegroundColor White
Write-Host "   2. Inicie o backend: cd apps/backend && npm run dev" -ForegroundColor White
Write-Host "   3. Inicie o frontend: cd apps/web && npm run dev" -ForegroundColor White
Write-Host "   4. Siga o GUIA_TESTES_INTEGRACAO.md" -ForegroundColor White

Write-Host "`n📖 Documentação completa: GUIA_TESTES_INTEGRACAO.md" -ForegroundColor Cyan

# 5. Verificar se migrations foram executadas
Write-Host "`n🔍 Verificando migrations..." -ForegroundColor Cyan

$migrationFile = "supabase/migrations/20250120000002_set_test_values.sql"
if (Test-Path $migrationFile) {
    Write-Host "✅ Migration de valores de teste encontrada" -ForegroundColor Green
    Write-Host "   Execute: supabase migration up 20250120000002_set_test_values" -ForegroundColor Yellow
} else {
    Write-Host "⚠️  Migration não encontrada" -ForegroundColor Yellow
}

Write-Host "`n✅ Configuração concluída!" -ForegroundColor Green
Write-Host "`n🚀 Pronto para iniciar os testes!" -ForegroundColor Cyan



