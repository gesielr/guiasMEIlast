# remove_emojis.py
import re
import os
from pathlib import Path

# Mapeamento de emojis para equivalentes ASCII
EMOJI_MAP = {
    '✅': '[OK]',
    '⚠️': '[WARN]',
    '❌': '[ERROR]',
    '🔄': '[RELOAD]',
    '📊': '[STATS]',
    '🔍': '[SEARCH]',
    '💾': '[SAVE]',
    '🚀': '[START]',
    '⏱️': '[TIME]',
    '📝': '[NOTE]',
    '🔒': '[LOCK]',
    '🔓': '[UNLOCK]',
}

def remove_emojis_from_file(file_path):
    """Remove emojis de um arquivo Python."""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original_content = content
        
        # Substituir cada emoji pelo equivalente ASCII
        for emoji, replacement in EMOJI_MAP.items():
            content = content.replace(emoji, replacement)
        
        # Se houve mudanças, salvar o arquivo
        if content != original_content:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"[OK] Emojis removidos de: {file_path}")
            return True
        else:
            return False
    except Exception as e:
        print(f"[ERROR] Erro ao processar {file_path}: {e}")
        return False

def main():
    """Processa todos os arquivos Python no diretório app."""
    base_dir = Path(r"c:\Users\carlo\OneDrive\Área de Trabalho\Curso\Projetos Pessoais\Inss - Guias\guiasMEI02\apps\backend\inss\app")
    
    files_modified = 0
    
    # Procurar todos os arquivos .py recursivamente
    for py_file in base_dir.rglob("*.py"):
        if remove_emojis_from_file(py_file):
            files_modified += 1
    
    print(f"\n[OK] Processo concluído. {files_modified} arquivos modificados.")

if __name__ == "__main__":
    main()
