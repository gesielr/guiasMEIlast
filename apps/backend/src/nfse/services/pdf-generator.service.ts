import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import logger from '../../utils/logger';
import type { DadosNFSe } from './nfse-consulta.service';

export class PdfGeneratorService {
  /**
   * Gerar PDF da NFS-e a partir dos dados estruturados
   */
  async gerarPdfNfse(dados: DadosNFSe): Promise<Buffer> {
    logger.info(`[PDF GEN] Gerando PDF para nota ${dados.numero}`);

    try {
      // Importação dinâmica para evitar erro se html-pdf-node não estiver instalado
      const htmlPdf = await import('html-pdf-node');
      
      // 1. Gerar HTML
      const html = this.gerarHtmlDanfse(dados);

      // 2. Converter HTML → PDF
      const options = {
        format: 'A4' as const,
        margin: {
          top: '20mm',
          right: '15mm',
          bottom: '20mm',
          left: '15mm'
        },
        printBackground: true,
        preferCSSPageSize: true
      };

      const file = { content: html };
      const pdfBuffer = await htmlPdf.default.generatePdf(file, options);

      logger.info(`[PDF GEN] ✅ PDF gerado (${pdfBuffer.length} bytes)`);
      return pdfBuffer;
    } catch (error) {
      logger.error(`[PDF GEN] Erro ao gerar PDF: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Gerar HTML do DANFSE (Documento Auxiliar da NFS-e)
   */
  private gerarHtmlDanfse(dados: DadosNFSe): string {
    const dataFormatada = format(dados.dataEmissao, "dd/MM/yyyy 'às' HH:mm:ss", {
      locale: ptBR
    });

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>DANFSE ${dados.numero}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: 'Arial', sans-serif;
      font-size: 11px;
      color: #000;
      line-height: 1.4;
    }
    .page {
      width: 210mm;
      min-height: 297mm;
      padding: 15mm;
      margin: 0 auto;
      background: white;
    }
    .header {
      text-align: center;
      border: 2px solid #000;
      padding: 15px;
      margin-bottom: 10px;
      background: #f8f9fa;
    }
    .header h1 {
      font-size: 16px;
      font-weight: bold;
      margin-bottom: 8px;
      text-transform: uppercase;
    }
    .header h2 {
      font-size: 14px;
      font-weight: normal;
      color: #333;
      margin-bottom: 5px;
    }
    .header .numero-nota {
      font-size: 20px;
      font-weight: bold;
      color: #c00;
      margin-top: 10px;
    }
    .section {
      border: 1px solid #000;
      margin-bottom: 8px;
      page-break-inside: avoid;
    }
    .section-header {
      background: #e9ecef;
      padding: 6px 10px;
      font-weight: bold;
      font-size: 12px;
      border-bottom: 1px solid #000;
      text-transform: uppercase;
    }
    .section-content {
      padding: 10px;
    }
    .row {
      display: flex;
      margin-bottom: 8px;
    }
    .field {
      flex: 1;
      padding-right: 15px;
    }
    .field-label {
      font-weight: bold;
      font-size: 9px;
      color: #666;
      text-transform: uppercase;
      margin-bottom: 3px;
    }
    .field-value {
      font-size: 11px;
      color: #000;
      word-wrap: break-word;
    }
    .discriminacao {
      min-height: 80px;
      padding: 10px;
      border: 1px solid #ddd;
      background: #fff;
      white-space: pre-wrap;
      word-wrap: break-word;
    }
    .valores-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 5px;
    }
    .valores-table td {
      padding: 8px;
      border: 1px solid #ddd;
    }
    .valores-table .label {
      width: 60%;
      font-weight: bold;
      background: #f8f9fa;
    }
    .valores-table .value {
      width: 40%;
      text-align: right;
      font-family: 'Courier New', monospace;
    }
    .valor-total {
      background: #e9ecef !important;
      font-size: 14px;
      font-weight: bold;
    }
    .chave-acesso {
      text-align: center;
      padding: 15px;
      margin-top: 20px;
      border: 2px solid #000;
      background: #f8f9fa;
    }
    .chave-acesso .titulo {
      font-weight: bold;
      font-size: 11px;
      margin-bottom: 8px;
      text-transform: uppercase;
    }
    .chave-acesso .chave {
      font-family: 'Courier New', monospace;
      font-size: 10px;
      word-break: break-all;
      letter-spacing: 1px;
      line-height: 1.6;
    }
    .footer {
      text-align: center;
      margin-top: 20px;
      padding-top: 15px;
      border-top: 1px solid #ddd;
      font-size: 9px;
      color: #666;
    }
  </style>
</head>
<body>
  <div class="page">
    <!-- CABEÇALHO -->
    <div class="header">
      <h1>DANFSE</h1>
      <h2>Documento Auxiliar da Nota Fiscal de Serviços Eletrônica</h2>
      <h2>Sistema Nacional da NFS-e</h2>
      <div class="numero-nota">Nº ${dados.numero || 'N/A'}</div>
    </div>

    <!-- DADOS DA NOTA -->
    <div class="section">
      <div class="section-header">Dados da Nota Fiscal</div>
      <div class="section-content">
        <div class="row">
          <div class="field">
            <div class="field-label">Número da NFS-e</div>
            <div class="field-value">${dados.numero || 'N/A'}</div>
          </div>
          <div class="field">
            <div class="field-label">Protocolo</div>
            <div class="field-value">${dados.protocolo || 'N/A'}</div>
          </div>
          <div class="field">
            <div class="field-label">Data e Hora de Emissão</div>
            <div class="field-value">${dataFormatada}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- PRESTADOR -->
    <div class="section">
      <div class="section-header">Prestador de Serviços</div>
      <div class="section-content">
        <div class="row">
          <div class="field" style="flex: 2;">
            <div class="field-label">Razão Social / Nome</div>
            <div class="field-value">${this.escapeHtml(dados.prestador.nome)}</div>
          </div>
          <div class="field">
            <div class="field-label">CNPJ</div>
            <div class="field-value">${this.formatarCNPJ(dados.prestador.cnpj)}</div>
          </div>
        </div>
        <div class="row">
          <div class="field" style="flex: 3;">
            <div class="field-label">Endereço</div>
            <div class="field-value">${this.escapeHtml(dados.prestador.endereco)}</div>
          </div>
          <div class="field">
            <div class="field-label">Município</div>
            <div class="field-value">${dados.prestador.municipio} - ${dados.prestador.uf}</div>
          </div>
          <div class="field">
            <div class="field-label">CEP</div>
            <div class="field-value">${this.formatarCEP(dados.prestador.cep)}</div>
          </div>
        </div>
        ${dados.prestador.fone || dados.prestador.email ? `
        <div class="row">
          ${dados.prestador.fone ? `
          <div class="field">
            <div class="field-label">Telefone</div>
            <div class="field-value">${dados.prestador.fone}</div>
          </div>
          ` : ''}
          ${dados.prestador.email ? `
          <div class="field" style="flex: 2;">
            <div class="field-label">E-mail</div>
            <div class="field-value">${dados.prestador.email}</div>
          </div>
          ` : ''}
        </div>
        ` : ''}
      </div>
    </div>

    <!-- TOMADOR -->
    <div class="section">
      <div class="section-header">Tomador de Serviços</div>
      <div class="section-content">
        <div class="row">
          <div class="field" style="flex: 2;">
            <div class="field-label">Razão Social / Nome</div>
            <div class="field-value">${this.escapeHtml(dados.tomador.nome)}</div>
          </div>
          <div class="field">
            <div class="field-label">CNPJ/CPF</div>
            <div class="field-value">${this.formatarCNPJ(dados.tomador.cnpj)}</div>
          </div>
        </div>
        <div class="row">
          <div class="field" style="flex: 3;">
            <div class="field-label">Endereço</div>
            <div class="field-value">${this.escapeHtml(dados.tomador.endereco)}</div>
          </div>
          <div class="field">
            <div class="field-label">Município</div>
            <div class="field-value">${dados.tomador.municipio} - ${dados.tomador.uf}</div>
          </div>
          <div class="field">
            <div class="field-label">CEP</div>
            <div class="field-value">${this.formatarCEP(dados.tomador.cep)}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- DISCRIMINAÇÃO DOS SERVIÇOS -->
    <div class="section">
      <div class="section-header">Discriminação dos Serviços</div>
      <div class="section-content">
        <div class="field-label">Código do Serviço: ${dados.servico.codigo}</div>
        <div class="discriminacao">${this.escapeHtml(dados.servico.discriminacao)}</div>
      </div>
    </div>

    <!-- VALORES -->
    <div class="section">
      <div class="section-header">Valores</div>
      <div class="section-content">
        <table class="valores-table">
          <tr>
            <td class="label">Valor dos Serviços</td>
            <td class="value">R$ ${dados.valores.servicos.toFixed(2)}</td>
          </tr>
          ${dados.valores.deducoes > 0 ? `
          <tr>
            <td class="label">(-) Deduções</td>
            <td class="value">R$ ${dados.valores.deducoes.toFixed(2)}</td>
          </tr>
          ` : ''}
          ${dados.valores.descontoIncondicionado > 0 ? `
          <tr>
            <td class="label">(-) Desconto Incondicionado</td>
            <td class="value">R$ ${dados.valores.descontoIncondicionado.toFixed(2)}</td>
          </tr>
          ` : ''}
          <tr>
            <td class="label">(=) Base de Cálculo</td>
            <td class="value">R$ ${dados.valores.baseCalculo.toFixed(2)}</td>
          </tr>
          ${dados.valores.retencoes > 0 ? `
          <tr>
            <td class="label">(-) Retenções</td>
            <td class="value">R$ ${dados.valores.retencoes.toFixed(2)}</td>
          </tr>
          ` : ''}
          <tr class="valor-total">
            <td class="label">VALOR LÍQUIDO DA NFS-e</td>
            <td class="value">R$ ${dados.valores.valorLiquido.toFixed(2)}</td>
          </tr>
        </table>
      </div>
    </div>

    <!-- CHAVE DE ACESSO -->
    <div class="chave-acesso">
      <div class="titulo">Chave de Acesso</div>
      <div class="chave">${this.formatarChaveAcesso(dados.chaveAcesso)}</div>
    </div>

    <!-- RODAPÉ -->
    <div class="footer">
      <p>Nota Fiscal de Serviços Eletrônica - Sistema Nacional</p>
      <p>Consulte a autenticidade em: https://www.nfse.gov.br/ConsultaPublica</p>
      <p>Documento gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm:ss", { locale: ptBR })}</p>
    </div>
  </div>
</body>
</html>
    `;
  }

  /**
   * Formatar CNPJ
   */
  private formatarCNPJ(cnpj: string): string {
    if (!cnpj) return '';
    const limpo = cnpj.replace(/\D/g, '');
    
    if (limpo.length === 14) {
      return limpo.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
    }
    
    if (limpo.length === 11) {
      return limpo.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
    }
    
    return cnpj;
  }

  /**
   * Formatar CEP
   */
  private formatarCEP(cep: string): string {
    if (!cep) return '';
    const limpo = cep.replace(/\D/g, '');
    return limpo.replace(/^(\d{5})(\d{3})$/, '$1-$2');
  }

  /**
   * Formatar chave de acesso (quebrar em blocos)
   */
  private formatarChaveAcesso(chave: string): string {
    if (!chave) return '';
    // Quebrar em blocos de 4 caracteres
    return chave.match(/.{1,4}/g)?.join(' ') || chave;
  }

  /**
   * Escapar HTML para prevenir XSS
   */
  private escapeHtml(text: string): string {
    if (!text) return '';
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}

