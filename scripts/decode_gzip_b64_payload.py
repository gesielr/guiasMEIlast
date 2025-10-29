import base64
import gzip
import json

# Decode function
def decode_gzip_b64(b64_string):
    gz_data = base64.b64decode(b64_string)
    xml_data = gzip.decompress(gz_data)
    return xml_data.decode('utf-8')

# Load payload.json
def decode_payload_file(payload_path, output_path, key):
    with open(payload_path, 'rb') as f:
        raw = f.read()
        # Remove BOM se presente
        if raw.startswith(b'\xef\xbb\xbf'):
            raw = raw[3:]
        payload = json.loads(raw.decode('utf-8'))
    b64_string = payload[key]
    xml_decoded = decode_gzip_b64(b64_string)
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(xml_decoded)
    print(f"Decoded XML written to {output_path}")

if __name__ == "__main__":
    decode_payload_file('payload.json', 'decoded_payload.xml', 'dps_xml_gzip_b64')
    decode_payload_file('payload-corrigido.json', 'decoded_payload_corrigido.xml', 'dps_xml_gzip_b64')
