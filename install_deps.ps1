# Script para instalar dependências do projeto INSS
$projectPath = "apps\backend\inss"
$requirementsFile = "$projectPath\requirements.txt"

Write-Host "Navegando para o diretório do projeto..."
Set-Location $projectPath

Write-Host "Ativando ambiente virtual..."
& ".\venv\Scripts\activate.ps1"

Write-Host "Instalando dependências..."
pip install -r requirements.txt

Write-Host "Instalação concluída!"
