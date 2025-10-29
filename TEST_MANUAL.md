# Manual de Testes - Terminal 1 e Terminal 2

## ⚙️ TERMINAL 1: Iniciar o Servidor

Copie e cole este comando no Terminal 1:

```powershell
cd "c:\Users\carlo\OneDrive\Área de Trabalho\Curso\Projetos Pessoais\Inss - Guias\guiasMEI\apps\backend\inss"; .\.venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --log-level debug
```

Aguarde até ver a mensagem:
```
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
```

**NÃO FECHE ESTE TERMINAL!** Deixe rodando e observe os logs.

---

## 🧪 TERMINAL 2: Executar os Testes

Após o servidor estar rodando, copie e cole este comando no Terminal 2:

```powershell
$pythonExe = "c:\Users\carlo\OneDrive\Área de Trabalho\Curso\Projetos Pessoais\Inss - Guias\guiasMEI\apps\backend\inss\.venv\Scripts\python.exe"; cd "c:\Users\carlo\OneDrive\Área de Trabalho\Curso\Projetos Pessoais\Inss - Guias\guiasMEI"; & $pythonExe test_post_fix.py
```

---

## 📊 O Que Você Vai Ver

### No Terminal 1 (Servidor):
Você deve ver logs com emojis como:
- ✅ `[EMITIR] Iniciando com payload...`
- ✅ `[EMITIR] WhatsApp validado...`
- ✅ `[EMITIR] Cálculo realizado...`
- Ou ❌ com um erro específico

### No Terminal 2 (Testes):
Você vai ver:
- ✅ GET / → PASS (status 200)
- POST /emitir → Resultado (PASS se 200, FAIL se 500)
- POST /complementacao → Resultado (PASS se 200, FAIL se 500)

---

## ⚠️ IMPORTANTE

1. **Deixe os dois terminais abertos** lado a lado
2. **Copie TODOS os logs** do Terminal 1 (do momento que enviou a requisição até ver o resultado)
3. **Me envie:**
   - Resultado do Terminal 2 (teste)
   - **TODOS os logs do Terminal 1** (especialmente os com ❌ se houver erro)

Pronto! É isso! 🎯
