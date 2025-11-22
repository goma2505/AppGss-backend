import axios from 'axios';
import fs from 'fs';

async function testLogin() {
  let output = '';
  try {
    output += 'Probando login con admin...\n';
    const response = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'admin@appgss.com',
      password: 'admin1234'
    });
    
    output += '✅ Login exitoso!\n';
    output += `Response: ${JSON.stringify(response.data, null, 2)}\n`;
    
  } catch (error) {
    output += '❌ Error en login:\n';
    if (error.response) {
      output += `Status: ${error.response.status}\n`;
      output += `Data: ${JSON.stringify(error.response.data, null, 2)}\n`;
    } else {
      output += `Error: ${error.message}\n`;
    }
  }
  
  fs.writeFileSync('login-test-result.txt', output);
  console.log('Resultado guardado en login-test-result.txt');
}

testLogin();