# Run NFSe Tests - PowerShell Script
# Este script executa a suite de testes completa para o sistema NFSe

param(
    [string]$TestType = "both",  # "node", "python", ou "both"
    [string]$Env = "development", # "development" ou "production"
    [bool]$Verbose = $true
)

$ScriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptPath

# Cores para output
$Colors = @{
    Green  = "`e[32m"
    Red    = "`e[31m"
    Yellow = "`e[33m"
    Cyan   = "`e[36m"
    Reset  = "`e[0m"
    Bold   = "`e[1m"
}

function Write-Color {
    param(
        [string]$Message,
        [string]$Color = "Reset"
    )
    Write-Host "$($Colors[$Color])$Message$($Colors.Reset)"
}

function Write-Header {
    param([string]$Text)
    Write-Host "`n"
    Write-Color "═══════════════════════════════════════════════════════" "Cyan"
    Write-Color $Text "Cyan"
    Write-Color "═══════════════════════════════════════════════════════" "Cyan"
}

function Write-Step {
    param([string]$Text)
    Write-Color "→ $Text" "Cyan"
}

function Write-Success {
    param([string]$Text)
    Write-Color "✓ $Text" "Green"
}

function Write-Error {
    param([string]$Text)
    Write-Color "✗ $Text" "Red"
}

function Write-Warning {
    param([string]$Text)
    Write-Color "⚠ $Text" "Yellow"
}

# Validações iniciais
Write-Header "VALIDAÇÕES INICIAIS"

Write-Step "Verificando ambiente Node.js..."
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Error "Node.js não encontrado! Por favor, instale Node.js 18+ https://nodejs.org/"
    exit 1
}
$NodeVersion = node --version
Write-Success "Node.js $NodeVersion encontrado"

if ($TestType -in @("python", "both")) {
    Write-Step "Verificando Python..."
    if (-not (Get-Command python -ErrorAction SilentlyContinue)) {
        if (-not (Get-Command python3 -ErrorAction SilentlyContinue)) {
            Write-Warning "Python não encontrado. Testes Python serão pulados."
            $TestType = "node"
        } else {
            Write-Success "Python3 encontrado"
        }
    } else {
        Write-Success "Python encontrado"
    }
}

# Verificar arquivo de configuração
Write-Step "Verificando arquivo de testes..."

$TestNodePath = "test_nfse_polling_and_pdf.mjs"
$TestPythonPath = "test_nfse_polling_and_pdf.py"

if (($TestType -in @("node", "both")) -and -not (Test-Path $TestNodePath)) {
    Write-Error "Arquivo de testes Node.js não encontrado: $TestNodePath"
    exit 1
}

if (($TestType -in @("python", "both")) -and -not (Test-Path $TestPythonPath)) {
    Write-Warning "Arquivo de testes Python não encontrado: $TestPythonPath"
    $TestType = "node"
}

Write-Success "Arquivos de testes encontrados"

# Verificar backend
Write-Step "Verificando conectividade com backend..."
$BackendUrl = "http://localhost:3333/health"
try {
    $Response = Invoke-WebRequest -Uri $BackendUrl -Method GET -TimeoutSec 2 -ErrorAction Stop
    Write-Success "Backend respondendo em http://localhost:3333"
} catch {
    Write-Warning "Backend não está respondendo em http://localhost:3333"
    Write-Color "Você pode iniciar com: cd apps/backend && npm run dev" "Yellow"
}

# Executar testes
Write-Header "EXECUTANDO TESTES"

if ($TestType -in @("node", "both")) {
    Write-Header "TESTE NODE.JS"
    Write-Color "Iniciando suite de testes Node.js..." "Cyan"
    Write-Color "Testando: Emissão → Polling → Download PDF → Erros → Métricas" "Cyan"
    Write-Host ""
    
    $StartTime = Get-Date
    & node $TestNodePath
    $NodeExitCode = $LASTEXITCODE
    $Duration = (Get-Date) - $StartTime
    
    Write-Host ""
    if ($NodeExitCode -eq 0) {
        Write-Success "Testes Node.js completados com sucesso"
        Write-Success "Tempo total: $($Duration.TotalSeconds) segundos"
        
        if (Test-Path "test_results.json") {
            Write-Success "Relatório salvo em: test_results.json"
            if (Test-Path "nfse_download.pdf") {
                Write-Success "PDF de teste baixado em: nfse_download.pdf"
            }
        }
    } else {
        Write-Error "Testes Node.js falharam (Exit code: $NodeExitCode)"
    }
}

if ($TestType -in @("python", "both")) {
    Write-Header "TESTE PYTHON"
    Write-Color "Iniciando suite de testes Python..." "Cyan"
    Write-Color "Testando: Emissão → Polling → Download PDF → Erros → Métricas" "Cyan"
    Write-Host ""
    
    $StartTime = Get-Date
    & python $TestPythonPath
    $PythonExitCode = $LASTEXITCODE
    $Duration = (Get-Date) - $StartTime
    
    Write-Host ""
    if ($PythonExitCode -eq 0) {
        Write-Success "Testes Python completados com sucesso"
        Write-Success "Tempo total: $($Duration.TotalSeconds) segundos"
        
        if (Test-Path "test_results_python.json") {
            Write-Success "Relatório salvo em: test_results_python.json"
        }
    } else {
        Write-Error "Testes Python falharam (Exit code: $PythonExitCode)"
    }
}

# Resumo final
Write-Header "RESUMO DOS TESTES"

$TestResultFiles = @()
if (Test-Path "test_results.json") {
    $TestResultFiles += "test_results.json"
}
if (Test-Path "test_results_python.json") {
    $TestResultFiles += "test_results_python.json"
}

if ($TestResultFiles.Count -gt 0) {
    Write-Step "Analisando resultados..."
    foreach ($File in $TestResultFiles) {
        Write-Host ""
        $Content = Get-Content $File | ConvertFrom-Json
        
        $Color = if ($Content.failed -eq 0) { "Green" } else { "Red" }
        Write-Color "$File:" $Color
        Write-Host "  - Total de testes: $($Content.total)"
        Write-Host "  - Passou: $($Content.passed)"
        Write-Host "  - Falhou: $($Content.failed)"
        
        if ($Content.failed -gt 0) {
            Write-Error "Alguns testes falharam!"
        }
    }
} else {
    Write-Warning "Nenhum arquivo de resultado encontrado"
}

Write-Host ""
Write-Header "PRÓXIMOS PASSOS"

Write-Color "1. Revisar logs em: apps/backend/logs/" "Cyan"
Write-Color "2. Consultar TESTING_GUIDE.md para detalhes de erros" "Cyan"
Write-Color "3. Verificar dashboard em: http://localhost:5173/admin/nfse/emissoes" "Cyan"
Write-Color "4. Para suporte, consulte: .env.documentation" "Cyan"

Write-Host ""
Write-Color "✓ Testes concluídos!" "Green"
Write-Host ""
