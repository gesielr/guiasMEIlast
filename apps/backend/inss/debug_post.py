#!/usr/bin/env python
"""Debug POST endpoint error"""
import subprocess
import sys
import time
import requests
import json

# Start server with stderr visible
print('Starting server...')
proc = subprocess.Popen([sys.executable, '-m', 'uvicorn', 'app.main:app', '--host', '0.0.0.0', '--port', '8000'],
                        stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, bufsize=1)

# Wait for server to be ready
time.sleep(5)

# Make POST request
payload = {
    'whatsapp': '5511987654321',
    'tipo_contribuinte': 'autonomo',
    'valor_base': 1000.0,
    'plano': 'normal',
    'competencia': '02/2025'
}

print('\nSending POST request...')
try:
    r = requests.post('http://localhost:8000/api/v1/guias/emitir', json=payload, timeout=15)
    print(f'POST Status: {r.status_code}')
    print(f'Response Headers: {dict(r.headers)}')
    print(f'Response Body: {r.text}')
except Exception as e:
    print(f'POST Error: {e}')

# Read server output
print('\n=== SERVER OUTPUT ===')
proc.terminate()
time.sleep(1)

# Print any remaining output
for line in proc.stdout:
    print(line.rstrip())

proc.wait()
print('Server terminated')
