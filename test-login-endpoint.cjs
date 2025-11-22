const axios = require('axios');

// URL del servidor
const SERVER_URL = 'http://localhost:5000';

// Cuentas de prueba
const testAccounts = [
  {
    username: 'admin.prueba',
    email: 'admin.prueba@gss.com',
    password: 'admin1234'
  },
  {
    username: 'super.prueba',
    email: 'super.prueba@gss.com',
    password: 'super1234'
  },
  {
    username: 'reside.alba',
    email: 'reside.alba@gss.com',
    password: 'reside1234'
  },
  {
    username: 'comite.alba',
    email: 'comite.alba@gss.com',
    password: 'comite1234'
  },
  {
    username: 'guardia.prueba',
    email: 'guardia.prueba@gss.com',
    password: 'guardia1234'
  }
  ,
  {
    username: 'karem.lara.s',
    email: 'karem.lara.s',
    password: 'Prueba1234'
  }
];

async function testLoginEndpoint() {
  console.log('🔍 Probando endpoint de login con cuentas de prueba...');
  console.log('=' .repeat(60));
  
  // Primero verificar que el servidor esté funcionando
  try {
    const healthResponse = await axios.get(`${SERVER_URL}/api/health`);
    console.log('✅ Servidor funcionando:', healthResponse.data.status);
    console.log('📊 Estado de la base de datos:', healthResponse.data.database.status);
    console.log('');
  } catch (error) {
    console.log('❌ Error conectando al servidor:', error.message);
    console.log('🔧 Asegúrate de que el servidor esté ejecutándose en puerto 3001');
    return;
  }
  
  // Probar login con cada cuenta
  for (const account of testAccounts) {
    console.log(`🔐 Probando login con: ${account.username}`);
    
    try {
      // Probar con email
      const emailResponse = await axios.post(`${SERVER_URL}/api/auth/login`, {
        email: account.email,
        password: account.password
      });
      
      console.log(`✅ Login exitoso con email: ${account.email}`);
      console.log(`   Token recibido: ${emailResponse.data.token ? 'Sí' : 'No'}`);
      console.log(`   Usuario: ${emailResponse.data.user?.username}`);
      console.log(`   Rol: ${emailResponse.data.user?.role}`);
      
    } catch (error) {
      console.log(`❌ Error con email ${account.email}:`, error.response?.data?.msg || error.message);
    }
    
    try {
      // Probar con username
      const usernameResponse = await axios.post(`${SERVER_URL}/api/auth/login`, {
        email: account.username,
        password: account.password
      });
      
      console.log(`✅ Login exitoso con username: ${account.username}`);
      console.log(`   Token recibido: ${usernameResponse.data.token ? 'Sí' : 'No'}`);
      console.log(`   Usuario: ${usernameResponse.data.user?.username}`);
      console.log(`   Rol: ${usernameResponse.data.user?.role}`);
      
    } catch (error) {
      console.log(`❌ Error con username ${account.username}:`, error.response?.data?.msg || error.message);
    }
    
    console.log('---');
  }
  
  // Probar con credenciales incorrectas
  console.log('🔐 Probando con credenciales incorrectas...');
  try {
    await axios.post(`${SERVER_URL}/api/auth/login`, {
      email: 'usuario.inexistente@test.com',
      password: 'contraseña_incorrecta'
    });
    console.log('❌ ERROR: Login debería haber fallado');
  } catch (error) {
    console.log('✅ Credenciales incorrectas rechazadas correctamente:', error.response?.data?.msg);
  }
}

testLoginEndpoint().catch(console.error);