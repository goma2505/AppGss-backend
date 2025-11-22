import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from './models/User.js';

async function debugAtlasUser() {
  try {
    await mongoose.connect('mongodb+srv://goma2505_db_user:2505Dell@gssapp.mezmxc8.mongodb.net/property-management?retryWrites=true&w=majority&appName=GSSAPP', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('Conectado a MongoDB Atlas');
    
    const testEmail = 'admin';
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
      
      // Mostrar todos los usuarios para comparar
      const allUsers = await User.find({}, 'username email name role');
      console.log('\nTodos los usuarios en MongoDB Atlas:');
      allUsers.forEach(u => {
        console.log(`- Username: "${u.username}", Email: "${u.email || 'null'}", Name: "${u.name}", Role: "${u.role}"`);
      });
      
    } else {
      console.log('✅ Usuario encontrado:', {
        id: user._id,
        username: user.username,
        email: user.email,
        name: user.name,
        role: user.role
      });
      
      console.log(`\nValidando contraseña: ${testPassword}`);
      console.log('Hash almacenado:', user.password);
      
      const isMatch = await bcrypt.compare(testPassword, user.password);
      console.log('¿Contraseña coincide?', isMatch ? '✅ Sí' : '❌ No');
      
      if (!isMatch) {
        // Probar con diferentes contraseñas
        const testPasswords = ['admin123', 'password', '123456', 'admin'];
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

debugAtlasUser();