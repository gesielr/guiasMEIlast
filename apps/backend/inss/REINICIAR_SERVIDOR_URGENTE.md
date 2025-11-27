# ⚠️ REINICIAR SERVIDOR URGENTE ⚠️

## O PROBLEMA:

O código de barras **AINDA ESTÁ ERRADO** porque o servidor FastAPI está usando a **versão antiga do código em memória**.

Nos logs você pode ver:
```
[PDF] [DEBUG] Desenhando linha digitável: '85810000001-4 66980270116-8 30001273176-9 21952025113-3'
                                                                    ^^^^^^^^^^^
                                                                    Campo 3 ERRADO!
```

Deveria ser: `30001273176` com NIT `2731762195` (10 primeiros dígitos)
Mas está: `30001273176` com NIT errado processado

## SOLUÇÃO:

### Passo 1: PARAR O SERVIDOR

No terminal onde o servidor está rodando, pressione:
```
Ctrl + C
```

Aguarde até ver a mensagem de que o servidor foi encerrado.

### Passo 2: REINICIAR O SERVIDOR

No mesmo terminal, execute:
```powershell
cd "c:\Users\carlo\OneDrive\Área de Trabalho\Curso\Projetos Pessoais\Inss - Guias\guiasMEI02\apps\backend\inss"
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**OU** se você tem um script de inicialização:
```powershell
.\start_server.ps1
```

### Passo 3: VERIFICAR QUE O SERVIDOR REINICIOU

Aguarde ver no terminal:
```
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
INFO:     Started reloader process [xxxxx] using StatReload
INFO:     Started server process [xxxxx]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
```

### Passo 4: TESTAR NOVA EMISSÃO

Agora sim, emita uma nova GPS e você verá:
- NIT processado corretamente: `2731762195` (10 primeiros dígitos)
- Campo 3 da linha digitável: `30001273176-9` (com NIT correto)
- Código de barras mais grosso e legível (0.38mm)

## IMPORTANTE:

**SEM REINICIAR O SERVIDOR, NENHUMA MUDANÇA NO CÓDIGO PYTHON TERÁ EFEITO!**

O parâmetro `--reload` só funciona quando você **salva** um arquivo, mas como você já tinha salvado antes, precisa reiniciar manualmente.

## O QUE ESPERAR APÓS REINICIAR:

Logs corretos:
```
[GPS HYBRID] Identificador: 27317621955
[GPS HYBRID] NIT processado: 2731762195 (10 primeiros dígitos)
[PDF] Linha digitável: 85810000001-4 66980270116-8 30001273176-9 21952025113-3
                                                   ^^^^^^^^^^^
                                                   Correto agora! ✅
```

## RESUMO:

1. ❌ **Antes:** NIT `27317621955` → `7317621955` (removeu primeiro "2")
2. ✅ **Depois:** NIT `27317621955` → `2731762195` (removeu último "5" - verificador)

**REINICIE O SERVIDOR AGORA!**
