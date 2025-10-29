#!/usr/bin/env python
"""Simple test script to check API endpoints"""
import requests
import json
import time

def test_get():
    """Test GET endpoint"""
    print("\n=== Testing GET / ===")
    try:
        r = requests.get('http://localhost:8000/', timeout=5)
        print(f"Status: {r.status_code}")
        print(f"Response: {r.json()}")
        return r.status_code == 200
    except Exception as e:
        print(f"Error: {e}")
        return False

def test_post():
    """Test POST endpoint"""
    print("\n=== Testing POST /emitir ===")
    payload = {
        'whatsapp': '5511987654321',
        'tipo_contribuinte': 'autonomo',
        'valor_base': 1000.0,
        'plano': 'normal',
        'competencia': '02/2025'
    }
    try:
        r = requests.post('http://localhost:8000/api/v1/guias/emitir', json=payload, timeout=15)
        print(f"Status: {r.status_code}")
        if r.status_code == 200:
            print(f"Success! PDF size: {len(r.content)} bytes")
        else:
            print(f"Response: {r.text[:300]}")
        return r.status_code == 200
    except Exception as e:
        print(f"Error: {e}")
        return False

if __name__ == "__main__":
    print("Starting tests...")
    time.sleep(3)  # Wait for server to be ready
    
    get_ok = test_get()
    post_ok = test_post()
    
    print(f"\n=== Results ===")
    print(f"GET: {'PASS' if get_ok else 'FAIL'}")
    print(f"POST: {'PASS' if post_ok else 'FAIL'}")
