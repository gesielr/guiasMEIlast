// Script para gerar XML DPS atual que está sendo enviado
// Baseado nos dados reais do sistema

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { gzipSync } from 'zlib';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// Dados baseados nos logs atuais
const xmlNaoAssinado = `<?xml version="1.0" encoding="UTF-8"?>
<DPS xmlns="http://www.sped.fazenda.gov.br/nfse" versao="1.00">
  <infDPS Id="DPS420570425991067200018700001000000000582912">
    <tpAmb>2</tpAmb>
    <dhEmi>2025-11-07T11:09:42-03:00</dhEmi>
    <verAplic>EmissorWeb_1.4.0.0</verAplic>
    <serie>1</serie>
    <nDPS>582912</nDPS>
    <dCompet>2025-11-01</dCompet>
    <tpEmit>1</tpEmit>
    <cLocEmi>4205704</cLocEmi>
    <prest>
      <CNPJ>59910672000187</CNPJ>
      <regTrib>
        <opSimpNac>2</opSimpNac>
        <regEspTrib>0</regEspTrib>
      </regTrib>
    </prest>
    <toma>
      <CNPJ>41568425000189</CNPJ>
      <xNome>REBELO CONTABILIDADE LTDA</xNome>
      <end>
        <endNac>
          <cMun>4205704</cMun>
          <CEP>88495000</CEP>
        </endNac>
        <xLgr>ESTRADA ENCANTADA</xLgr>
        <nro>0</nro>
        <xBairro>ENCANTADA</xBairro>
      </end>
    </toma>
    <serv>
      <locPrest>
        <cLocPrestacao>4205704</cLocPrestacao>
      </locPrest>
      <cServ>
        <cTribNac>140101</cTribNac>
        <xDescServ>Limpeza em prédios e escritórios</xDescServ>
      </cServ>
    </serv>
    <valores>
      <vServPrest>
        <vServ>15.00</vServ>
      </vServPrest>
      <trib>
        <tribMun>
          <tribISSQN>1</tribISSQN>
          <tpRetISSQN>1</tpRetISSQN>
        </tribMun>
        <totTrib>
          <indTotTrib>0</indTotTrib>
        </totTrib>
      </trib>
    </valores>
  </infDPS>
</DPS>`;

// XML assinado (exemplo - a assinatura real será diferente)
// Nota: Este é um exemplo do formato, a assinatura real será gerada pelo sistema
const xmlAssinadoExemplo = `<?xml version="1.0" encoding="UTF-8"?>
<DPS xmlns="http://www.sped.fazenda.gov.br/nfse" versao="1.00">
  <infDPS Id="DPS420570425991067200018700001000000000582912">
    <tpAmb>2</tpAmb>
    <dhEmi>2025-11-07T11:09:42-03:00</dhEmi>
    <verAplic>EmissorWeb_1.4.0.0</verAplic>
    <serie>1</serie>
    <nDPS>582912</nDPS>
    <dCompet>2025-11-01</dCompet>
    <tpEmit>1</tpEmit>
    <cLocEmi>4205704</cLocEmi>
    <prest>
      <CNPJ>59910672000187</CNPJ>
      <regTrib>
        <opSimpNac>2</opSimpNac>
        <regEspTrib>0</regEspTrib>
      </regTrib>
    </prest>
    <toma>
      <CNPJ>41568425000189</CNPJ>
      <xNome>REBELO CONTABILIDADE LTDA</xNome>
      <end>
        <endNac>
          <cMun>4205704</cMun>
          <CEP>88495000</CEP>
        </endNac>
        <xLgr>ESTRADA ENCANTADA</xLgr>
        <nro>0</nro>
        <xBairro>ENCANTADA</xBairro>
      </end>
    </toma>
    <serv>
      <locPrest>
        <cLocPrestacao>4205704</cLocPrestacao>
      </locPrest>
      <cServ>
        <cTribNac>140101</cTribNac>
        <xDescServ>Limpeza em prédios e escritórios</xDescServ>
      </cServ>
    </serv>
    <valores>
      <vServPrest>
        <vServ>15.00</vServ>
      </vServPrest>
      <trib>
        <tribMun>
          <tribISSQN>1</tribISSQN>
          <tpRetISSQN>1</tpRetISSQN>
        </tribMun>
        <totTrib>
          <indTotTrib>0</indTotTrib>
        </totTrib>
      </trib>
    </valores>
  </infDPS>
  <Signature xmlns="http://www.w3.org/2000/09/xmldsig#">
    <SignedInfo>
      <CanonicalizationMethod Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/>
      <SignatureMethod Algorithm="http://www.w3.org/2000/09/xmldsig#rsa-sha1"/>
      <Reference URI="#DPS420570425991067200018700001000000000582912">
        <Transforms>
          <Transform Algorithm="http://www.w3.org/2000/09/xmldsig#enveloped-signature"/>
          <Transform Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/>
        </Transforms>
        <DigestMethod Algorithm="http://www.w3.org/2000/09/xmldsig#sha1"/>
        <DigestValue>EXEMPLO_DIGEST_VALUE_AQUI</DigestValue>
      </Reference>
    </SignedInfo>
    <SignatureValue>EXEMPLO_SIGNATURE_VALUE_AQUI</SignatureValue>
    <KeyInfo>
      <X509Data>
        <X509Certificate>EXEMPLO_CERTIFICADO_BASE64_AQUI</X509Certificate>
      </X509Data>
    </KeyInfo>
  </Signature>
</DPS>`;

