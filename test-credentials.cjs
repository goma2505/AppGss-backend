const bcrypt = require('bcryptjs');

// Cuentas de prueba del servidor
const testAccounts = [
  {
    username: 'admin.prueba',
    email: 'admin.prueba@gss.com',
    password: 'admin1234',
    hashedPassword: '$2b$10$a5znRy61KEYwN5xeACnSseipfuxFZB0d/0AweljOVqKoVBy/zqP6W'
  },
  {
    username: 'super.prueba',
    email: 'super.prueba@gss.com',
    password: 'super1234',
    hashedPassword: '$2b$10$48N3htknqC06cMAyD4N5ueh8jZooQ5Z1tobj40oQcaAXXtStk7pl2'
  },
  {
    username: 'reside.alba',
    email: 'reside.alba@gss.com',
    password: 'reside1234',
    hashedPassword: '$2b$10$Qn3dO5sKtraanFHXDoJ.QejMtY5N/lfYvq1mZBR5tX9mMaGdOxpNy'
  },
  {
    username: 'comite.alba',
    email: 'comite.alba@gss.com',
    password: 'comite1234',
    hashedPassword: '$2b$10$BjRSbDZ2BwO70TfrooEVvek7pydurLdbDymAGhTg5tTQAhqF1H9RS'
  },
  {
    username: 'guardia.prueba',
    email: 'guardia.prueba@gss.com',
    password: 'guardia1234',
    hashedPassword: '$2b$10$jswniV0xO/SP4ACjMEWfB./kVi8kRLBfKBiwUOPEZXBgsl6S2zUTy'
  }
];

async function testCredentials() {
  console.log('🔍 Verificando credenciales de cuentas de prueba...');
  console.log('=' .repeat(60));
  
  for (const account of testAccounts) {
    try {
      const isValid = await bcrypt.compare(account.password, account.hashedPassword);
      console.log(`${isValid ? '✅' : '❌'} ${account.username} (${account.email})`);
      console.log(`   Contraseña: ${account.password}`);
      console.log(`   Hash válido: ${isValid}`);
      console.log('');
    } catch (error) {
      console.log(`❌ Error verificando ${account.username}:`, error.message);
    }
  }
  
  console.log('\n📋 Resumen de credenciales para pruebas:');
  console.log('=' .repeat(60));
  testAccounts.forEach(account => {
    console.log(`Usuario: ${account.username}`);
    console.log(`Email: ${account.email}`);
    console.log(`Contraseña: ${account.password}`);
    console.log('---');
  });
}

testCredentials().catch(console.error);