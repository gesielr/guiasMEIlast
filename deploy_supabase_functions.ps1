# Script para fazer deploy das Edge Functions do Supabase
Write-Host "================================" -ForegroundColor Cyan
Write-Host "  DEPLOY SUPABASE EDGE FUNCTIONS" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Verificar se Supabase CLI está instalado
Write-Host "[1/5] Verificando Supabase CLI..." -ForegroundColor Yellow
try {
    $supabaseVersion = supabase --version 2>&1
    Write-Host "  ✓ Supabase CLI instalado: $supabaseVersion" -ForegroundColor Green
} catch {
    Write-Host "  ✗ Supabase CLI não encontrado" -ForegroundColor Red
    Write-Host ""
    Write-Host "Instale o Supabase CLI:" -ForegroundColor Yellow
    Write-Host "  npm install -g supabase" -ForegroundColor White
    Write-Host "  ou" -ForegroundColor Gray
    Write-Host "  scoop install supabase" -ForegroundColor White
    exit 1
}

# Navegar para diretório do projeto
Write-Host ""
Write-Host "[2/5] Navegando para diretório do projeto..." -ForegroundColor Yellow
Set-Location "c:\Users\carlo\OneDrive\Área de Trabalho\Curso\Projetos Pessoais\Inss - Guias\guiasMEI"
Write-Host "  ✓ Diretório: $(Get-Location)" -ForegroundColor Green

# Verificar se está linkado ao projeto Supabase
Write-Host ""
Write-Host "[3/5] Verificando link com projeto Supabase..." -ForegroundColor Yellow
try {
    $linkStatus = supabase status 2>&1
    Write-Host "  ✓ Projeto linkado" -ForegroundColor Green
} catch {
    Write-Host "  ⚠ Projeto não linkado. Execute:" -ForegroundColor Yellow
    Write-Host "    supabase link --project-ref idvfhgznofvubscjycvt" -ForegroundColor White
    Write-Host ""
    Write-Host "  Tentando linkar automaticamente..." -ForegroundColor Yellow
    supabase link --project-ref idvfhgznofvubscjycvt
}

# Fazer deploy da função fetch-cnpj
Write-Host ""
Write-Host "[4/5] Fazendo deploy da função fetch-cnpj..." -ForegroundColor Yellow
Write-Host "  ℹ Função: supabase/functions/fetch-cnpj" -ForegroundColor Gray

try {
    supabase functions deploy fetch-cnpj --no-verify-jwt
    Write-Host "  ✓ Deploy concluído com sucesso!" -ForegroundColor Green
} catch {
    Write-Host "  ✗ Erro no deploy" -ForegroundColor Red
    Write-Host "  Detalhes: $_" -ForegroundColor Gray
    exit 1
}

# Testar função deployada
Write-Host ""
Write-Host "[5/5] Testando função deployada..." -ForegroundColor Yellow
$testCnpj = "59910672000187"
$functionUrl = "https://idvfhgznofvubscjycvt.supabase.co/functions/v1/fetch-cnpj?cnpj=$testCnpj"

Write-Host "  ℹ URL: $functionUrl" -ForegroundColor Gray

try {
    $response = Invoke-WebRequest -Uri $functionUrl -Method Get -TimeoutSec 10
    if ($response.StatusCode -eq 200) {
        Write-Host "  ✓ Função respondendo corretamente (200 OK)" -ForegroundColor Green
        $data = $response.Content | ConvertFrom-Json
        Write-Host "  ✓ Razão Social: $($data.nome)" -ForegroundColor Green
    } else {
        Write-Host "  ⚠ Status: $($response.StatusCode)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  ✗ Erro ao testar função" -ForegroundColor Red
    Write-Host "  Detalhes: $_" -ForegroundColor Gray
}

Write-Host ""
Write-Host "================================" -ForegroundColor Cyan
Write-Host "  ✓ DEPLOY CONCLUÍDO!" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Próximo passo:" -ForegroundColor Yellow
Write-Host "  1. Recarregue a página no navegador (Ctrl+Shift+R)" -ForegroundColor White
Write-Host "  2. Digite novamente o CNPJ: 59.910.672/0001-87" -ForegroundColor White
Write-Host "  3. Verifique se os dados foram carregados automaticamente" -ForegroundColor White
Write-Host ""
