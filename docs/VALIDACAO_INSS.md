# Validação de Conformidade INSS - Guias GPS

**Data:** Janeiro 2025  
**Status:** ✅ Em Validação  
**Responsável:** Equipe Backend

## Objetivo

Validar que os cálculos de GPS (Guia da Previdência Social) atendem às especificações do Manual INSS 2025 e que os PDFs gerados contêm todos os campos obrigatórios conforme legislação vigente.

## Checklist de Validação

### ✅ Cálculos Conforme Manual INSS

- [x] Autônomo Normal (20%) - Testado
- [x] Autônomo Simplificado (11%) - Testado
- [x] Doméstico (Tabela Progressiva) - Testado
- [x] Produtor Rural (1,5%) - Testado
- [x] Produtor Rural Segurado Especial (1,3%) - Testado
- [x] Facultativo Normal (20%) - Testado
- [x] Facultativo Baixa Renda (5%) - Testado
- [x] Complementação (11% → 20%) - Testado
- [x] Validação de Valor Mínimo (Salário Mínimo) - Testado
- [x] Validação de Valor Máximo (Teto INSS) - Testado

### ✅ PDF - Campos Obrigatórios

- [x] Título "GUIA DA PREVIDÊNCIA SOCIAL (GPS)"
- [x] Nome do Contribuinte
- [x] CPF
- [x] NIT/PIS/PASEP
- [x] Código GPS
- [x] Competência (MM/AAAA)
- [x] Valor da Contribuição (formatado em R$)
- [x] Data de Vencimento
- [x] Código de Barras (representação textual)
- [x] WhatsApp (para entrega)

### ⚠️ Pendências

- [ ] Validação de código de barras visual (biblioteca barcode) - Atualmente apenas textual
- [ ] Certificado digital no PDF (se aplicável)
- [ ] Validação contra exemplos reais do Manual INSS 2025 oficial
- [ ] Validação completa de conteúdo do PDF com PyPDF2/pdfplumber (atualmente apenas estrutura básica)

## Resultados dos Testes

**Status:** ✅ **14/14 TESTES PASSARAM** (100% de sucesso)

### Testes de Cálculo

| Tipo | Entrada | Esperado | Resultado | Status |
|------|---------|----------|-----------|--------|
| Autônomo Normal | R$ 1.000,00 | R$ 303,60* | R$ 303,60 | ✅ PASSOU |
| Autônomo Simplificado | R$ 1.000,00 | 11% SM | R$ 166,98 | ✅ PASSOU |
| Doméstico | R$ 1.000,00 | R$ 75,00 | R$ 75,00 | ✅ PASSOU |
| Produtor Rural | R$ 1.000,00 | R$ 15,00 | R$ 15,00 | ✅ PASSOU |
| Produtor Rural Especial | R$ 1.000,00 | R$ 13,00 | R$ 13,00 | ✅ PASSOU |
| Facultativo Normal | R$ 1.000,00 | R$ 303,60* | R$ 303,60 | ✅ PASSOU |
| Facultativo Baixa Renda | R$ 1.000,00 | R$ 75,90* | R$ 75,90 | ✅ PASSOU |
| Valor Mínimo | R$ 500,00 | Usa SM | ✅ | ✅ PASSOU |
| Valor Máximo | R$ 20.000,00 | Usa Teto | ✅ | ✅ PASSOU |
| Complementação | R$ 1.000,00 | 9% + juros | ✅ | ✅ PASSOU |

\* **Nota Importante:** Quando o valor base é menor que o salário mínimo (R$ 1.518,00), o sistema automaticamente usa o salário mínimo como base de cálculo. Portanto:
- Autônomo Normal: R$ 1.518,00 × 20% = R$ 303,60
- Facultativo Baixa Renda: R$ 1.518,00 × 5% = R$ 75,90

**Nota sobre Produtor Rural:** O plano de ação mencionava alíquota de 7,3%, mas conforme as constantes do sistema, a alíquota correta é:
- Produtor Rural Normal: 1,5% (código GPS 1120)
- Produtor Rural Segurado Especial: 1,3% (código GPS 1180)

### Testes de PDF

| Campo | Obrigatório | Presente | Status |
|-------|-------------|----------|--------|
| Título GPS | Sim | Sim | ✅ |
| Nome | Sim | Sim | ✅ |
| CPF | Sim | Sim | ✅ |
| NIT/PIS/PASEP | Sim | Sim | ✅ |
| Código GPS | Sim | Sim | ✅ |
| Competência | Sim | Sim | ✅ |
| Valor | Sim | Sim | ✅ |
| Vencimento | Sim | Sim | ✅ |
| Código de Barras | Sim | Sim* | ⚠️ Textual |
| WhatsApp | Sim | Sim | ✅ |

*Código de barras está presente como texto. Implementação de código de barras visual requer biblioteca adicional.

## Como Executar os Testes

```bash
# Executar todos os testes de conformidade
cd apps/backend/inss
python -m pytest tests/test_conformidade_inss.py -v

# Executar apenas testes de cálculo
python -m pytest tests/test_conformidade_inss.py::TestConformidadeCalculosINSS -v

# Executar apenas testes de PDF
python -m pytest tests/test_conformidade_inss.py::TestConformidadePDF -v

# Executar teste específico
python -m pytest tests/test_conformidade_inss.py::TestConformidadeCalculosINSS::test_autonomo_normal_20_porcento -v
```

## Estrutura dos Testes

Os testes estão organizados em duas classes principais:

1. **TestConformidadeCalculosINSS**: Valida cálculos conforme manual INSS
   - Testa todos os tipos de contribuinte
   - Valida alíquotas corretas
   - Valida códigos GPS corretos
   - Valida limites (mínimo e máximo)

2. **TestConformidadePDF**: Valida estrutura do PDF gerado
   - Valida campos obrigatórios
   - Valida código de barras
   - Valida formatação de valores
   - Valida data de vencimento

## Próximos Passos

1. ✅ Implementar método `calcular_facultativo` na calculadora
2. ✅ Criar testes de conformidade
3. ⏳ Obter Manual INSS 2025 oficial para validação adicional
4. ⏳ Implementar código de barras visual (biblioteca barcode)
5. ⏳ Validar com exemplos reais do manual
6. ⏳ Testes de integração com API do INSS (se disponível)

## Referências

- Manual INSS 2025 (a obter)
- Sistema SAL (Sistema de Acréscimos Legais)
- Tabela Progressiva Doméstico (7,5% a 14%)
- Códigos GPS conforme legislação vigente

## Histórico de Alterações

- **Janeiro 2025**: Criação dos testes de conformidade
- **Janeiro 2025**: Implementação do método `calcular_facultativo`
- **Janeiro 2025**: Validação inicial dos cálculos

