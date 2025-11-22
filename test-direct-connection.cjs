const http = require('http');
const fs = require('fs');

// Test if server is responding
const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  }
};

const postData = JSON.stringify({
  email: 'admin',
  password: 'admin1234'
});

let output = '';
output += 'Testing direct connection to server...\n';
output += 'URL: http://localhost:5000/api/auth/login\n';
output += 'Data: ' + postData + '\n\n';

const req = http.request(options, (res) => {
  output += `Status Code: ${res.statusCode}\n`;
  output += `Headers: ${JSON.stringify(res.headers, null, 2)}\n`;
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    output += 'Response Body: ' + data + '\n';
    fs.writeFileSync('direct-connection-result.txt', output);
    console.log('Resultado guardado en direct-connection-result.txt');
    process.exit(0);
  });
});

req.on('error', (error) => {
  output += 'Connection Error: ' + error.message + '\n';
  output += 'Error Code: ' + error.code + '\n';
  fs.writeFileSync('direct-connection-result.txt', output);
  console.log('Error guardado en direct-connection-result.txt');
  process.exit(1);
});

req.on('timeout', () => {
  output += 'Request timeout\n';
  fs.writeFileSync('direct-connection-result.txt', output);
  console.log('Timeout guardado en direct-connection-result.txt');
  req.destroy();
  process.exit(1);
});

req.setTimeout(10000); // 10 second timeout
req.write(postData);
req.end();

console.log('Iniciando test de conexión directa...');