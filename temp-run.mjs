import { NfseService } from './apps/backend/src/nfse/services/nfse.service.js';
import fs from 'node:fs';

const dto = JSON.parse(fs.readFileSync('dps-request.json', 'utf8'));
const service = new NfseService();

service.emit(dto)
  .then((res) => {
    console.log('result', res);
  })
  .catch((err) => {
    console.error('error', err);
  });
