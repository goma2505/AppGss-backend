import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from './models/User.js';

const mongoUri = 'mongodb://localhost:27017/appgss';

async function createTestUsers() {
  try {
    await mongoose.connect(mongoUri);
    console.log('Conectado a MongoDB local');
    
    // Limpiar usuarios existentes
    await User.deleteMany({});
    console.log('Usuarios existentes eliminados');
    
    // Crear usuarios de prueba
    const users = [
      {
        name: 'Administrador',
        username: 'admin',
        email: 'admin@appgss.com',
        password: 'admin1234',
        role: 'admin',
        serviceCode: 'ADMIN',
        accessCode: 'ADMIN001'
      },
      {
        name: 'Alfredo Gómez',
        username: 'alfredo.gomez',
        email: 'alfredo.gomez@appgss.com',
        password: '2505Dell',
        role: 'guardia',
        serviceCode: 'ALBA',
        accessCode: 'ALBA001'
      }
    ];
    
    for (const userData of users) {
      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(userData.password, salt);
      
      // Create user
      const user = new User({
        name: userData.name,
        username: userData.username,
        email: userData.email,
        password: hashedPassword,
        role: userData.role,
        serviceCode: userData.serviceCode,
        accessCode: userData.accessCode
      });
      
      await user.save();
      console.log(`Usuario creado: ${userData.username} (${userData.email})`);
    }
    
    console.log('\n✅ Usuarios de prueba creados exitosamente!');
    console.log('\nCredenciales disponibles:');
    console.log('1. admin / admin1234');
    console.log('2. alfredo.gomez / 2505Dell');
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

createTestUsers();