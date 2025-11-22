import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from './models/User.js';

// Conectar a MongoDB Atlas
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/appgss';

async function createTestAccounts() {
  try {
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('✅ Conectado a MongoDB Atlas');
    
    // Definir las cuentas de prueba específicas solicitadas
    const testAccounts = [
      {
        name: 'Administrador Prueba',
        username: 'admin.prueba',
        email: 'admin.prueba@gss.com',
        password: 'admin1234',
        role: 'admin',
        serviceCode: 'GSS',
        accessCode: 'GSSADM001'
      },
      {
        name: 'Administrador Alf',
        username: 'admin.alf',
        email: 'admin.alf@gss.com',
        password: 'admin1234',
        role: 'administrador',
        serviceCode: 'ALBA',
        allowedServices: ['ALBA'],
        serviceCodes: ['ALBA'],
        accessCode: 'ADM-ALBA-25'
      },
      {
        name: 'Supervisor Prueba',
        username: 'super.prueba',
        email: 'super.prueba@gss.com',
        password: 'super1234',
        role: 'supervisor',
        serviceCode: 'ALBA',
        accessCode: 'ALBASUP001'
      },
      {
        name: 'Residente Alba',
        username: 'reside.alba',
        email: 'reside.alba@gss.com',
        password: 'reside1234',
        role: 'residente',
        serviceCode: 'ALBA',
        street: 'Calle Prueba',
        number: '123',
        accessCode: 'ALBARES001'
      },
      {
        name: 'Comité Alba',
        username: 'comite.alba',
        email: 'comite.alba@gss.com',
        password: 'comite1234',
        role: 'comite',
        serviceCode: 'ALBA',
        accessCode: 'ALBACOM001'
      },
      {
        name: 'Guardia Prueba',
        username: 'guardia.prueba',
        email: 'guardia.prueba@gss.com',
        password: 'guardia1234',
        role: 'guardia',
        serviceCode: 'ALBA',
        allowedServices: ['ALBA'],
        accessCode: 'ALBAGRD001'
      }
    ];
    
    console.log('\n🔄 Creando cuentas de prueba específicas...');
    
    for (const accountData of testAccounts) {
      try {
        // Verificar si el usuario ya existe
        const existingUser = await User.findOne({
          $or: [
            { username: accountData.username },
            { email: accountData.email }
          ]
        });
        
        if (existingUser) {
          console.log(`⚠️  Usuario ${accountData.username} ya existe, eliminando...`);
          await User.deleteOne({ _id: existingUser._id });
        }
        
        // Hashear la contraseña
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(accountData.password, salt);
        
        // Crear el usuario
        const newUser = new User({
          ...accountData,
          password: hashedPassword,
          isActive: true,
          isVerified: true
        });
        
        await newUser.save();
        console.log(`✅ Usuario creado: ${accountData.username} (${accountData.role})`);
        
      } catch (userError) {
        console.error(`❌ Error creando usuario ${accountData.username}:`, userError.message);
      }
    }
    
    console.log('\n📊 Verificando cuentas creadas...');
    const createdUsers = await User.find({
      username: { $in: testAccounts.map(acc => acc.username) }
    }, 'username email role serviceCode');
    
    createdUsers.forEach(user => {
      console.log(`- ${user.username} (${user.role}) - Servicio: ${user.serviceCode}`);
    });
    
    console.log('\n🎉 Proceso completado exitosamente!');
    console.log('\n📝 Credenciales de acceso:');
    testAccounts.forEach(acc => {
      console.log(`- ${acc.username} / ${acc.password} (${acc.role})`);
    });
    
  } catch (error) {
    console.error('❌ Error creando cuentas de prueba:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Desconectado de MongoDB');
  }
}

// Ejecutar el script
createTestAccounts();