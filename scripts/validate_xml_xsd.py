import sys
import os
from lxml import etree

# Caminhos dos arquivos
base_dir = r'C:\Users\carlo\OneDrive\Área de Trabalho\Curso\Projetos Pessoais\Inss - Guias\guiasMEI'
xml_files = [
    os.path.join(base_dir, 'decoded_payload.xml'),
    os.path.join(base_dir, 'decoded_payload_corrigido.xml'),
    os.path.join(base_dir, 'DPS.xml'),
    os.path.join(base_dir, 'decoded_payload_valid.xml'),
    os.path.join(base_dir, 'decoded_payload_corrigido_valid.xml')
]

# Mudar diretório de trabalho para onde estão os XSDs
xsd_dir = os.path.join('apps', 'backend', 'src', 'nfse', 'services', 'arquivos')
os.chdir(xsd_dir)
xsd_path = 'DPS_v1.00.xsd'

# Carregar XSD
with open(xsd_path, 'rb') as f:
    xsd_doc = etree.XML(f.read())
    xsd_schema = etree.XMLSchema(xsd_doc)

for xml_file in xml_files:
    print(f'Validando {xml_file}...')
    with open(xml_file, 'rb') as f:
        xml_doc = etree.XML(f.read())
        try:
            xsd_schema.assertValid(xml_doc)
            print(f'OK: {xml_file} é válido pelo XSD.')
        except etree.DocumentInvalid as e:
            print(f'ERRO: {xml_file} inválido pelo XSD.')
            print(str(e))