// Salvar XML não assinado
const arquivoNaoAssinado = path.resolve(projectRoot, 'DPS-NAO-ASSINADO.xml');
fs.writeFileSync(arquivoNaoAssinado, xmlNaoAssinado, 'utf8');
console.log(`✅ XML não assinado salvo em: ${arquivoNaoAssinado}`);

// Salvar XML assinado (exemplo)
const arquivoAssinado = path.resolve(projectRoot, 'DPS-ASSINADO-EXEMPLO.xml');
fs.writeFileSync(arquivoAssinado, xmlAssinadoExemplo, 'utf8');
console.log(`✅ XML assinado (exemplo) salvo em: ${arquivoAssinado}`);

// Gerar payload GZIP+B64 (formato que é enviado)
const xmlGzip = gzipSync(Buffer.from(xmlNaoAssinado, 'utf8'));
const xmlGzipB64 = xmlGzip.toString('base64');

const payload = {
  dpsXmlGZipB64: xmlGzipB64
};

const arquivoPayload = path.resolve(projectRoot, 'DPS-PAYLOAD.json');
fs.writeFileSync(arquivoPayload, JSON.stringify(payload, null, 2), 'utf8');
console.log(`✅ Payload JSON salvo em: ${arquivoPayload}`);
console.log(`   Tamanho do payload: ${xmlGzipB64.length} caracteres (base64)`);
console.log(`   Tamanho original: ${xmlNaoAssinado.length} bytes`);
console.log(`   Tamanho comprimido: ${xmlGzip.length} bytes`);
console.log(`   Taxa de compressão: ${((1 - xmlGzip.length / xmlNaoAssinado.length) * 100).toFixed(2)}%`);

console.log('\n📋 Resumo dos dados no XML:');
console.log('   Prestador CNPJ: 59.910.672/0001-87');
console.log('   Tomador CNPJ: 41.568.425/0001-89');
console.log('   Tomador Nome: REBELO CONTABILIDADE LTDA');
console.log('   Município: 4205704 (Garopaba/SC)');
console.log('   Serviço: 140101 - Limpeza em prédios e escritórios');
console.log('   Valor: R$ 15,00');
console.log('   Ambiente: 2 (Homologação)');
console.log('   tpAmb: 2');
console.log('\n⚠️  NOTA: O XML assinado é apenas um exemplo do formato.');
console.log('   A assinatura real será gerada pelo sistema com SHA1 conforme XSD.');

