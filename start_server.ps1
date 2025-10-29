# Terminal 1: SERVIDOR
# Copie e execute ESTE comando para iniciar o servidor

cd "c:\Users\carlo\OneDrive\Área de Trabalho\Curso\Projetos Pessoais\Inss - Guias\guiasMEI\apps\backend\inss"
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --log-level debug
