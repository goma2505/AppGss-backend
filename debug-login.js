import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from './models/User.js';

async function debugLogin() {
  try {
    await mongoose.connect('mongodb://localhost:27017/property-management', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('Conectado a MongoDB');
    
    const testEmail = 'alfredo.gomez';
    const testPassword = 'admin123';
    
    console.log(`\nBuscando usuario con email/username: ${testEmail}`);
    
    // Buscar exactamente como lo hace el endpoint
    let user = await User.findOne({ 
      $or: [
        { email: testEmail },
        { username: testEmail }
      ]
    });
    
    if (!user) {
      console.log('❌ Usuario no encontrado');
      
      // Buscar por separado para debug
      const userByEmail = await User.findOne({ email: testEmail });
      const userByUsername = await User.findOne({ username: testEmail });
      
      console.log('Búsqueda por email:', userByEmail ? 'Encontrado' : 'No encontrado');
      console.log('Búsqueda por username:', userByUsername ? 'Encontrado' : 'No encontrado');
      
      // Mostrar todos los usuarios para comparar
      const allUsers = await User.find({}, 'username email');
      console.log('\nTodos los usuarios en la base de datos:');
      allUsers.forEach(u => {
        console.log(`- Username: "${u.username}", Email: "${u.email || 'null'}"`);
      });
      
    } else {
      console.log('✅ Usuario encontrado:', {
        id: user._id,
        username: user.username,
        email: user.email,
        name: user.name
      });
      
      console.log(`\nValidando contraseña: ${testPassword}`);
      console.log('Hash almacenado:', user.password);
      
      const isMatch = await bcrypt.compare(testPassword, user.password);
      console.log('¿Contraseña coincide?', isMatch ? '✅ Sí' : '❌ No');
      
      if (!isMatch) {
        // Probar con diferentes contraseñas
        const testPasswords = ['admin123', 'password', '123456', 'admin', user.username];
        console.log('\nProbando otras contraseñas:');
        
        for (const pwd of testPasswords) {
          const match = await bcrypt.compare(pwd, user.password);
          console.log(`- "${pwd}": ${match ? '✅' : '❌'}`);
        }
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

debugLogin();