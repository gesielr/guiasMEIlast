# ⚠️ AÇÃO NECESSÁRIA: Limpar Cache e Reiniciar Servidor

## Data: 26/11/2025

## O Que Foi Feito Agora

✅ **Cache Python limpo:** Todos os arquivos `__pycache__` foram removidos

## Por Que Isso É Importante

Mesmo com o servidor reiniciado via `uvicorn --reload`, o Python mantém módulos compilados em cache (`.pyc` files). Isso pode fazer com que alterações no código não sejam aplicadas.

## Próximos Passos - FAÇA AGORA:

### 1. Pare o Servidor Atual

No terminal onde o servidor está rodando, pressione **Ctrl+C** para parar completamente.

### 2. Reinicie o Servidor

```powershell
cd "apps\backend\inss"
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 3. Aguarde a Mensagem de Sucesso

Você deve ver:
```
[OK] LIFESPAN STARTUP COMPLETO - SERVIDOR PRONTO
```

### 4. Emita Uma Nova GPS

Emita uma nova GPS com os mesmos dados:
- NIT: `27317621955`
- Código: `1163`
- Competência: `11/2025`
- Valor: R$ 166,98

### 5. Verifique a Linha Digitável

A linha digitável deve mostrar:
```
85810000001-4 66980270116-8 30001273176-9 21952025113-3
```

Com o NIT `2731762195` processado corretamente (10 primeiros dígitos, sem o verificador "5").

### 6. Teste com o App do Banco

Use o aplicativo do banco para escanear o código de barras. O módulo fino agora está em 0.38mm (padrão ISO), então o scanner deve conseguir ler.

## O Que Foi Corrigido

1. ✅ **NIT processado corretamente:** Agora remove o ÚLTIMO dígito (verificador "5") em vez do primeiro
   - Antes: `27317621955` → `7317621955` (ERRADO)
   - Depois: `27317621955` → `2731762195` (CORRETO)

2. ✅ **Largura de barras otimizada:** Módulo fino ajustado de 0.27mm para 0.38mm (padrão ISO/IEC 15417)
   - Barras agora estão no tamanho ideal para leitores bancários

3. ✅ **Cache Python limpo:** Arquivos `.pyc` removidos para garantir que o código atualizado seja carregado

## Se Ainda Não Funcionar

Se após reiniciar e testar o banco ainda não reconhecer:

1. **Verifique os logs** para confirmar que o NIT está sendo processado corretamente:
   ```
   [GPS HYBRID] Identificador: 27317621955
   ```

2. **Tire uma foto do código de barras** e verifique se as barras estão visíveis e bem definidas

3. **Teste o código digitável manualmente** no app do banco:
   ```
   85810000001466980270116830001273176921952025113320000000000
   ```
   (remova os espaços e hífens)

## Arquivos Modificados Nesta Sessão

- `codigo_barras_gps.py` - NIT processing (linhas 105-117)
- `gps_pdf_generator_oficial.py` - Barcode width (linhas 707-711)
- `__pycache__` - Limpo
