import { randomUUID } from "node:crypto";
import type { CreateDpsDto } from "../dto/create-dps.dto";

function formatDocumentoTag(documento: string) {
  const sanitized = documento.replace(/\D/g, "");
  if (sanitized.length === 14) {
    return { tag: "cnpj", value: sanitized };
  }
  return { tag: "cpf", value: sanitized };
}

function formatIsoDate(date?: string) {
  if (!date) return new Date().toISOString();
  return new Date(date).toISOString();
}

function money(value: number) {
  return value.toFixed(2);
}

function escapeXml(str: string) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function buildDpsXml(dto: CreateDpsDto): string {
  const id = `DPS-${randomUUID()}`;
  const prestadorDoc = formatDocumentoTag(dto.prestador.cpfCnpj);
  const tomadorDoc = formatDocumentoTag(dto.tomador.documento);
  const dataEmissao = formatIsoDate(dto.identification.dataEmissao);
  const competencia = dto.identification.competencia;
  const valorServicos = dto.servico.valorServicos;
  const valorDeducoes = dto.servico.valorDeducoes ?? 0;
  const valorIss = dto.servico.valorIss ?? ((valorServicos - valorDeducoes) * dto.servico.aliquota) / 100;

  // Campos adicionais conforme manual
  const obraXml = dto.obra ? `
    <obra>
      <codigoObra>${escapeXml(dto.obra.codigoObra)}</codigoObra>
      <cep>${escapeXml(dto.obra.cep)}</cep>
      <municipio>${escapeXml(dto.obra.municipio)}</municipio>
      <bairro>${escapeXml(dto.obra.bairro)}</bairro>
      <logradouro>${escapeXml(dto.obra.logradouro)}</logradouro>
      <numero>${escapeXml(dto.obra.numero)}</numero>
      ${dto.obra.complemento ? `<complemento>${escapeXml(dto.obra.complemento)}</complemento>` : ""}
      <inscricaoImobiliaria>${escapeXml(dto.obra.inscricaoImobiliaria)}</inscricaoImobiliaria>
    </obra>
  ` : "";

  const eventoXml = dto.evento ? `
    <evento>
      <identificacao>${escapeXml(dto.evento.identificacao)}</identificacao>
      <dataInicial>${escapeXml(dto.evento.dataInicial)}</dataInicial>
      <dataFinal>${escapeXml(dto.evento.dataFinal)}</dataFinal>
      <descricao>${escapeXml(dto.evento.descricao)}</descricao>
      <cep>${escapeXml(dto.evento.cep)}</cep>
      <municipio>${escapeXml(dto.evento.municipio)}</municipio>
      <bairro>${escapeXml(dto.evento.bairro)}</bairro>
      <logradouro>${escapeXml(dto.evento.logradouro)}</logradouro>
      <numero>${escapeXml(dto.evento.numero)}</numero>
      ${dto.evento.complemento ? `<complemento>${escapeXml(dto.evento.complemento)}</complemento>` : ""}
    </evento>
  ` : "";

  const exportacaoXml = dto.exportacao ? `
    <exportacao>
      <modalidade>${escapeXml(dto.exportacao.modalidade)}</modalidade>
      <vinculo>${escapeXml(dto.exportacao.vinculo)}</vinculo>
      <moeda>${escapeXml(dto.exportacao.moeda)}</moeda>
      <valorServicoMoedaEstrangeira>${money(dto.exportacao.valorServicoMoedaEstrangeira)}</valorServicoMoedaEstrangeira>
      <paisResultado>${escapeXml(dto.exportacao.paisResultado)}</paisResultado>
      <mecanismoApoio>${escapeXml(dto.exportacao.mecanismoApoio)}</mecanismoApoio>
      <mecanismoApoioTomador>${escapeXml(dto.exportacao.mecanismoApoioTomador)}</mecanismoApoioTomador>
      <vinculoOperacao>${escapeXml(dto.exportacao.vinculoOperacao)}</vinculoOperacao>
      ${dto.exportacao.numeroDeclaracaoImportacao ? `<numeroDeclaracaoImportacao>${escapeXml(dto.exportacao.numeroDeclaracaoImportacao)}</numeroDeclaracaoImportacao>` : ""}
      ${dto.exportacao.numeroRegistroExportacao ? `<numeroRegistroExportacao>${escapeXml(dto.exportacao.numeroRegistroExportacao)}</numeroRegistroExportacao>` : ""}
      <compartilharComMDIC>${dto.exportacao.compartilharComMDIC ? "1" : "2"}</compartilharComMDIC>
    </exportacao>
  ` : "";

  const deducoesXml = dto.deducoes && dto.deducoes.length > 0 ? `
    <deducoes>
      ${dto.deducoes.map(ded => `
        <deducao>
          <tipoDocumento>${escapeXml(ded.tipoDocumento)}</tipoDocumento>
          <chaveAcesso>${escapeXml(ded.chaveAcesso)}</chaveAcesso>
          <dataEmissao>${escapeXml(ded.dataEmissao)}</dataEmissao>
          <valorDedutivel>${money(ded.valorDedutivel)}</valorDedutivel>
          <valorDeducao>${money(ded.valorDeducao)}</valorDeducao>
        </deducao>
      `).join('')}
    </deducoes>
  ` : "";

  const beneficioXml = dto.beneficioMunicipal ? `
    <beneficioMunicipal>
      <identificacao>${escapeXml(dto.beneficioMunicipal.identificacao)}</identificacao>
      <valorReducao>${money(dto.beneficioMunicipal.valorReducao)}</valorReducao>
      <percentualReducao>${dto.beneficioMunicipal.percentualReducao}</percentualReducao>
    </beneficioMunicipal>
  ` : "";

  const retencaoXml = dto.retencaoIssqn ? `
    <retencaoIssqn>
      <retidoPor>${escapeXml(dto.retencaoIssqn.retidoPor)}</retidoPor>
      <valorRetido>${money(dto.retencaoIssqn.valorRetido)}</valorRetido>
    </retencaoIssqn>
  ` : "";

  // ...existing code...
  return `<?xml version="1.0" encoding="UTF-8"?>
<DPS xmlns="http://www.sped.fazenda.gov.br/nfse" versao="1.00">
  <infDPS Id="${id}">
    <identificacaoDPS>
      <numero>${escapeXml(dto.identification.numero)}</numero>
      <serie>${escapeXml(dto.identification.serie)}</serie>
      <competencia>${competencia}</competencia>
      <dataEmissao>${dataEmissao}</dataEmissao>
    </identificacaoDPS>
    <prestadorServico>
      <cpfCnpj>
        <${prestadorDoc.tag}>${prestadorDoc.value}</${prestadorDoc.tag}>
      </cpfCnpj>
      <inscricaoMunicipal>${escapeXml(dto.prestador.inscricaoMunicipal)}</inscricaoMunicipal>
      <codigoMunicipio>${dto.prestador.codigoMunicipio}</codigoMunicipio>
    </prestadorServico>
    <tomadorServico>
      <identificacaoTomador>
        <cpfCnpj>
          <${tomadorDoc.tag}>${tomadorDoc.value}</${tomadorDoc.tag}>
        </cpfCnpj>
      </identificacaoTomador>
      <razaoSocial>${escapeXml(dto.tomador.nome)}</razaoSocial>
      <endereco>
        <logradouro>${escapeXml(dto.tomador.endereco.logradouro)}</logradouro>
        <numero>${escapeXml(dto.tomador.endereco.numero)}</numero>
        <bairro>${escapeXml(dto.tomador.endereco.bairro)}</bairro>
        <codigoMunicipio>${dto.tomador.endereco.codigoMunicipio}</codigoMunicipio>
        <uf>${dto.tomador.endereco.uf}</uf>
        <cep>${dto.tomador.endereco.cep}</cep>
        ${dto.tomador.endereco.complemento ? `<complemento>${escapeXml(dto.tomador.endereco.complemento)}</complemento>` : ""}
      </endereco>
      ${dto.tomador.email ? `<email>${escapeXml(dto.tomador.email)}</email>` : ""}
    </tomadorServico>
    <servico>
      <codigoMunicipio>${dto.servico.codigoMunicipio}</codigoMunicipio>
      <codigoTributacaoMunicipio>${escapeXml(dto.servico.codigoTributacaoMunicipio)}</codigoTributacaoMunicipio>
      <itemListaLC116>${escapeXml(dto.servico.itemListaLc116)}</itemListaLC116>
      <codigoCNAE>${escapeXml(dto.servico.codigoCnae)}</codigoCNAE>
      <discriminacao>${escapeXml(dto.servico.descricao)}</discriminacao>
      <valores>
        <valorServicos>${money(valorServicos)}</valorServicos>
        <valorDeducoes>${money(valorDeducoes)}</valorDeducoes>
        <valorIss>${money(valorIss)}</valorIss>
        <aliquota>${dto.servico.aliquota.toFixed(2)}</aliquota>
      </valores>
    </servico>
    ${obraXml}
    ${eventoXml}
    ${exportacaoXml}
    ${deducoesXml}
    ${beneficioXml}
    ${retencaoXml}
    <regimeEspecialTributacao>${escapeXml(dto.regime.regimeEspecialTributacao)}</regimeEspecialTributacao>
    <optanteSimplesNacional>${dto.regime.optanteSimples ? "1" : "2"}</optanteSimplesNacional>
    <incentivoFiscal>${dto.regime.incentivoFiscal ? "1" : "2"}</incentivoFiscal>
    ${
      dto.referencias
        ? `<informacoesComplementares>
      <codigoMunicipioIncidencia>${dto.referencias.codigoMunicipioIncidencia}</codigoMunicipioIncidencia>
      <naturezaOperacao>${escapeXml(dto.referencias.naturezaOperacao)}</naturezaOperacao>
    </informacoesComplementares>`
        : ""
    }
  </infDPS>
</DPS>`;
}
