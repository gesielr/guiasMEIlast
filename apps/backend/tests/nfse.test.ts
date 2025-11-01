import { test, expect } from 'bun:test';
import { createAdnClient } from '../src/adapters/adn-client';
import { NfseService } from '../src/services/nfse.service';

const adnClient = createAdnClient();
const nfseService = new NfseService(adnClient);

// Testa emissão de NFSe

test('NFSe - Emissão', async () => {
  const payload = {
    // ...preencher com dados válidos de emissão...
  };
  const response = await nfseService.emitirNfse(payload);
  expect(response).toHaveProperty('chaveAcesso');
  expect(response).toHaveProperty('status');
});

// Testa consulta de NFSe

test('NFSe - Consulta', async () => {
  const chaveAcesso = 'EXEMPLO_CHAVE'; // Substituir por chave real ou mock
  const response = await nfseService.consultarNfse(chaveAcesso);
  expect(response).toHaveProperty('nfse');
  expect(response.nfse).toHaveProperty('chaveAcesso');
});

// Testa consulta de DPS

test('NFSe - Consulta DPS', async () => {
  const dpsId = 'EXEMPLO_DPS_ID'; // Substituir por ID real ou mock
  const response = await nfseService.consultarDps(dpsId);
  expect(response).toHaveProperty('dps');
});

// Testa consulta de parâmetros municipais

test('NFSe - Parâmetros Municipais', async () => {
  const municipio = '4205407'; // Exemplo: Florianópolis
  const response = await nfseService.consultarParametrosMunicipais(municipio);
  expect(response).toHaveProperty('parametros');
});

// Testa consulta de DANFSE

test('NFSe - DANFSE', async () => {
  const chaveAcesso = 'EXEMPLO_CHAVE'; // Substituir por chave real ou mock
  const response = await nfseService.consultarDanfse(chaveAcesso);
  expect(response).toHaveProperty('danfse');
});
