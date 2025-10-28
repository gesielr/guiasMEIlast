const fs = require('fs');
const zlib = require('zlib');

const xml = fs.readFileSync('dps-assinado.xml');
const gzipped = zlib.gzipSync(xml);
const b64 = gzipped.toString('base64');
fs.writeFileSync('dps-b64.txt', b64);
console.log('Base64 salvo em dps-b64.txt');
