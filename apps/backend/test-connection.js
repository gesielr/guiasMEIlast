import fetch from 'node-fetch';

async function testConnection() {
  try {
    const response = await fetch('http://127.0.0.1:3333/health');
    const data = await response.json();
    console.log('Response:', data);
  } catch (error) {
    console.error('Error:', error);
  }
}

testConnection();