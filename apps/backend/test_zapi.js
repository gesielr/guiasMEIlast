// Teste rápido da Z-API
require('dotenv').config();
const axios = require('axios');

const ZAPI_BASE_URL = process.env.ZAPI_BASE_URL;
const ZAPI_INSTANCE_ID = process.env.ZAPI_INSTANCE_ID;
const ZAPI_TOKEN = process.env.ZAPI_TOKEN;

console.log('=== Configuração Z-API ===');
console.log('Base URL:', ZAPI_BASE_URL);
console.log('Instance ID:', ZAPI_INSTANCE_ID);
console.log('Token:', ZAPI_TOKEN);

const url = `${ZAPI_BASE_URL}/instances/${ZAPI_INSTANCE_ID}/token/${ZAPI_TOKEN}/status`;
console.log('\n=== Testando Status da Instância ===');
console.log('URL:', url);

axios.get(url)
  .then(response => {
    console.log('\n✅ Status da API:', response.status);
    console.log('Resposta:', JSON.stringify(response.data, null, 2));
  })
  .catch(error => {
    console.error('\n❌ Erro ao conectar na Z-API:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Dados:', error.response.data);
    } else {
      console.error('Erro:', error.message);
    }
  });

// Teste de envio de mensagem
const phoneNumber = '5548991117268';
const message = 'Teste de mensagem da IA GuiasMEI';

setTimeout(() => {
  const sendUrl = `${ZAPI_BASE_URL}/instances/${ZAPI_INSTANCE_ID}/token/${ZAPI_TOKEN}/send-text`;
  console.log('\n=== Testando Envio de Mensagem ===');
  console.log('URL:', sendUrl);
  console.log('Para:', phoneNumber);
  
  axios.post(sendUrl, {
    phone: phoneNumber,
    message: message
  })
    .then(response => {
      console.log('\n✅ Mensagem enviada com sucesso!');
      console.log('Resposta:', JSON.stringify(response.data, null, 2));
    })
    .catch(error => {
      console.error('\n❌ Erro ao enviar mensagem:');
      if (error.response) {
        console.error('Status:', error.response.status);
        console.error('Dados:', error.response.data);
      } else {
        console.error('Erro:', error.message);
      }
    });
}, 2000);
